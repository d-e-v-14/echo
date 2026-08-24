import { describe, expect, it } from "vitest";
import {
  ReactionStoreData,
  applyReactionDelta,
  mergeMessageReactions,
  setMessageReactions,
  reactionEventToUpdater,
  getReactionState,
  subscribeReactions,
  updateReactionStore,
} from "./reactionStore";

const empty = (): ReactionStoreData => ({});

describe("applyReactionDelta", () => {
  it("adds a user to an emoji that has no reactions yet", () => {
    const next = applyReactionDelta(empty(), {
      messageId: "m1",
      emoji: "👍",
      userId: "u1",
      added: true,
    });
    expect(next.m1?.["👍"]).toEqual(["u1"]);
  });

  it("adds a second user without duplicating", () => {
    const next = applyReactionDelta(
      { m1: { "👍": ["u1"] } },
      { messageId: "m1", emoji: "👍", userId: "u2", added: true }
    );
    expect(next.m1?.["👍"]).toEqual(["u1", "u2"]);
  });

  it("removes a user and drops the emoji when it empties", () => {
    const next = applyReactionDelta(
      { m1: { "👍": ["u1", "u2"] } },
      { messageId: "m1", emoji: "👍", userId: "u1", added: false }
    );
    expect(next.m1?.["👍"]).toEqual(["u2"]);
  });

  it("drops the whole message entry when the last emoji empties", () => {
    const next = applyReactionDelta(
      { m1: { "👍": ["u1"] } },
      { messageId: "m1", emoji: "👍", userId: "u1", added: false }
    );
    expect(next).toEqual({});
  });

  it("derives added=false from a present user (toggle)", () => {
    const next = applyReactionDelta(
      { m1: { "🔥": ["u1"] } },
      { messageId: "m1", emoji: "🔥", userId: "u1" }
    );
    expect(next).toEqual({});
  });

  it("derives added=true for a user not present (toggle)", () => {
    const next = applyReactionDelta(
      empty(),
      { messageId: "m1", emoji: "🔥", userId: "u1" }
    );
    expect(next.m1?.["🔥"]).toEqual(["u1"]);
  });

  it("no-ops without a userId", () => {
    const prev = { m1: { "👍": ["u1"] } };
    expect(
      applyReactionDelta(prev, { messageId: "m1", emoji: "👍", added: true })
    ).toBe(prev);
  });

  it("is immutable", () => {
    const prev = { m1: { "👍": ["u1"] } };
    const next = applyReactionDelta(prev, {
      messageId: "m1",
      emoji: "👍",
      userId: "u2",
      added: true,
    });
    expect(prev.m1?.["👍"]).toEqual(["u1"]);
    expect(next).not.toBe(prev);
  });
});

describe("mergeMessageReactions / setMessageReactions", () => {
  it("replaces the emoji set (full payload)", () => {
    const next = mergeMessageReactions(
      { m1: { "👍": ["u1"] } },
      "m1",
      "👍",
      ["u2", "u3"]
    );
    expect(next.m1?.["👍"]).toEqual(["u2", "u3"]);
  });

  it("drops the emoji when the full set is empty", () => {
    const next = mergeMessageReactions({ m1: { "👍": ["u1"] } }, "m1", "👍", []);
    expect(next).toEqual({});
  });

  it("replaces the whole message reaction map", () => {
    const next = setMessageReactions(empty(), "m1", {
      "👍": ["u1"],
      "🔥": ["u2", "u1"],
    });
    expect(next.m1?.["👍"]).toEqual(["u1"]);
    expect(next.m1?.["🔥"]).toEqual(["u2", "u1"]);
  });
});

describe("reactionEventToUpdater", () => {
  it("returns null when no message id can be resolved", () => {
    expect(reactionEventToUpdater({ emoji: "👍" })).toBeNull();
    expect(reactionEventToUpdater(null)).toBeNull();
  });

  it("applies a delta for a channel reaction", () => {
    const updater = reactionEventToUpdater({
      message_id: "m1",
      emoji: "👍",
      user_id: "u1",
      added: true,
    });
    const next = updater!(empty());
    expect(next.m1?.["👍"]).toEqual(["u1"]);
  });

  it("handles dm_message_id and userId keys", () => {
    const updater = reactionEventToUpdater({
      dm_message_id: "m2",
      emoji: "🔥",
      userId: "u9",
      removed: true,
    });
    const next = updater!({ m2: { "🔥": ["u9", "u8"] } });
    expect(next.m2?.["🔥"]).toEqual(["u8"]);
  });

  it("handles envelope-wrapped payloads", () => {
    const updater = reactionEventToUpdater({
      eventId: "e1",
      payload: { entityId: "m3", emoji: "🎉", user_id: "u1", action: "added" },
    });
    const next = updater!(empty());
    expect(next.m3?.["🎉"]).toEqual(["u1"]);
  });

  it("merges a full user_ids set when present", () => {
    const updater = reactionEventToUpdater({
      message_id: "m4",
      emoji: "❤️",
      user_ids: ["a", "b"],
    });
    const next = updater!(empty());
    expect(next.m4?.["❤️"]).toEqual(["a", "b"]);
  });

  it("replaces the whole map when a reactions object is provided", () => {
    const updater = reactionEventToUpdater({
      dm_message_id: "m5",
      reactions: { "👍": ["u1"], "🔥": ["u2"] },
    });
    const next = updater!(empty());
    expect(next.m5).toEqual({ "👍": ["u1"], "🔥": ["u2"] });
  });
});

describe("store", () => {
  it("notifies subscribers on updateReactionStore", () => {
    let calls = 0;
    const unsubscribe = subscribeReactions(() => {
      calls += 1;
    });
    updateReactionStore((prev) => applyReactionDelta(prev, {
      messageId: "m1",
      emoji: "👍",
      userId: "u1",
      added: true,
    }));
    expect(calls).toBe(1);
    expect(getReactionState().m1?.["👍"]).toEqual(["u1"]);
    unsubscribe();
    updateReactionStore((prev) => prev);
    expect(calls).toBe(1);
  });

  it("does not notify when the reducer returns the same reference", () => {
    let calls = 0;
    subscribeReactions(() => {
      calls += 1;
    });
    const snapshot = getReactionState();
    updateReactionStore((prev) => prev);
    expect(calls).toBe(0);
    expect(getReactionState()).toBe(snapshot);
  });
});