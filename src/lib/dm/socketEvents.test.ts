import { describe, expect, it } from "vitest";
import {
  isDmEventBody,
  resolveDmConversationId,
  toDmMessageFromSocket,
  unwrapSocketPayload,
} from "./socketEvents";

describe("unwrapSocketPayload", () => {
  it("unwraps the payload field when present", () => {
    expect(unwrapSocketPayload({ payload: { id: 1 } })).toEqual({ id: 1 });
  });

  it("returns the value as-is when not wrapped", () => {
    expect(unwrapSocketPayload({ id: 1 })).toEqual({ id: 1 });
  });
});

describe("isDmEventBody", () => {
  it("accepts a receive_dm body", () => {
    expect(isDmEventBody({ thread_id: "t1", sender_id: "a", receiver_id: "me" })).toBe(true);
  });

  it("rejects a channel message body", () => {
    expect(isDmEventBody({ channel_id: "c1", sender_id: "a" })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isDmEventBody("hi")).toBe(false);
    expect(isDmEventBody(null)).toBe(false);
  });
});

describe("resolveDmConversationId", () => {
  it("resolves to the sender when the current user is the receiver", () => {
    expect(
      resolveDmConversationId({ sender_id: "alice", receiver_id: "me" }, "me")
    ).toBe("alice");
  });

  it("resolves to the receiver when the current user is the sender (confirmation)", () => {
    expect(
      resolveDmConversationId({ sender_id: "me", receiver_id: "bob" }, "me")
    ).toBe("bob");
  });

  it("returns null for channel events", () => {
    expect(resolveDmConversationId({ channel_id: "c1", sender_id: "a" }, "me")).toBeNull();
  });

  it("returns null when the current user id is unknown", () => {
    expect(
      resolveDmConversationId({ sender_id: "me", receiver_id: "bob" }, undefined)
    ).toBeNull();
  });
});

describe("toDmMessageFromSocket", () => {
  it("normalizes a valid message body", () => {
    const message = toDmMessageFromSocket({
      id: 7,
      content: "yo",
      sender_id: "alice",
      receiver_id: "me",
      thread_id: "t1",
    });
    expect(message).toMatchObject({
      id: "7",
      content: "yo",
      sender_id: "alice",
      receiver_id: "me",
      thread_id: "t1",
      status: "sent",
    });
  });

  it("returns null for bodies without any message identity", () => {
    expect(toDmMessageFromSocket({ channel_id: "c1" })).toBeNull();
  });
});