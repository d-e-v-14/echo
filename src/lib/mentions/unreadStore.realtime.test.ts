import { describe, it, expect, beforeEach } from "vitest";
import {
  resetUnreadStore,
  configureUnreadStore,
  addUnreadMention,
  resolvePendingServerIds,
  getSnapshot,
} from "./unreadStore";

beforeEach(() => {
  resetUnreadStore();
});

const LEGACY_SOCKET_PAYLOAD = {
  id: "notif-1",
  messageId: "msg-1",
  channelId: "ch-1",
  senderId: "user-2",
  senderUsername: "bob",
  senderAvatar: null,
  content: "hello @alice",
  channelName: "general",
  serverName: "My Server",
  timestamp: "2026-08-26T10:00:00.000Z",
  type: "mention" as const,
  isRead: false,
};

describe("realtime mention_notification contract", () => {
  it("stores legacy payloads unresolved but keeps serverName for backfill", () => {
    configureUnreadStore({
      userId: "user-1",
      socket: null,
      resolveServerId: () => undefined,
    });

    addUnreadMention(
      { eventId: "evt-1", payload: LEGACY_SOCKET_PAYLOAD },
      "user-1"
    );

    const snapshot = getSnapshot();
    expect(snapshot.channelCounts["ch-1"]).toBe(1);
    const entry = snapshot.channelMentions.get("ch-1")?.[0];
    expect(entry?.serverId).toBeUndefined();
    expect(entry?.serverName).toBe("My Server");
  });

  it("resolves serverId via the query-cache resolver when present", () => {
    configureUnreadStore({
      userId: "user-1",
      socket: null,
      resolveServerId: (channelId) =>
        channelId === "ch-1" ? "srv-open" : undefined,
    });

    addUnreadMention(
      { eventId: "evt-2", payload: LEGACY_SOCKET_PAYLOAD },
      "user-1"
    );

    const snapshot = getSnapshot();
    expect(snapshot.serverUnread["srv-open"]).toBe(true);
  });

  it("backfills serverId from serverName during pending resolution", () => {
    configureUnreadStore({ userId: "user-1", socket: null });

    addUnreadMention(
      { eventId: "evt-3", payload: LEGACY_SOCKET_PAYLOAD },
      "user-1"
    );
    expect(getSnapshot().serverUnread["srv-1"]).toBeUndefined();

    resolvePendingServerIds((channelId, serverName) =>
      serverName?.toLowerCase() === "my server" ? "srv-1" : undefined
    );

    const snapshot = getSnapshot();
    expect(snapshot.serverUnread["srv-1"]).toBe(true);
    expect(snapshot.channelCounts["ch-1"]).toBe(1);
    expect(snapshot.serverCounts["srv-1"]).toBe(1);
  });

  it("keeps entries unresolved when resolution finds nothing", () => {
    configureUnreadStore({ userId: "user-1", socket: null });

    addUnreadMention(
      { eventId: "evt-4", payload: LEGACY_SOCKET_PAYLOAD },
      "user-1"
    );

    resolvePendingServerIds(() => undefined);

    const snapshot = getSnapshot();
    expect(snapshot.channelCounts["ch-1"]).toBe(1);
    expect(snapshot.serverUnread["srv-1"]).toBeUndefined();
  });
});
