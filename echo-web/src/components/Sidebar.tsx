"use client";

import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  User,
  Phone,
  Bell,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Servers", icon: Users, path: "/servers" },
  { label: "Messages", icon: MessageSquareText, path: "/messages" },
  { label: "Friends", icon: User, path: "/friends" },
  { label: "Channels", icon: Phone, path: "/channels" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored !== null) {
      setCollapsed(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  return (
    <div
      className={clsx(
        "relative h-screen text-white flex flex-col justify-between overflow-hidden transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Background Image - Always Visible */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat z-0 transition-all duration-300"
        style={{
          backgroundImage: "url('/sidebar-bg.png')",
          backgroundSize: "auto 120%",
          backgroundPosition: "center",
        }}
      />

      {/* Sidebar Content */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Header & Toggle */}
        <div>
          <div className="flex items-center justify-between p-3">
            <Image
              src="/echo-logo.png"
              alt="Echo Logo"
              width={64}
              height={24}
              className={clsx(
                "object-contain transition-opacity duration-300",
                collapsed && "opacity-0"
              )}
            />
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="text-white hover:text-gray-400 transition"
            >
              {collapsed ? (
                <ChevronsRight size={20} />
              ) : (
                <ChevronsLeft size={20} />
              )}
            </button>
          </div>

          {/* Nav Items */}
          <div className="flex flex-col space-y-2 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <div className="relative group" key={item.label}>
                  <Link
                    href={item.path}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
                      isActive
                        ? "bg-white/20 text-white font-semibold shadow-md"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {!collapsed && (
                      <span className="transition-all duration-200">
                        {item.label}
                      </span>
                    )}
                  </Link>

                  {/* Tooltip */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-gray-900 text-white text-xs px-2 py-1 rounded shadow z-20 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile Section */}
        <div className="mb-6 px-2 flex items-center gap-3">
          <div className="relative group cursor-pointer shrink-0">
            <div className="rounded-full p-1 bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 animate-pulse">
              <Image
                src="/User_profil.png"
                alt="Avatar"
                width={40}
                height={40}
                className="rounded-full bg-white"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#1e1e2f]" />

            {/* Profile Tooltip */}
            {!collapsed && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center space-y-1 p-2 bg-[#1e1e2f] border border-gray-700 rounded-md text-sm text-white z-10">
                <span className="opacity-70 cursor-pointer">View Profile</span>
                <span className="opacity-70 cursor-pointer">Settings</span>
                <span className="opacity-70 cursor-pointer">Log Out</span>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center justify-between flex-1">
              <span className="font-semibold text-white">RAHUL</span>
              <Settings className="w-5 h-5 text-gray-300 cursor-pointer" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
