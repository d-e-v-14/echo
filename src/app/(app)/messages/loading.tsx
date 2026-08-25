import Skeleton from "@/components/loading/Skeleton";
import { ConversationListSkeleton } from "@/components/loading/skeletons";

export default function Loading() {
  return (
    <div className="flex h-screen w-full bg-slate-950 animate-in fade-in duration-200">
      <aside className="hidden lg:flex w-80 flex-col border-r border-slate-800 bg-black p-4">
        <div className="mb-5">
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="mt-2 h-3 w-52 rounded" />
        </div>
        <div className="skeleton mb-4 h-9 rounded-full" />
        <ConversationListSkeleton rows={7} />
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center bg-black opacity-70">
        <div aria-hidden className="flex flex-col items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="mt-4 h-4 w-40 rounded" />
          <Skeleton className="mt-2 h-3 w-56 rounded" />
        </div>
      </div>
    </div>
  );
}
