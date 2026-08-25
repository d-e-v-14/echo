"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import dynamic from "next/dynamic";
import MessageContentWithMentions from "./MessageContentWithMentions";
import {
  searchDmMessages,
  searchServerMessages,
  uploadMessage,
} from "@/api/message.api";

import { getUserAvatar } from "@/api/profile.api";
import { useSocket } from "@/lib/socket/SocketProvider";
import Toast from "@/components/Toast";
import { MessageSearchResult } from "@/api/types/message.types";

import { apiClient as profileApiClient } from "@/api/axios";

import { useChannelMessages } from "@/hooks/useChannelMessages";
import { useChannelRealtime } from "@/hooks/useChannelRealtime";
import { useChannelPermissions } from "@/hooks/useChannelPermissions";
import { useChannelMembers } from "@/hooks/useChannelMembers";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTyping } from "@/hooks/useTyping";
import { tokenStore } from "@/lib/auth/tokenStore";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageVirtualizer } from "@/components/chat/MessageVirtualizer";
import { ScrollToBottomButton } from "@/components/ScrollToBottomButton";
import { resolveInitialScrollTarget } from "@/lib/channels/scrollBehavior";
import { chatScrollStore } from "@/lib/chat/scrollStore";
import { isNearBottom } from "@/lib/scrollUtils";
import { useChatScroll } from "@/hooks/useChatScroll";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";

import { ChannelMessage, DEFAULT_AVATAR } from "@/lib/channels/types";
import {
  validateRoleMentions,
  validateUserMentions,
} from "@/lib/channels/mentions";
import { extractAvatarFromRaw } from "@/lib/channels/messageUtils";
import InlineSpinner from "@/components/loading/InlineSpinner";

const VideoPanel = dynamic(() => import("./VideoPanel"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
      <InlineSpinner size="md" />
    </div>
  ),
});

const UserProfileModal = dynamic(() => import("./UserProfileModal"), {
  ssr: false,
});

const conversationScrollKey = (channelId: string) => `ch:${channelId}`;

interface ChatWindowProps {
  onLoadOlderMessages?: () => void;
  channelId: string;
  isDM: boolean;
  currentUserId: string;
  localStream?: MediaStream | null;
  remoteStreams?: { id: string; stream: MediaStream }[];
  serverId?: string;
  threadId?: string;
  channelName?: string;
}

