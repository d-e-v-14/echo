
import { VoiceVideoManager } from "./VoiceVideoManager";

export interface ActiveCallState {
  isMinimized: boolean;
  channelId: string;
  serverId: string;
  channelName: string;
  startTime: Date;
  callType: "voice" | "video";
}

class CallStateManager {
  private static instance: CallStateManager;

  private voiceManager: VoiceVideoManager | null = null;
  private callState: ActiveCallState | null = null;
  private listeners: Set<(state: ActiveCallState | null) => void> = new Set();

  private constructor() {
  }

  static getInstance(): CallStateManager {
    if (!CallStateManager.instance) {
      CallStateManager.instance = new CallStateManager();
    }
    return CallStateManager.instance;
  }

  getOrCreateManager(userId: string, username: string): VoiceVideoManager {
    if (!this.voiceManager) {
      this.voiceManager = new VoiceVideoManager(userId, username);
    }
    return this.voiceManager;
  }

  getManager(): VoiceVideoManager | null {
    return this.voiceManager;
  }

  setManager(manager: VoiceVideoManager): void {
    this.voiceManager = manager;
  }

  startCall(
    channelId: string,
    serverId: string,
    channelName: string,
    callType: "voice" | "video" = "voice"
  ): void {
    this.callState = {
      isMinimized: false,
      channelId,
      serverId,
      channelName,
      startTime: new Date(),
      callType,
    };
    this.notifyListeners();
    console.log("[CallStateManager] Call started:", this.callState);
  }

  minimizeCall(): void {
    if (this.callState) {
      this.callState = { ...this.callState, isMinimized: true };
      this.notifyListeners();
      console.log("[CallStateManager] Call minimized");
    }
  }

  maximizeCall(): void {
    if (this.callState) {
      this.callState = { ...this.callState, isMinimized: false };
      this.notifyListeners();
      console.log("[CallStateManager] Call maximized");
    }
  }

  endCall(): void {
    if (this.voiceManager) {
      try {
        this.voiceManager.leaveVoiceChannel();
        this.voiceManager.disconnect();
      } catch (error) {
        console.error("[CallStateManager] Error ending call:", error);
      }
      this.voiceManager = null;
    }
    this.callState = null;
    this.notifyListeners();
    console.log("[CallStateManager] Call ended");
  }

  hasActiveCall(): boolean {
    return this.callState !== null && this.voiceManager?.isConnected() === true;
  }

  isInChannel(channelId: string): boolean {
    return this.callState?.channelId === channelId && this.hasActiveCall();
  }

  getCallState(): ActiveCallState | null {
    return this.callState ? { ...this.callState } : null;
  }

  subscribe(listener: (state: ActiveCallState | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.callState ? { ...this.callState } : null);
    return () => this.listeners.delete(listener);
  }

  getCallDuration(): number {
    if (!this.callState) return 0;
    return Math.floor((Date.now() - this.callState.startTime.getTime()) / 1000);
  }

  updateCallType(callType: "voice" | "video"): void {
    if (this.callState) {
      this.callState = { ...this.callState, callType };
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    const state = this.callState ? { ...this.callState } : null;
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error("[CallStateManager] Error in listener:", error);
      }
    });
  }
}

export const callStateManager = CallStateManager.getInstance();
