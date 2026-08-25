"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trash2, User } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  danger?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "User Settings",
    items: [
      {
        id: "profile",
        label: "Profile",
        href: "/profile-settings",
        icon: <User className="h-4 w-4 flex-shrink-0" />,
      },
    ],
  },
  {
    label: "Account",
    items: [
      // {
      //   id: "change-password",
      //   label: "Change Password",
      //   href: "/change-password",
      //   icon: <Lock className="h-4 w-4 flex-shrink-0" />,
      // },
      {
        id: "delete-account",
        label: "Delete Account",
        href: "/delete-account",
        icon: <Trash2 className="h-4 w-4 flex-shrink-0" />,
        danger: true,
      },
    ],
  },
];

export default function SettingsSidebar() {
  const pathname = usePathname();

  const activeId = pathname?.startsWith("/profile-settings")
    ? "profile"
    : pathname?.startsWith("/delete-account")
      ? "delete-account"
      : "";

  return (
    <nav className="flex min-h-full w-60 flex-col border-r border-white/[0.06] bg-black">
      <div className="scrollbar flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className={groupIndex > 0 ? "mt-4" : ""}>
            {group.label && (
              <div className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-[#72767d]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    flex w-full items-center gap-2 rounded px-2.5 py-2 text-base transition-all duration-150
                    ${
                      isActive
                        ? item.danger
                          ? "bg-[#ed4245]/15 font-medium text-[#ed4245]"
                          : "bg-white/[0.08] font-medium text-white"
                        : item.danger
                          ? "text-[#ed4245]/70 hover:bg-[#ed4245]/10 hover:text-[#ed4245]"
                          : "text-[#b5bac1] hover:bg-white/[0.04] hover:text-white"
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}