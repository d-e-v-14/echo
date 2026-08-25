import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getServerMembers,
  kickMember,
  banMember,
  addUserToServer,
  searchUsers,
  getAllRoles,
  assignRoleToUser,
  removeRoleFromUser,
} from "@/api";
import { ServerMember } from "@/api/types/server.types";
import { SearchUser } from "@/api/types/user.types";
import { Role } from "@/api/types/roles.types";
import { useToast } from "@/contexts/ToastContext";
import { useUser } from "@/components/UserContext";
import { invalidateServerPermissionQueries } from "@/lib/query/roleSync";

interface Member {
  id: string;
  username: string;
  fullname: string;
  roles: { id: string; name: string; color: string; role_type: string }[];
  joinDate: string;
  avatar: string;
}

interface MembersProps {
  serverId: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export default function Members({
  serverId,
  isOwner = false,
  isAdmin = false,
}: MembersProps) {
  const { showToast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRolePopupFor, setShowRolePopupFor] = useState<string | null>(null);
  const [serverRoles, setServerRoles] = useState<Role[]>([]);
  const [roleActionLoading, setRoleActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
    loadServerRoles();
  }, [serverId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) handleSearchUsers();
      else setSearchResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadServerRoles = async () => {
    try {
      setServerRoles(await getAllRoles(serverId));
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  };

  const loadMembers = async () => {
    try {
      const serverMembers = await getServerMembers(serverId);
      if (!serverMembers || !Array.isArray(serverMembers)) {
        setMembers([]);
        return;
      }
      setMembers(
        serverMembers.map((m: ServerMember) => ({
          id: m.user_id,
          username: `@${m.users.username}`,
          fullname: m.users.fullname,
          roles:
            m.user_roles?.map((ur: any) => ({
              id: ur.roles?.id || ur.role_id,
              name: ur.roles?.name || "Unknown",
              color: ur.roles?.color || "#5865f2",
              role_type: ur.roles?.role_type || "custom",
            })) || [],
          joinDate: new Date(m.joined_at).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          avatar: m.users.avatar_url || "/avatar.png",
        }))
      );
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (memberId: string, roleId: string) => {
    setRoleActionLoading(roleId);
    try {
      await assignRoleToUser(serverId, memberId, roleId);
      await loadMembers();
      if (memberId === user?.id) {
        invalidateServerPermissionQueries(queryClient, serverId);
      }
    } catch (error: any) {
      showToast(error?.response?.data?.error || "Failed to assign role", "error");
    } finally {
      setRoleActionLoading(null);
    }
  };

  const handleRemoveRole = async (memberId: string, roleId: string) => {
    setRoleActionLoading(roleId);
    try {
      await removeRoleFromUser(serverId, memberId, roleId);
      await loadMembers();
      if (memberId === user?.id) {
        invalidateServerPermissionQueries(queryClient, serverId);
      }
    } catch (error: any) {
      showToast(error?.response?.data?.error || "Failed to remove role", "error");
    } finally {
      setRoleActionLoading(null);
    }
  };

  const handleSearchUsers = async () => {
    setSearchLoading(true);
    try {
      setSearchResults(await searchUsers(searchQuery));
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKickMember = async (memberId: string, memberUsername: string) => {
    if (!confirm(`Kick ${memberUsername}?`)) return;
    try {
      await kickMember(serverId, memberId);
      setMembers(members.filter((m) => m.id !== memberId));
      showToast(`${memberUsername} kicked`, "success");
    } catch {
      showToast("Failed to kick member", "error");
    }
  };

  const handleBanMember = async (memberId: string, memberUsername: string) => {
    const reason = prompt(`Ban reason for ${memberUsername}:`);
    if (reason === null) return;
    try {
      await banMember(serverId, memberId, reason);
      setMembers(members.filter((m) => m.id !== memberId));
      showToast(`${memberUsername} has been banned`, "success");
    } catch {
      showToast("Failed to ban member", "error");
    }
  };

  const handleAddMemberToServer = async (user: SearchUser) => {
    try {
      await addUserToServer(serverId, user.username);
      setShowAddMember(false);
      setSearchQuery("");
      setSearchResults([]);
      showToast(`@${user.username} added`, "success");
      await loadMembers();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || "Failed to add member";
      showToast(msg, "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-[#72767d] mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {(isOwner || isAdmin) && (
          <button
            onClick={() => {
              setShowAddMember(!showAddMember);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-sm px-3 py-1.5 rounded"
          >
            {showAddMember ? "Cancel" : "Add Member"}
          </button>
        )}
      </div>

      {showAddMember && (
        <div className="border border-white/[0.06] rounded-lg bg-[#111214] p-4">
          <input
            className="w-full bg-[#18191c] text-base text-white border border-white/[0.06] rounded px-3 py-2 focus:border-[#FFC341] focus:outline-none transition-colors"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchLoading && (
            <div className="text-sm text-[#72767d] mt-2">Searching...</div>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-1 mt-2 max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={user.avatar_url || "/avatar.png"}
                      className="w-7 h-7 rounded-full"
                      alt=""
                    />
                    <div>
                      <div className="text-sm font-medium">@{user.username}</div>
                      <div className="text-[10px] text-[#72767d]">{user.fullname}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMemberToServer(user)}
                    className="bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-medium text-xs px-2.5 py-1 rounded"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border border-white/[0.06] rounded-lg bg-[#111214]">
        {loading ? (
          <div className="p-8 text-center text-[#72767d] text-sm">Loading...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[#b5bac1] text-sm">No members found</div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={member.avatar}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-base font-medium truncate">{member.username}</div>
                    <div className="text-sm text-[#72767d] truncate">
                      {member.fullname} · Joined {member.joinDate}
                    </div>
                    {member.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {member.roles.map((role) => (
                          <span
                            key={role.id}
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${role.color || "#5865f2"}20`,
                              color: role.color || "#5865f2",
                            }}
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {(isOwner || isAdmin) && (
                  <div className="flex gap-1 flex-shrink-0 ml-3">
                    <button
                      onClick={() =>
                        setShowRolePopupFor(
                          showRolePopupFor === member.id ? null : member.id
                        )
                      }
                      className="text-[#b5bac1] text-xs px-2 py-1 rounded hover:bg-white/[0.06] transition"
                    >
                      Roles
                    </button>
                    <button
                      onClick={() => handleKickMember(member.id, member.username)}
                      className="text-[#e67e22] text-xs px-2 py-1 rounded hover:bg-[#e67e22]/10 transition"
                    >
                      Kick
                    </button>
                    <button
                      onClick={() => handleBanMember(member.id, member.username)}
                      className="text-[#ed4245] text-xs px-2 py-1 rounded hover:bg-[#ed4245]/10 transition"
                    >
                      Ban
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRolePopupFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23272a] border border-white/[0.06] p-5 rounded-lg max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-base font-semibold mb-1">Manage Roles</h3>
            <p className="text-sm text-[#72767d] mb-4">
              for {members.find((m) => m.id === showRolePopupFor)?.username}
            </p>

            <div className="mb-4">
              <h4 className="text-xs font-semibold text-[#72767d] uppercase tracking-wider mb-2">
                Current
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {members
                  .find((m) => m.id === showRolePopupFor)
                  ?.roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: `${role.color || "#5865f2"}20`,
                        color: role.color || "#5865f2",
                      }}
                    >
                      <span>{role.name}</span>
                      {role.role_type !== "owner" && (
                        <button
                          onClick={() => handleRemoveRole(showRolePopupFor!, role.id)}
                          disabled={roleActionLoading === role.id}
                          className="ml-0.5 hover:text-[#ed4245]"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                {members.find((m) => m.id === showRolePopupFor)?.roles.length === 0 && (
                  <span className="text-sm text-[#72767d]">None</span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-semibold text-[#72767d] uppercase tracking-wider mb-2">
                Available
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {serverRoles
                  .filter((role) => {
                    const mr = members.find((m) => m.id === showRolePopupFor)?.roles || [];
                    return !mr.some((r) => r.id === role.id);
                  })
                  .filter((role) => {
                    if (role.role_type === "owner") return false;
                    if (role.role_type === "admin") return isOwner;
                    return true;
                  })
                  .map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleAssignRole(showRolePopupFor!, role.id)}
                      disabled={roleActionLoading === role.id}
                      className="flex items-center justify-between w-full text-left p-2 rounded hover:bg-white/[0.04] transition text-xs"
                    >
                      <span style={{ color: role.color || "#fff" }}>
                        {role.name}
                        {role.role_type === "admin" && " (Admin)"}
                      </span>
                      <span className="text-[10px] text-[#72767d]">
                        {roleActionLoading === role.id ? "..." : "+ Add"}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            <button
              onClick={() => setShowRolePopupFor(null)}
              className="w-full text-sm text-[#b5bac1] py-2 rounded border border-white/[0.06] hover:bg-white/[0.04] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
