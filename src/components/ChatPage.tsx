"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePageReady } from "@/components/RouteChangeLoader";
import {
  Paperclip,
  Search,
  X,
  Phone,
  Video,
  Pin,
  Clock,
  CircleAlert,
} from "lucide-react";
import MessageInputWithMentions from "./MessageInputWithMentions";
import InlineSearchDropdown from "./InlineSearchDropdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserDMs,
  uploaddm,
  markThreadAsRead,
  searchDmMessages,
} from "@/api/message.api";
import { fetchUserProfile } from "@/api/profile.api";
import { useSocket } from "@/lib/socket/SocketProvider";
import MessageBubble from "./MessageBubble";
import MessageAttachment from "./MessageAttachment";
import { useMessageNotifications } from "@/contexts/MessageNotificationContext";
import Toast from "@/components/Toast";
import { useToast } from "@/contexts/ToastContext";
import UserProfileModal from "./UserProfileModal";
import { ScrollToBottomButton } from "@/components/ScrollToBottomButton";
import { useChatScroll } from "@/hooks/useChatScroll";
import { MessageSearchResult } from "@/api/types/message.types";
import { useDmMessages } from "@/hooks/useDmMessages";
import {
  ConversationListSkeleton,
  LoadingOlderMessagesSkeleton,
  MessageListSkeleton,
} from "@/components/loading/skeletons";
import { queryKeys } from "@/lib/query/keys";
import {
  flattenDmMessages,
  insertIncomingIntoDataOrCreate,
  insertIncomingIntoPages,
  markMessagesFailed,
  mergeDmSummaries,
  normalizeDmMessage,
  replaceOptimisticById,
  resolveRepliesForThread,
  sortDmConversationsByLatest,
} from "@/lib/dm/messageUtils";
import type {
  DmMessage as DirectMessage,
  DmMessagesData,
  DmReplyTarget,
  DmSummary,
} from "@/lib/dm/types";

interface User {
  id: string;
  fullname: string;
  avatar_url?: string;
}

type DMReplyTarget = DmReplyTarget | null;

const isCodeBlock = (content?: string) => {
  if (!content) return false;
  return /```(?:\w+)?\n?[\s\S]*?```/.test(content);
};

const isReplyImage = (mediaUrl?: string | null, mediaType?: string) => {
  if (!mediaUrl) return false;
  const ext = mediaUrl.split("?")[0].split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
  return (
    mediaUrl.startsWith("blob:") ||
    imageExts.includes(ext) ||
    Boolean(mediaType?.startsWith("image/"))
  );
};

const getInitials = (name: string = "") => {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2) || "?"
  );
};

type GroupedSection = {
  dayLabel: string;
  groups: Array<{
    key: string;
    senderId: string;
    name: string;
    isSender: boolean;
    avatarUrl?: string;
    messages: Array<DirectMessage & { timeLabel: string }>;
  }>;
};

interface ChatListProps {
  conversations: {
    user: User;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
    status?: DirectMessage["status"];
  }[];
  activeDmId: string | null;
  onSelectDm: (userId: string) => void;
  isLoading: boolean;
  error: string | null;
}

