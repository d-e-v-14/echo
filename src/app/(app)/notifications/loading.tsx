export default function Loading() {
  return (
    <div className="min-h-screen bg-black p-6 animate-in fade-in duration-200">
      <div className="max-w-3xl mx-auto">
       
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-slate-800/60 animate-pulse" />
            <div className="h-6 w-36 rounded bg-slate-800/70 animate-pulse" />
          </div>
          <div className="h-8 w-28 rounded-lg bg-slate-800/50 animate-pulse" />
        </div>

       
        <div className="flex gap-2 mb-6">
          <div className="h-8 w-16 rounded-full bg-slate-800/50 animate-pulse" />
          <div className="h-8 w-20 rounded-full bg-slate-800/40 animate-pulse" />
        </div>

        
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/30 border border-slate-800/40">
              <div className="h-10 w-10 rounded-full bg-slate-800/60 animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded bg-slate-800/60 animate-pulse" style={{ width: `${50 + i * 8}%` }} />
                <div className="h-3 w-2/5 rounded bg-slate-800/40 animate-pulse" />
                <div className="h-3 w-24 rounded bg-slate-800/30 animate-pulse" />
              </div>
              <div className="h-2 w-2 rounded-full bg-indigo-500/60 animate-pulse shrink-0 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
