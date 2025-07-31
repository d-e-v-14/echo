import { io, Socket } from 'socket.io-client';

// This class encapsulates all the logic for the voice chat.
export class VoiceService {
    private socket: Socket | null = null;
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private onRemoteStreamCallback: ((stream: MediaStream, socketId: string) => void) | null = null;
    private onUserDisconnectedCallback: ((socketId: string) => void) | null = null;

    // Use a public STUN server from Google for NAT traversal
    private peerConnectionConfig: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ],
    };

    constructor(private serverUrl: "http://localhost:5000") {}

    /**
     * Connects to the Socket.IO server and initializes the local microphone stream.
     */
    public async connect(): Promise<void> {
        if (this.socket) return;

        try {
            // Get microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            // Connect to the socket server
            this.socket = io(this.serverUrl);
            this.setupSocketListeners();
            console.log('Successfully connected to voice server and got local stream.');

        } catch (error) {
            console.error('Error connecting or getting media stream:', error);
            throw error;
        }
    }

    /**
     * Joins a specific voice channel.
     * @param channelId The ID of the channel to join.
     */
    public joinChannel(channelId: string): void {
        if (!this.socket) {
            console.error('Socket not connected. Call connect() first.');
            return;
        }
        this.socket.emit('join_voice_channel', channelId);
    }

    /**
     * Sets up all the listeners for incoming socket events from the server.
     */
    private setupSocketListeners(): void {
        if (!this.socket) return;

        this.socket.on('user-joined', (socketId: string) => {
            console.log('New user joined:', socketId);
            // A new user joined, create an offer to start a connection with them.
            this.createPeerConnection(socketId, true);
        });

        this.socket.on('webrtc-offer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
            console.log('Received WebRTC offer from:', from);
            const peerConnection = this.createPeerConnection(from, false);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            this.socket?.emit('webrtc-answer', { to: from, sdp: answer });
        });

        this.socket.on('webrtc-answer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
            console.log('Received WebRTC answer from:', from);
            const peerConnection = this.peerConnections.get(from);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        });

        this.socket.on('webrtc-ice-candidate', ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
            console.log('Received ICE candidate from:', from);
            const peerConnection = this.peerConnections.get(from);
            if (peerConnection) {
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });
        
        this.socket.on('user-disconnected', (socketId: string) => {
            console.log('User disconnected:', socketId);
            const peerConnection = this.peerConnections.get(socketId);
            if (peerConnection) {
                peerConnection.close();
                this.peerConnections.delete(socketId);
            }
            if (this.onUserDisconnectedCallback) {
                this.onUserDisconnectedCallback(socketId);
            }
        });
    }

    /**
     * Creates a new RTCPeerConnection for a given user.
     * @param targetSocketId The socket ID of the other user.
     * @param isInitiator Whether this client is initiating the connection.
     */
    private createPeerConnection(targetSocketId: string, isInitiator: boolean): RTCPeerConnection {
        const peerConnection = new RTCPeerConnection(this.peerConnectionConfig);
        this.peerConnections.set(targetSocketId, peerConnection);

        // Add local stream tracks to the connection to be sent to the other peer
        this.localStream?.getTracks().forEach(track => {
            peerConnection.addTrack(track, this.localStream!);
        });

        // When the other user's stream is received
        peerConnection.ontrack = (event) => {
            console.log('Received remote stream from:', targetSocketId);
            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(event.streams[0], targetSocketId);
            }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket?.emit('webrtc-ice-candidate', {
                    to: targetSocketId,
                    candidate: event.candidate,
                });
            }
        };

        // If this client is the one starting the connection, create and send an offer
        if (isInitiator) {
            peerConnection.onnegotiationneeded = async () => {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                this.socket?.emit('webrtc-offer', { to: targetSocketId, sdp: offer });
            };
        }

        return peerConnection;
    }

    /**
     * Register a callback function to be called when a remote stream is received.
     */
    public onRemoteStream(callback: (stream: MediaStream, socketId: string) => void): void {
        this.onRemoteStreamCallback = callback;
    }
    
    /**
     * Register a callback function to be called when a user disconnects.
     */
    public onUserDisconnected(callback: (socketId: string) => void): void {
        this.onUserDisconnectedCallback = callback;
    }

    /**
     * Disconnects from the server and cleans up resources.
     */
    public disconnect(): void {
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.localStream?.getTracks().forEach(track => track.stop());
        this.socket?.disconnect();
        this.socket = null;
    }
}