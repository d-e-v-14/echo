"use client";

import { Suspense, useEffect, useState } from "react";
import Toast from "@/components/Toast";
import MessagesPageContent from "@/components/ChatPage";

export default function MessagesClientWrapper() {
  const [showToast, setShowToast] = useState(true);

  
  useEffect(() => {
    return () => setShowToast(false);
  }, []);

  return (
    <>
     
      {showToast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <Toast
            message="Loading messages…"
            type="info"
            duration={3000}
            onClose={() => setShowToast(false)}
          />
        </div>
      )}

      <Suspense fallback={null}>
        <MessagesPageContent />
      </Suspense>
    </>
  );
}
