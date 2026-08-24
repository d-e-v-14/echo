import { describe, expect, it } from "vitest";
import {
  createChannelMessagesData,
  flattenChannelMessages,
  insertIncomingIntoDataOrCreate,
  insertIncomingIntoPages,
  markMessagesFailed,
  replaceOptimisticById,
  updateMessageById,
  deleteMessageById,
} from "./cache";
import type { ChannelMessage, ChannelMessagesData } from "./types";

const ME = "me";

const msg = (
  overrides: Partial<ChannelMessage> & { id: string | number }
): ChannelMessage => ({
  content: "",
  senderId: ME,
  timestamp: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const data = (...messages: ChannelMessage[]): ChannelMessagesData =>
  createChannelMessagesData(messages);

describe("createChannelMessagesData / flattenChannelMessages", () => {
  it("wraps messages in a single newest page", () => {
    const created = createChannelMessagesData([msg({ id: "1" })], true, "c1");
    expect(created.pages).toHaveLength(1);
    expect(created.pages[0]).toMatchObject({
      hasMore: true,
      nextCursor: "c1",
    });
    expect(flattenChannelMessages(created).map((m) => m.id)).toEqual(["1"]);
  });

  it("returns an empty array when there is no data", () => {
    expect(flattenChannelMessages(undefined)).toEqual([]);
  });

  it("flattens multiple pages oldest → newest", () => {
    const multi: ChannelMessagesData = {
      pages: [
        { messages: [msg({ id: "old", timestamp: "2026-01-01T00:00:01.000Z" })], hasMore: true },
        { messages: [msg({ id: "new", timestamp: "2026-01-01T00:00:02.000Z" })], hasMore: false },
      ],
      pageParams: [null, "c0"],
    };
    expect(flattenChannelMessages(multi).map((m) => m.id)).toEqual(["old", "new"]);
  });
});

describe("insertIncomingIntoPages", () => {
  it("inserts into the newest (last) page and sorts", () => {
    const old = {
      pages: [
        { messages: [msg({ id: "old", timestamp: "2026-01-01T00:00:01.000Z" })], hasMore: true, nextCursor: "c0" },
        { messages: [msg({ id: "newest", timestamp: "2026-01-01T00:00:10.000Z" })], hasMore: false, nextCursor: null },
      ],
      pageParams: [null, "c0"],
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

describe("insertIncomingIntoDataOrCreate", () => {
  it("creates a cache page when nothing is cached yet", () => {
    const next = insertIncomingIntoDataOrCreate(undefined, msg({ id: "1" }));
    expect(flattenChannelMessages(next).map((m) => m.id)).toEqual(["1"]);
  });

  it("delegates to insertIncomingIntoPages when data exists", () => {
    const old = data(msg({ id: "1" }));
    const next = insertIncomingIntoDataOrCreate(
      old,
      msg({ id: "2", timestamp: "2026-01-01T00:00:05.000Z" })
    );
    expect(flattenChannelMessages(next).map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("replaces a matching optimistic message with the real message", () => {
    const old = data(
      msg({
        id: "temp-abc",
        content: "hi",
        senderId: ME,
        status: "pending",
        timestamp: "2026-01-01T00:00:01.000Z",
      })
    );
    const next = insertIncomingIntoDataOrCreate(
      old,
      msg({
        id: "real-9",
        content: "hi",
        senderId: ME,
        timestamp: "2026-01-01T00:00:02.000Z",
      })
    );
    const flat = flattenChannelMessages(next);
    expect(flat).toHaveLength(1);
    expect(flat[0].id).toBe("real-9");
    expect(flat[0].status).toBe("sent");
  });
});

describe("replaceOptimisticById", () => {
  it("swaps a temp message for the confirmed message and marks sent", () => {
    const old = data(
      msg({ id: "temp-1", content: "hi", status: "pending" })
    );
    const next = replaceOptimisticById(old, "temp-1", {
      id: "real-1",
      content: "hi",
      mediaUrl: null as unknown as string,
    });
    const flat = flattenChannelMessages(next);
    expect(flat.map((m) => m.id)).toEqual(["real-1"]);
    expect(flat[0].status).toBe("sent");
  });

  it("no-ops when the temp id is already gone", () => {
    const old = data(msg({ id: "real-1" }));
    expect(replaceOptimisticById(old, "temp-1", { id: "real-2" })).toBe(old);
  });
});

describe("markMessagesFailed", () => {
  it("marks only the given temp ids as failed", () => {
    const old = data(
      msg({ id: "temp-1", status: "pending" }),
      msg({ id: "real-1", status: "sent" })
    );
    const next = markMessagesFailed(old, new Set(["temp-1"]));
    const flat = flattenChannelMessages(next);
    expect(flat.find((m) => m.id === "temp-1")?.status).toBe("failed");
    expect(flat.find((m) => m.id === "real-1")?.status).toBe("sent");
  });
});

describe("updateMessageById", () => {
  it("patches a message across pages (edit / reaction / pin)", () => {
    const old = {
      pages: [
        { messages: [msg({ id: "1", content: "before" })], hasMore: false, nextCursor: null },
      ],
      pageParams: [null],
    };
    const next = updateMessageById(old, "1", (m) => ({
      ...m,
      content: "after",
    }));
    expect(flattenChannelMessages(next)[0].content).toBe("after");
  });

  it("no-ops when the message is not present", () => {
    const old = data(msg({ id: "1" }));
    expect(updateMessageById(old, "ghost", (m) => m)).toBe(old);
  });
});

describe("deleteMessageById", () => {
  it("removes a message by id across pages", () => {
    const old = data(msg({ id: "1" }), msg({ id: "2" }));
    const next = deleteMessageById(old, "1");
    expect(flattenChannelMessages(next).map((m) => m.id)).toEqual(["2"]);
  });

  it("no-ops when the message is not present", () => {
    const old = data(msg({ id: "1" }));
    expect(deleteMessageById(old, "ghost")).toBe(old);
  });
});