"use client";

import { Suspense, useEffect, useState } from "react";
import MessagesPageContent from "@/components/ChatPage";

export default function MessagesClientWrapper() {
  const [, setShowToast] = useState(true);

  useEffect(() => {
    return () => setShowToast(false);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <MessagesPageContent />
      </Suspense>
    </>
  );
}
