import { io, Socket } from 'socket.io-client';

export class VideoVoiceService {
    private socket: Socket | null = null;
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private onRemoteStreamCallback: ((stream: MediaStream, socketId: string) => void) | null = null;
    private onUserDisconnectedCallback: ((socketId: string) => void) | null = null;

    private peerConnectionConfig: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    constructor(private serverUrl: string) {}

    public async connect(): Promise<void> {
        if (this.socket) return;
        try {
            // UPDATED: Request video along with audio
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            this.socket = io(this.serverUrl);
            this.setupSocketListeners();
        } catch (error) {
            console.error('Error connecting or getting media stream:', error);
            throw error;
        }
    }

    public joinChannel(channelId: string): void {
        this.socket?.emit('join_voice_channel', channelId);
    }

    private setupSocketListeners(): void {
        if (!this.socket) return;
        this.socket.on('webrtc-offer', async ({ from, sdp }) => {
            const pc = this.createPeerConnection(from, false);
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.socket?.emit('webrtc-answer', { to: from, sdp: answer });
        });
        this.socket.on('webrtc-answer', async ({ from, sdp }) => {
            this.peerConnections.get(from)?.setRemoteDescription(new RTCSessionDescription(sdp));
        });
        this.socket.on('webrtc-ice-candidate', ({ from, candidate }) => {
            this.peerConnections.get(from)?.addIceCandidate(new RTCIceCandidate(candidate));
        });
        this.socket.on('user-disconnected', (socketId: string) => {
            this.peerConnections.get(socketId)?.close();
            this.peerConnections.delete(socketId);
            this.onUserDisconnectedCallback?.(socketId);
        });
    }

    private createPeerConnection(targetSocketId: string, isInitiator: boolean): RTCPeerConnection {
        const pc = new RTCPeerConnection(this.peerConnectionConfig);
        this.peerConnections.set(targetSocketId, pc);

        this.localStream?.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
        pc.ontrack = (event) => this.onRemoteStreamCallback?.(event.streams[0], targetSocketId);
        pc.onicecandidate = (event) => {
            if (event.candidate) this.socket?.emit('webrtc-ice-candidate', { to: targetSocketId, candidate: event.candidate });
        };
        if (isInitiator) {
            pc.onnegotiationneeded = async () => {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                this.socket?.emit('webrtc-offer', { to: targetSocketId, sdp: offer });
            };
        }
        return pc;
    }

    // NEW: Method to get the local stream for UI display
    public getLocalStream = (): MediaStream | null => this.localStream;

    // NEW: Method to toggle microphone
    public toggleAudio = (enabled: boolean): void => {
        this.localStream?.getAudioTracks().forEach(track => track.enabled = enabled);
    }

    // NEW: Method to toggle camera
    public toggleVideo = (enabled: boolean): void => {
        this.localStream?.getVideoTracks().forEach(track => track.enabled = enabled);
    }

    public onRemoteStream = (cb: (stream: MediaStream, socketId: string) => void): void => { this.onRemoteStreamCallback = cb; }
    public onUserDisconnected = (cb: (socketId: string) => void): void => { this.onUserDisconnectedCallback = cb; }

    public disconnect(): void {
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.localStream?.getTracks().forEach(track => track.stop());
        this.socket?.disconnect();
        this.socket = null;
    }
}