"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isNearBottom } from "@/lib/scrollUtils";
import { chatScrollStore } from "@/lib/chat/scrollStore";

export interface ScrollTrackedMessage {
  id: string | number;
}

export interface ElementScrollTarget {
  kind: "element";
  messageId: string | number;
  offset?: number;
}

export type InitialTarget = { kind: "bottom" } | ElementScrollTarget;

type MessageRefs = React.MutableRefObject<
  Record<string | number, HTMLDivElement | null>
>;

export interface UseChatScrollOptions {
  /** Stable per-conversation id. All scroll state is keyed by this. */
  conversationKey: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  messages: ScrollTrackedMessage[];
  messageRefs: MessageRefs;
  /** True once the initial page of messages is rendered (skeletons gone). */
  ready: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  /** Fetch one older page. Resolve true if the message list changed. */
  onLoadOlder: () => Promise<boolean>;
  nearBottomThreshold?: number;
  topLoadThreshold?: number;
  /**
   * Optional first-open positioning policy (e.g. jump to first unread).
   * Anchor restoration always takes precedence and is handled internally.
   */
  resolveInitialTarget?: (messages: ScrollTrackedMessage[]) => InitialTarget;
  /** Fired once after the conversation has been positioned on open. */
  onPositioned?: (kind: "bottom" | "element") => void;
  /** Extra read-only scroll handling (e.g. read markers). Must not scroll. */
  onScrolledExtra?: (container: HTMLDivElement) => void;
}

export interface UseChatScrollResult {
  handleScroll: () => void;
  showJumpButton: boolean;
  newMessageCount: number;
  isNearBottomNow: () => boolean;
  scrollToBottom: (smooth?: boolean) => void;
  jumpToLatest: () => void;
  /** Pin to bottom after the next message-list commit (used when sending). */
  stickNextRender: () => void;
  saveAnchorNow: () => void;
  scrollToMessage: (
    messageId: string | number,
    opts?: { highlightMs?: number }
  ) => Promise<boolean>;
}

const ANCHOR_SAVE_INTERVAL_MS = 150;
const SUPPRESS_ANCHOR_MS = 120;
const SUPPRESS_SMOOTH_MS = 800;

