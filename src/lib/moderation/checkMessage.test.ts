import { describe, expect, it } from "vitest";
import { checkMessage, isModerationBlockedError } from "./checkMessage";

describe("checkMessage", () => {
  it("allows normal messages", () => {
    expect(checkMessage("hello there, how are you?").allowed).toBe(true);
    expect(checkMessage("").allowed).toBe(true);
    expect(checkMessage("   ").allowed).toBe(true);
    expect(checkMessage("🎉 party time 🎉").allowed).toBe(true);
  });

  it("blocks a blacklisted word", () => {
    expect(checkMessage("this is shit").allowed).toBe(false);
    expect(checkMessage("fuck this").allowed).toBe(false);
  });

  it("blocks uppercase/lowercase variations", () => {
    expect(checkMessage("THIS IS SHIT").allowed).toBe(false);
    expect(checkMessage("Fuck This").allowed).toBe(false);
    expect(checkMessage("fUcK").allowed).toBe(false);
  });

  it("blocks words wrapped in punctuation", () => {
    expect(checkMessage("oh, shit!").allowed).toBe(false);
    expect(checkMessage("(fuck)").allowed).toBe(false);
    expect(checkMessage("...asshole...").allowed).toBe(false);
    expect(checkMessage("fuck,").allowed).toBe(false);
  });

  it("blocks words separated by extra whitespace", () => {
    expect(checkMessage("you   ass   here").allowed).toBe(false);
    expect(checkMessage("  shit  ").allowed).toBe(false);
  });

  it("does not block words that merely contain a blacklisted term", () => {
    expect(checkMessage("the assassin was caught").allowed).toBe(true);
    expect(checkMessage("classic mistake").allowed).toBe(true);
    expect(checkMessage("grass is green").allowed).toBe(true);
    expect(checkMessage("I'm in the office").allowed).toBe(true);
  });
});

describe("isModerationBlockedError", () => {
  it("detects the error code in the response body", () => {
    expect(
      isModerationBlockedError({
        response: { data: { code: "MESSAGE_MODERATION_BLOCKED" } },
      })
    ).toBe(true);
  });

  it("detects the code under the error key", () => {
    expect(
      isModerationBlockedError({
        response: { data: { error: "MESSAGE_MODERATION_BLOCKED" } },
      })
    ).toBe(true);
  });

  it("detects the code inside the message string", () => {
    expect(
      isModerationBlockedError({
        response: {
          data: { message: "Blocked (MESSAGE_MODERATION_BLOCKED)" },
        },
      })
    ).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isModerationBlockedError(null)).toBe(false);
    expect(
      isModerationBlockedError({ response: { data: { code: "OTHER" } } })
    ).toBe(false);
    expect(
      isModerationBlockedError({ response: { status: 500 } })
    ).toBe(false);
  });
});