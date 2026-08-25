"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { usePageReady } from "@/components/RouteChangeLoader";
import {
  FaUserFriends,
  FaPlus,
  FaSearch,
  FaCommentAlt,
  FaUserMinus,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  fetchAllFriends,
  fetchFriendRequests,
  addFriend,
  removeFriend,
  searchUsers,
} from "@/api";
import UserProfileModal from "@/components/UserProfileModal";
import { SearchUserResult } from "@/api/types/user.types";
import { Socket } from "socket.io-client";
import InlineSpinner from "@/components/loading/InlineSpinner";
import { ConversationListSkeleton } from "@/components/loading/skeletons";

type TabId = "all" | "add";

type RelationshipStatus = SearchUserResult["relationshipStatus"];

interface FriendRequestData {
  friends_id: string;
  created_at: string;
  user1_id: string;
  user1: {
    username: string;
    fullname: string;
    avatar_url: string;
  };
}

interface FriendData {
  id: string;
  username: string;
  fullname: string;
  avatar_url: string;
  status: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const pageReady = usePageReady();
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [requests, setRequests] = useState<FriendRequestData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
  } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  useRef<Socket | null>(null);
  useRef<ReturnType<typeof setInterval> | null>(null);

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aOnline = a.status === "online" ? 0 : 1;
      const bOnline = b.status === "online" ? 0 : 1;
      if (aOnline !== bOnline) return aOnline - bOnline;
      return (a.username || "").localeCompare(b.username || "");
    });
  }, [friends]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: "All" },
    { id: "add", label: "Add Friend" },
  ];

  useMemo(() => friends.filter((f) => f.status === "online").length, [friends]);

  useEffect(() => {
    Promise.all([loadFriends(), loadRequests()]).finally(() => {
      setInitialLoading(false);
      pageReady();
    });
  }, [pageReady]);

  useEffect(() => {
    const userItem = localStorage.getItem("user");
    if (!userItem) return;
    try {
      const parsed = JSON.parse(userItem);
      setCurrentUserId(parsed?.id);
    } catch {
      setCurrentUserId(undefined);
    }
  }, []);

  const openUserProfile = useCallback(
    (userId: string, fallbackName?: string, fallbackAvatar?: string) => {
      if (!userId) return;

      setSelectedUser({
        id: userId,
        username: fallbackName || "Unknown User",
        avatarUrl: fallbackAvatar || "/User_profil.png",
      });
      setIsProfileOpen(true);
    },
    []
  );

  const loadFriends = async () => {
    try {
      const data = await fetchAllFriends();
      setFriends(data as any);
    } catch (err: any) {
      console.error("Error loading friends:", err);
      setError(err?.response?.data?.message || "Failed to load friends");
    }
  };

  const loadRequests = async () => {
    try {
      const data = await fetchFriendRequests();
      setRequests(data as any);
    } catch (err: any) {
      console.error("Error loading requests:", err);
    }
  };

  const handleAddFriend = async (userId: string) => {
    setLoading(true);
    setError("");
    try {
      await addFriend(userId);
      loadRequests();
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, relationshipStatus: "pending" as const }
            : user
        )
      );
    } catch (err: any) {
      console.error("Error adding friend:", err);
      setError(err?.response?.data?.message || "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setError("");
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (err: any) {
      console.error("Error searching users:", err);
      setError(err?.response?.data?.message || "Failed to search users");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSendDM = async (friendId: string) => {
    router.push(`/messages?dm=${friendId}`);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!friendId || removingFriendId) return;

    setRemovingFriendId(friendId);
    setError("");
    try {
      await removeFriend(friendId);
      setFriends((prev) => prev.filter((friend) => friend.id !== friendId));
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === friendId
            ? { ...user, relationshipStatus: "none" as const }
            : user
        )
      );
    } catch (err: any) {
      console.error("Error removing friend:", err);
      setError(err?.response?.data?.message || "Failed to remove friend");
    } finally {
      setRemovingFriendId(null);
    }
  };

  const getProfileRelationshipStatus = (
    userId?: string
  ): RelationshipStatus | undefined => {
    if (!userId || userId === currentUserId) return undefined;

    const searchMatch = searchResults.find((user) => user.id === userId);
    if (searchMatch) return searchMatch.relationshipStatus;

    if (friends.some((friend) => friend.id === userId)) return "accepted";
    if (requests.some((request) => request.user1_id === userId))
      return "pending";

    return "none";
  };

  const selectedUserRelationshipStatus = getProfileRelationshipStatus(
    selectedUser?.id
  );
  const selectedUserActionLoading =
    Boolean(selectedUser?.id && removingFriendId === selectedUser.id) ||
    loading;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
          <FaUserFriends className="h-5 w-5 text-[#b5bac1]" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            Friends
          </h1>
        </div>

        {/* Tabs */}
        <nav
          role="tablist"
          className="mt-3 flex flex-wrap items-center gap-1 md:gap-2"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-[#b5bac1] hover:text-white"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="mt-6">
          {initialLoading ? (
            <ConversationListSkeleton rows={6} />
          ) : activeTab === "add" ? (
            /* Add Friend */
            <div className="max-w-lg">
              <h2 className="text-lg font-semibold text-white">Add Friend</h2>
              <p className="mt-1 text-sm text-[#b5bac1]">
                You can add a friend with their Echo username.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#72767d]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter a username to search"
                    className="h-11 w-full rounded-lg border border-white/[0.06] bg-[#18191c] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-[#72767d] focus:border-[#FFC341]/50 focus:ring-2 focus:ring-[#FFC341]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearch(searchQuery)}
                  disabled={!searchQuery.trim() || searching}
                  className="h-11 shrink-0 rounded-lg bg-gradient-to-r from-[#FFC341] to-[#FFD700] px-5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Friend
                </button>
              </div>

              {searching && searchQuery.trim() && (
                <div className="mt-4 flex items-center gap-2 text-xs text-[#b5bac1]">
                  <InlineSpinner size="xs" /> Searching...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[#72767d]">
                    Results
                  </h3>
                  <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06]">
                    {searchResults.map((user) => (
                      <li
                        key={user.id}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                      >
                        <img
                          src={user.avatar_url || "/avatar.png"}
                          alt={user.username}
                          className="h-9 w-9 shrink-0 rounded-full bg-[#23272a] object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/avatar.png";
                          }}
                        />
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() =>
                            openUserProfile(
                              user.id,
                              user.username,
                              user.avatar_url
                            )
                          }
                        >
                          <div className="truncate text-sm font-medium text-white">
                            {user.fullname || user.username}
                          </div>
                          <div className="truncate text-xs text-[#72767d]">
                            @{user.username}
                          </div>
                        </div>
                        {user.relationshipStatus === "none" && (
                          <button
                            type="button"
                            onClick={() => handleAddFriend(user.id)}
                            disabled={loading}
                            className="shrink-0 rounded-lg bg-gradient-to-r from-[#FFC341] to-[#FFD700] px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
                          >
                            <FaPlus className="mr-1 inline h-3 w-3" /> Add
                          </button>
                        )}
                        {user.relationshipStatus === "pending" && (
                          <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-[#b5bac1]">
                            Pending
                          </span>
                        )}
                        {user.relationshipStatus === "accepted" && (
                          <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-[#b5bac1]">
                            Friends
                          </span>
                        )}
                        {user.relationshipStatus === "rejected" && (
                          <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-[#b5bac1]">
                            Rejected
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* All */
            <div>
              {sortedFriends.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-[#111214] p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-[#18191c]">
                    <FaUserFriends className="h-5 w-5 text-[#72767d]" />
                  </div>
                  <p className="text-sm font-medium text-white">
                    No friends yet.
                  </p>
                  <p className="mt-1 text-xs text-[#72767d]">
                    Use Add Friend to start building your list.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[#72767d]">
                    All Friends — {sortedFriends.length}
                  </p>
                  <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06]">
                    {sortedFriends.map((f) => {
                      const isOnline = f.status === "online";
                      return (
                        <li
                          key={f.id}
                          className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={f.avatar_url}
                              alt={f.username}
                              className={`h-10 w-10 rounded-full bg-[#23272a] object-cover ${
                                isOnline ? "" : "opacity-60"
                              }`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/avatar.png";
                              }}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black ${
                                isOnline ? "bg-green-500" : "bg-[#80848e]"
                              }`}
                            />
                          </div>
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() =>
                              openUserProfile(f.id, f.username, f.avatar_url)
                            }
                          >
                            <div
                              className={`truncate text-sm font-semibold ${
                                isOnline ? "text-white" : "text-[#b5bac1]"
                              }`}
                            >
                              {f.fullname || f.username}
                            </div>
                            <div className="truncate text-xs text-[#72767d]">
                              {isOnline ? "Online" : `@${f.username}`}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSendDM(f.id)}
                              title="Send message"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b5bac1] transition hover:text-white"
                            >
                              <FaCommentAlt className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFriend(f.id)}
                              disabled={removingFriendId === f.id}
                              title="Remove friend"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-300/80 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FaUserMinus className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
        currentUserId={currentUserId}
        relationshipStatus={selectedUserRelationshipStatus}
        friendActionLoading={selectedUserActionLoading}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
      />
    </div>
  );
}