export function useChatScroll({
  conversationKey,
  containerRef,
  messages,
  messageRefs,
  ready,
  hasMore,
  loadingMore,
  onLoadOlder,
  nearBottomThreshold = 140,
  topLoadThreshold = 120,
  resolveInitialTarget,
  onPositioned,
  onScrolledExtra,
}: UseChatScrollOptions): UseChatScrollResult {
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const keyRef = useRef(conversationKey);
  const nearBottomRef = useRef(true);
  const unseenCountRef = useRef(0);
  const pendingStickRef = useRef(false);
  const visitPositionedKeyRef = useRef<string | null>(null);
  const initPendingRef = useRef(false);
  const olderInFlightRef = useRef(false);
  const lastSeenIdRef = useRef<string | null>(null);
  const prevCountRef = useRef(0);
  const suppressUntilRef = useRef(0);
  const lastAnchorSaveRef = useRef(0);
  const rafScrollRef = useRef<number | null>(null);
  const followRafRef = useRef<number | null>(null);

  // Latest options for use inside stable callbacks / cleanup.
  const optionsRef = useRef({
    messages,
    hasMore,
    loadingMore,
    onLoadOlder,
    nearBottomThreshold,
    topLoadThreshold,
    resolveInitialTarget,
    onPositioned,
    onScrolledExtra,
    ready,
  });
  optionsRef.current = {
    messages,
    hasMore,
    loadingMore,
    onLoadOlder,
    nearBottomThreshold,
    topLoadThreshold,
    resolveInitialTarget,
    onPositioned,
    onScrolledExtra,
    ready,
  };

  const suppress = useCallback((ms: number) => {
    suppressUntilRef.current = performance.now() + ms;
  }, []);

  const isSuppressed = useCallback(
    () => performance.now() < suppressUntilRef.current,
    []
  );

  const findElement = useCallback(
    (messageId: string | number): HTMLDivElement | null =>
      messageRefs.current[messageId] ??
      (containerRef.current?.querySelector(
        `[data-message-id="${messageId}"]`
      ) as HTMLDivElement | null) ??
      null,
    [containerRef, messageRefs]
  );

  const clearUnseen = useCallback(() => {
    unseenCountRef.current = 0;
    setNewMessageCount(0);
    setShowJumpButton(false);
  }, []);

  const saveAnchorNow = useCallback(() => {
    const key = keyRef.current;
    const container = containerRef.current;
    const currentMessages = optionsRef.current.messages;
    if (!container || currentMessages.length === 0) return;

    if (isNearBottom(container, 80)) {
      chatScrollStore.setAnchor(key, null);
      return;
    }

    const viewportTop = container.scrollTop;
    for (const msg of currentMessages) {
      const el = messageRefs.current[msg.id];
      if (!el) continue;
      const top = el.offsetTop;
      if (top + el.offsetHeight >= viewportTop) {
        chatScrollStore.setAnchor(key, {
          messageId: msg.id,
          offset: viewportTop - top,
        });
        return;
      }
    }
  }, [containerRef, messageRefs]);

  const syncAtBottomUi = useCallback(
    (container: HTMLDivElement) => {
      const near = isNearBottom(container, optionsRef.current.nearBottomThreshold);
      nearBottomRef.current = near;
      if (near) {
        if (unseenCountRef.current > 0) clearUnseen();
        else setShowJumpButton(false);
      } else {
        setShowJumpButton(true);
      }
    },
    [clearUnseen]
  );

  const maybeRequestOlder = useCallback(
    (container: HTMLDivElement) => {
      const opts = optionsRef.current;
      if (
        !opts.hasMore ||
        opts.loadingMore ||
        olderInFlightRef.current ||
        initPendingRef.current
      ) {
        return;
      }
      if (container.scrollTop > opts.topLoadThreshold) return;

      olderInFlightRef.current = true;
      const requestedKey = keyRef.current;
      const previousHeight = container.scrollHeight;
      const previousTop = container.scrollTop;

      suppress(SUPPRESS_ANCHOR_MS);

      opts
        .onLoadOlder()
        .then((applied) => {
          olderInFlightRef.current = false;
          if (!applied || keyRef.current !== requestedKey) return;

          requestAnimationFrame(() => {
            const node = containerRef.current;
            if (!node || keyRef.current !== requestedKey) return;
            node.scrollTop =
              previousTop + (node.scrollHeight - previousHeight);
            saveAnchorNow();
          });
        })
        .catch(() => {
          olderInFlightRef.current = false;
        });
    },
    [containerRef, saveAnchorNow, suppress]
  );

  const handleScroll = useCallback(() => {
    if (rafScrollRef.current !== null) return;
    rafScrollRef.current = requestAnimationFrame(() => {
      rafScrollRef.current = null;
      const container = containerRef.current;
      if (!container) return;

      syncAtBottomUi(container);

      if (!isSuppressed()) {
        const now = performance.now();
        if (now - lastAnchorSaveRef.current >= ANCHOR_SAVE_INTERVAL_MS) {
          lastAnchorSaveRef.current = now;
          saveAnchorNow();
        }
        optionsRef.current.onScrolledExtra?.(container);
        maybeRequestOlder(container);
      }
    });
  }, [
    containerRef,
    syncAtBottomUi,
    isSuppressed,
    saveAnchorNow,
    maybeRequestOlder,
  ]);

  const pinToBottom = useCallback(
    (smooth: boolean) => {
      const container = containerRef.current;
      if (!container) return;
      suppress(smooth ? SUPPRESS_SMOOTH_MS : SUPPRESS_ANCHOR_MS);
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      nearBottomRef.current = true;
    },
    [containerRef, suppress]
  );

  const scrollToBottom = useCallback(
    (smooth = true) => {
      pinToBottom(smooth);
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (container) syncAtBottomUi(container);
      });
    },
    [containerRef, pinToBottom, syncAtBottomUi]
  );

  const jumpToLatest = useCallback(() => {
    clearUnseen();
    scrollToBottom(true);
  }, [clearUnseen, scrollToBottom]);

  const stickNextRender = useCallback(() => {
    pendingStickRef.current = true;
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      nearBottomRef.current = true;
    }
    clearUnseen();
  }, [containerRef, clearUnseen]);

  const scrollToMessage = useCallback(
    async (
      messageId: string | number,
      opts?: { highlightMs?: number }
    ): Promise<boolean> => {
      const requestedKey = keyRef.current;
      const highlightMs = opts?.highlightMs ?? 1800;

      for (let attempt = 0; attempt < 8; attempt++) {
        if (keyRef.current !== requestedKey) return false;

        const el = findElement(messageId);
        if (el) {
          const container = containerRef.current;
          if (!container) return false;
          suppress(SUPPRESS_SMOOTH_MS);
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("mention-highlight");
          setTimeout(() => el.classList.remove("mention-highlight"), highlightMs);
          requestAnimationFrame(() => {
            const node = containerRef.current;
            if (node && keyRef.current === requestedKey) {
              syncAtBottomUi(node);
              saveAnchorNow();
            }
          });
          return true;
        }

        const currentOpts = optionsRef.current;
        if (
          currentOpts.hasMore &&
          !currentOpts.loadingMore &&
          attempt < 6 &&
          keyRef.current === requestedKey
        ) {
          const applied = await currentOpts.onLoadOlder().catch(() => false);
          if (applied) continue;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(1.6, attempt))
        );
      }

      return keyRef.current === requestedKey && Boolean(findElement(messageId));
    },
    [
      containerRef,
      findElement,
      saveAnchorNow,
      suppress,
      syncAtBottomUi,
    ]
  );

  // Conversation switch: reset all per-visit refs so the new conversation
  // positions itself. Anchors were already persisted by the scroll handler.
  useEffect(() => {
    keyRef.current = conversationKey;
    visitPositionedKeyRef.current = null;
    initPendingRef.current = false;
    lastSeenIdRef.current = null;
    prevCountRef.current = 0;
    pendingStickRef.current = false;
    unseenCountRef.current = 0;
    setNewMessageCount(0);
    setShowJumpButton(false);
    nearBottomRef.current = true;
  }, [conversationKey, saveAnchorNow]);

  // Initial positioning + restoration. Runs exactly once per visit, only
  // after real content is rendered (ready), never mid-skeleton.
  //
  // Deliberately does NOT depend on `messages`: it reads the freshest list
  // from optionsRef at fire time, so a socket append or cache update landing
  // during the double-rAF window can neither cancel nor stale-position us.
  useEffect(() => {
    if (!ready || visitPositionedKeyRef.current === conversationKey) return;

    const container = containerRef.current;
    if (!container) return;

    initPendingRef.current = true;

    // Hide until positioned so the user never glimpses a wrong scroll
    // position before restore/bottom jump happens (no flash, no animation).
    container.style.visibility = "hidden";

    let cancelled = false;
    let frameId: number | null = null;

    const position = () => {
      frameId = null;
      const liveContainer = containerRef.current;
      if (liveContainer) liveContainer.style.visibility = "";

      if (
        cancelled ||
        keyRef.current !== conversationKey ||
        !liveContainer ||
        optionsRef.current.messages.length === 0
      ) {
        initPendingRef.current = false;
        return;
      }

      const messages = optionsRef.current.messages;
      const state = chatScrollStore.get(conversationKey);
      let kind: "bottom" | "element" = "bottom";

      const anchorEl = state.anchor
        ? findElement(state.anchor.messageId)
        : null;
      if (state.anchor && anchorEl) {
        anchorEl.scrollIntoView({ behavior: "auto", block: "start" });
        liveContainer.scrollTop += state.anchor.offset;
        kind = "element";
      } else {
        const target = resolveInitialTarget?.(messages);
        const targetEl =
          target?.kind === "element" ? findElement(target.messageId) : null;
        if (target?.kind === "element" && targetEl) {
          targetEl.scrollIntoView({ behavior: "auto", block: "start" });
          liveContainer.scrollTop += target.offset ?? 0;
          kind = "element";
        } else {
          liveContainer.scrollTop = liveContainer.scrollHeight;
        }
      }

      chatScrollStore.markInitialized(conversationKey);
      visitPositionedKeyRef.current = conversationKey;
      initPendingRef.current = false;
      suppress(SUPPRESS_ANCHOR_MS);
      syncAtBottomUi(liveContainer);
      onPositioned?.(kind);
    };

    frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(position);
    });

    return () => {
      cancelled = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      const liveContainer = containerRef.current;
      if (liveContainer) liveContainer.style.visibility = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, conversationKey]);

  // Follow behaviour on list changes: only ever reacts to appended messages.
  useEffect(() => {
    const currentLastId = messages.length
      ? String(messages[messages.length - 1].id)
      : "";
    const previousLastId = lastSeenIdRef.current;
    const previousCount = prevCountRef.current;
    lastSeenIdRef.current = currentLastId;
    prevCountRef.current = messages.length;

    if (visitPositionedKeyRef.current !== keyRef.current) return;
    if (initPendingRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    if (pendingStickRef.current) {
      pendingStickRef.current = false;
      container.scrollTop = container.scrollHeight;
      nearBottomRef.current = true;
      clearUnseen();
      return;
    }

    if (previousLastId === null || currentLastId === previousLastId) return;
    if (messages.length < previousCount) return; // deletions: stay put

    const activeKey = keyRef.current;
    if (nearBottomRef.current) {
      if (followRafRef.current !== null) cancelAnimationFrame(followRafRef.current);
      followRafRef.current = requestAnimationFrame(() => {
        followRafRef.current = null;
        const node = containerRef.current;
        if (!node || keyRef.current !== activeKey) return;
        node.scrollTop = node.scrollHeight;
        nearBottomRef.current = true;
      });
    } else {
      unseenCountRef.current += Math.max(1, messages.length - previousCount);
      setNewMessageCount(unseenCountRef.current);
      setShowJumpButton(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, conversationKey]);

  // Unmount: persist final anchor and release pending frames.
  useEffect(() => {
    return () => {
      if (rafScrollRef.current !== null) cancelAnimationFrame(rafScrollRef.current);
      if (followRafRef.current !== null) cancelAnimationFrame(followRafRef.current);
      saveAnchorNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    handleScroll,
    showJumpButton,
    newMessageCount,
    isNearBottomNow: () => {
      const container = containerRef.current;
      return container
        ? isNearBottom(container, nearBottomThreshold)
        : nearBottomRef.current;
    },
    scrollToBottom,
    jumpToLatest,
    stickNextRender,
    saveAnchorNow,
    scrollToMessage,
  };
}
