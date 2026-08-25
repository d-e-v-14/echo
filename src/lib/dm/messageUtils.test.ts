import { describe, expect, it } from "vitest";
import {
  createDmMessagesData,
  dmMessagePreview,
  flattenDmMessages,
  insertIncomingIntoPages,
  markMessageFailedById,
  markMessagesFailed,
  mergeDmSummaries,
  mergeIntoPage,
  normalizeDmMessage,
  reconcileConfirmedMessage,
  replaceOptimisticById,
  resolveRepliesForThread,
  sortDmConversationsByLatest,
  sortDmMessages,
} from "./messageUtils";
import type { DmMessage, DmMessagesData, DmSummary } from "./types";

const ME = "me";
const THEM = "them";

const msg = (
  overrides: Partial<DmMessage> & { id: string }
): DmMessage => ({
  content: "",
  sender_id: THEM,
  receiver_id: ME,
  timestamp: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const data = (...messages: DmMessage[]): DmMessagesData =>
  createDmMessagesData(messages);

describe("normalizeDmMessage", () => {
  it("maps snake_case and camelCase fields to the canonical shape", () => {
    const m = normalizeDmMessage({
      message_id: 5,
      message: "hello",
      sender_id: "a",
      receiver_id: "b",
      media_url: "http://x/y.png",
      media_type: "image/png",
      reply_to_message: { id: 1, content: "parent", author: "z" },
    });
    expect(m).toMatchObject({
      id: "5",
      content: "hello",
      sender_id: "a",
      receiver_id: "b",
      media_url: "http://x/y.png",
      media_type: "image/png",
      status: "sent",
    });
    expect(m.replyTo).toMatchObject({ id: "1", content: "parent", author: "z" });
  });

  it("handles a reply_to that is only an id (Loading placeholder)", () => {
    const m = normalizeDmMessage({ id: 1, reply_to: "99" });
    expect(m.replyTo).toEqual({ id: "99", content: "Loading...", author: "User" });
  });
});

describe("sortDmMessages", () => {
  it("sorts by timestamp ascending", () => {
    const sorted = sortDmMessages([
      msg({ id: "2", timestamp: "2026-01-01T00:00:02.000Z" }),
      msg({ id: "1", timestamp: "2026-01-01T00:00:01.000Z" }),
    ]);
    expect(sorted.map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("resolveRepliesForThread", () => {
  it("fills Loading reply from the message map and current user", () => {
    const messages = [
      msg({ id: "1", content: "parent", sender_id: THEM }),
      msg({
        id: "2",
        content: "child",
        sender_id: ME,
        replyTo: { id: "1", content: "Loading...", author: "User" },
      }),
    ];
    const resolved = resolveRepliesForThread(
      messages,
      [{ id: THEM, fullname: "Alice" }]
    );
    expect(resolved[1].replyTo).toMatchObject({
      id: "1",
      content: "parent",
      author: "Alice",
    });
  });

  it("labels the parent as You when the parent was sent by the current user", () => {
    const messages = [
      msg({ id: "1", content: "parent", sender_id: ME }),
      msg({
        id: "2",
        content: "child",
        sender_id: THEM,
        replyTo: { id: "1", content: "Loading...", author: "User" },
      }),
    ];
    const resolved = resolveRepliesForThread(messages, [], ME);
    expect(resolved[1].replyTo?.author).toBe("You");
  });
});

describe("mergeIntoPage", () => {
  it("appends a new incoming message and sorts", () => {
    const page = { messages: [msg({ id: "1" })], hasMore: false };
    const next = mergeIntoPage(
      page,
      msg({ id: "2", timestamp: "2026-01-01T00:00:05.000Z" })
          );
    expect(next.messages.map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("deduplicates by stable id", () => {
    const page = { messages: [msg({ id: "1" })], hasMore: false };
    const next = mergeIntoPage(page, msg({ id: "1" }));
    expect(next).toBe(page);
    expect(next.messages).toHaveLength(1);
  });

  it("replaces a matching optimistic temp message with the real message", () => {
    const page = {
      messages: [
        msg({
          id: "temp-abc",
          content: "hi",
          sender_id: ME,
          status: "pending",
          timestamp: "2026-01-01T00:00:01.000Z",
        }),
      ],
      hasMore: false,
    };
    const next = mergeIntoPage(
      page,
      msg({
        id: "real-9",
        content: "hi",
        sender_id: ME,
        timestamp: "2026-01-01T00:00:02.000Z",
      })
    );
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0].id).toBe("real-9");
    expect(next.messages[0].status).toBe("sent");
  });

  it("does not replace a confirmed message with identical content (2x 'hey')", () => {
    const page = {
      messages: [
        msg({
          id: "real-1",
          content: "hey",
          sender_id: ME,
          status: "sent",
          timestamp: "2026-01-01T00:00:01.000Z",
        }),
      ],
      hasMore: false,
    };
    const next = mergeIntoPage(
      page,
      msg({
        id: "real-2",
        content: "hey",
        sender_id: ME,
        timestamp: "2026-01-01T00:00:05.000Z",
      })
    );
    expect(next.messages.map((m) => m.id)).toEqual(["real-1", "real-2"]);
  });

  it("treats blob media previews as optimistic", () => {
    const page = {
      messages: [
        msg({
          id: "temp-img",
          content: "",
          sender_id: ME,
          media_url: "blob:file-id",
          status: "pending",
        }),
      ],
      hasMore: false,
    };
    const next = mergeIntoPage(
      page,
      msg({
        id: "img-1",
        content: "",
        sender_id: ME,
        media_url: "http://x/img.png",
        timestamp: "2026-01-01T00:00:02.000Z",
      })
    );
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0].id).toBe("img-1");
    expect(next.messages[0].media_url).toBe("http://x/img.png");
  });
});

describe("insertIncomingIntoPages", () => {
  it("inserts into the newest (last) page", () => {
    const old = {
      pages: [
        { messages: [msg({ id: "old", timestamp: "2026-01-01T00:00:00.000Z" })], hasMore: true },
        { messages: [msg({ id: "newest", timestamp: "2026-01-01T00:00:10.000Z" })], hasMore: false },
      ],
      pageParams: [0, 1],
    };
    const next = insertIncomingIntoPages(
      old,
      msg({ id: "fresh", timestamp: "2026-01-01T00:00:12.000Z" })
    );
    expect(next?.pages[0].messages.map((m) => m.id)).toEqual(["old"]);
    expect(next?.pages[1].messages.map((m) => m.id)).toEqual(["newest", "fresh"]);
  });

  it("returns unchanged when the id already exists anywhere", () => {
    const old = data(msg({ id: "x" }));
    expect(insertIncomingIntoPages(old, msg({ id: "x" }))).toBe(old);
  });

  it("returns undefined when no pages exist yet", () => {
    expect(insertIncomingIntoPages(undefined, msg({ id: "x" }))).toBeUndefined();
  });
});

describe("replaceOptimisticById", () => {
  it("replaces a temp message with the confirmed message", () => {
    const old = data(
      msg({ id: "temp-1", sender_id: ME, content: "hi", status: "pending" })
    );
    const next = replaceOptimisticById(old, "temp-1", {
      id: "real-1",
      content: "hi",
      media_url: null,
    });
    expect(flattenDmMessages(next).map((m) => m.id)).toEqual(["real-1"]);
    expect(flattenDmMessages(next)[0].status).toBe("sent");
  });

  it("no-ops when the temp id is already gone", () => {
    const old = data(msg({ id: "real-1" }));
    const next = replaceOptimisticById(old, "temp-1", { id: "real-2" });
    expect(next).toBe(old);
  });
});

describe("markMessagesFailed", () => {
  it("marks the given temp ids as failed", () => {
    const old = data(
      msg({ id: "temp-1", sender_id: ME, status: "pending" }),
      msg({ id: "real-1", status: "sent" })
    );
    const next = markMessagesFailed(old, new Set(["temp-1"]));
    const flat = flattenDmMessages(next);
    expect(flat.find((m) => m.id === "temp-1")?.status).toBe("failed");
    expect(flat.find((m) => m.id === "real-1")?.status).toBe("sent");
  });
});

describe("markMessageFailedById", () => {
  it("marks a single message failed by id", () => {
    const old = data(
      msg({ id: "temp-1", sender_id: ME, status: "pending" }),
      msg({ id: "real-1", status: "sent" })
    );
    const next = markMessageFailedById(old, "temp-1");
    expect(flattenDmMessages(next).find((m) => m.id === "temp-1")?.status).toBe("failed");
    expect(flattenDmMessages(next).find((m) => m.id === "real-1")?.status).toBe("sent");
  });

  it("no-ops when the id is not present", () => {
    const old = data(msg({ id: "real-1" }));
    expect(markMessageFailedById(old, "ghost")).toBe(old);
  });
});

describe("dmMessagePreview", () => {
  it("shows GIF for a gif message instead of the raw url", () => {
    expect(
      dmMessagePreview("[GIF]https://media1.giphy.com/media/abc/giphy.gif")
    ).toBe("GIF");
  });

  it("returns the trimmed content for normal messages", () => {
    expect(dmMessagePreview("  hello world  ")).toBe("hello world");
  });

  it("returns a fallback when the content is empty", () => {
    expect(dmMessagePreview("")).toBe("Sent an attachment");
  });
});

describe("sortDmConversationsByLatest", () => {
  const conv = (id: string, timestamp: string) => ({
    user: { id },
    lastMessage: "msg",
    timestamp,
    unreadCount: 0,
  });

  it("sorts conversations newest first by timestamp", () => {
    const sorted = sortDmConversationsByLatest([
      conv("a", "2026-01-01T00:00:01.000Z"),
      conv("b", "2026-01-01T00:00:03.000Z"),
      conv("c", "2026-01-01T00:00:02.000Z"),
    ]);
    expect(sorted.map((c) => c.user.id)).toEqual(["b", "c", "a"]);
  });

  it("does not duplicate conversations when reordering", () => {
    const list = [
      conv("a", "2026-01-01T00:00:01.000Z"),
      conv("b", "2026-01-01T00:00:03.000Z"),
      conv("c", "2026-01-01T00:00:02.000Z"),
    ];
    const sorted = sortDmConversationsByLatest(list);
    expect(sorted).toHaveLength(3);
    expect(new Set(sorted.map((c) => c.user.id)).size).toBe(3);
    expect(list).toHaveLength(3);
  });

  it("moves a conversation to the top when its timestamp is updated", () => {
    let list = sortDmConversationsByLatest([
      conv("a", "2026-01-01T00:00:01.000Z"),
      conv("b", "2026-01-01T00:00:02.000Z"),
    ]);
    expect(list[0].user.id).toBe("b");

    list = sortDmConversationsByLatest(
      list.map((c) =>
        c.user.id === "a"
          ? { ...c, timestamp: "2026-01-01T00:00:03.000Z" }
          : c
      )
    );
    expect(list[0].user.id).toBe("a");
  });
});

describe("mergeDmSummaries", () => {
  const summary = (
    id: string,
    timestamp: string,
    lastMessage = "msg"
  ): [string, DmSummary] => [
    id,
    { lastMessage, timestamp, unreadCount: 0 },
  ];

  it("keeps a newer local preview instead of a stale remote one", () => {
    const remote = new Map([
      summary("a", "2026-01-01T00:00:01.000Z", "You: older"),
    ]);
    const local = new Map([
      summary("a", "2026-01-01T00:00:02.000Z", "You: newer"),
    ]);
    const next = mergeDmSummaries(remote, local);
    expect(next.get("a")?.lastMessage).toBe("You: newer");
  });

  it("adopts remote data when it is newer than the local preview", () => {
    const remote = new Map([
      summary("a", "2026-01-01T00:00:03.000Z", "Alice: latest"),
    ]);
    const local = new Map([
      summary("a", "2026-01-01T00:00:02.000Z", "You: older"),
    ]);
    const next = mergeDmSummaries(remote, local);
    expect(next.get("a")?.lastMessage).toBe("Alice: latest");
  });

  it("preserves a local conversation that is missing from the remote list", () => {
    const remote = new Map();
    const local = new Map([
      summary("a", "2026-01-01T00:00:02.000Z", "You: fresh dm"),
    ]);
    const next = mergeDmSummaries(remote, local);
    expect(next.get("a")?.lastMessage).toBe("You: fresh dm");
  });

  it("returns the remote map unchanged when nothing should be kept", () => {
    const remote = new Map([
      summary("a", "2026-01-01T00:00:03.000Z", "Alice: latest"),
    ]);
    const local = new Map([
      summary("a", "2026-01-01T00:00:02.000Z", "You: older"),
    ]);
    expect(mergeDmSummaries(remote, local)).toBe(remote);
  });

  it("adopts the full remote list when there is no local state yet", () => {
    const remote = new Map([
      summary("a", "2026-01-01T00:00:03.000Z", "Alice: hello"),
      summary("b", "2026-01-01T00:00:02.000Z", "Bob: hi"),
    ]);
    const next = mergeDmSummaries(remote, new Map());
    expect(next.get("a")?.lastMessage).toBe("Alice: hello");
    expect(next.get("b")?.lastMessage).toBe("Bob: hi");
  });
});

describe("reconcileConfirmedMessage", () => {
  it("replaces the optimistic message by temp id", () => {
    const old = data(msg({ id: "temp-1", sender_id: ME, content: "hi", status: "pending" }));
    const next = reconcileConfirmedMessage(
      old,
      "temp-1",
      msg({ id: "real-1", sender_id: ME, content: "hi", timestamp: "2026-01-01T00:00:02.000Z" })
    );
    const flat = flattenDmMessages(next);
    expect(flat.map((m) => m.id)).toEqual(["real-1"]);
    expect(flat[0].status).toBe("sent");
  });

  it("inserts the confirmed message when the temp id is already gone", () => {
    const old = data(msg({ id: "real-1", content: "hi" }));
    const next = reconcileConfirmedMessage(
      old,
      "temp-1",
      msg({ id: "real-2", content: "hello", timestamp: "2026-01-01T00:00:02.000Z" })
    );
    expect(flattenDmMessages(next).map((m) => m.id)).toEqual(["real-1", "real-2"]);
  });

  it("falls back to content-merge when no temp id is present", () => {
    const old = data(msg({ id: "temp-1", sender_id: ME, content: "hi", status: "pending" }));
    const next = reconcileConfirmedMessage(
      old,
      undefined,
      msg({ id: "real-9", sender_id: ME, content: "hi", timestamp: "2026-01-01T00:00:02.000Z" })
    );
    expect(flattenDmMessages(next).map((m) => m.id)).toEqual(["real-9"]);
  });

  it("creates a page when nothing is cached", () => {
    const next = reconcileConfirmedMessage(undefined, undefined, msg({ id: "real-1" }));
    expect(flattenDmMessages(next).map((m) => m.id)).toEqual(["real-1"]);
  });
});