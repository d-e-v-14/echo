"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";
import { Paperclip, Clock, Check, CircleAlert, X, Trash2, Flag, ChevronDown, Reply } from "lucide-react";
import { safeImgSrc } from "@/lib/security/safeUrl";

export interface ChatMessage {
  id?: string | number;
  content: string;
  replyTo?: {
    id: string | number;
    content: string;
    author?: string;
    mediaUrl?: string | null;
    mediaType?: string;
  } | null;
  status?: "pending" | "sent" | "failed";
  pendingAttachment?: string | null;
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

interface MessageBubbleProps {
  message: ChatMessage;
  name?: string;
  isSender?: boolean;
  avatarUrl?: string;
  timestamp?: string;
  onProfileClick?: () => void;
  onReply?: () => void;
  onReplyPreviewClick?: (messageId: string | number) => void;
  onRetry?: () => void;
  onDiscard?: () => void;
  onReact?: (emoji: string) => void;
  onPin?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  isPinned?: boolean;
  showPinAction?: boolean;
  reactions?: MessageReactionSummary[];
  children?: React.ReactNode;
  messageRenderer?: (content: string) => React.ReactNode;
  isMentioned?: boolean;
}

const MessageAvatar: React.FC<{
  name?: string;
  avatarUrl?: string;
  onClick?: () => void;
  className?: string;
}> = ({ name, avatarUrl, onClick, className = "" }) => {
  const [hasError, setHasError] = useState(false);
  const initials = (name || "?").slice(0, 2).toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center ${
        onClick ? "cursor-pointer hover:opacity-90 transition" : ""
      } ${className}`}
    >
      {avatarUrl && !hasError ? (
        <img
          src={safeImgSrc(avatarUrl)}
          alt={name || "User"}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="text-xs font-semibold uppercase text-slate-300">
          {initials}
        </span>
      )}
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  name,
  isSender = false,
  avatarUrl,
  timestamp,
  onProfileClick,
  onReply,
  onReplyPreviewClick,
  onRetry,
  onDiscard,
  onReact,
  onDelete,
  onReport,
  reactions = [],
  children,
  messageRenderer,
  isMentioned = false,
}) => {
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null);
  const copiedBlockTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (copiedBlockTimerRef.current) {
        window.clearTimeout(copiedBlockTimerRef.current);
      }
    };
  }, []);
  const isPending = message.status === "pending";
  const isFailed = message.status === "failed";
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState<{
    top: number;
    left: number;
    placement: "above" | "below";
  } | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [actionsMenuPlacement, setActionsMenuPlacement] = useState<
    "above" | "below"
  >("below");
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const isGifMessage = message.content?.startsWith("[GIF]");

  useEffect(() => {
    if (!actionsMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionsMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionsMenuOpen]);

  const toggleActionsMenu = () => {
    setActionsMenuOpen((open) => {
      if (!open) {
        const rect = actionsMenuRef.current?.getBoundingClientRect();
        if (rect) {
          const spaceBelow = window.innerHeight - rect.bottom;
          setActionsMenuPlacement(spaceBelow < 180 ? "above" : "below");
        }
      }
      return !open;
    });
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

  useEffect(() => {
    if (!showReactionPicker) return;

    const updatePosition = () => {
      const button = reactionButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const pickerWidth = 352;
      const pickerHeight = 438;
      const gap = 8;

      const leftBase = isSender ? rect.right - pickerWidth : rect.left;
      const left = Math.max(
        8,
        Math.min(leftBase, window.innerWidth - pickerWidth - 8)
      );

      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const placement =
        spaceBelow >= pickerHeight || spaceBelow >= spaceAbove
          ? "below"
          : "above";

      const top =
        placement === "below"
          ? rect.bottom + gap
          : Math.max(8, rect.top - pickerHeight - gap);

      setReactionPickerPosition({ top, left, placement });
    };

    updatePosition();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(target) &&
        reactionButtonRef.current &&
        !reactionButtonRef.current.contains(target)
      ) {
        setShowReactionPicker(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [showReactionPicker, isSender]);

  const handleReactionPick = (emojiData: EmojiClickData) => {
    onReact?.(emojiData.emoji);
    setShowReactionPicker(false);
  };

  const handleQuickReaction = (emoji: string) => {
    onReact?.(emoji);
  };

  const bubbleStyles = isSender
    ? "bg-[#3a3c43] text-[#dbdee1]"
    : "bg-[#2b2d31] text-[#dbdee1]";

  const copyCodeBlock = async (code: string, blockIndex: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBlockIndex(blockIndex);
      if (copiedBlockTimerRef.current) {
        window.clearTimeout(copiedBlockTimerRef.current);
      }
      copiedBlockTimerRef.current = window.setTimeout(() => {
        setCopiedBlockIndex((current) =>
          current === blockIndex ? null : current
        );
      }, 1500);
    } catch (error) {
      console.error("Failed to copy code block:", error);
    }
  };

  const renderPlainContent = (content: string) => {
    if (!content) return null;

    const gifMatch = content.match(/^\[GIF\](.+)$/);
    const gifUrl = gifMatch ? safeImgSrc(gifMatch[1]) : undefined;
    if (gifMatch) {
      return gifUrl ? (
        <img
          src={gifUrl}
          alt="GIF"
          className="block max-w-full h-auto rounded-lg"
        />
      ) : (
        <span className="break-all text-[#dbdee1]">{gifMatch[1]}</span>
      );
    }

    const codeFenceRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
    const segments: Array<{ type: "text" | "code"; value: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeFenceRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          value: content.slice(lastIndex, match.index),
        });
      }

      segments.push({
        type: "code",
        value: match[1].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      segments.push({ type: "text", value: content.slice(lastIndex) });
    }

    if (segments.length === 0) {
      return content;
    }

    return segments.map((segment, segmentIndex) => {
      if (segment.type === "text") {
        return (
          <React.Fragment key={`text-${segmentIndex}`}>
            {segment.value}
          </React.Fragment>
        );
      }

      const isCopied = copiedBlockIndex === segmentIndex;

      return (
        <div
          key={`code-${segmentIndex}`}
          className="my-2 overflow-hidden rounded-lg border border-slate-600 bg-[#1e1f22] text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2 text-[11px] text-slate-400">
            <span>Code</span>
            <button
              type="button"
              onClick={() => copyCodeBlock(segment.value, segmentIndex)}
              className="rounded-md border border-slate-600 mx-2 px-2 py-1 text-slate-200 transition hover:bg-slate-700"
            >
              {isCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="p-2 overflow-x-auto text-sm leading-6 text-slate-100">
            <code className="font-mono whitespace-pre-wrap break-words">
              {segment.value}
            </code>
          </pre>
        </div>
      );
    });
  };

  const actionMenuItems: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
  }[] = [];

  if (onReply && !isFailed) {
    actionMenuItems.push({
      label: "Reply",
      icon: <Reply className="h-4 w-4" />,
      onClick: onReply,
    });
  }

  if (onReport && !isSender && !isPending && !isFailed) {
    actionMenuItems.push({
      label: "Report",
      icon: <Flag className="h-4 w-4" />,
      onClick: onReport,
      danger: true,
    });
  }

  if (onDelete && !isPending && !isFailed) {
    actionMenuItems.push({
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      danger: true,
    });
  }

  const replyPreview = message.replyTo ? (
    <button
      type="button"
      onClick={() => onReplyPreviewClick?.(message.replyTo!.id)}
      className={`mb-1.5 block w-full max-w-full overflow-hidden rounded-md border-l-4 border-[#FFC341] bg-black/20 px-2 py-1.5 text-left text-xs text-white/80 transition ${
        onReplyPreviewClick
          ? "cursor-pointer hover:bg-black/30"
          : "cursor-default"
      }`}
    >
      <span className="block font-semibold text-[#FFC341]">
        {message.replyTo.author || "User"}
      </span>
      <span className="mt-0.5 flex min-w-0 items-center gap-2">
        {message.replyTo.content?.startsWith("[GIF]") ? (
          <>
            {safeImgSrc(message.replyTo.content.replace("[GIF]", "")) && (
              <img
                src={safeImgSrc(message.replyTo.content.replace("[GIF]", ""))}
                alt="GIF reply"
                className="h-10 w-10 flex-shrink-0 rounded object-cover border border-slate-600"
              />
            )}
            <span className="truncate text-white/50">GIF</span>
          </>
        ) : message.replyTo.content?.trim().startsWith("```") ? (
          <div className="max-w-xs overflow-hidden rounded border border-slate-700 bg-black/30 px-2 py-1">
            <pre className="whitespace-pre-wrap font-mono text-xs text-white/70">
              {message.replyTo.content
                .replace(/^```[\w]*\n?/, "")
                .replace(/```/g, "")
                .trim()
                .split("\n")
                .slice(0, 3)
                .join("\n")}
            </pre>
          </div>
        ) : (
          <>
            {message.replyTo.mediaUrl &&
              (isReplyImage(
                message.replyTo.mediaUrl,
                message.replyTo.mediaType
              ) ? (
                <img
                  src={safeImgSrc(message.replyTo.mediaUrl)}
                  alt="Reply attachment"
                  className="h-9 w-9 flex-shrink-0 rounded object-cover border border-slate-600"
                />
              ) : (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-slate-600 bg-black/30 text-white/70">
                  <Paperclip className="h-4 w-4" />
                </span>
              ))}

            <span className="min-w-0 truncate">
              {(() => {
                const text =
                  message.replyTo.content ||
                  (message.replyTo.mediaUrl ? "Attachment" : "");

                const words = text.split(/\s+/);

                return words.length > 100
                  ? words.slice(0, 100).join(" ") + "..."
                  : text;
              })()}
            </span>
          </>
        )}
      </span>
    </button>
  ) : null;

  return (
    <div
      data-message-id={message.id}
      className={`flex mb-3 p-2 mx-0 ${isSender ? "justify-end" : "justify-start"} ${
        isPending ? "opacity-70" : ""
      }`}
    >
      {!isSender && (
        <div className="mx-1 mr-2">
          <MessageAvatar
            name={name}
            avatarUrl={avatarUrl}
            onClick={onProfileClick}
          />
        </div>
      )}

      <div
        className={`flex flex-col gap-1 max-w-[75%] ${
          isSender ? "items-end text-left" : "items-start"
        }`}
      >
        <div
          className={`
    group relative w-fit max-w-96
    ${isGifMessage ? "p-1" : "px-3 py-2"}
    ${bubbleStyles}
    rounded-lg shadow-sm
    ${isMentioned ? "ring-1 ring-[#facc15]" : ""}
    ${isFailed ? "ring-1 ring-red-500 bg-red-900/30" : ""}
  `}
        >
          {actionMenuItems.length > 0 && (
            <div ref={actionsMenuRef} className="absolute right-1 top-1 z-10">
              <button
                type="button"
                onClick={toggleActionsMenu}
                className={`flex items-center justify-center transition ${
                  isSender
                    ? "text-white/50 hover:text-white"
                    : "text-[#8696a0] hover:text-white"
                } ${
                  actionsMenuOpen
                    ? "opacity-100"
                    : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                }`}
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={actionsMenuOpen}
                title="More options"
              >
                <ChevronDown className="h-4 w-4" />
              </button>

              {actionsMenuOpen && (
                <div
                  role="menu"
                  className={`absolute z-30 w-40 overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22] py-1 shadow-xl animate-slide-up-fade ${
                    isSender ? "right-0" : "left-0"
                  } ${
                    actionsMenuPlacement === "above"
                      ? "bottom-full mb-1"
                      : "top-full mt-1"
                  }`}
                >
                  {actionMenuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        item.onClick();
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        item.danger
                          ? "text-[#ed4245] hover:bg-[#ed4245]/10"
                          : "text-[#b5bac1] hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {name && !isSender && (
            <span
              className="mb-0.5 block cursor-pointer text-xs font-semibold text-[#FFC341] hover:underline"
              onClick={onProfileClick}
            >
              {name}
            </span>
          )}

          {replyPreview}

          <div
            className={`text-sm leading-relaxed whitespace-pre-wrap break-words text-left ${
              actionMenuItems.length > 0 && !isGifMessage ? "pr-4" : ""
            }`}
          >
            {messageRenderer
              ? messageRenderer(message.content)
              : renderPlainContent(message.content)}
          </div>

          {isPending && message.pendingAttachment && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#949ba4]">
              <Clock className="h-3 w-3" />
              Uploading {message.pendingAttachment}…
            </div>
          )}

          {children && <div className="mt-3">{children}</div>}

          {(reactions.length > 0 || (isFailed && (onRetry || onDiscard))) && (
            <div className="flex items-center gap-2 mt-1">
            {reactions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {reactions.map((reaction) => (
                  <button
                    key={`${message.id}-${reaction.emoji}`}
                    type="button"
                    onClick={() => handleQuickReaction(reaction.emoji)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                      reaction.reactedByMe
                        ? "border-[#FFC341]/60 bg-slate-800 text-slate-100 hover:bg-slate-700/90"
                        : "border-slate-700/80 bg-slate-900/90 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
                    }`}
                    aria-label={
                      reaction.reactedByMe
                        ? `Remove reaction ${reaction.emoji}`
                        : `React with ${reaction.emoji}`
                    }
                    title={
                      reaction.reactedByMe
                        ? `Remove reaction ${reaction.emoji}`
                        : `React with ${reaction.emoji}`
                    }
                  >
                    <span>{reaction.emoji}</span>
                    {reaction.count > 1 && <span>{reaction.count}</span>}
                  </button>
                ))}
              </div>
            )}
            {isFailed && (onRetry || onDiscard) && (
              <div className="flex items-center gap-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <span>Failed</span>
                    <span className="underline">Retry</span>
                  </button>
                )}
                {onDiscard && (
                  <button
                    onClick={onDiscard}
                    className="text-xs text-red-400 hover:text-red-300"
                    aria-label="Discard message"
                    title="Discard"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            </div>
          )}

          <div className="mt-0.5 flex items-center justify-end gap-1 leading-none">
            {timestamp && (
              <span className="text-[11px] text-white/60">{timestamp}</span>
            )}
            {isSender && message.status === "pending" && (
              <span
                className="flex items-center text-white/60"
                aria-label="Sending"
                title="Sending"
              >
                <Clock className="h-3 w-3" />
              </span>
            )}
            {isSender && message.status === "sent" && (
              <span
                className="flex items-center text-[#53bdeb]"
                aria-label="Delivered"
                title="Delivered"
              >
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            {isSender && isFailed && (
              <span
                className="flex items-center gap-1 text-[#ed4245]"
                aria-label="Not delivered"
                title="Not delivered"
              >
                <CircleAlert className="h-3 w-3" />
                Not delivered
              </span>
            )}
          </div>
        </div>

        {showReactionPicker &&
        reactionPickerPosition &&
        typeof document !== "undefined"
          ? createPortal(
              <div
                ref={reactionPickerRef}
                className="fixed z-[9999]"
                style={{
                  top: reactionPickerPosition.top,
                  left: reactionPickerPosition.left,
                }}
              >
                <EmojiPicker
                  theme={Theme.DARK}
                  onEmojiClick={handleReactionPick}
                />
              </div>,
              document.body
            )
          : null}
      </div>

      {isSender && (
        <div className="ml-3">
          <MessageAvatar name={name || "You"} avatarUrl={avatarUrl} />
        </div>
      )}
    </div>
  );
};

export default memo(MessageBubble);
