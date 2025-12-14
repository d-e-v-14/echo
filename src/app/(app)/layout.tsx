// src/app/(app)/layout.tsx
"use client";

import Sidebar from "@/components/Sidebar";
import { VoiceCallProvider } from "@/contexts/VoiceCallContext";
import FloatingVoiceWindow from "@/components/FloatingVoiceWindow";
import "../globals.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <VoiceCallProvider>
      <div className="flex h-screen bg-black overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <FloatingVoiceWindow />
      </div>
    </VoiceCallProvider>
  );
}
