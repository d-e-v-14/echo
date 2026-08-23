import { describe, it, expect } from "vitest";
import {
  isValidUsernameMention,
  normalizeRoleName,
  validateUserMentions,
  validateRoleMentions,
  isContentMentioningMe,
} from "./mentions";

describe("isValidUsernameMention", () => {
  it("always allows @everyone", () => {
    expect(isValidUsernameMention("@everyone", new Set(["alice"]))).toBe(true);
  });

  it("allows known usernames (case-insensitive)", () => {
    const set = new Set(["alice", "bob"]);
    expect(isValidUsernameMention("@alice", set)).toBe(true);
    expect(isValidUsernameMention("@ALICE", set)).toBe(true);
  });

  it("rejects unknown usernames", () => {
    expect(isValidUsernameMention("@carol", new Set(["alice"]))).toBe(false);
  });
});

describe("validateUserMentions", () => {
  it("returns invalid with the offending mention", () => {
    expect(validateUserMentions("hi @ghost", new Set(["alice"]))).toEqual({
      valid: false,
      invalidUser: "@ghost",
    });
  });

  it("ignores role mentions and @everyone", () => {
    expect(
      validateUserMentions("@&Moderator @everyone", new Set(["alice"]))
    ).toEqual({ valid: true });
  });
});

describe("normalizeRoleName", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeRoleName("  Event   Planner  ")).toBe("event planner");
  });
});

describe("validateRoleMentions", () => {
  it("returns invalid for unknown roles", () => {
    expect(validateRoleMentions("@&Ghost", new Set(["moderator"]))).toEqual({
      valid: false,
      invalidRole: "Ghost",
    });
  });

  it("accepts known roles case-insensitively", () => {
    expect(validateRoleMentions("@&moderator", new Set(["moderator"]))).toEqual({
      valid: true,
    });
  });
});

describe("isContentMentioningMe", () => {
  const options = {
    username: "bob",
    roleIds: ["r1"],
    roles: [{ id: "r1", name: "Moderator" }],
  };

  it("detects @everyone / @here", () => {
    expect(isContentMentioningMe("ping @everyone", { ...options, roleIds: [] })).toBe(true);
    expect(isContentMentioningMe("ping @here", { ...options, roleIds: [] })).toBe(true);
  });

  it("detects current username", () => {
    expect(isContentMentioningMe("hey @bob", options)).toBe(true);
    expect(isContentMentioningMe("hey @alice", options)).toBe(false);
  });

  it("detects current user role mentions", () => {
    expect(isContentMentioningMe("call @&Moderator", options)).toBe(true);
    expect(isContentMentioningMe("call @&Admin", options)).toBe(false);
  });
});
