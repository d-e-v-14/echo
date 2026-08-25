
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  AudioVideoFacade,
  AudioVideoObserver,
  VideoTileState,
  MeetingSessionStatusCode,
  DefaultActiveSpeakerPolicy,
  ContentShareObserver,
  MeetingSessionStatus,
  DeviceChangeObserver,
  VideoSource,
  DefaultModality,
} from "amazon-chime-sdk-js";

import axios from "axios";

const CHIME_API_URL = process.env.NEXT_PUBLIC_CHIME_API_URL;

const chimeApiClient = axios.create({
  baseURL: CHIME_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

export interface MediaState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
  recording: boolean;
  mediaQuality: "low" | "medium" | "high" | "auto";
  activeStreams: {
    audio: boolean;
    video: boolean;
    screen: boolean;
  };
  availablePermissions: {
    audio: boolean;
    video: boolean;
  };
}

export interface DeviceInfo {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  activeAudioDevice?: string;
  activeVideoDevice?: string;
  activeAudioOutputDevice?: string;
}

export interface NetworkStats {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  connectionType: "good" | "fair" | "poor";
}

export interface ChimeMeetingInfo {
  meeting: {
    MeetingId: string;
    MediaPlacement: {
      AudioHostUrl: string;
      AudioFallbackUrl: string;
      SignalingUrl: string;
      TurnControlUrl: string;
      ScreenDataUrl?: string;
      ScreenViewingUrl?: string;
      ScreenSharingUrl?: string;
    };
    ExternalMeetingId?: string;
  };
  attendee: {
    AttendeeId: string;
    ExternalUserId: string;
    JoinToken: string;
  };
}

export interface VoiceRosterMember {
  name: string;
  attendeeId: string;
  oduserId: string;
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
  signalStrength: number;
}

export interface VideoTileInfo {
  tileId: number;
  attendeeId: string;
  isLocal: boolean;
  isContent: boolean;
  active: boolean;
}

export class VoiceVideoManager
  implements AudioVideoObserver, ContentShareObserver, DeviceChangeObserver
{
  private userId: string;
  private username: string;
  private currentChannelId: string | null = null;

  private logger: ConsoleLogger;
  private deviceController: DefaultDeviceController | null = null;
  private meetingSession: DefaultMeetingSession | null = null;
  private audioVideo: AudioVideoFacade | null = null;

  private audioElement: HTMLAudioElement | null = null;

  private localScreenStream: MediaStream | null = null;
  private screenShareTrackEndedHandler: (() => void) | null = null;

  private videoTiles: Map<number, VideoTileInfo> = new Map();
  private localVideoTileId: number | null = null;
  private localScreenTileId: number | null = null;

  private roster: Map<string, VoiceRosterMember> = new Map();
  private currentRemoteVideoSources: VideoSource[] = [];

  private mediaState: MediaState = {
    muted: true, // Start muted by default
    speaking: false,
    video: false,
    screenSharing: false,
    recording: false,
    mediaQuality: "auto",
    activeStreams: { audio: false, video: false, screen: false },
    availablePermissions: { audio: false, video: false },
  };

  private deviceInfo: DeviceInfo = {
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  };

  private networkStats: NetworkStats = {
    latency: 0,
    packetLoss: 0,
    bandwidth: 0,
    connectionType: "good",
  };

  private callbacks = {
    onVideoTileUpdated: null as ((tile: VideoTileInfo) => void) | null,
    onVideoTileRemoved: null as ((tileId: number) => void) | null,
    onVoiceRoster: null as ((members: VoiceRosterMember[]) => void) | null,
    onUserJoined: null as
      | ((attendeeId: string, externalUserId: string) => void)
      | null,
    onUserLeft: null as ((attendeeId: string) => void) | null,
    onMediaStateChange: null as
      | ((attendeeId: string, state: Partial<VoiceRosterMember>) => void)
      | null,
    onScreenSharing: null as
      | ((attendeeId: string, isSharing: boolean) => void)
      | null,
    onError: null as
      | ((error: { code: string; message: string }) => void)
      | null,
    onConnectionStateChange: null as ((connected: boolean) => void) | null,
    onNetworkQuality: null as ((stats: NetworkStats) => void) | null,
  };

  constructor(userId: string, username?: string) {
    this.userId = userId;
    this.username = username || userId;
    this.logger = new ConsoleLogger("ChimeVoice", LogLevel.WARN);
  }

  async initialize(requestVideo = true, requestAudio = true): Promise<void> {
    try {
      console.log("[VoiceVideoManager] Initializing with:", {
        requestVideo,
        requestAudio,
      });

      if (!this.deviceController) {
        this.deviceController = new DefaultDeviceController(this.logger);
      }

      let audioGranted = false;
      let videoGranted = false;

      if (requestAudio) {
        try {
          const audioInputs =
            await this.deviceController.listAudioInputDevices();
          audioGranted = audioInputs.length > 0;
          console.log(
            "[VoiceVideoManager] Audio devices found:",
            audioInputs.length
          );
        } catch (e: any) {
          console.warn("[VoiceVideoManager] Audio permission denied:", e.name);
        }
      }

      if (requestVideo) {
        try {
          const videoInputs =
            await this.deviceController.listVideoInputDevices();
          videoGranted = videoInputs.length > 0;
          console.log(
            "[VoiceVideoManager] Video devices found:",
            videoInputs.length
          );
        } catch (e: any) {
          console.warn("[VoiceVideoManager] Video permission denied:", e.name);
        }
      }

      this.mediaState.availablePermissions = {
        audio: audioGranted,
        video: videoGranted,
      };

      await this.updateDeviceInfo();

      if (!audioGranted && !videoGranted) {
        throw new Error("No media permissions granted");
      }
    } catch (error: any) {
      console.error("[VoiceVideoManager] Initialization failed:", error);
      this.callbacks.onError?.({ code: "INIT_FAILED", message: error.message });
      throw error;
    }
  }

  async initializeAudioOnly(): Promise<void> {
    return this.initialize(false, true);
  }

  async initializeVideoOnly(): Promise<void> {
    return this.initialize(true, false);
  }

  async joinVoiceChannel(channelId: string): Promise<void> {
    try {
      console.log("[VoiceVideoManager] Joining channel:", channelId);
      this.currentChannelId = channelId;

      const meetingInfo = await this.createOrJoinMeeting(channelId);

      if (!meetingInfo?.meeting || !meetingInfo?.attendee) {
        throw new Error("Invalid meeting info received from server");
      }

      console.log("[VoiceVideoManager] Got meeting info:", {
        meetingId: meetingInfo.meeting.MeetingId,
        attendeeId: meetingInfo.attendee.AttendeeId,
      });

      const configuration = new MeetingSessionConfiguration(
        meetingInfo.meeting,
        meetingInfo.attendee
      );

      this.meetingSession = new DefaultMeetingSession(
        configuration,
        this.logger,
        this.deviceController!
      );

      this.audioVideo = this.meetingSession.audioVideo;

      this.audioVideo.addObserver(this);
      this.audioVideo.addContentShareObserver(this);
      this.deviceController?.addDeviceChangeObserver(this);

      this.audioVideo.realtimeSubscribeToAttendeeIdPresence(
        (attendeeId: string, present: boolean, externalUserId?: string) => {
          this.handleAttendeePresence(attendeeId, present, externalUserId);
        }
      );

      this.audioVideo.realtimeSubscribeToMuteAndUnmuteLocalAudio(
        (muted: boolean) => {
          this.mediaState.muted = muted;
          this.broadcastRoster();
        }
      );

      this.audioVideo.subscribeToActiveSpeakerDetector(
        new DefaultActiveSpeakerPolicy(),
        (attendeeIds: string[]) => {
          this.handleActiveSpeakers(attendeeIds);
        }
      );

      await this.startSession();

      this.callbacks.onConnectionStateChange?.(true);
    } catch (error: any) {
      console.error("[VoiceVideoManager] Failed to join channel:", error);
      this.callbacks.onError?.({ code: "JOIN_FAILED", message: error.message });
      throw error;
    }
  }

  private async startSession(): Promise<void> {
    if (!this.audioVideo || !this.deviceController) return;

    try {
      const audioInputs = await this.deviceController.listAudioInputDevices();
      if (audioInputs.length > 0) {
        const deviceId =
          this.deviceInfo.activeAudioDevice || audioInputs[0].deviceId;
        await this.audioVideo.startAudioInput(deviceId);
        this.deviceInfo.activeAudioDevice = deviceId;
        this.mediaState.activeStreams.audio = true;
        console.log("[VoiceVideoManager] Started audio input:", deviceId);
      }

      const audioOutputs = await this.deviceController.listAudioOutputDevices();
      if (audioOutputs.length > 0) {
        const deviceId =
          this.deviceInfo.activeAudioOutputDevice || audioOutputs[0].deviceId;
        await this.audioVideo.chooseAudioOutput(deviceId);
        this.deviceInfo.activeAudioOutputDevice = deviceId;
      }

      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      this.audioElement.style.display = "none";
      document.body.appendChild(this.audioElement);
      this.audioVideo.bindAudioElement(this.audioElement);

      this.audioVideo.start();

      this.audioVideo.realtimeMuteLocalAudio();
      this.mediaState.muted = true;

      setTimeout(() => this.syncExistingRemoteVideo(), 300);
    } catch (error) {
      console.error("[VoiceVideoManager] Failed to start session:", error);
      throw error;
    }
  }

  leaveVoiceChannel(): void {
    console.log("[VoiceVideoManager] Leaving channel:", this.currentChannelId);

    if (this.audioVideo) {
      if (this.mediaState.video) {
        this.audioVideo.stopVideoInput();
        this.audioVideo.stopLocalVideoTile();
      }
      if (this.mediaState.screenSharing) {
        this.audioVideo.stopContentShare();
        this.clearLocalScreenStream();
      }
      this.audioVideo.removeObserver(this);
      this.audioVideo.removeContentShareObserver(this);
      this.deviceController?.removeDeviceChangeObserver(this);
      this.audioVideo.stop();
    }

    if (this.audioElement) {
      this.audioElement.remove();
      this.audioElement = null;
    }

    this.roster.clear();

    this.videoTiles.forEach((_, tileId) => {
      this.callbacks.onVideoTileRemoved?.(tileId);
    });

    this.videoTiles.clear();
    this.localVideoTileId = null;
    this.localScreenTileId = null;
    this.currentChannelId = null;
    this.meetingSession = null;
    this.audioVideo = null;

    this.mediaState = {
      ...this.mediaState,
      video: false,
      screenSharing: false,
      speaking: false,
      activeStreams: { audio: false, video: false, screen: false },
    };

    this.callbacks.onConnectionStateChange?.(false);
  }

  toggleAudio(enabled: boolean): void {
    if (!this.audioVideo) return;

    if (enabled) {
      const unmuted = this.audioVideo.realtimeUnmuteLocalAudio();
      this.mediaState.muted = !unmuted;
      console.log("[VoiceVideoManager] Unmuted audio:", unmuted);
    } else {
      this.audioVideo.realtimeMuteLocalAudio();
      this.mediaState.muted = true;
      console.log("[VoiceVideoManager] Muted audio");
    }

    this.broadcastLocalState();
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (!this.audioVideo) return;

    try {
      if (enabled) {
        if (!this.mediaState.availablePermissions.video) {
          console.warn("[VoiceVideoManager] No video permission");
          return;
        }

        const videoInputs =
          await this.deviceController?.listVideoInputDevices();
        if (!videoInputs?.length) {
          console.warn("[VoiceVideoManager] No video devices available");
          return;
        }

        const deviceId =
          this.deviceInfo.activeVideoDevice || videoInputs[0].deviceId;

        await this.audioVideo.startVideoInput({
          deviceId,
          width: { max: 640 },
          height: { max: 360 },
          frameRate: { max: 15 },
        });

        this.deviceInfo.activeVideoDevice = deviceId;

        this.audioVideo.startLocalVideoTile();

        this.mediaState.video = true;
        this.mediaState.activeStreams.video = true;
      } else {
        await this.audioVideo.stopVideoInput();
        this.audioVideo.stopLocalVideoTile();

        this.mediaState.video = false;
        this.mediaState.activeStreams.video = false;
        console.log("[VoiceVideoManager] Video stopped");
      }

      this.broadcastLocalState();
    } catch (error) {
      console.error("[VoiceVideoManager] Toggle video failed:", error);
      throw error;
    }
  }

  async startScreenShare(): Promise<void> {
    if (!this.audioVideo) return;

    try {
      const screenStream =
        await this.audioVideo.startContentShareFromScreenCapture(undefined, 15);
      this.attachLocalScreenStream(screenStream);
      this.mediaState.screenSharing = true;
      this.mediaState.activeStreams.screen = true;
      this.broadcastLocalState();
      console.log("[VoiceVideoManager] Screen sharing started");
    } catch (error: any) {
      console.error("[VoiceVideoManager] Screen share failed:", error);

      if (
        error.name === "NotAllowedError" ||
        error.message?.includes("Permission denied")
      ) {
        console.log("[VoiceVideoManager] Screen share was cancelled by user");
        return;
      }

      this.callbacks.onError?.({
        code: "SCREEN_SHARE_FAILED",
        message: error.message || "Screen sharing failed",
      });

      throw error;
    }
  }

  stopScreenShare(): void {
    if (!this.audioVideo) return;

    this.audioVideo.stopContentShare();
    this.clearLocalScreenStream();
    this.mediaState.screenSharing = false;
    this.mediaState.activeStreams.screen = false;
    this.broadcastLocalState();
  }

  private getBaseAttendeeId(attendeeId: string): string {
    return new DefaultModality(attendeeId).base();
  }

  private attachLocalScreenStream(stream: MediaStream): void {
    this.detachLocalScreenStreamListeners();
    this.localScreenStream = stream;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    this.screenShareTrackEndedHandler = () => {
      console.log(
        "[VoiceVideoManager] Screen share track ended (browser stop button)"
      );
      if (this.mediaState.screenSharing) {
        this.mediaState.screenSharing = false;
        this.mediaState.activeStreams.screen = false;
        this.localScreenStream = null;
        this.detachLocalScreenStreamListeners();
        this.broadcastLocalState();
      }
    };
    videoTrack.addEventListener("ended", this.screenShareTrackEndedHandler);
  }

  private detachLocalScreenStreamListeners(): void {
    if (this.localScreenStream && this.screenShareTrackEndedHandler) {
      this.localScreenStream
        .getVideoTracks()
        .forEach((track) =>
          track.removeEventListener("ended", this.screenShareTrackEndedHandler!)
        );
    }
    this.screenShareTrackEndedHandler = null;
  }

  private clearLocalScreenStream(): void {
    this.detachLocalScreenStreamListeners();
    this.localScreenStream = null;
  }

  contentShareDidStart(): void {
    this.mediaState.screenSharing = true;
    this.mediaState.activeStreams.screen = true;
    this.broadcastLocalState();
  }

  contentShareDidStop(): void {
    this.clearLocalScreenStream();
    this.mediaState.screenSharing = false;
    this.mediaState.activeStreams.screen = false;
    this.broadcastLocalState();
  }

  contentShareDidPause(): void {
    console.log("[VoiceVideoManager] Content share paused");
  }

  contentShareDidUnpause(): void {
    console.log("[VoiceVideoManager] Content share unpaused");
  }

  async updateDeviceInfo(): Promise<void> {
    if (!this.deviceController) return;

    try {
      const [audioInputs, videoInputs, audioOutputs] = await Promise.all([
        this.deviceController.listAudioInputDevices(),
        this.deviceController.listVideoInputDevices(),
        this.deviceController.listAudioOutputDevices(),
      ]);

      this.deviceInfo = {
        audioInputs: audioInputs as unknown as MediaDeviceInfo[],
        videoInputs: videoInputs as unknown as MediaDeviceInfo[],
        audioOutputs: audioOutputs as unknown as MediaDeviceInfo[],
        activeAudioDevice: this.deviceInfo.activeAudioDevice,
        activeVideoDevice: this.deviceInfo.activeVideoDevice,
        activeAudioOutputDevice: this.deviceInfo.activeAudioOutputDevice,
      };
    } catch (error) {
      console.error("[VoiceVideoManager] Failed to update devices:", error);
    }
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    if (!this.audioVideo) return;
    await this.audioVideo.startAudioInput(deviceId);
    this.deviceInfo.activeAudioDevice = deviceId;
  }

  async switchCamera(deviceId: string): Promise<void> {
    if (!this.audioVideo) return;
    await this.audioVideo.startVideoInput({
      deviceId,
      width: { max: 640 },
      height: { max: 360 },
      frameRate: { max: 15 },
    });

    this.deviceInfo.activeVideoDevice = deviceId;
    console.log("[VoiceVideoManager] Switched camera to:", deviceId);
  }

  async switchSpeaker(deviceId: string): Promise<void> {
    if (!this.audioVideo) return;
    await this.audioVideo.chooseAudioOutput(deviceId);
    this.deviceInfo.activeAudioOutputDevice = deviceId;
    console.log("[VoiceVideoManager] Switched speaker to:", deviceId);
  }

  audioInputsChanged(freshAudioInputDeviceList: MediaDeviceInfo[]): void {
    this.deviceInfo.audioInputs = freshAudioInputDeviceList;
  }

  audioOutputsChanged(freshAudioOutputDeviceList: MediaDeviceInfo[]): void {
    this.deviceInfo.audioOutputs = freshAudioOutputDeviceList;
  }

  videoInputsChanged(freshVideoInputDeviceList: MediaDeviceInfo[]): void {
    this.deviceInfo.videoInputs = freshVideoInputDeviceList;
  }

  audioVideoDidStart(): void {
    this.callbacks.onConnectionStateChange?.(true);
    setTimeout(() => this.syncExistingRemoteVideo(), 200);
  }

  audioVideoDidStop(sessionStatus: MeetingSessionStatus): void {
    const code = sessionStatus.statusCode();
    console.log("[VoiceVideoManager] Audio/video session stopped:", code);

    if (code === MeetingSessionStatusCode.Left) {
      console.log("[VoiceVideoManager] User left the meeting");
    } else if (code === MeetingSessionStatusCode.MeetingEnded) {
      console.log("[VoiceVideoManager] Meeting was ended");
    } else {
      console.warn("[VoiceVideoManager] Session stopped with code:", code);
    }

    this.callbacks.onConnectionStateChange?.(false);
  }

  audioVideoDidStartConnecting(reconnecting: boolean): void {
    console.log("[VoiceVideoManager] Connecting...", { reconnecting });
  }

  videoTileDidUpdate(tileState: VideoTileState): void {
    if (!tileState.tileId) return;

    const tileInfo: VideoTileInfo = {
      tileId: tileState.tileId,
      attendeeId: tileState.boundAttendeeId || "",
      isLocal: tileState.localTile || false,
      isContent: tileState.isContent || false,
      active: tileState.active || false,
    };

    this.videoTiles.set(tileState.tileId, tileInfo);

    if (tileState.localTile) {
      if (tileState.isContent) {
        this.localScreenTileId = tileState.tileId;
      } else {
        this.localVideoTileId = tileState.tileId;
      }
    }

    console.log("[VoiceVideoManager] Video tile updated:", tileInfo);

    if (tileState.boundAttendeeId && !tileState.isContent) {
      const baseAttendeeId = this.getBaseAttendeeId(tileState.boundAttendeeId);
      const rosterMember = this.roster.get(baseAttendeeId);
      if (rosterMember && tileState.active !== false) {
        if (!rosterMember.video) {
          rosterMember.video = true;
          this.broadcastRoster();
        }
      }
    }

    this.callbacks.onVideoTileUpdated?.(tileInfo);

    if (tileState.isContent && tileState.boundAttendeeId) {
      const baseAttendeeId = this.getBaseAttendeeId(tileState.boundAttendeeId);
      const rosterMember = this.roster.get(baseAttendeeId);
      if (rosterMember) {
        rosterMember.screenSharing = tileState.active !== false;
        this.broadcastRoster();
      }
      this.callbacks.onScreenSharing?.(
        baseAttendeeId,
        tileState.active !== false
      );
    }
  }

  videoTileWasRemoved(tileId: number): void {
    const tileInfo = this.videoTiles.get(tileId);

    if (tileInfo?.isContent && tileInfo.attendeeId) {
      const baseAttendeeId = this.getBaseAttendeeId(tileInfo.attendeeId);
      const rosterMember = this.roster.get(baseAttendeeId);
      if (rosterMember) {
        rosterMember.screenSharing = false;
        this.broadcastRoster();
      }
      this.callbacks.onScreenSharing?.(baseAttendeeId, false);
    }

    if (tileInfo?.isLocal && tileInfo?.attendeeId && !tileInfo.isContent) {
      const rosterMember = this.roster.get(tileInfo.attendeeId);
      if (rosterMember) {
        console.log(
          `[VoiceVideoManager] Setting LOCAL roster member ${tileInfo.attendeeId} video state to false (tile removed)`
        );
        rosterMember.video = false;
        this.broadcastRoster();
      }
    }

    this.videoTiles.delete(tileId);

    if (tileId === this.localVideoTileId) {
      this.localVideoTileId = null;
    }
    if (tileId === this.localScreenTileId) {
      this.localScreenTileId = null;
    }

    console.log("[VoiceVideoManager] Video tile removed:", tileId);
    this.callbacks.onVideoTileRemoved?.(tileId);
  }

  connectionDidBecomePoor(): void {
    console.warn("[VoiceVideoManager] Connection became poor");
    this.networkStats.connectionType = "poor";
    this.callbacks.onNetworkQuality?.(this.networkStats);
  }

  connectionDidSuggestStopVideo(): void {
    console.warn(
      "[VoiceVideoManager] Suggestion to stop video due to poor connection"
    );
  }

  remoteVideoSourcesDidChange(videoSources: VideoSource[]): void {
    this.currentRemoteVideoSources = videoSources;
    this.applyRemoteVideoSourcesToRoster(videoSources);
  }

  private applyRemoteVideoSourcesToRoster(videoSources: VideoSource[]): void {
    const attendeesWithVideo = new Set<string>();

    for (const source of videoSources) {
      const attendeeId = source.attendee?.attendeeId;
      if (!attendeeId || attendeeId.includes("#content")) continue;
      attendeesWithVideo.add(this.getBaseAttendeeId(attendeeId));
    }

    let hasChanges = false;
    this.roster.forEach((member, attendeeId) => {
      const baseId = this.getBaseAttendeeId(attendeeId);
      const hasVideo = attendeesWithVideo.has(baseId);
      if (member.video !== hasVideo) {
        member.video = hasVideo;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.broadcastRoster();
    }

    this.videoTiles.forEach((tile) => {
      if (!tile.isContent && tile.active) {
        this.callbacks.onVideoTileUpdated?.(tile);
      }
    });
  }

  private syncExistingRemoteVideo(): void {
    if (!this.audioVideo) return;

    try {
      const sources = this.audioVideo.getRemoteVideoSources?.() ?? [];
      if (sources.length > 0) {
        this.remoteVideoSourcesDidChange(sources);
        return;
      }
    } catch (error) {
      console.warn("[VoiceVideoManager] getRemoteVideoSources failed:", error);
    }

    if (this.currentRemoteVideoSources.length > 0) {
      this.applyRemoteVideoSourcesToRoster(this.currentRemoteVideoSources);
    }
  }

  private handleAttendeePresence(
    attendeeId: string,
    present: boolean,
    externalUserId?: string
  ): void {
    if (attendeeId.includes("#content")) return;

    const userId = externalUserId || attendeeId;

    if (present) {
      const member: VoiceRosterMember = {
        name: userId,
        attendeeId,
        oduserId: userId,
        muted: false,
        speaking: false,
        video: false, // Always start false, remoteVideoSourcesDidChange handles video state
        screenSharing: false,
        signalStrength: 1,
      };

      this.roster.set(attendeeId, member);
      this.callbacks.onUserJoined?.(attendeeId, userId);

      this.syncExistingRemoteVideo();

      this.audioVideo?.realtimeSubscribeToVolumeIndicator(
        attendeeId,
        (
          aid: string,
          volume: number | null,
          muted: boolean | null,
          signalStrength: number | null
        ) => {
          const rosterMember = this.roster.get(aid);
          if (rosterMember) {
            if (muted !== null) rosterMember.muted = muted;
            if (volume !== null) rosterMember.speaking = volume > 0;
            if (signalStrength !== null)
              rosterMember.signalStrength = signalStrength;

            this.callbacks.onMediaStateChange?.(aid, {
              muted: rosterMember.muted,
              speaking: rosterMember.speaking,
              signalStrength: rosterMember.signalStrength,
            });
          }
        }
      );

      console.log("[VoiceVideoManager] Attendee joined:", {
        attendeeId,
        userId,
      });
    } else {
      this.roster.delete(attendeeId);
      this.callbacks.onUserLeft?.(attendeeId);
      console.log("[VoiceVideoManager] Attendee left:", attendeeId);
    }

    this.broadcastRoster();
  }

  private handleActiveSpeakers(attendeeIds: string[]): void {
    this.roster.forEach((member, aid) => {
      const wasSpeaking = member.speaking;
      member.speaking = attendeeIds.includes(aid);

      if (wasSpeaking !== member.speaking) {
        this.callbacks.onMediaStateChange?.(aid, { speaking: member.speaking });
      }
    });
  }

  private broadcastRoster(): void {
    const members = Array.from(this.roster.values());
    this.callbacks.onVoiceRoster?.(members);
  }

  private broadcastLocalState(): void {
    const localAttendeeId =
      this.meetingSession?.configuration?.credentials?.attendeeId;
    if (localAttendeeId) {
      const localMember = this.roster.get(localAttendeeId);
      if (localMember) {
        localMember.muted = this.mediaState.muted;
        localMember.video = this.mediaState.video;
        localMember.screenSharing = this.mediaState.screenSharing;
      }
    }
    this.broadcastRoster();
  }

  private async createOrJoinMeeting(
    channelId: string
  ): Promise<ChimeMeetingInfo> {
    try {
      console.log(
        "[VoiceVideoManager] Creating/joining meeting for channel:",
        channelId
      );

      let response: any;

      try {
        response = await chimeApiClient.post("/meetings", {
          attendeeName: this.username, // Required by backend - will be displayed
          channelId: channelId, // Required by backend
          externalUserId: this.username, // Optional - used as Chime ExternalUserId
        });
        console.log("[VoiceVideoManager] Created new meeting");
      } catch (createError: any) {
        if (createError.response?.status === 409) {
          const existingMeetingId =
            createError.response?.data?.meetingId ||
            createError.response?.data?.data?.meeting?.MeetingId ||
            channelId;
          console.log(
            "[VoiceVideoManager] Meeting exists, joining:",
            existingMeetingId
          );

          response = await chimeApiClient.post(
            `/meetings/${existingMeetingId}/attendees`,
            {
              attendeeName: this.username, // Required by backend
              externalUserId: this.username, // Optional - used as Chime ExternalUserId
            }
          );
        } else {
          throw createError;
        }
      }

      const responseData = response.data?.data || response.data;
      const { meeting, attendee } = responseData;

      if (!meeting || !attendee) {
        throw new Error("Invalid response: missing meeting or attendee data");
      }

      console.log("[VoiceVideoManager] Got meeting:", meeting.MeetingId);
      console.log("[VoiceVideoManager] Got attendee:", attendee.AttendeeId);

      return {
        meeting: {
          MeetingId: meeting.MeetingId,
          MediaPlacement: {
            AudioHostUrl: meeting.MediaPlacement?.AudioHostUrl,
            AudioFallbackUrl: meeting.MediaPlacement?.AudioFallbackUrl,
            SignalingUrl: meeting.MediaPlacement?.SignalingUrl,
            TurnControlUrl: meeting.MediaPlacement?.TurnControlUrl,
            ScreenDataUrl: meeting.MediaPlacement?.ScreenDataUrl,
            ScreenViewingUrl: meeting.MediaPlacement?.ScreenViewingUrl,
            ScreenSharingUrl: meeting.MediaPlacement?.ScreenSharingUrl,
          },
          ExternalMeetingId: meeting.ExternalMeetingId || channelId,
        },
        attendee: {
          AttendeeId: attendee.AttendeeId,
          ExternalUserId: attendee.ExternalUserId || this.userId,
          JoinToken: attendee.JoinToken,
        },
      };
    } catch (error: any) {
      console.error("[VoiceVideoManager] API call failed:", error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to join meeting";
      throw new Error(message);
    }
  }

  bindVideoElement(tileId: number, element: HTMLVideoElement): void {
    if (this.audioVideo) {
      this.audioVideo.bindVideoElement(tileId, element);
    }
  }

  unbindVideoElement(tileId: number): void {
    if (this.audioVideo) {
      this.audioVideo.unbindVideoElement(tileId);
    }
  }

  onVideoTileUpdated(callback: (tile: VideoTileInfo) => void): void {
    this.callbacks.onVideoTileUpdated = callback;
  }

  onVideoTileRemoved(callback: (tileId: number) => void): void {
    this.callbacks.onVideoTileRemoved = callback;
  }

  onVoiceRoster(callback: (members: VoiceRosterMember[]) => void): void {
    this.callbacks.onVoiceRoster = callback;
  }

  onUserJoined(
    callback: (attendeeId: string, externalUserId: string) => void
  ): void {
    this.callbacks.onUserJoined = callback;
  }

  onUserLeft(callback: (attendeeId: string) => void): void {
    this.callbacks.onUserLeft = callback;
  }

  onMediaState(
    callback: (attendeeId: string, state: Partial<VoiceRosterMember>) => void
  ): void {
    this.callbacks.onMediaStateChange = callback;
  }

  onScreenSharing(
    callback: (attendeeId: string, isSharing: boolean) => void
  ): void {
    this.callbacks.onScreenSharing = callback;
  }

  onError(callback: (error: { code: string; message: string }) => void): void {
    this.callbacks.onError = callback;
  }

  onConnectionStateChange(callback: (connected: boolean) => void): void {
    this.callbacks.onConnectionStateChange = callback;
  }

  onNetworkQuality(callback: (stats: NetworkStats) => void): void {
    this.callbacks.onNetworkQuality = callback;
  }

  onStream(
    callback: (
      stream: MediaStream,
      peerId: string,
      type: "video" | "screen"
    ) => void
  ): void {
    void callback;
    console.warn(
      "[VoiceVideoManager] onStream is deprecated, use onVideoTileUpdated instead"
    );
  }

  onRecording(callback: (event: string, data: any) => void): void {
    void callback;
    console.warn(
      "[VoiceVideoManager] Recording is managed server-side via Chime Media Capture Pipeline"
    );
  }

  getMediaState(): MediaState {
    return { ...this.mediaState };
  }

  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  getNetworkStats(): NetworkStats | null {
    return this.networkStats;
  }

  getAvailablePermissions(): { audio: boolean; video: boolean } {
    return { ...this.mediaState.availablePermissions };
  }

  hasAnyPermissions(): boolean {
    return (
      this.mediaState.availablePermissions.audio ||
      this.mediaState.availablePermissions.video
    );
  }

  isConnected(): boolean {
    return this.audioVideo !== null;
  }

  getCurrentChannelId(): string | null {
    return this.currentChannelId;
  }

  getLocalVideoTileId(): number | null {
    return this.localVideoTileId;
  }

  getLocalScreenTileId(): number | null {
    return this.localScreenTileId;
  }

  getVideoTiles(): Map<number, VideoTileInfo> {
    return new Map(this.videoTiles);
  }

  getRoster(): VoiceRosterMember[] {
    return Array.from(this.roster.values());
  }

  getAudioVideo(): AudioVideoFacade | null {
    return this.audioVideo;
  }

  getLocalAttendeeId(): string | null {
    return this.meetingSession?.configuration?.credentials?.attendeeId || null;
  }

  getLocalExternalUserId(): string | null {
    return (
      this.meetingSession?.configuration?.credentials?.externalUserId || null
    );
  }

  adjustQuality(quality: "low" | "medium" | "high" | "auto"): void {
    this.mediaState.mediaQuality = quality;
    console.log("[VoiceVideoManager] Quality preference set to:", quality);
  }

  startRecording(config?: any): void {
    void config;
    console.log(
      "[VoiceVideoManager] Recording is managed via Chime Media Capture Pipeline on the server"
    );
  }

  stopRecording(): void {
    console.log("[VoiceVideoManager] Stop recording via server");
  }

  disconnect(): void {
    this.leaveVoiceChannel();
    this.deviceController = null;
    console.log("[VoiceVideoManager] Fully disconnected");
  }

  getLocalStream(): MediaStream | null {
    return null;
  }

  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  async ensureConnection(): Promise<void> {
  }
}
