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
import { Paperclip, Search, Send, Smile, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserDMs,
  uploaddm,
  markThreadAsRead,
  invalidateUserDmCache,
  searchDmMessages,
} from "@/api/message.api";
import { fetchUserProfile } from "@/api/profile.api";
import { useSocket } from "@/lib/socket/SocketProvider";
import MessageBubble from "./MessageBubble";
import MessageAttachment from "./MessageAttachment";
import { useMessageNotifications } from "@/contexts/MessageNotificationContext";
import Toast from "@/components/Toast";
import { useToast } from "@/contexts/ToastContext";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import UserProfileModal from "./UserProfileModal";
import { ScrollToBottomButton } from "@/components/ScrollToBottomButton";
import { isNearBottom } from "@/lib/scrollUtils";
// import { useMessageReactions } from "@/hooks/useMessageReactions";
// import { usePinnedMessages } from "@/hooks/usePinnedMessages";
import MessageSearchPanel from "./MessageSearchPanel";
// import PinnedMessagesBar from "./PinnedMessagesBar";
import { MessageSearchResult } from "@/api/types/message.types";
import { useDmMessages } from "@/hooks/useDmMessages";
import { queryKeys } from "@/lib/query/keys";
import {
  flattenDmMessages,
  insertIncomingIntoDataOrCreate,
  insertIncomingIntoPages,
  markMessagesFailed,
  normalizeDmMessage,
  replaceOptimisticById,
  resolveRepliesForThread,
} from "@/lib/dm/messageUtils";
import type {
  DmMessage as DirectMessage,
  DmMessagesData,
  DmReplyTarget,
} from "@/lib/dm/types";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

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
// 1. ChatList Component (Updated to show errors)

