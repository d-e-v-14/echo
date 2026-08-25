"use client";

import { useState, useEffect } from "react";
import { getBannedUsers, unbanUser } from "@/api";
import { BannedUser } from "@/api/types/user.types";
import { useToast } from "@/contexts/ToastContext";

interface BannedUsersProps {
  serverId: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export default function BannedUsers({
  serverId,
  isOwner = false,
  isAdmin = false,
}: BannedUsersProps) {
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadBannedUsers();
  }, [serverId]);

  const loadBannedUsers = async () => {
    try {
      setLoading(true);
      const banned = await getBannedUsers(serverId);
      setBannedUsers(banned);
    } catch (err: any) {
      console.error("Failed to load banned users:", err);
      showToast(
        err?.response?.data?.error || "Failed to load banned users",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (userId: string, username: string) => {
    if (!confirm(`Unban ${username}?`)) return;
    try {
      await unbanUser(serverId, userId);
      setBannedUsers((prev) => prev.filter((u) => u.user_id !== userId));
      showToast(`${username} has been unbanned`, "success");
    } catch (err: any) {
      console.error("Failed to unban user:", err);
      showToast(
        err?.response?.data?.error || "Failed to unban user",
        "error"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bans</h1>
        <p className="text-sm text-[#72767d] mt-1">
          {bannedUsers.length} banned user{bannedUsers.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="border border-white/[0.06] rounded-lg bg-[#111214]">
        {loading ? (
          <div className="p-8 text-center text-[#72767d] text-sm">Loading...</div>
        ) : bannedUsers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[#b5bac1] text-sm mb-1">No banned users</div>
            <div className="text-[#72767d] text-xs">This server has no bans.</div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {bannedUsers.map((banned) => (
              <div
                key={banned.user_id}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={banned.users?.avatar_url || "/avatar.png"}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-base font-medium truncate">
                      @{banned.users?.username || "Unknown"}
                    </div>
                    <div className="text-sm text-[#72767d] truncate">
                      {banned.users?.fullname}
                      {banned.reason && (
                        <span className="text-[#ed4245]"> · {banned.reason}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#72767d]">
                      Banned by @{banned.banned_by_user?.username || "Unknown"} ·{" "}
                      {new Date(banned.banned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {(isOwner || isAdmin) && (
                  <button
                    onClick={() =>
                      handleUnban(banned.user_id, banned.users?.username || "this user")
                    }
                    className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium px-3 py-1.5 rounded text-xs flex-shrink-0 ml-3"
                  >
                    Unban
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
