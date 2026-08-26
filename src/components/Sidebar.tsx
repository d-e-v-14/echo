"use client";

import { useUser } from "@/components/UserContext";

import {
  Users,
  MessageSquareText,
  User as UserIcon,
  Cross,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect } from "react";
import Skeleton from "@/components/loading/Skeleton";
import { useFriendNotifications } from "../contexts/FriendNotificationContext";
import { useMessageNotifications } from "../contexts/MessageNotificationContext";
import { useJoinServerModal } from "@/contexts/JoinServerModalContext";

const navItems = [
  { label: "Servers", icon: Users, path: "/servers" },
  { label: "Messages", icon: MessageSquareText, path: "/messages" },
  { label: "Friends", icon: UserIcon, path: "/friends" },
  { label: "Join Server", icon: Cross, path: "" },
];

export default function Sidebar() {
  const { user } = useUser();
  const { openJoinServerModal } = useJoinServerModal();

  const pathname = usePathname();

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
      <aside className="relative flex h-screen w-52 shrink-0 flex-col overflow-hidden select-none">
        <div className="absolute inset-0 z-0 border-r border-gray-800 bg-black" />
        <div className="relative z-10 flex h-full flex-col px-3 pb-3 pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-14 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
          </div>

          <div className="mx-1 mt-3 border-t border-white/[0.06]" />

          <nav className="flex-1 space-y-1 px-1 pt-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-4 py-3"
              >
                <Skeleton className="h-5 w-5 shrink-0 rounded-md" />
                <Skeleton className="h-3.5 w-24 rounded-full" />
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-20 rounded-full" />
              <Skeleton className="h-3 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative flex h-screen w-52 shrink-0 flex-col overflow-hidden select-none">
      {/* Background */}
      <div className="absolute inset-0 z-0 border-r border-gray-800 bg-black" />

      <div className="relative z-10 flex h-full flex-col">
        {/* Brand */}
        <div className="px-3 pb-2 pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/ieeecs.png"
                alt="IEEE CS logo"
                fill
                sizes="36px"
                className="object-contain"
              />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-base font-bold tracking-wide text-white">
                IEEE
              </span>
              <span className="block text-sm font-semibold tracking-wide text-[#b5bac1]">
                Computer Society
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 px-1 pt-3">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              let notificationCount = 0;

              if (item.label === "Messages") {
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

        {/* Profile */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-2">
            <Link
              href="/profile-settings"
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.06]"
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
        </div>
      </div>
    </aside>
  );
}