export default function Loading() {
  return (
    <div className="min-h-screen bg-black p-6 animate-in fade-in duration-200">
      
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-slate-800/60 animate-pulse" />
          <div className="h-6 w-32 rounded bg-slate-800/70 animate-pulse" />
        </div>

        
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-lg bg-slate-800/50 animate-pulse" />
          ))}
        </div>

        
        <div className="h-10 w-full max-w-md rounded-lg bg-slate-900/70 border border-slate-800/70 animate-pulse mb-6" />

      
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-800/40">
              <div className="h-11 w-11 rounded-full bg-slate-800/60 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-800/60 animate-pulse" />
                <div className="h-3 w-20 rounded bg-slate-800/40 animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-9 rounded-lg bg-slate-800/50 animate-pulse" />
                <div className="h-9 w-9 rounded-lg bg-slate-800/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
