export default function Loading() {
  return (
    <div className="flex h-screen w-full bg-black animate-in fade-in duration-200">
   
      <div className="w-[72px] shrink-0 flex flex-col items-center gap-2 py-3 border-r border-slate-800/50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 w-12 rounded-2xl bg-slate-800/60 animate-pulse" />
        ))}
      </div>

     
      <div className="w-60 shrink-0 flex flex-col border-r border-slate-800/50 p-3">
        <div className="h-5 w-32 rounded bg-slate-800/70 animate-pulse mb-4" />
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-slate-800/50 animate-pulse mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 rounded-md bg-slate-800/40 animate-pulse" />
          ))}
          <div className="h-3 w-24 rounded bg-slate-800/50 animate-pulse mt-4 mb-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 rounded-md bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      </div>

      
      <div className="flex-1 flex flex-col">
      
        <div className="h-14 border-b border-slate-800/50 flex items-center px-4 gap-3">
          <div className="h-4 w-4 rounded bg-slate-800/50 animate-pulse" />
          <div className="h-4 w-28 rounded bg-slate-800/60 animate-pulse" />
        </div>
      
        <div className="flex-1 p-4 space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-800/50 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-24 rounded bg-slate-800/60 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-slate-800/30 animate-pulse" />
                </div>
                <div className="h-3.5 rounded bg-slate-800/40 animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                {i % 2 === 0 && <div className="h-3.5 w-2/5 rounded bg-slate-800/30 animate-pulse" />}
              </div>
            </div>
          ))}
        </div>
       
        <div className="h-16 border-t border-slate-800/50 px-4 flex items-center">
          <div className="flex-1 h-10 rounded-lg bg-slate-800/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
