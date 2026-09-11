import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resetMessageUnreadStore,
  configureMessageUnreadStore,
  applyChannelMessage,
  markChannelMessageRead,
  markServerMessageRead,
  setActiveMessageChannel,
  getMessageUnreadSnapshot,
  getActiveMessageChannel,
  pruneMessageServers,
  pruneMessageChannels,
} from "./messageUnreadStore";

beforeEach(() => {
  resetMessageUnreadStore();
});

afterEach(() => {
  resetMessageUnreadStore();
});

const NEW_MESSAGE = {
  id: "msg-1",
  channel_id: "ch-1",
  sender_id: "user-2",
  content: "hello there",
  timestamp: "2026-09-11T10:00:00.000Z",
};

describe("messageUnreadStore", () => {
  it("counts a new_message for a channel whose server is known", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: (channelId) =>
        channelId === "ch-1" ? "srv-1" : undefined,
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");

    const snapshot = getMessageUnreadSnapshot();
    expect(snapshot.channelCounts["ch-1"]).toBe(1);
    expect(snapshot.serverCounts["srv-1"]).toBe(1);
    expect(snapshot.channelServer["ch-1"]).toBe("srv-1");
    expect(snapshot.totalUnread).toBe(1);
  });

  it("ignores messages sent by the current user", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage({ ...NEW_MESSAGE, sender_id: "user-1" }, "user-1");

    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });

  it("ignores messages in the channel currently being viewed", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });
    setActiveMessageChannel("ch-1");

    applyChannelMessage(NEW_MESSAGE, "user-1");

    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });

  it("ignores messages that mention the current user (counted by mention store)", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      username: "alice",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage(
      { ...NEW_MESSAGE, content: "ping @alice" },
      "user-1"
    );
    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);

    applyChannelMessage(
      { ...NEW_MESSAGE, content: "@everyone squad up" },
      "user-1"
    );
    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });

  it("ignores messages from servers the user does not belong to", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-ghost",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");

    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });

  it("does not double count the same message id", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");
    applyChannelMessage(NEW_MESSAGE, "user-1");

    expect(getMessageUnreadSnapshot().totalUnread).toBe(1);
  });

  it("markChannelMessageRead clears a channel and applies the server total", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");
    markChannelMessageRead("ch-1");

    const snapshot = getMessageUnreadSnapshot();
    expect(snapshot.channelCounts["ch-1"]).toBeUndefined();
    expect(snapshot.serverCounts["srv-1"]).toBeUndefined();
    expect(snapshot.totalUnread).toBe(0);
  });

  it("setActiveMessageChannel marks the newly active channel read", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");
    setActiveMessageChannel("ch-1");

    expect(getActiveMessageChannel()).toBe("ch-1");
    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });

  it("markServerMessageRead clears every channel under a server", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");
    applyChannelMessage({ ...NEW_MESSAGE, id: "msg-2" }, "user-1");
    markServerMessageRead("srv-1");

    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });

  it("pruneMessageServers drops counts for servers the user left", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1", "srv-2"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");
    pruneMessageServers(new Set(["srv-2"]));

    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });

  it("pruneMessageServers preserves unread counts for servers that remain", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1", "srv-2"]),
      resolveServerId: (channelId) =>
        channelId === "ch-1" ? "srv-1" : "srv-2",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");
    applyChannelMessage(
      { ...NEW_MESSAGE, id: "msg-2", channel_id: "ch-2" },
      "user-1"
    );

    pruneMessageServers(new Set(["srv-2"]));

    const snapshot = getMessageUnreadSnapshot();
    expect(snapshot.serverCounts["srv-2"]).toBe(1);
    expect(snapshot.totalUnread).toBe(1);
  });

  it("pruneMessageChannels drops counts for deleted channels of a server", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");
    pruneMessageChannels("srv-1", new Set(["ch-other"]));

    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });

  it("resets for a different user", () => {
    configureMessageUnreadStore({
      userId: "user-1",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    applyChannelMessage(NEW_MESSAGE, "user-1");
    expect(getMessageUnreadSnapshot().totalUnread).toBe(1);

    configureMessageUnreadStore({
      userId: "user-9",
      knownServerIds: new Set(["srv-1"]),
      resolveServerId: () => "srv-1",
    });

    expect(getMessageUnreadSnapshot().totalUnread).toBe(0);
  });
});