import { describe, expect, it } from "vitest";
import {
  isChannelEventBody,
  resolveChannelId,
  toChannelMessageFromSocket,
} from "./socketEvents";

describe("isChannelEventBody", () => {
  it("accepts snake_case and camelCase channel ids", () => {
    expect(isChannelEventBody({ channel_id: "c1" })).toBe(true);
    expect(isChannelEventBody({ channelId: "c1" })).toBe(true);
  });

  it("rejects non-channel and non-object bodies", () => {
    expect(isChannelEventBody({ thread_id: "t1" })).toBe(false);
    expect(isChannelEventBody({ receiver_id: "u2" })).toBe(false);
    expect(isChannelEventBody(null)).toBe(false);
    expect(isChannelEventBody("c1")).toBe(false);
  });
});

describe("resolveChannelId", () => {
  it("reads the channel id from either casing", () => {
    expect(resolveChannelId({ channel_id: "c1" })).toBe("c1");
    expect(resolveChannelId({ channelId: "c2" })).toBe("c2");
  });

  it("returns null for non-channel bodies", () => {
    expect(resolveChannelId({ thread_id: "t1" })).toBeNull();
    expect(resolveChannelId(undefined)).toBeNull();
  });
});

describe("toChannelMessageFromSocket", () => {
  it("normalizes a channel message from a socket payload", () => {
    const message = toChannelMessageFromSocket(
      {
        id: 5,
        content: "hi",
        sender_id: "u2",
        channel_id: "c1",
        timestamp: "2026-01-01T10:00:00.000Z",
        username: "bob",
      },
      "me"
    );
    expect(message).toMatchObject({
      id: 5,
      content: "hi",
      senderId: "u2",
      username: "bob",
    });
  });

  it("treats the current user as You", () => {
    const message = toChannelMessageFromSocket(
      { id: 1, content: "hi", sender_id: "me", channel_id: "c1" },
      "me"
    );
    expect(message?.username).toBe("You");
  });

  it("unwraps a payload envelope", () => {
    const message = toChannelMessageFromSocket(
      { payload: { id: 7, content: "wrapped", sender_id: "u2", channel_id: "c1" } },
      "me"
    );
    expect(message?.content).toBe("wrapped");
  });

  it("returns null for bodies that are not messages", () => {
    expect(toChannelMessageFromSocket({ channel_id: "c1" }, "me")).toBeNull();
    expect(toChannelMessageFromSocket(null, "me")).toBeNull();
  });
});