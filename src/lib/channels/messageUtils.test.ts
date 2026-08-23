import { describe, it, expect } from "vitest";
import {
  normalizeChannelMessage,
  extractReplyFromRaw,
  extractAvatarFromRaw,
  resolveReplyTargets,
  dedupeAndSortByTime,
  prependOlderMessages,
  mergeIncomingMessage,
  shouldAddOptimisticMessage,
  reconcileOptimisticMessage,
  removeOptimisticMessage,
  findUnreadDividerIndex,
  isContentMentioningCurrentUser,
  groupMessagesForDisplay,
  formatDayLabel,
  formatMessageTime,
  isCodeBlock,
  isReplyImage,
} from "./messageUtils";
import { ChannelMessage, MessageGroup } from "./types";

const base = (overrides: Partial<ChannelMessage> = {}): ChannelMessage => ({
  id: "m1",
  content: "hello",
  senderId: "u1",
  timestamp: "2026-01-01T10:00:00.000Z",
  ...overrides,
});

describe("formatDayLabel / formatMessageTime", () => {
  it("returns Recent for invalid day timestamps", () => {
    expect(formatDayLabel("not-a-date")).toBe("Recent");
  });

  it("returns empty string for invalid message timestamps", () => {
    expect(formatMessageTime("not-a-date")).toBe("");
  });

  it("returns a non-empty label for a valid timestamp", () => {
    expect(formatDayLabel("2026-01-01T10:00:00.000Z")).not.toBe("");
  });
});

describe("extractReplyFromRaw", () => {
  it("maps an object reply target", () => {
    const target = extractReplyFromRaw({
      reply_to_message: {
        id: 9,
        content: "orig",
        users: { username: "alice", avatar_url: "/a.png" },
        media_url: "/m.png",
        media_type: "image/png",
      },
    });
    expect(target).toEqual({
      id: "9",
      content: "orig",
      author: "alice",
      avatarUrl: "/a.png",
      mediaUrl: "/m.png",
      mediaType: "image/png",
    });
  });

  it("maps a scalar reply target to Loading", () => {
    expect(extractReplyFromRaw({ reply_to: 12 })).toEqual({
      id: "12",
      content: "Loading...",
      author: "Unknown",
    });
  });

  it("returns null when no reply target present", () => {
    expect(extractReplyFromRaw({ content: "x" })).toBeNull();
  });
});

describe("extractAvatarFromRaw", () => {
  it("digs through common envelopes", () => {
    expect(extractAvatarFromRaw({ sender: { users: { avatar_url: "/x.png" } } })).toBe("/x.png");
    expect(extractAvatarFromRaw({ avatar_url: "/y.png" })).toBe("/y.png");
    expect(extractAvatarFromRaw({ content: "no avatar" })).toBeUndefined();
  });
});

describe("normalizeChannelMessage", () => {
  it("maps fields and treats self as You", () => {
    const msg = normalizeChannelMessage(
      {
        id: 5,
        content: "hi",
        sender_id: "me",
        timestamp: "2026-01-01T10:00:00.000Z",
        username: "me",
      },
      "me",
      "/avatar.png"
    );
    expect(msg.username).toBe("You");
    expect(msg.id).toBe(5);
    expect(msg.avatarUrl).toBe("/avatar.png");
  });

  it("falls back to display name for others", () => {
    const msg = normalizeChannelMessage(
      { sender_id: "u2", sender: { username: "bob" } },
      "me"
    );
    expect(msg.username).toBe("bob");
  });
});

describe("resolveReplyTargets", () => {
  it("fills Loading replies from the parent", () => {
    const parent = base({ id: "p1", content: "parent text", username: "bob" });
    const child = base({
      id: "c1",
      content: "reply",
      replyTo: { id: "p1", content: "Loading...", author: "Unknown" },
    });
    const [outChild] = resolveReplyTargets([parent, child].sort((a, b) => String(a.id).localeCompare(String(b.id))) as any);
    expect(outChild.replyTo?.content).toBe("parent text");
    expect(outChild.replyTo?.author).toBe("bob");
  });

  it("marks Loading replies as unavailable when no parent", () => {
    const child = base({
      id: "c2",
      replyTo: { id: "ghost", content: "Loading...", author: "Unknown" },
    });
    const [out] = resolveReplyTargets([child]);
    expect(out.replyTo?.content).toBe("Original message unavailable");
  });
});

describe("dedupeAndSortByTime", () => {
  it("removes duplicate ids and sorts chronologically", () => {
    const input = [
      base({ id: "a", timestamp: "2026-01-02T00:00:00.000Z" }),
      base({ id: "b", timestamp: "2026-01-01T00:00:00.000Z" }),
      base({ id: "a", timestamp: "2026-01-02T00:00:00.000Z" }),
    ];
    const out = dedupeAndSortByTime(input);
    expect(out.map((m) => m.id)).toEqual(["b", "a"]);
  });
});

