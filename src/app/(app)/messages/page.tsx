import { Suspense } from "react";
import MessagesPageContent from "@/components/ChatPage";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading messages…</p>
          </div>
        </div>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
