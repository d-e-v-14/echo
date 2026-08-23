import { describe, it, expect } from "vitest";
import {
  updateTyping,
  removeTyping,
  pruneTyping,
  isTypingUser,
  typingUsers,
  TYPING_TIMEOUT_MS,
} from "./typing";

describe("typing state machine", () => {
  it("records a typing user with an expiry", () => {
    const next = updateTyping({}, "u1", 1000);
    expect(next["u1"]).toBe(1000 + TYPING_TIMEOUT_MS);
  });

  it("removes a user explicitly", () => {
    const typing = updateTyping({}, "u1", 1000);
    expect(removeTyping(typing, "u1")).toEqual({});
    expect(removeTyping({}, "u1")).toEqual({});
  });

  it("prunes expired users", () => {
    const typing = {
      u1: 500,
      u2: 10_000,
    };
    const pruned = pruneTyping(typing, 3000);
    expect(pruned).toEqual({ u2: 10_000 });
  });

  it("reports whether a user is currently typing", () => {
    const typing = { u1: 10_000 };
    expect(isTypingUser(typing, "u1", 5_000)).toBe(true);
    expect(isTypingUser(typing, "u1", 20_000)).toBe(false);
    expect(isTypingUser({}, "u1", 5_000)).toBe(false);
  });

  it("lists typing users excluding a given user", () => {
    const typing = { u1: 10_000, u2: 20_000 };
    expect(typingUsers(typing, 5_000, "u1")).toEqual(["u2"]);
  });

  it("does not mutate the input map", () => {
    const source: Record<string, number> = { u1: 10_000 };
    const next = updateTyping(source, "u2", 1000);
    expect(source["u2"]).toBeUndefined();
    expect(next["u1"]).toBe(10_000);
  });
});
