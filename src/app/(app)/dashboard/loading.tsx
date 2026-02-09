export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center animate-in fade-in duration-200">
      <div className="w-full max-w-lg p-6 space-y-6">
        <div className="h-6 w-48 rounded bg-slate-800/70 animate-pulse mx-auto" />
        <div className="h-4 w-64 rounded bg-slate-800/40 animate-pulse mx-auto" />
        <div className="h-10 w-full rounded-lg bg-slate-800/40 animate-pulse" />
        <div className="h-10 w-40 rounded-lg bg-indigo-800/30 animate-pulse mx-auto" />
      </div>
    </div>
  );
}
