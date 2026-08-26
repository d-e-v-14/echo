import { describe, it, expect, beforeEach } from "vitest";
import {
  resetUnreadStore,
  configureUnreadStore,
  addUnreadMention,
  hydrateUnread,
  normalizeMentionEntry,
  removeUnreadMention,
  removeChannelUnreadLocal,
  pruneServerChannels,
  pruneServers,
  getSnapshot,
} from "./unreadStore";

beforeEach(() => {
  resetUnreadStore();
});

const flatMention = (overrides: Record<string, unknown> = {}) => ({
  id: "mention-1",
  message_id: "msg-1",
  channel_id: "ch-1",
  server_id: "server-1",
  sender_id: "user-2",
  sender_username: "bob",
  created_at: "2026-08-26T10:00:00.000Z",
  ...overrides,
});

describe("normalizeMentionEntry", () => {
  it("parses a flat payload", () => {
    const entry = normalizeMentionEntry(flatMention());
    expect(entry).toMatchObject({
      id: "mention-1",
      messageId: "msg-1",
      channelId: "ch-1",
      serverId: "server-1",
      senderId: "user-2",
      senderUsername: "bob",
    });
  });

  it("parses a nested payload (message.channels.server_id)", () => {
    const entry = normalizeMentionEntry({
      id: "mention-2",
      message_id: "msg-2",
      created_at: "2026-08-26T10:01:00.000Z",
      message: {
        id: "msg-2",
        sender_id: "user-3",
        channel_id: "ch-2",
        users: { username: "alice" },
        channels: { server_id: "server-2" },
      },
    });
    expect(entry).toMatchObject({
      id: "mention-2",
      messageId: "msg-2",
      channelId: "ch-2",
      serverId: "server-2",
      senderId: "user-3",
      senderUsername: "alice",
    });
  });

  it("unwraps an envelope payload", () => {
    const entry = normalizeMentionEntry({ payload: flatMention() });
    expect(entry?.channelId).toBe("ch-1");
  });

  it("falls back to a cache resolver when serverId is missing", () => {
    configureUnreadStore({
      userId: "user-1",
      socket: null,
      resolveServerId: (channelId) =>
        channelId === "ch-1" ? "server-from-resolver" : undefined,
    });
    const entry = normalizeMentionEntry(
      flatMention({ server_id: undefined, serverId: undefined })
    );
    expect(entry?.serverId).toBe("server-from-resolver");
  });

  it("rejects self mentions", () => {
    const entry = normalizeMentionEntry(
      flatMention({ sender_id: "user-1" }),
      "user-1"
    );
    expect(entry).toBeNull();
  });

  it("returns null when channelId is missing", () => {
    expect(normalizeMentionEntry({ id: "x" })).toBeNull();
  });
});

describe("unread store state", () => {
  it("dedupes duplicate mentions for the same message+channel", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    addUnreadMention(flatMention());
    addUnreadMention(flatMention());
    expect(getSnapshot().channelCounts["ch-1"]).toBe(1);
  });

  it("derives server unread from unread channels", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    addUnreadMention(flatMention({ id: "a", message_id: "m1", channel_id: "ch-1", server_id: "s1" }));
    addUnreadMention(flatMention({ id: "b", message_id: "m2", channel_id: "ch-2", server_id: "s1" }));
    addUnreadMention(flatMention({ id: "c", message_id: "m3", channel_id: "ch-3", server_id: "s2" }));

    const snapshot = getSnapshot();
    expect(snapshot.serverUnread["s1"]).toBe(true);
    expect(snapshot.serverUnread["s2"]).toBe(true);
    expect(snapshot.serverCounts["s1"]).toBe(2);
    expect(snapshot.serverChannels.get("s1")).toEqual(["ch-1", "ch-2"]);
  });

  it("keeps multiple unread channels independent", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    addUnreadMention(flatMention({ id: "a", message_id: "m1", channel_id: "dev", server_id: "s1" }));
    addUnreadMention(flatMention({ id: "b", message_id: "m2", channel_id: "general", server_id: "s1" }));
    addUnreadMention(flatMention({ id: "c", message_id: "m3", channel_id: "projects", server_id: "s1" }));

    const removedDev = removeChannelUnreadLocal("dev");
    expect(removedDev.map((e) => e.channelId)).toEqual(["dev"]);

    const snapshot = getSnapshot();
    expect(snapshot.channelCounts["dev"]).toBeUndefined();
    expect(snapshot.channelCounts["general"]).toBe(1);
    expect(snapshot.channelCounts["projects"]).toBe(1);
    expect(snapshot.serverUnread["s1"]).toBe(true);
  });

  it("clears server unread when all channels are read", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    addUnreadMention(flatMention({ id: "a", message_id: "m1", channel_id: "dev", server_id: "s1" }));
    addUnreadMention(flatMention({ id: "b", message_id: "m2", channel_id: "general", server_id: "s1" }));

    removeChannelUnreadLocal("dev");
    removeChannelUnreadLocal("general");

    expect(getSnapshot().serverUnread["s1"]).toBeFalsy();
  });

  it("hydrates initial unread mentions", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    hydrateUnread([
      normalizeMentionEntry(flatMention({ id: "a", message_id: "m1", channel_id: "ch-1", server_id: "s1" }))!,
      normalizeMentionEntry(flatMention({ id: "b", message_id: "m2", channel_id: "ch-2", server_id: "s2" }))!,
    ]);
    expect(getSnapshot().channelCounts["ch-1"]).toBe(1);
    expect(getSnapshot().channelCounts["ch-2"]).toBe(1);
  });
});

describe("removeUnreadMention", () => {
  it("removes by string id", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    addUnreadMention(flatMention());
    removeUnreadMention("mention-1");
    expect(getSnapshot().channelCounts["ch-1"]).toBeUndefined();
  });

  it("removes by object id", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    addUnreadMention(flatMention());
    removeUnreadMention({ id: "mention-1" });
    expect(getSnapshot().channelCounts["ch-1"]).toBeUndefined();
  });
});

describe("pruning", () => {
  it("cleans up unread for deleted channels", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    addUnreadMention(flatMention({ id: "a", message_id: "m1", channel_id: "dev", server_id: "s1" }));
    addUnreadMention(flatMention({ id: "b", message_id: "m2", channel_id: "general", server_id: "s1" }));

    pruneServerChannels("s1", new Set(["general"]));

    const snapshot = getSnapshot();
    expect(snapshot.channelCounts["dev"]).toBeUndefined();
    expect(snapshot.channelCounts["general"]).toBe(1);
    expect(snapshot.serverUnread["s1"]).toBe(true);
  });

  it("cleans up unread for left servers", () => {
    configureUnreadStore({ userId: "user-1", socket: null });
    addUnreadMention(flatMention({ id: "a", message_id: "m1", channel_id: "ch-1", server_id: "s1" }));
    addUnreadMention(flatMention({ id: "b", message_id: "m2", channel_id: "ch-2", server_id: "s2" }));

    pruneServers(new Set(["s2"]));

    const snapshot = getSnapshot();
    expect(snapshot.channelCounts["ch-1"]).toBeUndefined();
    expect(snapshot.channelCounts["ch-2"]).toBe(1);
  });
});