export default forwardRef(function ChatWindow(
  {
    channelId,
    currentUserId,
    localStream = null,
    remoteStreams = [],
    serverId,
    threadId,
    channelName,
  }: ChatWindowProps,
  ref
) {
  const { connected } = useSocket();

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>(
    {}
  );
  const avatarCacheRef = useRef<
    Record<string, { url: string; updatedAt: number }>
  >({});
  const [micOn, setMicOn] = useState<boolean>(true);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
    key: number;
  } | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] =
    useState<string>(DEFAULT_AVATAR);
  const [replyingTo, setReplyingTo] = useState<ChannelMessage | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [currentMentionIndex, setCurrentMentionIndex] = useState(0);
  const [roleModal, setRoleModal] = useState<{
    open: boolean;
    role: string;
    users: { id: string; username: string; avatarUrl: string }[];
  }>({
    open: false,
    role: "",
    users: [],
  });
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
    roles?: { id: string; name: string; color: string }[];
  } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const currentChannelIdRef = useRef(channelId);

  useEffect(() => {
    currentChannelIdRef.current = channelId;
  }, [channelId]);

  const getAvatarUrl = useCallback(async (userId: string): Promise<string> => {
    const cached = avatarCacheRef.current[userId];

    if (cached && Date.now() - cached.updatedAt < 5 * 60 * 1000) {
      return cached.url;
    }

    try {
      const avatarUrl = await getUserAvatar(userId);
      const finalUrl = avatarUrl || DEFAULT_AVATAR;

      avatarCacheRef.current[userId] = {
        url: `${finalUrl}?t=${Date.now()}`,
        updatedAt: Date.now(),
      };

      return avatarCacheRef.current[userId].url;
    } catch {
      return DEFAULT_AVATAR;
    }
  }, []);

  const resolveAvatarUrl = useCallback(
    async (userId: string, raw?: unknown): Promise<string> => {
      const directUrl = extractAvatarFromRaw(raw);

      if (directUrl) {
        return `${directUrl}?t=${Date.now()}`;
      }

      return getAvatarUrl(userId);
    },
    [getAvatarUrl]
  );

  const {
    messages,
    loadingMessages,
    loadingMore,
    hasMore,
    isInitialLoadDone,
    loadMessages,
    addOptimistic,
    reconcileTemp,
    dropTemp,
    markFailed,
    updateMessages,
  } = useChannelMessages({
    channelId,
    currentUserId,
    resolveAvatarUrl,
  });

  const { permissions, permissionError, setPermissionError } =
    useChannelPermissions(channelId, serverId);

  const {
    currentUsername,
    serverRoles,
    currentUserRoleIds,
    validUsernames,
    validRoleNames,
  } = useChannelMembers({ serverId, currentUserId });

  const {
    lastReadTimestamp,
    unreadMentions,
    unreadMentionCount,
    unreadDividerIndex,
    markUnreadMentionsAsRead,
    updateLastRead,
  } = useUnreadMessages({ channelId, currentUserId, messages });

  const { typingUsers, sendTyping } = useTyping({ channelId, currentUserId });

  const reactionMode = threadId && !serverId ? "dm" : "channel";

  const registerMessageRef = useCallback(
    (id: string | number, el: HTMLDivElement | null) => {
      messageRefs.current[id] = el;
    },
    []
  );


  useEffect(() => {
    let cancelled = false;

    const loadCurrentUserAvatar = async () => {
      if (!currentUserId) return;

      try {
        const res = await profileApiClient.get("/api/profile/getProfile");
        const profile = res.data?.user;
        if (!profile?.avatar_url) return;

        const freshUrl = `${profile.avatar_url}?t=${Date.now()}`;
        if (cancelled) return;

        setCurrentUserAvatar(freshUrl);
        avatarCacheRef.current[currentUserId] = {
          url: freshUrl,
          updatedAt: Date.now(),
        };

        updateMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUserId
              ? { ...msg, avatarUrl: freshUrl }
              : msg
          )
        );
      } catch {}
    };

    loadCurrentUserAvatar();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, updateMessages]);

  useEffect(() => {
    const missingSenders = Array.from(
      new Set(
        messages
          .filter(
            (msg) =>
              msg.senderId &&
              msg.senderId !== currentUserId &&
              (!msg.avatarUrl || msg.avatarUrl === DEFAULT_AVATAR)
          )
          .map((msg) => String(msg.senderId))
      )
    );

    if (missingSenders.length === 0) return;

    let cancelled = false;

    const hydrateMissingAvatars = async () => {
      for (const senderId of missingSenders) {
        const avatarUrl = await getUserAvatar(senderId);
        if (cancelled || !avatarUrl || avatarUrl === DEFAULT_AVATAR) {
          continue;
        }

        updateMessages((prev) =>
          prev.map((msg) =>
            String(msg.senderId) === senderId &&
            (!msg.avatarUrl || msg.avatarUrl === DEFAULT_AVATAR)
              ? { ...msg, avatarUrl }
              : msg
          )
        );
      }
    };

    hydrateMissingAvatars();

    return () => {
      cancelled = true;
    };
  }, [messages, currentUserId, updateMessages]);

  const highlightMessage = useCallback((messageId: string | number) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      el?.classList.add("mention-highlight");
      setTimeout(() => el?.classList.remove("mention-highlight"), 2000);
    }, 100);
  }, []);

  const handleReconnect = useCallback(() => {
    void loadMessages();
  }, [loadMessages]);

  useChannelRealtime({
    channelId,
    currentUsername,
    onHighlight: highlightMessage,
    onReconnect: handleReconnect,
  });

  const handleReply = useCallback((message: ChannelMessage) => {
    setReplyingTo(message);
  }, []);

  const conversationKey = conversationScrollKey(channelId);

  // Read-only scroll side effects (read markers). Must never scroll.
  const handleScrolledExtra = useCallback(
    (container: HTMLDivElement) => {
      if (messages.length === 0 || !currentUserId) return;

      const isAtBottom = isNearBottom(container, 50);

      if (isAtBottom) {
        updateLastRead(messages[messages.length - 1].timestamp);
        void markUnreadMentionsAsRead();
        return;
      }

      const viewportBottom = container.scrollTop + container.clientHeight;
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const el = messageRefs.current[msg.id];
        if (!el || el.offsetTop > viewportBottom) continue;
        const existing = lastReadTimestamp
          ? new Date(lastReadTimestamp).getTime()
          : 0;
        const next = new Date(msg.timestamp).getTime();
        if (next > existing) {
          updateLastRead(msg.timestamp);
          void markUnreadMentionsAsRead();
        }
        break;
      }
    },
    [messages, currentUserId, lastReadTimestamp, updateLastRead, markUnreadMentionsAsRead, messageRefs]
  );

  const handlePositioned = useCallback(
    (kind: "bottom" | "element") => {
      if (kind !== "bottom") return;
      const last = messages[messages.length - 1];
      if (last) updateLastRead(last.timestamp);
      void markUnreadMentionsAsRead();
    },
    [messages, updateLastRead, markUnreadMentionsAsRead]
  );

  const loadOlder = useCallback(
    () => loadMessages(true),
    [loadMessages]
  );

  const scroll = useChatScroll({
    conversationKey,
    containerRef: messagesContainerRef,
    messages,
    messageRefs,
    ready: !loadingMessages && messages.length > 0,
    hasMore,
    loadingMore,
    onLoadOlder: loadOlder,
    resolveInitialTarget: (msgs) => {
      const target = resolveInitialScrollTarget(
        msgs as Parameters<typeof resolveInitialScrollTarget>[0],
        currentUserId,
        lastReadTimestamp,
        chatScrollStore.get(conversationScrollKey(channelId)).anchor
      );
      if (target.kind === "anchor") {
        return {
          kind: "element",
          messageId: target.anchor.messageId,
          offset: target.anchor.offset,
        };
      }
      if (target.kind === "first-unread") {
        const firstUnread = msgs[target.index];
        if (firstUnread) {
          return { kind: "element", messageId: firstUnread.id };
        }
      }
      return { kind: "bottom" };
    },
    onPositioned: handlePositioned,
    onScrolledExtra: handleScrolledExtra,
  });

  useEffect(() => {
    messageRefs.current = {};
  }, [channelId]);

  const jumpToNextMention = useCallback(() => {
    if (unreadMentions.length === 0) return;

    const targetMention =
      unreadMentions[currentMentionIndex % unreadMentions.length];
    void scroll.scrollToMessage(targetMention.messageId, { highlightMs: 2000 });
    setCurrentMentionIndex((prev) => prev + 1);
  }, [unreadMentions, currentMentionIndex, scroll]);

  const openProfile = useCallback(
    async (userId: string, username?: string, fallbackAvatar?: string) => {
      if (!userId) return;

      const safeUsername = username || "Unknown";
      const safeAvatar = fallbackAvatar || DEFAULT_AVATAR;

      setSelectedUser({
        id: userId,
        username: safeUsername,
        avatarUrl: safeAvatar,
        about: "Loading bio...",
        roles: [],
      });
      setIsProfileOpen(true);

      try {
        const token = await tokenStore.ensureAccessToken();
        if (!token || !serverId) return;

        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/newserver/${serverId}/members/${userId}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        setSelectedUser({
          id: userId,
          username:
            data.user?.username ||
            data.users?.username ||
            data.username ||
            safeUsername,
          avatarUrl:
            data.user?.avatar_url ||
            data.users?.avatar_url ||
            data.avatar_url ||
            safeAvatar,
          about:
            data.user?.bio || data.users?.bio || data.bio || "No bio yet...",
          roles:
            data.roles?.map((r: any) => ({
              id: r.id || r.role_id,
              name: r.name,
              color: r.color || "#374151",
            })) || [],
        });
      } catch {
        setSelectedUser((prev) =>
          prev ? { ...prev, about: "No bio available." } : null
        );
      }
    },
    [serverId]
  );

  const handleUsernameClick = useCallback(
    async (userId: string, username: string) => {
      const fromMessages = messages.find(
        (msg) =>
          msg.username?.toLowerCase() === username.toLowerCase() &&
          msg.senderId &&
          !String(msg.senderId).startsWith("temp-") &&
          String(msg.senderId) !== msg.username
      );

      if (fromMessages?.senderId) {
        const avatarUrl =
          avatarCacheRef.current[String(fromMessages.senderId)]?.url ||
          fromMessages.avatarUrl ||
          DEFAULT_AVATAR;
        await openProfile(String(fromMessages.senderId), username, avatarUrl);
        return;
      }

      await openProfile(userId, username, DEFAULT_AVATAR);
    },
    [openProfile, messages]
  );

  const handleRoleMentionClick = useCallback(
    async (roleName: string) => {
      if (!serverId) return;

      try {
        const token = await tokenStore.ensureAccessToken();
        if (!token) return;
        const url = `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/newserver/${serverId}/roles/${encodeURIComponent(
          roleName.trim()
        )}/members`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch users for role: ${roleName}`);
        }

        const data = await response.json();
        setRoleModal({
          open: true,
          role: roleName,
          users: data.users || [],
        });
      } catch {
        setRoleModal({
          open: true,
          role: roleName,
          users: [],
        });
      }
    },
    [serverId]
  );

  const sendSingleMessage = useCallback(
    async (text: string, file: File | null) => {
      if (text.trim() === "" && !file) return;

      if (permissions && !permissions.canSend) {
        let errorMsg =
          "You don't have permission to send messages in this channel.";
        if (permissions.channelType === "read_only") {
          errorMsg =
            "This is a read-only channel. Only admins and moderators can send messages.";
        } else if (permissions.channelType === "role_restricted") {
          errorMsg =
            "You need specific roles to send messages in this channel.";
        }
        setPermissionError(errorMsg);
        setTimeout(() => setPermissionError(null), 5000);
        return;
      }

      const roleValidation = validateRoleMentions(text, validRoleNames);
      if (!roleValidation.valid) {
        alert(
          `Role "${roleValidation.invalidRole}" does not exist in this server.`
        );
        return;
      }
      validateUserMentions(text, validUsernames);

      const userAvatar =
        avatarCacheRef.current[currentUserId] ||
        currentUserAvatar ||
        DEFAULT_AVATAR;

      const resolvedAvatarUrl =
        typeof userAvatar === "string" ? userAvatar : userAvatar?.url;

      const tempId = `temp-${currentUserId}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const optimisticMessage: ChannelMessage = {
        id: tempId,
        content: file ? `${text} Uploading ${file.name}...` : text,
        senderId: currentUserId,
        timestamp: new Date().toISOString(),
        avatarUrl: resolvedAvatarUrl || DEFAULT_AVATAR,
        username: "You",
        status: "pending",
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              content: replyingTo.content,
              author: replyingTo.username || "User",
              avatarUrl: replyingTo.avatarUrl || DEFAULT_AVATAR,
              mediaUrl: replyingTo.mediaUrl || null,
              mediaType: replyingTo.mediaType,
            }
          : null,
      };

      addOptimistic(optimisticMessage);
      scroll.stickNextRender();

      try {
        const response = await uploadMessage({
          content: text,
          channel_id: channelId,
          sender_id: currentUserId,
          reply_to: replyingTo?.id,
          file: file || undefined,
        });

        setReplyingTo(null);

        reconcileTemp(tempId, {
          id: String(response?.id ?? tempId),
          content: response?.content ?? undefined,
          mediaUrl: response?.media_url ?? response?.mediaUrl,
        });
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.error || err.message || "Unknown error";

        if (err?.response?.status === 403) {
          setPermissionError(errorMessage);
          setTimeout(() => setPermissionError(null), 5000);
          dropTemp(tempId);
        } else {
          markFailed(new Set([tempId]));
          setToast({
            message: "Upload failed: size exceeded",
            type: "error",
            key: Date.now(),
          });
        }
      }
    },
    [
      permissions,
      validRoleNames,
      validUsernames,
      avatarCacheRef,
      currentUserAvatar,
      currentUserId,
      channelId,
      replyingTo,
      addOptimistic,
      reconcileTemp,
      dropTemp,
      markFailed,
      updateMessages,
      setPermissionError,
      scroll,
    ]
  );

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

  const handleSend = useCallback(
    async (text: string, files: File[]) => {
      const normalizedText = text.trim();
      const fileList = files || [];

      if (!normalizedText && fileList.length === 0) return;

      const annotated = fileList.map((file) => {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
          return {
            file,
            valid: false,
            errorReason: `Too large (max ${MAX_FILE_SIZE_MB} MB)`,
          };
        if (!ALLOWED_TYPES.includes(file.type))
          return { file, valid: false, errorReason: "Unsupported file type" };
        return { file, valid: true, errorReason: undefined };
      });

      const invalid = annotated.filter((f) => !f.valid);
      if (invalid.length > 0) {
        setToast({
          message: invalid
            .map((f) => `"${f.file.name}": ${f.errorReason}`)
            .join("\n"),
          type: "error",
          key: Date.now(),
        });
      }

      const validFiles = annotated.filter((f) => f.valid).map((f) => f.file);
      if (!normalizedText && validFiles.length === 0) return;

      setIsSending(true);

      try {
        if (validFiles.length === 0) {
          await sendSingleMessage(text, null);
          return;
        }

        const [firstFile, ...restFiles] = validFiles;
        await sendSingleMessage(text, firstFile);

        for (const file of restFiles) {
          await sendSingleMessage("", file);
        }
      } finally {
        setIsSending(false);
      }
    },
    [sendSingleMessage]
  );

  const handleSearch = useCallback(
    async (query: string) => {
      if (reactionMode === "dm" && threadId) {
        return searchDmMessages(threadId, query);
      }
      if (!serverId) return [];
      return searchServerMessages(serverId, query);
    },
    [reactionMode, threadId, serverId]
  );

  const handleSearchSelect = useCallback(
    async (result: MessageSearchResult) => {
      if (
        reactionMode === "channel" &&
        result.channel_id &&
        result.channel_id !== channelId
      ) {
        setToast({
          message: `This message is in #${
            result.channel_name || "another channel"
          }. Switch to that channel to view it.`,
          type: "info",
          key: Date.now(),
        });
        return;
      }

      const success = await scroll.scrollToMessage(result.id, { highlightMs: 1500 });
      if (!success) {
        setToast({
          message: "Could not find that message in the loaded history.",
          type: "error",
          key: Date.now(),
        });
      }
    },
    [reactionMode, channelId, scroll]
  );

  useImperativeHandle(
    ref,
    () => ({
      async scrollToMessage(
        messageId: string,
        options: { highlightDuration?: number } = { highlightDuration: 1500 }
      ) {
        return scroll.scrollToMessage(messageId, {
          highlightMs: options.highlightDuration ?? 1500,
        });
      },

      async loadOlderPages(limitPages = 1) {
        if (!hasMore) return false;
        for (let i = 0; i < limitPages; i++) {
          await loadMessages(true);
          if (!hasMore) break;
        }
        return true;
      },

      scrollToBottom() {
        scroll.jumpToLatest();
        return true;
      },
    }),
    [scroll, hasMore, loadMessages]
  );

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [localStream, micOn]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [localStream, camOn]);

  const renderMessageContent = useCallback(
    (msg: ChannelMessage): React.ReactNode => {
      if (typeof msg.content !== "string") return null;

      const gifMatch = msg.content.match(/^\[GIF\](.+)$/);

      if (gifMatch) {
        return (
          <img
            src={gifMatch[1]}
            alt="GIF"
            className="block max-w-full h-auto rounded-lg"
          />
        );
      }

      return (
        <MessageContentWithMentions
          content={msg.content}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          serverRoles={serverRoles}
          isValidUsernameMention={(mention) =>
            validUsernames.has(mention.replace("@", "").toLowerCase())
          }
          currentUserRoleIds={currentUserRoleIds}
          onMentionClick={handleUsernameClick}
          onRoleMentionClick={handleRoleMentionClick}
        />
      );
    },
    [
      currentUserId,
      currentUsername,
      serverRoles,
      validUsernames,
      currentUserRoleIds,
      handleUsernameClick,
      handleRoleMentionClick,
    ]
  );

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
      {(serverId || threadId) && (
        <ChatHeader
          channelName={channelName}
          connected={connected}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch((v) => !v)}
          onCloseSearch={() => setShowSearch(false)}
          onSearch={handleSearch}
          onSelectResult={handleSearchSelect}
          showChannelName={reactionMode === "channel"}
        />
      )}

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

      {(localStream || (remoteStreams && remoteStreams.length > 0)) && (
        <div className="p-4 pb-0 h-96 flex-shrink-0">
          <div className="relative w-full h-full">
            <VideoPanel
              localStream={localStream || undefined}
              remotes={remoteStreams}
            />
            <div className="absolute bottom-3 right-3 flex gap-2 z-10">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={`px-3 py-1 rounded-md text-sm ${
                  micOn ? "bg-green-600/80" : "bg-red-600/80"
                }`}
                title={micOn ? "Mute mic" : "Unmute mic"}
              >
                {micOn ? "Mic On" : "Mic Off"}
              </button>
              <button
                onClick={() => setCamOn((v) => !v)}
                className={`px-3 py-1 rounded-md text-sm ${
                  camOn ? "bg-green-600/80" : "bg-red-600/80"
                }`}
                title={camOn ? "Turn camera off" : "Turn camera on"}
              >
                {camOn ? "Cam On" : "Cam Off"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex-1 flex flex-col min-h-0">
        <MessageVirtualizer
          containerRef={messagesContainerRef}
          onScroll={scroll.handleScroll}
        >
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            loadingMessages={loadingMessages}
            loadingMore={loadingMore}
            hasMore={hasMore}
            isInitialLoadDone={isInitialLoadDone}
            unreadDividerIndex={unreadDividerIndex}
            registerRef={registerMessageRef}
            typingNames={typingUsers}
            renderContent={renderMessageContent}
            onReply={handleReply}
            onProfileClick={(msg) =>
              openProfile(msg.senderId, msg.username, msg.avatarUrl)
            }
            onReplyPreviewClick={(id) => void scroll.scrollToMessage(id)}
          />
        </MessageVirtualizer>

        {scroll.showJumpButton && (
          <ScrollToBottomButton
            onClick={scroll.jumpToLatest}
            count={scroll.newMessageCount}
          />
        )}
      </div>

      <MessageComposer
        permissions={permissions}
        permissionError={permissionError}
        serverId={serverId}
        serverRoles={serverRoles}
        isSending={isSending}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        unreadMentionCount={unreadMentionCount}
        onJumpToNextMention={jumpToNextMention}
        onSend={handleSend}
        onTyping={sendTyping}
        placeholder={`Message #${channelName}`}
      />

      {roleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#232428] rounded-2xl shadow-2xl w-96 p-6 text-white relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
              onClick={() => setRoleModal({ ...roleModal, open: false })}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-2">
              Role: <span className="text-[#FFC341]">@{roleModal.role}</span>
            </h2>
            <div className="mb-2 text-sm text-gray-400">
              {roleModal.users.length} member(s) with this role:
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {roleModal.users.length === 0 ? (
                <div className="text-gray-500 text-center">No users found.</div>
              ) : (
                roleModal.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition"
                  >
                    <img
                      src={user.avatarUrl || DEFAULT_AVATAR}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span>{user.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
        currentUserId={currentUserId}
        currentUsername={currentUsername}
      />
    </div>
  );
});
