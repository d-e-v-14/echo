import { useEffect, useRef } from "react";

type Remote = { id: string; stream: MediaStream };

interface Props {
  localStream?: MediaStream | null;
  remotes?: Remote[];
  collapsed?: boolean;
}

export default function VideoPanel({ localStream, remotes = [], collapsed }: Props) {
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localStream) {
      if (localRef.current.srcObject !== localStream) {
        localRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  return (
    <div className={`w-full ${collapsed ? "h-0 overflow-hidden" : "h-auto"} rounded-lg`}>
      <div className="aspect-video w-full bg-black/70 rounded-lg overflow-hidden">
        {/* Local video large */}
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {remotes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {remotes.map(r => (
            <RemoteVideo key={r.id} stream={r.stream} />
          ))}
        </div>
      )}
    </div>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <div className="aspect-video bg-black/60 rounded-md overflow-hidden">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
    </div>
  );
}
