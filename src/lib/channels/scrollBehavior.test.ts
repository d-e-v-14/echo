import { describe, expect, it } from "vitest";
import { resolveInitialScrollTarget } from "./scrollBehavior";

const messages = [
  {
    id: "oldest",
    senderId: "other",
    timestamp: "2026-01-01T09:00:00.000Z",
  },
  {
    id: "latest",
    senderId: "other",
    timestamp: "2026-01-01T10:00:00.000Z",
  },
];

describe("resolveInitialScrollTarget", () => {
  it("opens a channel with no saved read position at the latest message", () => {
    expect(
      resolveInitialScrollTarget(messages, "me", null, null)
    ).toEqual({ kind: "bottom" });
  });

  it("opens at the first unread message after a saved read position", () => {
    expect(
      resolveInitialScrollTarget(
        messages,
        "me",
        "2026-01-01T09:30:00.000Z",
        null
      )
    ).toEqual({ kind: "first-unread", index: 1 });
  });

  it("restores an explicit scroll anchor when there are no unread messages", () => {
    expect(
      resolveInitialScrollTarget(
        messages,
        "me",
        "2026-01-01T10:00:00.000Z",
        { messageId: "oldest", offset: 12 }
      )
    ).toEqual({ kind: "anchor", anchor: { messageId: "oldest", offset: 12 } });
  });
});