describe("prependOlderMessages", () => {
  it("prepends without duplicating ids", () => {
    const current = [base({ id: "b" }), base({ id: "c" })];
    const older = [base({ id: "a" }), base({ id: "b" })];
    expect(prependOlderMessages(current, older).map((m) => m.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("mergeIncomingMessage", () => {
  it("drops the optimistic duplicate of the incoming message", () => {
    const optimistic = base({
      id: "temp-1",
      senderId: "me",
      content: "hi there",
      timestamp: "2026-01-01T10:00:01.000Z",
      status: "pending",
    });
    const incoming = base({
      id: "real-1",
      senderId: "me",
      content: "hi there",
      timestamp: "2026-01-01T10:00:02.000Z",
    });
    const out = mergeIncomingMessage([optimistic], incoming, "me");
    expect(out.map((m) => m.id)).toEqual(["real-1"]);
    expect(out[0].status).toBeUndefined();
  });

  it("appends and sorts new incoming messages", () => {
    const existing = base({ id: "a", timestamp: "2026-01-01T09:00:00.000Z" });
    const incoming = base({ id: "b", timestamp: "2026-01-01T10:00:00.000Z" });
    const out = mergeIncomingMessage([existing], incoming, "me");
    expect(out.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("shouldAddOptimisticMessage", () => {
  it("rejects near-duplicate optimistic messages", () => {
    const existing = base({
      senderId: "me",
      content: "hello",
      timestamp: "2026-01-01T10:00:00.500Z",
    });
    const optimistic = base({
      id: "temp-1",
      senderId: "me",
      content: "hello",
      timestamp: "2026-01-01T10:00:01.000Z",
    });
    expect(shouldAddOptimisticMessage([existing], optimistic, "me")).toBe(false);
  });

  it("accepts distinct messages", () => {
    const existing = base({ senderId: "me", content: "one" });
    const optimistic = base({ id: "temp-1", senderId: "me", content: "two" });
    expect(shouldAddOptimisticMessage([existing], optimistic, "me")).toBe(true);
  });
});

describe("reconcileOptimisticMessage", () => {
  it("swaps temp id for real id and marks sent", () => {
    const optimistic = base({
      id: "temp-1",
      senderId: "me",
      status: "pending",
    });
    const out = reconcileOptimisticMessage([optimistic], "temp-1", {
      id: "real-1",
    });
    expect(out[0].id).toBe("real-1");
    expect(out[0].status).toBe("sent");
  });

  it("drops the temp message when the real message already exists", () => {
    const optimistic = base({ id: "temp-1" });
    const real = base({ id: "real-1" });
    const out = reconcileOptimisticMessage([optimistic, real], "temp-1", {
      id: "real-1",
    });
    expect(out.map((m) => m.id)).toEqual(["real-1"]);
  });
});

describe("removeOptimisticMessage", () => {
  it("removes by temp id", () => {
    const out = removeOptimisticMessage(
      [base({ id: "temp-1" }), base({ id: "real-1" })],
      "temp-1"
    );
    expect(out.map((m) => m.id)).toEqual(["real-1"]);
  });
});

describe("findUnreadDividerIndex", () => {
  const messages = [
    base({ id: "a", senderId: "u2", timestamp: "2026-01-01T09:00:00.000Z" }),
    base({ id: "b", senderId: "u2", timestamp: "2026-01-01T10:00:00.000Z" }),
    base({ id: "c", senderId: "u3", timestamp: "2026-01-01T11:00:00.000Z" }),
  ];

  it("finds the first unread message by another user", () => {
    expect(
      findUnreadDividerIndex(messages, "2026-01-01T09:30:00.000Z", "me")
    ).toBe(1);
  });

  it("returns -1 when everything is read", () => {
    expect(
      findUnreadDividerIndex(messages, "2026-01-02T00:00:00.000Z", "me")
    ).toBe(-1);
  });

  it("returns -1 without a last-read timestamp", () => {
    expect(findUnreadDividerIndex(messages, null, "me")).toBe(-1);
  });
});

describe("isContentMentioningCurrentUser", () => {
  it("detects @username", () => {
    expect(isContentMentioningCurrentUser("hey @bob", "bob")).toBe(true);
    expect(isContentMentioningCurrentUser("hey @bob", "alice")).toBe(false);
  });
});

describe("isCodeBlock / isReplyImage", () => {
  it("detects fenced code blocks", () => {
    expect(isCodeBlock("```js\nconst x = 1;\n```")).toBe(true);
    expect(isCodeBlock("plain text")).toBe(false);
  });

  it("detects reply images by extension, blob and media type", () => {
    expect(isReplyImage("/pic.png")).toBe(true);
    expect(isReplyImage("blob:123", "image/png")).toBe(true);
    expect(isReplyImage("/doc.pdf", "application/pdf")).toBe(false);
    expect(isReplyImage(null)).toBe(false);
  });
});

describe("groupMessagesForDisplay", () => {
  it("groups consecutive same-sender messages into one group", () => {
    const msgs = [
      base({ id: "1", senderId: "u1", username: "bob", timestamp: "2026-01-01T10:00:00.000Z" }),
      base({ id: "2", senderId: "u1", username: "bob", timestamp: "2026-01-01T10:01:00.000Z" }),
      base({ id: "3", senderId: "u2", timestamp: "2026-01-01T10:02:00.000Z" }),
    ];
    const sections = groupMessagesForDisplay(msgs, "me");
    expect(sections).toHaveLength(1);
    const groupNames = sections[0].groups.map((g) => g.name);
    expect(groupNames).toEqual(["bob", "Unknown"]);
  });

  it("splits same-sender messages that are further apart than the window", () => {
    const msgs = [
      base({ id: "1", senderId: "u1", timestamp: "2026-01-01T10:00:00.000Z" }),
      base({ id: "2", senderId: "u1", timestamp: "2026-01-01T10:30:00.000Z" }),
    ];
    const sections = groupMessagesForDisplay(msgs, "me", { timeWindowMs: 60000 });
    expect(sections[0].groups).toHaveLength(2);
  });

  it("spells the time label onto each message", () => {
    const msgs = [base({ id: "1", senderId: "u1", timestamp: "2026-01-01T10:00:00.000Z" })];
    const groups: MessageGroup[] = groupMessagesForDisplay(msgs, "me")[0].groups;
    expect(groups[0].messages[0].timeLabel).not.toBe("");
  });
});
