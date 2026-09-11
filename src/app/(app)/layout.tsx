"use client";

import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";
// Voice and video disabled: the global voice call context is not mounted, so
// no voice/video sockets are ever connected or triggered.
// import { VoiceCallProvider } from "@/contexts/VoiceCallContext";
import { FriendNotificationProvider } from "@/contexts/FriendNotificationContext";
import { MessageNotificationProvider } from "@/contexts/MessageNotificationContext";
import { ImageModalProvider } from "@/contexts/ImageModalContext";
import { JoinServerModalProvider } from "@/contexts/JoinServerModalContext";
import RouteChangeLoader from "@/components/RouteChangeLoader";
import ReconnectBanner from "@/components/loading/ReconnectBanner";
import { RouteGuard } from "@/components/RouteGuard";
import "../globals.css";
import { UserProvider } from "@/components/UserContext";
import { SocketProvider } from "@/lib/socket/SocketProvider";
import { RealtimeCacheSync } from "@/lib/query/RealtimeCacheSync";
import { MentionUnreadProvider } from "@/contexts/MentionUnreadProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { tokenStore } from "@/lib/auth/tokenStore";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useInactivityLogout(
    typeof window !== "undefined" && tokenStore.hasRefreshToken()
  );
  return (
    <RouteGuard>
      <UserProvider>
      <SocketProvider>
        <RealtimeCacheSync />
        <MentionUnreadProvider />
        <FriendNotificationProvider>
          <MessageNotificationProvider>
            {/* Voice and video disabled: VoiceCallProvider is not mounted. */}
            {/* <VoiceCallProvider> */}
            <ImageModalProvider>
              <JoinServerModalProvider>
                <RouteChangeLoader>
                  <ReconnectBanner />
                  <div className="flex h-screen bg-black overflow-hidden relative">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto">
                      <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
                    </main>
                  </div>
                </RouteChangeLoader>
              </JoinServerModalProvider>
            </ImageModalProvider>
            {/* </VoiceCallProvider> */}
          </MessageNotificationProvider>
        </FriendNotificationProvider>
      </SocketProvider>
    </UserProvider>
    </RouteGuard>
  );
}
