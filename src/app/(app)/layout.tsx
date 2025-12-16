// src/app/(app)/layout.tsx
"use client";

import Sidebar from "@/components/Sidebar";
import { VoiceCallProvider } from "@/contexts/VoiceCallContext";
import { FriendNotificationProvider } from "@/contexts/FriendNotificationContext";
import { MessageNotificationProvider } from "@/contexts/MessageNotificationContext";
import FloatingVoiceWindow from "@/components/FloatingVoiceWindow";
import "../globals.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FriendNotificationProvider>
      <MessageNotificationProvider>
        <VoiceCallProvider>
          <div className="flex h-screen bg-black overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
            <FloatingVoiceWindow />
          </div>
        </VoiceCallProvider>
      </MessageNotificationProvider>
    </FriendNotificationProvider>
  );
}
