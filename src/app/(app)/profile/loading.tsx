export default function Loading() {
  return (
    <div className="min-h-screen bg-black p-6 animate-in fade-in duration-200">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-full bg-slate-800/60 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-slate-800/70 animate-pulse" />
            <div className="h-3 w-24 rounded bg-slate-800/40 animate-pulse" />
          </div>
        </div>

       
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-slate-900/30 border border-slate-800/40">
          <div className="h-24 w-24 rounded-full bg-slate-800/60 animate-pulse" />
          <div className="h-5 w-36 rounded bg-slate-800/60 animate-pulse" />
          <div className="h-3 w-28 rounded bg-slate-800/40 animate-pulse" />
          <div className="h-3 w-48 rounded bg-slate-800/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
