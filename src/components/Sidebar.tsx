"use client";

import { logout } from "@/api/auth.api";
import { useUser } from "@/components/UserContext";

import {
  Users,
  MessageSquareText,
  User as UserIcon,
  Bell,
  LogOut,
  Cross,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { useFriendNotifications } from "../contexts/FriendNotificationContext";
import { useMessageNotifications } from "../contexts/MessageNotificationContext";
import { useJoinServerModal } from "@/contexts/JoinServerModalContext";

const navItems = [
  { label: "Servers", icon: Users, path: "/servers" },
  { label: "Messages", icon: MessageSquareText, path: "/messages" },
  { label: "Friends", icon: UserIcon, path: "/friends" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Join Server", icon: Cross, path: "" },
];

export default function Sidebar() {
  const { user } = useUser();
  const { openJoinServerModal } = useJoinServerModal();

  const pathname = usePathname();

  const { unreadCount } = useNotifications();

  const {
    friendRequestCount,
    refreshCount: refreshFriendCount,
  } = useFriendNotifications();

  const {
    unreadMessageCount,
    refreshCount: refreshMessageCount,
  } = useMessageNotifications();

  const handleNavClick = async (path: string) => {
    if (path === "/friends") {
      await refreshFriendCount();
    } else if (path === "/messages") {
      await refreshMessageCount();
    }
  };

  useEffect(() => {
    const handleFocus = async () => {
      try {
        await Promise.all(
          [refreshFriendCount?.(), refreshMessageCount?.()].filter(Boolean)
        );
      } catch (error) {
        console.error("Failed to refresh counts on focus:", error);
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshFriendCount, refreshMessageCount]);

  if (!user) {
    return (
      <aside className="flex h-screen w-64 items-center justify-center bg-black text-white" />
    );
  }

  const handleLogout = async () => {
    try {
      await logout();

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "/";
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <aside className="relative flex h-screen w-52 shrink-0 flex-col overflow-hidden select-none">
      {/* Background */}
      <div className="absolute inset-0 z-0 border-r border-gray-800 bg-black" />

      <div className="relative z-10 flex h-full flex-col">
        {/* Profile */}
        <div className="px-1 pb-2 pt-2">
          <Link
            href="/profile-settings"
            className="
              group
              flex items-center gap-3
              rounded-lg
              px-2.5 py-2.5
              transition-colors
              hover:bg-white/[0.06]
            "
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="rounded-full bg-[#FFC341] p-[2px]">
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white">
                  <Image
                    src={user.avatar_url || "/avatar.png"}
                    alt="User"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-green-500" />
            </div>

            {/* User information */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user.fullname}
              </p>

              <p
                className="max-w-[150px] truncate text-xs text-gray-400"
                title={user.username}
              >
                @{user.username}
              </p>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 px-1 pt-3">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              let notificationCount = 0;

              if (item.label === "Notifications") {
                notificationCount = unreadCount;
              } else if (item.label === "Messages") {
                notificationCount = unreadMessageCount;
              } else if (item.label === "Friends") {
                notificationCount = friendRequestCount;
              }

              const isJoinServer = item.label === "Join Server";

              const itemClassName = clsx(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3",
                "font-medium transition-all duration-150",
                isActive
  ? "bg-white/[0.08] text-white"
  : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
              );

              const itemContent = (
                <>
                  <div className="relative shrink-0">
                    <item.icon className="h-5 w-5" />

                    {notificationCount > 0 && (
                      <span
                        className="
                          absolute -right-1 -top-1
                          flex h-4 min-w-4
                          items-center justify-center
                          rounded-full
                          bg-red-500
                          px-1
                          text-[10px]
                          font-bold
                          leading-none
                          text-white
                        "
                      >
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </div>

                  <span className="truncate">{item.label}</span>
                </>
              );

              return isJoinServer ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={openJoinServerModal}
                  className={clsx(itemClassName, "text-left")}
                >
                  {itemContent}
                </button>
              ) : (
                <Link
                  key={item.label}
                  href={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={itemClassName}
                >
                  {itemContent}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className=" p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="
              flex h-9 w-full
              items-center justify-center gap-2
              rounded-md
              px-3
              text-lg
              font-medium
              text-gray-400
              transition-colors
              hover:bg-red-500/10
              hover:text-red-400
            "
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}