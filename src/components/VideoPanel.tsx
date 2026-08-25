import { useEffect, useRef } from "react";

type Remote = { id: string; stream: MediaStream };

interface Props {
  localStream?: MediaStream | null;
  remotes?: Remote[];
  collapsed?: boolean;
}

function VideoTile({
  stream,
  name,
  isLocal = false,
}: {
  stream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  return (
    <div
      ref={containerRef}
      className="group relative w-full h-full min-h-0 rounded-lg overflow-hidden border border-slate-700 bg-[#1E2124] transition-all"
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#1E2124]">
          <div className="text-center text-slate-300">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-600 text-2xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm">Camera off</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 rounded bg-slate-900/80 px-3 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
        {name} {isLocal && "(You)"}
      </div>

    </div>
  );
}

export default function VideoPanel({
  localStream,
  remotes = [],
  collapsed,
}: Props) {
  const total = 1 + remotes.length;

  const getLayout = (count: number) => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count === 3) return { cols: 3, rows: 1 };
    if (count === 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  };

  const { cols, rows } = getLayout(total);

  if (collapsed) {
    return <div className="h-0 w-full overflow-hidden" />;
  }

  return (
    <div className="h-full w-full bg-[#111315] p-4">
      <div
        className="h-full w-full gap-4"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        <VideoTile stream={localStream} name="Me" isLocal={true} />

        {remotes.map((r) => (
          <VideoTile key={r.id} stream={r.stream} name={r.id} />
        ))}
      </div>
    </div>
  );
}
