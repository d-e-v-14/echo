"use client";

import Sidebar from "@/components/Sidebar";
import { VoiceCallProvider } from "@/contexts/VoiceCallContext";
import { FriendNotificationProvider } from "@/contexts/FriendNotificationContext";
import { MessageNotificationProvider } from "@/contexts/MessageNotificationContext";
import { ImageModalProvider } from "@/contexts/ImageModalContext";
import RouteChangeLoader from "@/components/RouteChangeLoader";
import ReconnectBanner from "@/components/loading/ReconnectBanner";
import "../globals.css";
import { UserProvider } from "@/components/UserContext";
import { SocketProvider } from "@/lib/socket/SocketProvider";
import { RealtimeCacheSync } from "@/lib/query/RealtimeCacheSync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <SocketProvider>
        <RealtimeCacheSync />
        <FriendNotificationProvider>
          <MessageNotificationProvider>
            <VoiceCallProvider>
              <ImageModalProvider>
                <RouteChangeLoader>
                  <ReconnectBanner />
                  <div className="flex h-screen bg-black overflow-hidden relative">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto">{children}</main>
                  </div>
                </RouteChangeLoader>
              </ImageModalProvider>
            </VoiceCallProvider>
          </MessageNotificationProvider>
        </FriendNotificationProvider>
      </SocketProvider>
    </UserProvider>
  );
}
