export default function Loading() {
  return (
    <div className="min-h-screen bg-black p-6 animate-in fade-in duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-full bg-slate-800/60 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-slate-800/70 animate-pulse" />
            <div className="h-3 w-28 rounded bg-slate-800/40 animate-pulse" />
          </div>
        </div>

        {/* Avatar section */}
        <div className="flex items-center gap-6 mb-8 p-4 rounded-xl bg-slate-900/30 border border-slate-800/40">
          <div className="h-20 w-20 rounded-full bg-slate-800/60 animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 rounded bg-slate-800/60 animate-pulse" />
            <div className="h-3 w-48 rounded bg-slate-800/40 animate-pulse" />
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-slate-800/50 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-slate-800/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