interface ChatListProps {
  conversations: { user: User; lastMessage: string; unreadCount: number }[];
  activeDmId: string | null;
  onSelectDm: (userId: string) => void;
  isLoading: boolean;
  error: string | null;
}

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
    return conversations.filter(
      ({ user, lastMessage }) =>
        user.fullname.toLowerCase().includes(lowered) ||
        lastMessage.toLowerCase().includes(lowered)
    );
  }, [conversations, query]);

  return (
    <aside className="hidden h-full w-80 flex-col border-r border-slate-800 bg-black p-4 backdrop-blur-lg lg:flex">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Direct Messages
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Catch up with teammates and friends in real time.
        </p>
      </div>

      <label className="group mb-4 flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 focus-within:border-indigo-500/60 focus-within:text-indigo-300">
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
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <li
                key={idx}
                className="animate-pulse rounded-xl border border-slate-800/60 bg-slate-900/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-800/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded-full bg-slate-800/70" />
                    <div className="h-3 w-3/4 rounded-full bg-slate-800/50" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4 text-center text-sm text-slate-400">
            No conversations found. Try another name.
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredConversations.map(({ user, lastMessage, unreadCount }) => {
              const isActive = activeDmId === user.id;
              return (
                <li
                  key={user.id}
                  onClick={() => onSelectDm(user.id)}
                  className={`group flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-indigo-500/40 hover:bg-slate-800/40 ${
                    isActive
                      ? "border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]"
                      : ""
                  }`}
                >
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-slate-700/60 bg-slate-800/60">
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm font-medium ${
                          isActive ? "text-slate-100" : "text-slate-200"
                        }`}
                      >
                        {user.fullname}
                      </p>
                      {unreadCount > 0 && !isActive && (
                        <span className="flex-shrink-0 bg-green-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 font-bold">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400 group-hover:text-slate-300">
                      {lastMessage || "No messages yet."}
                    </p>
                  </div>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-indigo-400" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};

// 2. ChatWindow Component (No changes needed)

interface ChatWindowProps {
  onLoadOlderMessages?: (container: HTMLDivElement) => void;
  isLoadingOlderMessages?: boolean;
  isLoadingMessages?: boolean;
  activeUser: User | null;
  messages: DirectMessage[];
  currentUser: User | null;
  partnerId: string | null;
  threadId: string | null;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
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
  onLoadOlderMessages,
  isLoadingOlderMessages,
  isLoadingMessages,
  activeUser,
  messages,
  currentUser,
  partnerId,
  threadId,
  allUsers,
  onSendMessage,
  messagesContainerRef,
  onToast,
  onOpenProfile,
}) => {
  // const messageIds = useMemo(
  //   () => messages.map((msg) => msg.id).filter(Boolean),
  //   [messages]
  // );

  // const { getReactionsForMessage, toggleReaction } = useMessageReactions({
  //   mode: "dm",
  //   currentUserId: currentUser?.id ?? null,
  //   messageIds,
  // });

  // const { pins, isPinned, togglePin, unpin, canPinMore } = usePinnedMessages({
  //   threadId,
  //   onError: (message) => onToast(message, "error"),
  // });

  useToast();
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<DMReplyTarget>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  interface SelectedFile {
    file: File;
    valid: boolean;
    errorReason?: string;
  }
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const dmAtBottomRef = useRef(true);
  const prevThreadRef = useRef<string | null>(null);

  const scrollDmToBottom = () => {
    dmAtBottomRef.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftInputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleDmScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = isNearBottom(container);
    dmAtBottomRef.current = isAtBottom;
    setShowScrollToBottom(!isAtBottom);

    if (container.scrollTop < 100) {
      onLoadOlderMessages?.(container);
    }
  };

  useEffect(() => {
    const isThreadSwitch = prevThreadRef.current !== threadId;
    prevThreadRef.current = threadId;

    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      if (isThreadSwitch) {
        dmAtBottomRef.current = true;
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
        setShowScrollToBottom(false);
        return;
      }

      if (dmAtBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowScrollToBottom(false);
        return;
      }

      setShowScrollToBottom(!isNearBottom(container));
    });
  }, [messages, threadId]);

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
  const scrollToMessage = useCallback(async (messageId: string | number) => {
    const idStr = String(messageId);
    const el =
      messageRefs.current[idStr] ??
      (document.querySelector(
        `[data-message-id="${idStr}"]`
      ) as HTMLElement | null);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("mention-highlight");
      setTimeout(() => el.classList.remove("mention-highlight"), 1500);
      return true;
    }
    return false;
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!threadId) return [];
      return searchDmMessages(threadId, query);
    },
    [threadId]
  );

  const handleSearchSelect = useCallback(
    async (result: MessageSearchResult) => {
      const success = await scrollToMessage(result.id);
      if (!success) {
        onToast("Could not find that message in this conversation.", "error");
      }
    },
    [scrollToMessage, onToast]
  );

  const canSend = draft.length > 0 || files.some((f) => f.valid);
  const handleSend = (value: string) => {
    const validFiles = files.filter((f) => f.valid).map((f) => f.file);
    if (value.trim().length === 0 && validFiles.length === 0) return;
    onSendMessage(value, validFiles, replyingTo);
    setDraft("");
    setFiles([]);
    setReplyingTo(null);
    requestAnimationFrame(() => {
      if (draftInputRef.current) {
        draftInputRef.current.style.height = "auto";
        draftInputRef.current.focus();
      }
    });
  };

  const MAX_FILE_SIZE_MB = 25;
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    const annotated: SelectedFile[] = selected.map((file) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
        return {
          file,
          valid: false,
          errorReason: `Too large (max ${MAX_FILE_SIZE_MB} MB)`,
        };
      if (!ALLOWED_TYPES.includes(file.type))
        return { file, valid: false, errorReason: "Unsupported file type" };
      return { file, valid: true };
    });
    const invalid = annotated.filter((f) => !f.valid);
    if (invalid.length > 0) {
      onToast(
        invalid.map((f) => `"${f.file.name}": ${f.errorReason}`).join("\n"),
        "error"
      );
    }
    setFiles((prev) => [...prev, ...annotated]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  // useEffect(() => {
  //   bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

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
      <header className="flex items-center justify-between border-b border-slate-800/80 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-800/70 bg-slate-900/70">
            {activeUser.avatar_url ? (
              <img
                src={activeUser.avatar_url}
                alt={activeUser.fullname}
                className="h-full w-full cursor-pointer object-cover"
                onClick={() =>
                  onOpenProfile(
                    activeUser.id,
                    activeUser.fullname,
                    activeUser.avatar_url
                  )
                }
              />
            ) : (
              <div
                onClick={() =>
                  onOpenProfile(
                    activeUser.id,
                    activeUser.fullname,
                    activeUser.avatar_url
                  )
                }
                className="flex h-full w-full cursor-pointer items-center justify-center text-sm font-semibold uppercase text-slate-200"
              >
                {getInitials(activeUser.fullname)}
              </div>
            )}
          </div>
          <div>
            <h3
              onClick={() =>
                onOpenProfile(
                  activeUser.id,
                  activeUser.fullname,
                  activeUser.avatar_url
                )
              }
              className="text-base font-semibold text-slate-100 cursor-pointer hover:text-white"
            >
              {activeUser.fullname}
            </h3>
            <p className="text-xs text-slate-400">
              Direct message • {messages.length}{" "}
              {messages.length === 1 ? "message" : "messages"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            disabled={!threadId}
            className="rounded-full border border-slate-800/70 p-2 transition-colors hover:border-indigo-500/50 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Search in conversation"
            title="Search messages"
          >
            <Search className="h-4 w-4" />
          </button>
          {/* <span className="text-[10px] text-slate-500">
            {canPinMore ? `${pins.length}/3 pins` : "3/3 pins"}
          </span> */}
        </div>
      </header>

      {/* <PinnedMessagesBar
        pins={pins}
        onJumpTo={(messageId) => {
          void scrollToMessage(messageId);
        }}
        onUnpin={(messageId) => {
          void unpin(messageId, true);
        }}
        isDm
      /> */}

      <MessageSearchPanel
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={handleSearch}
        onSelectResult={handleSearchSelect}
        placeholder="Search in this conversation..."
        title="Search Conversation"
      />

      <div className="relative flex-1 flex flex-col min-h-0">
        <div
          ref={messagesContainerRef}
          onScroll={handleDmScroll}
          className="chat-scroll flex-1 space-y-0 overflow-y-auto px-6 py-6 pr-3 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-900"
        >
        {isLoadingOlderMessages && (
          <div className="flex justify-center py-2">
            <div className="flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 shadow-lg shadow-black/20">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-indigo-400" />
              Loading older messages...
            </div>
          </div>
        )}
        {groupedMessages.length === 0 ? (
          isLoadingMessages ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-500 border-t-indigo-400" />
              <p className="text-sm">Loading messages...</p>
            </div>
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
                        ref={(el) => {
                          messageRefs.current[msg.id] = el;
                        }}
                      >
                        <MessageBubble
                          isSender={group.isSender}
                          message={msg}
                          // reactions={getReactionsForMessage(msg.id)}
                          // onReact={(emoji) => {
                          //   if (currentUser?.id) {
                          //     void toggleReaction(
                          //       msg.id,
                          //       emoji,
                          //       currentUser.id
                          //     );
                          //   }
                          // }}
                          showPinAction={
                            !!msg.id && !String(msg.id).startsWith("temp-")
                          }
                          // isPinned={isPinned(msg.id)}
                          // onPin={() => {
                          //   void togglePin(msg.id, true);
                          // }}
                          onReply={() => {
                            setReplyingTo({
                              id: msg.id,
                              content: msg.content,
                              author: group.isSender ? "You" : group.name,
                              mediaUrl: msg.media_url,
                              mediaType: msg.media_type,
                            });
                          }}
                          onReplyPreviewClick={scrollToMessage}
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
        <div ref={bottomRef} />
        </div>

        {showScrollToBottom && (
          <ScrollToBottomButton
            onClick={scrollDmToBottom}
            className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          />
        )}
      </div>

      <footer className="relative border-t border-slate-800/80 bg-slate-900/70 px-6 py-5">
        {files.length > 0 && (
          <div className="mb-3 space-y-2">
            {files.map((entry, index) => (
              <div
                key={`${entry.file.name}-${entry.file.lastModified}-${index}`}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                  entry.valid
                    ? "border-slate-800/70 bg-slate-900/60 text-slate-200"
                    : "border-rose-500/30 bg-rose-950/30 text-slate-500 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Paperclip
                    className={`h-4 w-4 ${
                      entry.valid ? "text-indigo-300" : "text-slate-600"
                    }`}
                  />
                  <span className="truncate max-w-[220px]">
                    {entry.file.name}
                  </span>
                  <span className="text-xs">
                    {entry.valid
                      ? `${Math.round(entry.file.size / 1024)} KB`
                      : entry.errorReason}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="rounded-full border border-slate-800/70 p1 text-slate-400 transition-colors hover:border-rose-500/50 hover:text-rose-300"
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {replyingTo && (
          <div className="mb-2 rounded-lg border-l-4 border-blue-500 bg-slate-800 px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 text-sm text-slate-300">
                <span className="shrink-0">
                  Replying to{" "}
                  <span className="font-semibold">
                    {replyingTo.author || "User"}
                  </span>
                  :
                </span>

                {replyingTo.content?.startsWith("[GIF]") ? (
                  <img
                    src={replyingTo.content.replace("[GIF]", "")}
                    alt="GIF preview"
                    className="h-10 w-10 rounded object-cover border border-slate-600 flex-shrink-0"
                  />
                ) : isCodeBlock(replyingTo.content) ? (
                  <div className="max-w-xs truncate rounded bg-slate-900 border border-slate-700 px-2 font-mono text-xs text-green-400">
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
                          className="h-9 w-9 flex-shrink-0 rounded object-cover border border-slate-600"
                        />
                      ) : (
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-slate-600 bg-slate-800 text-slate-300">
                          <Paperclip className="h-4 w-4" />
                        </span>
                      ))}
                    <span className="italic truncate">
                      {replyingTo.content ||
                        (replyingTo.mediaUrl ? "Attachment" : "")}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  requestAnimationFrame(() => {
                    draftInputRef.current?.focus();
                  });
                }}
                className="ml-3 text-slate-400 transition hover:text-white"
                aria-label="Cancel reply"
              ></button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-4 py-3">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-msvideo,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-slate-800/70 p-2 text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Add reaction"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="rounded-full border border-slate-800/70 p-2 text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
          >
            <Smile className="h-4 w-4" />
          </button>

          <textarea
            ref={draftInputRef}
            rows={1}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) {
                return;
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend(draft);
              }
            }}
            placeholder={`Message @${recipientFirstName}`}
            className="max-h-32 min-h-6 flex-1 resize-none overflow-y-auto bg-transparent py-0 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
          />
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-20 left-6 z-50"
            >
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={(emojiData) => {
                  setDraft((prev) => prev + emojiData.emoji);
                }}
              />
            </div>
          )}

          <button
            onClick={() => handleSend(draft)}
            disabled={!canSend}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition ${
              canSend
                ? "bg-indigo-500/90 hover:bg-indigo-400"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
          >
            <span>Send</span>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};

// =============================================================
// 3. Main Page Content (Parent Component with updated logic)
// =============================================================

function MessagesPageContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDM = searchParams.get("dm");
  const { refreshCount: refreshMessageNotifications, unreadPerThread } =
    useMessageNotifications();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [threadIds, setThreadIds] = useState<Map<string, string>>(new Map());
  const [dmSummaries, setDmSummaries] = useState<
    Map<string, { lastMessage: string; timestamp: string; unreadCount: number }>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setFileError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastAutoScrollDmRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
    roles?: string[];
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
  const invalidateDmCacheForCurrentUser = () => {
    if (currentUser?.id) {
      invalidateUserDmCache(currentUser.id);
    }
  };

  useEffect(() => {
    activeDmIdRef.current = activeDmId;
  }, [activeDmId]);

  // ── DM messages: TanStack Query is the single source of truth ──────────
  // The active conversation's messages live in the query cache (keyed by the
  // other user's id). Socket events and the send mutation update the same
  // cache directly, so navigating away and back never loses messages.
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

  // Socket event wiring on the application-level socket.
  // DM messages themselves are inserted into the TanStack Query cache by
  // RealtimeCacheSync; this handler only reconciles the conversation list
  // (users + last-message summaries + unread counts).
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (raw: any) => {
      try {
        if (!raw) return;
        invalidateDmCacheForCurrentUser();
        // Unwrap common envelope shapes
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

        // Ignore channel messages; this handler only reconciles the DM list.
        const isDm =
          incoming.thread_id != null ||
          incoming.threadId != null ||
          receiver !== "";
        if (!isDm) return;

        const incomingMsg = normalizeDmMessage(incoming);

        const selfId = currentUser?.id;
        let partnerId = incomingMsg.sender_id;
        if (partnerId === selfId) partnerId = incomingMsg.receiver_id;

        if (!partnerId) {
          console.warn("Incoming DM missing partner id", incoming);
          return;
        }

        // Learn the thread id for new DM threads so the messages query can
        // enable and reconcile immediately.
        if (incomingMsg.thread_id) {
          setThreadIds((prev) => {
            if (prev.get(partnerId) === incomingMsg.thread_id) return prev;
            const next = new Map(prev);
            next.set(partnerId, incomingMsg.thread_id!);
            return next;
          });
        }

        // ==========================================
        // NEW CODE ADDED HERE: Add new users to list
        // ==========================================
        setAllUsers((prev) => {
          if (prev.some((u) => u.id === partnerId)) return prev;

          // Asynchronously fetch their real profile data
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
        // ==========================================

        setDmSummaries((prev) => {
          const next = new Map(prev);
          const existing = next.get(partnerId) ?? {
            lastMessage: "",
            timestamp: new Date(0).toISOString(),
            unreadCount: 0,
          };

          const isFromSelf = incomingMsg.sender_id === selfId;
          const isActiveConversation = partnerId === activeDmIdRef.current;
          const shouldIncrementUnread = !isFromSelf && !isActiveConversation;

          next.set(partnerId, {
            lastMessage: isFromSelf
              ? `You: ${incomingMsg.content || "Sent an attachment"}`
              : incomingMsg.content || "Sent an attachment",
            timestamp: incomingMsg.timestamp,
            unreadCount: isFromSelf
              ? 0
              : shouldIncrementUnread
                ? existing.unreadCount + 1
                : isActiveConversation
                  ? 0
                  : existing.unreadCount,
          });
          return next;
        });
      } catch (e) {
        console.error("Failed to handle incoming DM:", e, raw);
      }
    };

    const handleError = (errorMessage: any) => {
      console.error("Socket DM Error:", errorMessage);
    };

    const onConnect = () => {
      // Connected
    };

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

  // Effect to get user and initialize socket
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

  // Removed duplicate socket setup effect; handled in single effect above

  // --- EFFECT TO FETCH HISTORICAL DMS (with improved error logging) ---
  useEffect(() => {
    // Ensure we have a valid user before fetching
    if (currentUser && currentUser.id) {
      const fetchDms = async () => {
        try {
          setIsLoading(true);
          setError(null);

          const payload = await getUserDMs();

          // Normalize different possible response shapes
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
          const summaryMap = new Map<
            string,
            { lastMessage: string; timestamp: string; unreadCount: number }
          >();

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

          setAllUsers(users);
          setThreadIds(threadMap);
          setDmSummaries(summaryMap);
        } catch (error: any) {
          console.error("--- DETAILED FETCH ERROR ---");
          console.error(error);
          if (error.response) {
            console.error("Backend Response Data:", error.response.data);
          }
          setError("Failed to load conversations. Check console for details.");
        } finally {
          setIsLoading(false);
          pageReady();
        }
      };
      fetchDms();
    }
  }, [currentUser]);

  // Older-message pagination is handled by useDmMessages (useInfiniteQuery).
  // This wrapper preserves the scroll position when a previous page is
  // prepended.
  const loadingOlderStateRef = useRef<{
    node: HTMLDivElement | null;
    height: number;
    top: number;
  } | null>(null);

  const loadOlderMessages = useCallback(
    (container?: HTMLDivElement | null) => {
      if (isFetchingPreviousPage || !hasPreviousPage) return;

      const node = container ?? messagesContainerRef.current;
      if (node) {
        loadingOlderStateRef.current = {
          node,
          height: node.scrollHeight,
          top: node.scrollTop,
        };
      }
      fetchPreviousPage();
    },
    [isFetchingPreviousPage, hasPreviousPage, fetchPreviousPage]
  );

  useEffect(() => {
    if (isFetchingPreviousPage) return;
    const saved = loadingOlderStateRef.current;
    if (!saved) return;
    loadingOlderStateRef.current = null;

    requestAnimationFrame(() => {
      if (!saved.node) return;
      saved.node.scrollTop = saved.top + (saved.node.scrollHeight - saved.height);
    });
  }, [isFetchingPreviousPage]);

  // Effect to set the active DM based on the URL parameter
  // If user not in allUsers, fetch their profile and add them
  // Effect to set the active DM based on the URL parameter
  // If user not in allUsers, fetch their profile and add them
  useEffect(() => {
    if (!selectedDM || !currentUser) return;

    // Check if user already exists
    const userExists = allUsers.some((u) => u.id === selectedDM);

    if (userExists) {
      // User exists, just set as active
      setActiveDmId(selectedDM);
      return; // Exit early, no fetch needed
    }

    // User doesn't exist, fetch their profile
    let isCancelled = false;

    const fetchAndAddUser = async () => {
      try {
        const profile = await fetchUserProfile(selectedDM);

        // Don't update if effect was cleaned up
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

          // Add user to allUsers if not already present
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

    // Cleanup function
    return () => {
      isCancelled = true;
    };
  }, [selectedDM, currentUser?.id, allUsers.length]); // Use allUsers.length instead of allUsers
  // Empty dependency array is okay here due to the functional updates.
  // Effect for handling incoming socket events
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
        invalidateDmCacheForCurrentUser();

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

      // If a GET for this conversation is in flight (e.g. the initial page0
      // fetch), cancel it so it cannot overwrite the optimistic insert with a
      // snapshot that predates the new message. Track whether we cancelled so
      // onSuccess can reconcile the page afterwards.
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
        next.set(vars.conversationId, {
          lastMessage: previewText.trim(),
          timestamp: optimisticTimestamp,
          unreadCount: 0,
        });
        return next;
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
            // Keep the optimistic reply preview when the server response does
            // not echo the reply target.
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

        setDmSummaries((prev) => {
          const next = new Map(prev);
          next.set(result.conversationId, {
            lastMessage: (savedMediaUrl
              ? "You: Sent an attachment"
              : `You: ${savedContent}`
            ).trim(),
            timestamp: String(
              saved?.timestamp ?? new Date().toISOString()
            ),
            unreadCount: 0,
          });
          return next;
        });
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

      // Reconcile the page we cancelled during the send so any messages the
      // aborted GET had not yet returned are picked up from the server.
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
    async (userId: string, fallbackName?: string, fallbackAvatar?: string) => {
      if (!userId) return;

      setSelectedUser({
        id: userId,
        username: fallbackName || "Unknown User",
        avatarUrl: fallbackAvatar || "/User_profil.png",
        about: "Loading bio...",
        roles: [],
      });
      setIsProfileOpen(true);

      try {
        const token = localStorage.getItem("access_token");

        // Try the generic profile endpoint with exhaustive field names
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token || ""}` },
        });

        let profile: any = null;

        if (response.ok) {
          profile = await response.json();
        } else {
          // Fallback to the existing fetchUserProfile helper
          profile = await fetchUserProfile(userId);
        }

        if (!profile) throw new Error("Profile not found");

        // Exhaustive extraction — covers user/users nesting and flat shapes
        const resolvedUsername =
          profile.user?.username ||
          profile.users?.username ||
          profile.username ||
          profile.fullname ||
          profile.name ||
          fallbackName ||
          "Unknown User";

        const resolvedAvatar =
          profile.user?.avatar_url ||
          profile.users?.avatar_url ||
          profile.avatar_url ||
          fallbackAvatar ||
          "/User_profil.png";

        const resolvedBio =
          profile.user?.bio ||
          profile.users?.bio ||
          profile.bio ||
          profile.about ||
          "No bio yet...";

        setSelectedUser((prev) => {
          if (!prev || prev.id !== userId) return prev;
          return {
            id: userId,
            username: resolvedUsername,
            avatarUrl: resolvedAvatar,
            about: resolvedBio,
            roles: Array.isArray(profile.roles)
              ? profile.roles
                  .map((role: any) =>
                    typeof role === "string" ? role : role?.name
                  )
                  .filter(Boolean)
              : [],
          };
        });
      } catch (error) {
        console.error("openUserProfile fetch failed:", error);
        setSelectedUser((prev) =>
          prev ? { ...prev, about: "No bio available." } : null
        );
      }
    },
    []
  );
  // Mark thread as read when user opens a DM
  useEffect(() => {
    if (!activeDmId || !currentUser?.id) return;

    const markAsRead = async () => {
      try {
        // Get messages for this DM to find the thread_id
        if (activeMessages.length === 0) {
          return;
        }

        // Get thread_id from the thread map or any message
        const threadId =
          threadIds.get(activeDmId) || activeMessages[0]?.thread_id;
        if (!threadId) {
          return;
        }

        // Mark thread as read
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

    // Small delay to ensure messages are loaded
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
    return allUsers
      .map((user) => {
        const fallbackSummary = dmSummaries.get(user.id);
        const lastMessage =
          fallbackSummary?.lastMessage || "No messages yet.";
        const timestamp =
          fallbackSummary?.timestamp || new Date(0).toISOString();

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
        };
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      });
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

  const lastMessageId = activeMessages[activeMessages.length - 1]?.id;

  useEffect(() => {
    lastAutoScrollDmRef.current = null;
  }, [activeDmId]);

  useEffect(() => {
    if (!activeDmId || !lastMessageId) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    // A small timeout ensures the DOM has actually painted the new message
    setTimeout(() => {
      const isInitialLoad = lastAutoScrollDmRef.current !== activeDmId;

      // Increased threshold to 400px to better catch multi-line texts or attachments
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        400;

      if (isInitialLoad || isNearBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: isInitialLoad ? "auto" : "smooth",
        });
        lastAutoScrollDmRef.current = activeDmId;
      }
    }, 100);
  }, [activeDmId, lastMessageId]);

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
                      ? "border-indigo-400/70 bg-indigo-500/10 text-indigo-100"
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
            onLoadOlderMessages={loadOlderMessages}
            isLoadingOlderMessages={isFetchingPreviousPage}
            isLoadingMessages={isLoadingDmMessages}
            activeUser={activeUser}
            messages={activeMessages}
            currentUser={currentUser}
            partnerId={activeDmId}
            threadId={activeThreadId}
            messagesContainerRef={messagesContainerRef}
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