const formatTimestamp = (ts: string): string => {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (date.getTime() >= startOfToday.getTime()) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() >= yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeDmId,
  onSelectDm,
  isLoading,
  error,
}) => {
  const [query, setQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!query.trim()) return conversations;
    const lowered = query.trim().toLowerCase();
    return conversations.filter(({ user }) =>
      user.fullname.toLowerCase().includes(lowered)
    );
  }, [conversations, query]);

  return (
    <aside className="hidden h-full w-80 flex-col border-r border-slate-800 bg-black p-4 backdrop-blur-lg lg:flex">
      <div className="mb-5 text-center">
        <h2 className="text-lg font-semibold text-slate-100">
          Messages
        </h2>
     
      </div>

      <label className="group mb-4 flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 focus-within:border-[#FFC341]/60 focus-within:text-[#FFC341]">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
        />
      </label>

      <div className="chat-scroll flex-1 space-y-2 overflow-y-auto pr-1">
        {isLoading ? (
          <ConversationListSkeleton rows={6} />
        ) : error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4 text-center text-sm text-slate-400">
            No conversations found. Try another name.
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredConversations.map(
              ({ user, lastMessage, timestamp, unreadCount, status }) => {
                const isActive = activeDmId === user.id;
                const hasUnread = unreadCount > 0 && !isActive;
                return (
                  <li
                    key={user.id}
                    onClick={() => onSelectDm(user.id)}
                    className={`group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-white/[0.08]"
                        : "text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {hasUnread && (
                      <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-green-500" />
                    )}
                    <div className="relative h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-700/60 bg-slate-800/60">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.fullname}
                            className="h-10 w-10 object-cover rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling?.classList.remove(
                                "hidden"
                              );
                            }}
                          />
                        ) : null}
                        <div
                          className={`flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-300 ${
                            user.avatar_url ? "hidden" : ""
                          }`}
                        >
                          {getInitials(user.fullname)}
                        </div>
                      </div>
                      {hasUnread && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-black">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-sm font-semibold ${
                            hasUnread ? "text-white" : "text-slate-200"
                          }`}
                        >
                          {user.fullname}
                        </p>
                        <span
                          className={`flex-shrink-0 text-[11px] leading-none ${
                            hasUnread ? "text-white" : "text-slate-500"
                          }`}
                        >
                          {status === "pending" ? (
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                          ) : status === "failed" ? (
                            <CircleAlert className="h-3.5 w-3.5 text-[#ed4245]" />
                          ) : (
                            formatTimestamp(timestamp)
                          )}
                        </span>
                      </div>
                      <p
                        className={`truncate text-xs ${
                          hasUnread ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {lastMessage || "No messages yet."}
                      </p>
                    </div>
                  </li>
                );
              }
            )}
          </ul>
        )}
      </div>
    </aside>
  );
};

interface ChatWindowProps {
  onLoadOlder: () => Promise<boolean>;
  hasMorePages?: boolean;
  isLoadingOlderMessages?: boolean;
  isLoadingMessages?: boolean;
  activeUser: User | null;
  messages: DirectMessage[];
  currentUser: User | null;
  partnerId: string | null;
  threadId: string | null;
  allUsers: User[];
  onSendMessage: (
    message: string,
    files: File[],
    replyTo?: DMReplyTarget
  ) => void;
  onFileError: (msg: string) => void;
  onOpenProfile: (
    userId: string,
    fallbackName?: string,
    fallbackAvatar?: string
  ) => void;
  onToast: (msg: string, type: "info" | "success" | "error") => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  onLoadOlder,
  hasMorePages,
  isLoadingOlderMessages,
  isLoadingMessages,
  activeUser,
  messages,
  currentUser,
  partnerId,
  threadId,
  allUsers,
  onSendMessage,
  onToast,
  onOpenProfile,
}) => {

  useToast();
  const [replyingTo, setReplyingTo] = useState<DMReplyTarget>(null);
  const [showSearch, setShowSearch] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const replyingToRef = useRef<DMReplyTarget>(null);

  const registerMessageRef = useCallback(
    (id: string | number, el: HTMLDivElement | null) => {
      messageRefs.current[id] = el;
    },
    []
  );

  // One source of truth for DM scrolling: per-conversation anchors,
  // restoration, follow-on-append and prepend compensation all live here.
  const scroll = useChatScroll({
    conversationKey: `dm:${threadId ?? partnerId ?? "none"}`,
    containerRef: messagesContainerRef,
    messages,
    messageRefs,
    ready: !isLoadingMessages && messages.length > 0,
    hasMore: Boolean(hasMorePages),
    loadingMore: Boolean(isLoadingOlderMessages),
    onLoadOlder,
  });

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );
  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const groupedMessages = useMemo<GroupedSection[]>(() => {
    if (!messages.length) return [];

    const sections: GroupedSection[] = [];
    const partner = partnerId
      ? allUsers.find((u) => u.id === partnerId) || activeUser
      : activeUser;

    messages.forEach((message) => {
      const timestamp = new Date(message.timestamp);
      const dayLabel = Number.isNaN(timestamp.getTime())
        ? "Recent"
        : dayFormatter.format(timestamp);
      let section = sections[sections.length - 1];
      if (!section || section.dayLabel !== dayLabel) {
        section = { dayLabel, groups: [] };
        sections.push(section);
      }

      const senderId = message.sender_id;
      const isSender = senderId === currentUser?.id;
      const name = isSender ? "You" : (partner?.fullname ?? "Unknown User");
      const avatarUrl = isSender
        ? currentUser?.avatar_url
        : partner?.avatar_url;
      let group = section.groups[section.groups.length - 1];
      if (!group || group.senderId !== senderId) {
        group = {
          key: `${dayLabel}-${partnerId}-${isSender ? "me" : "them"}-${
            message.id
          }`,
          senderId,
          name,
          isSender,
          avatarUrl,
          messages: [],
        };
        section.groups.push(group);
      }

      group.messages.push({
        ...message,
        timeLabel: Number.isNaN(timestamp.getTime())
          ? ""
          : timeFormatter.format(timestamp),
      });
    });

    return sections;
  }, [
    messages,
    currentUser?.id,
    partnerId,
    allUsers,
    dayFormatter,
    timeFormatter,
  ]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!threadId) return [];
      return searchDmMessages(threadId, query);
    },
    [threadId]
  );

  const handleSearchSelect = useCallback(
    async (result: MessageSearchResult) => {
      const success = await scroll.scrollToMessage(result.id, {
        highlightMs: 1800,
      });
      if (!success) {
        onToast("Could not find that message in this conversation.", "error");
      }
    },
    [scroll, onToast]
  );

  useEffect(() => {
    replyingToRef.current = replyingTo;
  }, [replyingTo]);

  const handleSendMessage = useCallback(
    (text: string, files: File[]) => {
      if (text.trim().length === 0 && files.length === 0) return;
      onSendMessage(text, files, replyingToRef.current);
      scroll.stickNextRender();
      setReplyingTo(null);
    },
    [onSendMessage, scroll]
  );

  if (!activeUser) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-black text-slate-400">
        <div className="rounded-full border border-slate-800/70 bg-slate-900/50 p-6">
          <Paperclip className="h-8 w-8 text-slate-500" />
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-200">Select a conversation</p>
          <p className="mt-1 text-sm text-slate-400">
            Choose someone from the list to start chatting.
          </p>
        </div>
      </div>
    );
  }

  const recipientFirstName =
    activeUser.fullname.split(" ")[0] || activeUser.fullname;

  return (
    <div className="flex h-full flex-1 flex-col bg-black backdrop-blur">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#111214] px-4">
        {/* Left: Avatar + Name */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onOpenProfile(
                activeUser.id,
                activeUser.fullname,
                activeUser.avatar_url
              )
            }
            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#23272a] ring-2 ring-transparent transition hover:ring-[#FFC341]/40"
            title={`View ${activeUser.fullname}'s profile`}
          >
            {activeUser.avatar_url ? (
              <img
                src={activeUser.avatar_url}
                alt={activeUser.fullname}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-[#b5bac1]">
                {getInitials(activeUser.fullname)}
              </span>
            )}
          </button>
          <h3
            onClick={() =>
              onOpenProfile(
                activeUser.id,
                activeUser.fullname,
                activeUser.avatar_url
              )
            }
            className="min-w-0 truncate text-[15px] font-semibold text-slate-100 cursor-pointer hover:text-white"
            title={activeUser.fullname}
          >
            {activeUser.fullname}
          </h3>
        </div>

        {/* Center: Action Buttons */}
        <div className="flex items-center gap-1 md:ml-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b5bac1] transition hover:bg-white/[0.06] hover:text-white"
            title="Start voice call"
            aria-label="Start voice call"
          >
            <Phone className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b5bac1] transition hover:bg-white/[0.06] hover:text-white"
            title="Start video call"
            aria-label="Start video call"
          >
            <Video className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b5bac1] transition hover:bg-white/[0.06] hover:text-white"
            title="Pinned messages"
            aria-label="Pinned messages"
          >
            <Pin className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Right: Search */}
        <div className="ml-auto flex min-w-0 shrink-0 items-center">
          <div className="group relative">
            <input
              type="text"
              placeholder={`Search ${activeUser.fullname.split(" ")[0] || activeUser.fullname}`}
              onClick={() => threadId && setShowSearch(true)}
              readOnly={!threadId}
              className="h-9 w-64 rounded-lg border border-white/[0.06] bg-[#1e1f22] px-3 pr-9 text-sm text-slate-200 placeholder:text-[#72767d] outline-none transition-colors focus:border-[#FFC341]/40 focus:ring-1 focus:ring-[#FFC341]/20 disabled:cursor-not-allowed disabled:opacity-40 lg:w-72"
              aria-label={`Search messages with ${activeUser.fullname}`}
            />
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#72767d] transition group-focus-within:text-[#FFC341]/60" />
            <InlineSearchDropdown
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              onSearch={handleSearch}
              onSelectResult={handleSearchSelect}
              placeholder="Search in this conversation..."
              align="right"
            />
          </div>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col min-h-0">
        <div
          ref={messagesContainerRef}
          onScroll={scroll.handleScroll}
          className="chat-scroll relative flex-1 space-y-0 overflow-y-auto px-6 py-6 pr-3 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-900"
        >
        {isLoadingOlderMessages && <LoadingOlderMessagesSkeleton />}
        {groupedMessages.length === 0 ? (
          isLoadingMessages ? (
            <MessageListSkeleton />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <p>No messages yet.</p>
              <p className="text-sm">Say hi to start the conversation!</p>
            </div>
          )
        ) : (
          groupedMessages.map((section) => (
            <div key={section.dayLabel} className="space-y-4">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex-1 border-t border-slate-800/70" />
                <span className="rounded-full border border-slate-800/60 bg-slate-900/60 px-3 py-1 uppercase tracking-wide text-slate-300">
                  {section.dayLabel}
                </span>
                <span className="flex-1 border-t border-slate-800/70" />
              </div>
              <div className="space-y-5">
                {section.groups.map((group) => (
                  <div key={group.key} className="space-y-2">
                    {group.messages.map((msg, index) => (
                      <div
                        key={msg.id}
                        ref={(el) => registerMessageRef(msg.id, el)}
                      >
                        <MessageBubble
                          isSender={group.isSender}
                          message={msg}
                          showPinAction={
                            !!msg.id && !String(msg.id).startsWith("temp-")
                          }
                          onReply={() => {
                            setReplyingTo({
                              id: msg.id,
                              content: msg.content,
                              author: group.isSender ? "You" : group.name,
                              mediaUrl: msg.media_url,
                              mediaType: msg.media_type,
                            });
                          }}
                          onReplyPreviewClick={(id) =>
                            void scroll.scrollToMessage(id)
                          }
                          timestamp={msg.timeLabel}
                          name={
                            !group.isSender && index === 0
                              ? group.name
                              : undefined
                          }
                          avatarUrl={group.avatarUrl}
                          onProfileClick={
                            group.isSender
                              ? undefined
                              : () =>
                                  onOpenProfile(
                                    group.senderId,
                                    group.name,
                                    group.avatarUrl
                                  )
                          }
                        >
                          {msg.media_url && (
                            <MessageAttachment
                              media_url={msg.media_url}
                              media_type={msg.media_type}
                            />
                          )}
                        </MessageBubble>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        </div>

        {scroll.showJumpButton && (
          <ScrollToBottomButton
            onClick={scroll.jumpToLatest}
            count={scroll.newMessageCount}
            className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          />
        )}
      </div>

      <footer className="relative p-2">
        {replyingTo && (
          <div className="mx-4 mt-3 mb-2 rounded-lg border-l-4 border-[#FFC341] bg-[#23272a]/60 px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 text-sm text-slate-300">
                <span className="shrink-0">
                  Replying to{" "}
                  <span className="font-semibold text-[#FFC341]">
                    {replyingTo.author || "User"}
                  </span>
                  :
                </span>

                {replyingTo.content?.startsWith("[GIF]") ? (
                  <img
                    src={replyingTo.content.replace("[GIF]", "")}
                    alt="GIF preview"
                    className="h-10 w-10 rounded object-cover border border-[#23272a] flex-shrink-0"
                  />
                ) : isCodeBlock(replyingTo.content) ? (
                  <div className="max-w-xs truncate rounded bg-[#111214] border border-[#23272a] px-2 font-mono text-xs text-green-400">
                    {
                      (
                        replyingTo.content.match(
                          /```(?:\w+)?\n?([\s\S]*?)```/
                        )?.[1] || ""
                      )
                        .trim()
                        .split("\n")[0]
                    }
                  </div>
                ) : (
                  <>
                    {replyingTo.mediaUrl &&
                      (isReplyImage(
                        replyingTo.mediaUrl,
                        replyingTo.mediaType
                      ) ? (
                        <img
                          src={replyingTo.mediaUrl}
                          alt="Reply attachment"
                          className="h-9 w-9 flex-shrink-0 rounded object-cover border border-[#23272a]"
                        />
                      ) : (
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-[#23272a] bg-[#111214] text-[#72767d]">
                          <Paperclip className="h-4 w-4" />
                        </span>
                      ))}
                    <span className="italic truncate text-slate-400">
                      {replyingTo.content ||
                        (replyingTo.mediaUrl ? "Attachment" : "")}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="ml-3 text-[#72767d] transition hover:text-white"
                aria-label="Cancel reply"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <MessageInputWithMentions
          sendMessage={handleSendMessage}
          isSending={false}
          serverRoles={[]}
          onTyping={() => {}}
          placeholder={`Message ${recipientFirstName}`}
        />
      </footer>
    </div>
  );
};

function MessagesPageContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDM = searchParams.get("dm");
  const { refreshCount: refreshMessageNotifications, unreadPerThread } =
    useMessageNotifications();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [threadIds, setThreadIds] = useState<Map<string, string>>(new Map());
  const [dmSummaries, setDmSummaries] = useState<Map<string, DmSummary>>(
    new Map()
  );
  const dmSummariesRef = useRef<Map<string, DmSummary>>(new Map());
  useEffect(() => {
    dmSummariesRef.current = dmSummaries;
  }, [dmSummaries]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setFileError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
  } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pageReady = usePageReady();
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
    key: number;
  } | null>(null);

  const { socket } = useSocket();
  const activeDmIdRef = useRef<string | null>(null);

  const updateDmListCache = (
    partnerId: string,
    summary: DmSummary
  ) => {
    const userId = currentUserIdRef.current;
    if (!userId) return;
    queryClient.setQueryData(
      queryKeys.dmList(userId),
      (old: {
        users: User[];
        threadMap: Map<string, string>;
        summaryMap: Map<string, DmSummary>;
      } | undefined) => {
        if (!old) return old;
        const summaryMap = new Map(old.summaryMap);
        const existing = summaryMap.get(partnerId);
        summaryMap.set(partnerId, {
          lastMessage: summary.lastMessage,
          timestamp: summary.timestamp,
          unreadCount: summary.unreadCount ?? existing?.unreadCount ?? 0,
          status: summary.status ?? existing?.status,
        });
        return { ...old, summaryMap };
      }
    );
  };

  useEffect(() => {
    activeDmIdRef.current = activeDmId;
  }, [activeDmId]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
  }, [currentUser?.id]);

  const activeThreadId = activeDmId
    ? (threadIds.get(activeDmId) ?? null)
    : null;

  const {
    data: dmMessagesData,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    isLoading: isLoadingDmMessages,
  } = useDmMessages(activeDmId, activeThreadId);

  const rawActiveMessages = useMemo(
    () => flattenDmMessages(dmMessagesData),
    [dmMessagesData]
  );

  const activeMessages = useMemo(
    () =>
      resolveRepliesForThread(
        rawActiveMessages,
        allUsers,
        currentUser?.id
      ),
    [rawActiveMessages, allUsers, currentUser?.id]
  );

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (raw: any) => {
      try {
        if (!raw) return;
        const incoming =
          (raw as any)?.payload ?? (raw as any)?.data ?? (raw as any)?.message ?? raw;
        if (!incoming) return;
        if (Array.isArray(incoming)) {
          incoming.forEach(handleNewMessage);
          return;
        }

        const receiver = String(
          incoming.receiver_id ??
            incoming.receiverId ??
            incoming.to ??
            incoming.targetId ??
            ""
        );

        const isDm =
          incoming.thread_id != null ||
          incoming.threadId != null ||
          receiver !== "";
        if (!isDm) return;

        const incomingMsg = normalizeDmMessage(incoming);

        const selfId = currentUserIdRef.current;
        let partnerId = incomingMsg.sender_id;
        if (partnerId === selfId) partnerId = incomingMsg.receiver_id;

        if (!partnerId) {
          console.warn("Incoming DM missing partner id", incoming);
          return;
        }

        if (incomingMsg.thread_id) {
          setThreadIds((prev) => {
            if (prev.get(partnerId) === incomingMsg.thread_id) return prev;
            const next = new Map(prev);
            next.set(partnerId, incomingMsg.thread_id!);
            return next;
          });
        }

        setAllUsers((prev) => {
          if (prev.some((u) => u.id === partnerId)) return prev;

          fetchUserProfile(partnerId)
            .then((profile) => {
              if (profile) {
                setAllUsers((users) =>
                  users.map((u) =>
                    u.id === partnerId
                      ? {
                          ...u,
                          fullname:
                            profile.fullname || profile.username || "Unknown",
                          avatar_url: profile.avatar_url,
                        }
                      : u
                  )
                );
              }
            })
            .catch(console.error);

          return [...prev, { id: partnerId, fullname: "Loading..." }];
        });

        const isFromSelf = incomingMsg.sender_id === selfId;
        const isActiveConversation = partnerId === activeDmIdRef.current;
        const shouldIncrementUnread = !isFromSelf && !isActiveConversation;

        const existing = dmSummariesRef.current.get(partnerId) ?? {
          lastMessage: "",
          timestamp: new Date(0).toISOString(),
          unreadCount: 0,
        };

        const msgTimestamp = Number.isFinite(Date.parse(incomingMsg.timestamp))
          ? incomingMsg.timestamp
          : new Date().toISOString();

        const summary: DmSummary = {
          lastMessage: isFromSelf
            ? `You: ${incomingMsg.content || "Sent an attachment"}`
            : incomingMsg.content || "Sent an attachment",
          timestamp: msgTimestamp,
          unreadCount: isFromSelf
            ? 0
            : shouldIncrementUnread
              ? existing.unreadCount + 1
              : isActiveConversation
                ? 0
                : existing.unreadCount,
          status: "sent",
        };

        setDmSummaries((prev) => {
          const next = new Map(prev);
          next.set(partnerId, summary);
          return next;
        });
        updateDmListCache(partnerId, summary);
      } catch (e) {
        console.error("Failed to handle incoming DM:", e, raw);
      }
    };

    const handleError = (errorMessage: any) => {
      console.error("Socket DM Error:", errorMessage);
    };

    const onConnect = () => {};

    socket.on("connect", onConnect);
    socket.on("new_message", handleNewMessage);
    socket.on("dm_sent_confirmation", handleNewMessage);
    socket.on("receive_dm", handleNewMessage);
    socket.on("dm_error", handleError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("new_message", handleNewMessage);
      socket.off("dm_sent_confirmation", handleNewMessage);
      socket.off("receive_dm", handleNewMessage);
      socket.off("dm_error", handleError);
    };
  }, [socket]);

  useEffect(() => {
    const userItem = localStorage.getItem("user");
    if (userItem) {
      const loggedInUser = JSON.parse(userItem);
      setCurrentUser(loggedInUser);
    } else {
      router.push("/");
    }
  }, [router]);
  useEffect(() => {
    const handleProfileUpdate = () => {
      const userItem = localStorage.getItem("user");
      if (!userItem) return;

      const updatedUser = JSON.parse(userItem) as User;
      setCurrentUser(updatedUser);

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === updatedUser.id
            ? {
                ...u,
                fullname: updatedUser.fullname,

                avatar_url: updatedUser.avatar_url,
              }
            : u
        )
      );
    };

    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () =>
      window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);
  useEffect(() => {
    if (!currentUser?.id || !currentUser.avatar_url) return;

    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser?.id
          ? { ...u, avatar_url: currentUser.avatar_url }
          : u
      )
    );
  }, [currentUser?.avatar_url, currentUser?.id]);

  // The DM conversation list is owned by React Query. The old module-level
  // cache has been removed; React Query handles both caching and request
  // deduplication. We mirror the parsed result into local state that the
  // rest of the component already reads.
  const {
    data: dmListData,
    isError: dmListError,
    isLoading: isLoadingDmList,
  } = useQuery({
    queryKey: queryKeys.dmList(currentUser?.id ?? "__none__"),
    enabled: Boolean(currentUser?.id),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }

      const payload = await getUserDMs();

      const top = (payload as any)?.data ?? payload;
      let threads: any[] = [];
      if (Array.isArray(top)) {
        threads = top;
      } else if (Array.isArray((top as any)?.threads)) {
        threads = (top as any).threads;
      } else if (Array.isArray((top as any)?.data)) {
        threads = (top as any).data;
      } else {
        console.warn("Unexpected DM response shape", top);
        threads = [];
      }

      const users: User[] = [];
      const threadMap = new Map<string, string>();
      const summaryMap = new Map<string, DmSummary>();

      threads.forEach((thread: any) => {
        const threadId = thread.thread_id
          ? String(thread.thread_id)
          : thread._id
            ? String(thread._id)
            : thread.id
              ? String(thread.id)
              : undefined;

        const other = thread.other_user;

        if (other && other.id) {
          const otherId = String(other.id);
          const name =
            other.fullname ||
            other.username ||
            other.name ||
            other.display_name ||
            "Unknown User";

          users.push({
            id: otherId,
            fullname: name,
            avatar_url: other.avatar_url ?? null,
          });

          const rawThreadMessages = Array.isArray(thread.messages)
            ? thread.messages
            : [];
          const lastMessageObj =
            rawThreadMessages.length > 0
              ? rawThreadMessages[rawThreadMessages.length - 1]
              : (thread.last_message ?? thread.lastMessage ?? null);
          const content = lastMessageObj
            ? lastMessageObj.media_url || lastMessageObj.mediaUrl
              ? "Sent an attachment"
              : String(
                  lastMessageObj.content ?? lastMessageObj.message ?? ""
                )
            : "No messages yet.";
          const isSender = lastMessageObj?.sender_id === currentUser.id;
          summaryMap.set(otherId, {
            lastMessage: lastMessageObj
              ? `${isSender ? "You: " : `${name}: `}${content}`.trim()
              : "No messages yet.",
            timestamp: String(
              lastMessageObj?.timestamp ??
                thread.updated_at ??
                thread.updatedAt ??
                new Date(0).toISOString()
            ),
            unreadCount: Number(
              thread.unread_count ?? thread.unreadCount ?? 0
            ),
            status: lastMessageObj?.status ?? "sent",
          });

          if (threadId) {
            threadMap.set(otherId, threadId);
          }
        } else if (thread.recipientId) {
          const rid = String(thread.recipientId);
          const name = thread.recipientName || "Unknown User";

          users.push({
            id: rid,
            fullname: name,
          });

          if (threadId) {
            threadMap.set(rid, threadId);
          }
        }
      });

      return { users, threadMap, summaryMap };
    },
  });

  useEffect(() => {
    if (!dmListData) return;
    setAllUsers((prev) => {
      const byId = new Map(prev.map((u) => [u.id, u]));
      dmListData.users.forEach((u) => byId.set(u.id, u));
      return Array.from(byId.values());
    });
    setThreadIds((prev) => {
      const next = new Map(prev);
      dmListData.threadMap.forEach((threadId, partnerId) => {
        if (!next.has(partnerId)) next.set(partnerId, threadId);
      });
      return next;
    });
    setDmSummaries((prev) => mergeDmSummaries(dmListData.summaryMap, prev));
  }, [dmListData]);

  useEffect(() => {
    setIsLoading(isLoadingDmList || !currentUser?.id);
  }, [isLoadingDmList, currentUser?.id]);

  useEffect(() => {
    setError(
      dmListError
        ? "Failed to load conversations. Check console for details."
        : null
    );
  }, [dmListError]);

  const pageReadyCalledRef = useRef(false);
  useEffect(() => {
    if (pageReadyCalledRef.current) return;
    if (currentUser?.id && !isLoadingDmList) {
      pageReadyCalledRef.current = true;
      pageReady();
    }
  }, [currentUser?.id, isLoadingDmList, pageReady]);

  // Loads one older page; prepend compensation is handled by useChatScroll.
  const loadOlderMessages = useCallback(async () => {
    if (isFetchingPreviousPage || !hasPreviousPage) return false;
    try {
      await fetchPreviousPage();
      return true;
    } catch {
      return false;
    }
  }, [isFetchingPreviousPage, hasPreviousPage, fetchPreviousPage]);

  useEffect(() => {
    if (!selectedDM || !currentUser) return;

    const userExists = allUsers.some((u) => u.id === selectedDM);

    if (userExists) {
      setActiveDmId(selectedDM);
      return;
    }

    let isCancelled = false;

    const fetchAndAddUser = async () => {
      try {
        const profile = await fetchUserProfile(selectedDM);

        if (isCancelled) return;

        if (profile) {
          const newUser: User = {
            id: profile.id || selectedDM,
            fullname:
              profile.fullname ||
              profile.username ||
              profile.name ||
              "Unknown User",
            avatar_url: profile.avatar_url,
          };

          setAllUsers((prev) => {
            if (prev.some((u) => u.id === selectedDM)) return prev;
            return [...prev, newUser];
          });

          setActiveDmId(selectedDM);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch user profile for DM:", error);
        }
      }
    };

    fetchAndAddUser();

    return () => {
      isCancelled = true;
    };
  }, [selectedDM, currentUser?.id, allUsers.length]);
  const buildDmUploads = (
    content: string,
    files: File[],
    replyTo?: DMReplyTarget
  ) =>
    (files.length > 0 ? files : [null]).map((file, index) => {
      const contentForFile = index === 0 ? content : `${file?.name ?? "file"}`;
      const blobUrl = file ? URL.createObjectURL(file) : null;

      return {
        file,
        content: contentForFile,
        tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        optimisticContent: contentForFile,
        blobUrl,
        replyTo: index === 0 ? replyTo : null,
      };
    });

  const sendDmMutation = useMutation({
    mutationFn: async (vars: {
      conversationId: string;
      senderId: string;
      uploads: ReturnType<typeof buildDmUploads>;
    }) => {
      const { conversationId, senderId, uploads } = vars;
      let lastSavedThreadId = threadIds.get(conversationId) || undefined;
      const savedResults: Array<{
        upload: (typeof uploads)[number];
        saved: any;
      }> = [];

      for (const upload of uploads) {
        const dmPayload = {
          sender_id: senderId,
          receiver_id: conversationId,
          message: upload.content,
          mediaurl: upload.file ?? undefined,
          reply_to: upload.replyTo?.id,
        };

        const savedRaw = await uploaddm(dmPayload);
        const saved = savedRaw?.message ?? savedRaw?.data ?? savedRaw;
        if (!saved) {
          console.warn("DM upload returned no data");
        }

        const savedThreadId = saved?.thread_id
          ? String(saved.thread_id)
          : saved?.threadId
            ? String(saved.threadId)
            : undefined;
        if (savedThreadId) lastSavedThreadId = savedThreadId;

        savedResults.push({ upload, saved });
      }

      return { conversationId, lastSavedThreadId, savedResults };
    },
    onMutate: async (vars) => {
      const key = queryKeys.dmMessages(vars.conversationId);

      const state = queryClient.getQueryState(key);
      const cancelledFetch = state?.fetchStatus === "fetching";
      if (cancelledFetch) {
        await queryClient.cancelQueries({ queryKey: key });
      }

      const optimisticTimestamp = new Date().toISOString();
      const optimisticMessages = vars.uploads.map((upload) => ({
        id: upload.tempId,
        content: upload.optimisticContent,
        sender_id: vars.senderId,
        receiver_id: vars.conversationId,
        timestamp: optimisticTimestamp,
        media_url: upload.blobUrl,
        media_type: upload.file?.type ?? undefined,
        replyTo: upload.replyTo,
        status: "pending" as const,
      }));

      queryClient.setQueryData(
        key,
        (old: DmMessagesData | undefined) => {
          let next = old;
          optimisticMessages.forEach((message) => {
            next = insertIncomingIntoDataOrCreate(next, message);
          });
          return next;
        }
      );

      setDmSummaries((prev) => {
        const next = new Map(prev);
        const previewText =
          vars.uploads.length > 1 || (vars.uploads[0]?.file != null)
            ? "You: Sent an attachment"
            : `You: ${vars.uploads[0]?.content ?? ""}`;
        const summary: DmSummary = {
          lastMessage: previewText.trim(),
          timestamp: optimisticTimestamp,
          unreadCount: 0,
          status: "pending",
        };
        next.set(vars.conversationId, summary);
        return next;
      });

      const optimisticPreviewText =
        vars.uploads.length > 1 || (vars.uploads[0]?.file != null)
          ? "You: Sent an attachment"
          : `You: ${vars.uploads[0]?.content ?? ""}`;
      updateDmListCache(vars.conversationId, {
        lastMessage: optimisticPreviewText.trim(),
        timestamp: optimisticTimestamp,
        unreadCount: 0,
        status: "pending",
      });

      return { uploads: vars.uploads, cancelledFetch };
    },
    onSuccess: (result, _vars, context) => {
      const key = queryKeys.dmMessages(result.conversationId);

      for (const { upload, saved } of result.savedResults) {
        if (upload.blobUrl) URL.revokeObjectURL(upload.blobUrl);

        const savedId = saved
          ? (saved.id ?? saved.message_id ?? saved.clientMessageId)
          : undefined;
        const savedMediaUrl = saved?.media_url ?? saved?.mediaUrl ?? null;
        const savedContent = String(
          saved?.content ?? saved?.message ?? upload.content ?? ""
        );

        if (saved && (savedId || savedMediaUrl)) {
          const confirmed = normalizeDmMessage({
            ...saved,
            media_url: savedMediaUrl,
          });

queryClient.setQueryData(
          key,
          (old: DmMessagesData | undefined) => {
            if (!old) return old;
            const optimistic = flattenDmMessages(old).find(
              (m) => String(m.id) === upload.tempId
            );
            const confirmedMessage = confirmed.replyTo
              ? confirmed
              : {
                  ...confirmed,
                  replyTo: optimistic?.replyTo ?? confirmed.replyTo,
                };
            const next = replaceOptimisticById(
              old,
              upload.tempId,
              confirmedMessage
            );
            return insertIncomingIntoPages(next, confirmedMessage) ?? next;
          }
        );
        }

        const confirmedSummary: DmSummary = {
          lastMessage: (savedMediaUrl
            ? "You: Sent an attachment"
            : `You: ${savedContent}`
          ).trim(),
          timestamp: String(saved?.timestamp ?? new Date().toISOString()),
          unreadCount: 0,
          status: "sent",
        };
        setDmSummaries((prev) => {
          const next = new Map(prev);
          next.set(result.conversationId, confirmedSummary);
          return next;
        });
        updateDmListCache(result.conversationId, confirmedSummary);
      }

      if (result.lastSavedThreadId) {
        setThreadIds((prev) => {
          if (prev.get(result.conversationId) === result.lastSavedThreadId) {
            return prev;
          }
          const next = new Map(prev);
          next.set(result.conversationId, result.lastSavedThreadId!);
          return next;
        });
        void markThreadAsRead(result.lastSavedThreadId);
        void refreshMessageNotifications();
      }

      if (context?.cancelledFetch) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (error: any, vars, context) => {
      console.error("Failed to send DM via API:", error);
      const tempIds = new Set(
        (context?.uploads ?? vars.uploads).map((upload) => upload.tempId)
      );
      queryClient.setQueryData(
        queryKeys.dmMessages(vars.conversationId),
        (old: DmMessagesData | undefined) =>
          old ? markMessagesFailed(old, tempIds) : old
      );
      setDmSummaries((prev) => {
        const next = new Map(prev);
        const existing = next.get(vars.conversationId);
        if (existing) {
          next.set(vars.conversationId, { ...existing, status: "failed" });
        }
        return next;
      });
      updateDmListCache(vars.conversationId, {
        lastMessage:
          dmSummariesRef.current.get(vars.conversationId)?.lastMessage ??
          "Failed to send",
        timestamp:
          dmSummariesRef.current.get(vars.conversationId)?.timestamp ??
          new Date().toISOString(),
        unreadCount: 0,
        status: "failed",
      });
      (context?.uploads ?? vars.uploads).forEach((upload) => {
        if (upload.blobUrl) URL.revokeObjectURL(upload.blobUrl);
      });
      setToast({
        message: "file size excceded",
        type: "error",
        key: Date.now(),
      });
    },
  });

  const handleSendMessage = (
    content: string,
    files: File[],
    replyTo?: DMReplyTarget
  ) => {
    if (!currentUser || !activeDmId) return;
    if (!content.trim() && files.length === 0) return;

    sendDmMutation.mutate({
      conversationId: activeDmId,
      senderId: currentUser.id,
      uploads: buildDmUploads(content, files, replyTo),
    });
  };

  const handleSelectDm = useCallback(
    (userId: string) => {
      setActiveDmId(userId);
      router.push(`/messages?dm=${userId}`);
    },
    [router]
  );

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
  useEffect(() => {
    if (!activeDmId || !currentUser?.id) return;

    const markAsRead = async () => {
      try {
        if (activeMessages.length === 0) {
          return;
        }

        const threadId =
          threadIds.get(activeDmId) || activeMessages[0]?.thread_id;
        if (!threadId) {
          return;
        }

        await markThreadAsRead(threadId);

        setDmSummaries((prev) => {
          const next = new Map(prev);
          const existing = next.get(activeDmId);
          if (existing) {
            next.set(activeDmId, { ...existing, unreadCount: 0 });
          }
          return next;
        });

        await refreshMessageNotifications();
      } catch (error) {
        console.error("Failed to mark thread as read:", error);
      }
    };

    const timeoutId = setTimeout(markAsRead, 100);
    return () => clearTimeout(timeoutId);
  }, [
    activeDmId,
    currentUser?.id,
    activeMessages,
    threadIds,
    refreshMessageNotifications,
  ]);

  const conversations = useMemo(() => {
    return sortDmConversationsByLatest(
      allUsers.map((user) => {
        const fallbackSummary = dmSummaries.get(user.id);
        const lastMessage =
          fallbackSummary?.lastMessage || "No messages yet.";
        const timestamp =
          fallbackSummary?.timestamp || new Date(0).toISOString();
        const status = fallbackSummary?.status;

        const threadId = threadIds.get(user.id);
        const isActiveConversation = activeDmId === user.id;
        const unreadCount =
          isActiveConversation
            ? 0
            : threadId
              ? (unreadPerThread[threadId] ?? 0)
              : (fallbackSummary?.unreadCount ?? 0);

        return {
          user,
          lastMessage,
          timestamp,
          unreadCount,
          status,
        };
      })
    );
  }, [
    allUsers,
    currentUser?.id,
    unreadPerThread,
    dmSummaries,
    activeDmId,
    threadIds,
  ]);
  const activeUser = useMemo(() => {
    return allUsers.find((u) => u.id === activeDmId) || null;
  }, [allUsers, activeDmId]);

  return (
    <div className="flex h-screen min-h-0 w-full bg-slate-950 text-slate-100">
      {toast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <Toast
            key={toast.key}
            message={toast.message}
            type={toast.type}
            duration={4000}
            onClose={() => setToast(null)}
          />
        </div>
      )}
      <ChatList
        conversations={conversations}
        activeDmId={activeDmId}
        onSelectDm={handleSelectDm}
        isLoading={isLoading}
        error={error}
      />
      <div className="flex flex-1 flex-col">
        <div className="border-b border-slate-800/70 bg-black px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Direct Messages
              </h2>
              <p className="text-xs text-slate-400">
                Tap a friend to open the chat.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto">
            {conversations.map(({ user }) => {
              const isActive = activeDmId === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => handleSelectDm(user.id)}
                  className={`flex min-w-[64px] flex-col items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition-colors ${
                    isActive
                      ? "border-[#FFC341]/70 bg-[#FFC341]/10 text-[#FFC341]"
                      : "border-slate-800/70 bg-slate-900/60 text-slate-300"
                  }`}
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-800/70 bg-slate-800/60">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.fullname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-200">
                        {getInitials(user.fullname)}
                      </div>
                    )}
                  </div>
                  <span className="truncate text-center text-[11px] leading-tight">
                    {user.fullname.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <ChatWindow
            onLoadOlder={loadOlderMessages}
            hasMorePages={hasPreviousPage}
            isLoadingOlderMessages={isFetchingPreviousPage}
            isLoadingMessages={isLoadingDmMessages}
            activeUser={activeUser}
            messages={activeMessages}
            currentUser={currentUser}
            partnerId={activeDmId}
            threadId={activeThreadId}
            allUsers={allUsers}
            onSendMessage={handleSendMessage}
            onFileError={(msg) => setFileError(msg)}
            onOpenProfile={openUserProfile}
            onToast={(msg, type) =>
              setToast({ message: msg, type, key: Date.now() })
            }
          />
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}

export default function MessagesPageContent() {
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

  return (
    <>
      {toast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={3000}
            onClose={() => setToast(null)}
          />
        </div>
      )}
      <Suspense fallback={<div className="h-screen bg-black" />}>
        <MessagesPageContentInner />
      </Suspense>
    </>
  );
}
