"use client";

import { useState } from "react";

interface SidebarProps {
  selected: string;
  onSelect: (tab: string) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
  serverName?: string;
  serverIcon?: string;
  memberCount?: number;
}

interface MenuItem {
  id: string;
  label: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export default function Sidebar({
  selected,
  onSelect,
  isOwner = false,
  isAdmin = false,
  serverName = "",
  serverIcon,
  memberCount,
}: SidebarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const buildMenuGroups = (): MenuGroup[] => {
    const groups: MenuGroup[] = [];

    groups.push({
      label: "Server Settings",
      items: [{ id: "Overview", label: "Overview" }],
    });

    if (isOwner || isAdmin) {
      groups.push({
        label: "Community",
        items: [
          { id: "Members", label: "Members" },
          { id: "Role", label: "Roles" },
          { id: "Invite people", label: "Invites" },
          { id: "Add Channel", label: "Channels" },
        ],
      });
    } else {
      groups.push({
        label: "Community",
        items: [
          { id: "Members", label: "Members" },
          { id: "Role", label: "Roles" },
        ],
      });
    }

    if (isOwner || isAdmin) {
      groups.push({
        label: "Moderation",
        items: [{ id: "Bans", label: "Bans" }],
      });
    }

    groups.push({
      label: "",
      items: [
        { id: "Leave", label: "Leave Server" },
        ...(isOwner ? [{ id: "Danger Zone", label: "Danger Zone" }] : []),
      ],
    });

    return groups;
  };

  const menuGroups = buildMenuGroups();

  return (
    <nav className="w-60 min-h-screen bg-black flex flex-col border-r border-white/[0.06]">
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {serverIcon ? (
            <img
              src={serverIcon}
              alt={serverName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#FFC341] flex items-center justify-center text-black font-bold text-sm">
              {serverName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-white truncate">
              {serverName}
            </div>
            {memberCount !== undefined && (
              <div className="text-sm text-[#72767d]">
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 scrollbar">
        {menuGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.label && (
              <div className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#72767d]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = selected === item.id;
              const isHovered = hovered === item.id;
              const isDanger = item.id === "Danger Zone";
              const isLeave = item.id === "Leave";

              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`
                    w-full text-left px-2.5 py-2 rounded text-base transition-all duration-150 flex items-center gap-2
                    ${isActive
                      ? isDanger
                        ? "bg-[#ed4245]/15 text-[#ed4245] font-medium"
                        : "bg-white/[0.08] text-white font-medium"
                      : isDanger
                        ? "text-[#ed4245]/70 hover:bg-[#ed4245]/10 hover:text-[#ed4245]"
                        : isLeave
                          ? "text-[#b5bac1] hover:bg-white/[0.06] hover:text-[#ed4245]"
                          : isHovered
                            ? "text-white bg-white/[0.04]"
                            : "text-[#b5bac1]"
                    }
                  `}
                >
                  {isDanger && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )}
                  {isLeave && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  )}
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
