export interface ScrollMessage {
  id: string | number;
  senderId: string;
  timestamp: string;
}

export interface ScrollAnchor {
  messageId: string | number;
  offset: number;
}

export type InitialScrollTarget =
  | { kind: "bottom" }
  | { kind: "first-unread"; index: number }
  | { kind: "anchor"; anchor: ScrollAnchor };

export function resolveInitialScrollTarget(
  messages: ScrollMessage[],
  currentUserId: string,
  lastReadTimestamp: string | null,
  anchor: ScrollAnchor | null
): InitialScrollTarget {
  const lastReadMs = lastReadTimestamp
    ? new Date(lastReadTimestamp).getTime()
    : 0;

  if (
    anchor &&
    messages.some((message) => String(message.id) === String(anchor.messageId))
  ) {
    return { kind: "anchor", anchor };
  }

  if (lastReadMs > 0) {
    const firstUnreadIndex = messages.findIndex(
      (message) =>
        new Date(message.timestamp).getTime() > lastReadMs &&
        message.senderId !== currentUserId
    );

    if (firstUnreadIndex !== -1) {
      return { kind: "first-unread", index: firstUnreadIndex };
    }
  }

  return { kind: "bottom" };
}
