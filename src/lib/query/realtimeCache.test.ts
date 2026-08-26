import { describe, it, expect } from "vitest";
import { realtimeEventToCommands } from "./realtimeCache";

describe("realtimeEventToCommands", () => {
  it("does not refetch the channel window on new_message (cache is patched directly)", () => {
    expect(
      realtimeEventToCommands("new_message", {
        channel_id: "c1",
        id: "m1",
        sender_id: "u1",
        content: "hi",
      })
    ).toEqual([]);
  });

  it("does not reconcile the DM list via refetch on a DM message (patched directly)", () => {
    expect(
      realtimeEventToCommands("new_message", {
        thread_id: "t1",
        message_id: "m1",
        sender_id: "u1",
      })
    ).toEqual([]);
  });

  it("does not refetch on message_confirmed/message_error (patched directly)", () => {
    expect(
      realtimeEventToCommands("message_confirmed", {
        channel_id: "c1",
        temp_id: "temp-1",
        id: "m1",
      })
    ).toEqual([]);
    expect(
      realtimeEventToCommands("message_error", {
        channel_id: "c1",
        temp_id: "temp-1",
      })
    ).toEqual([]);
  });

  it("falls back to a narrow window refetch for a partial new_message payload", () => {
    expect(
      realtimeEventToCommands("new_message", { channel_id: "c1" })
    ).toEqual([
      { type: "invalidate", queryKeys: [["channel", "c1", "messages"]] },
    ]);
  });

  it("never refetches on receive_dm (conversation cache is patched directly)", () => {
    expect(realtimeEventToCommands("receive_dm", { thread_id: "t1" })).toEqual([]);
  });

  it("returns no commands for a reconcilable channel_updated (object patched directly)", () => {
    expect(
      realtimeEventToCommands("channel_updated", {
        server_id: "s1",
        channel_id: "c1",
        name: "general",
        type: "text",
        is_private: false,
      })
    ).toEqual([]);
  });

  it("falls back to a surgical reconcile for a partial channel_updated payload", () => {
    const commands = realtimeEventToCommands("channel_updated", {
      server_id: "s1",
      channel_id: "c1",
    });
    expect(commands).toEqual([
      { type: "invalidate", queryKeys: [["server", "s1", "channels"]] },
      { type: "invalidate", queryKeys: [["channel", "c1", "permissions"]] },
    ]);
  });

  it("never invalidates the message window for channel_updated", () => {
    const commands = realtimeEventToCommands("channel_updated", {
      channel_id: "c1",
      name: "renamed",
    });
    expect(commands).toEqual([]);
  });

  it("returns no commands for a permission payload that can be patched", () => {
    expect(
      realtimeEventToCommands("permissions_updated", {
        channel_id: "c1",
        canView: true,
        canSend: false,
        isAdmin: false,
        isModerator: false,
      })
    ).toEqual([]);
  });

  it("maps a partial permissions_updated to the channel permissions family", () => {
    expect(
      realtimeEventToCommands("permissions_updated", { channel_id: "c1" })
    ).toEqual([
      { type: "invalidate", queryKeys: [["channel", "c1", "permissions"]] },
    ]);
  });

  it("returns no commands on notification events (store patches itself)", () => {
    expect(realtimeEventToCommands("mention_notification", {})).toEqual([]);
    expect(realtimeEventToCommands("mention_marked_read", {})).toEqual([]);
  });

  it("returns no commands on friend/presence events (state patches itself)", () => {
    expect(realtimeEventToCommands("friend_request_accepted", {})).toEqual([]);
    expect(realtimeEventToCommands("presence_updated", {})).toEqual([]);
  });

  it("returns no commands on reaction_updated (reaction store is patched)", () => {
    expect(
      realtimeEventToCommands("reaction_updated", {
        channel_id: "c1",
        message_id: "m1",
        emoji: "👍",
        user_id: "u1",
      })
    ).toEqual([]);
  });

  it("removes (never persists) voice/presence state", () => {
    expect(realtimeEventToCommands("voice_state_update", {})).toEqual([
      { type: "remove", queryKeys: [["voice"], ["presence"]] },
    ]);
  });

  it("recognises envelope-wrapped payloads", () => {
    expect(
      realtimeEventToCommands("new_message", {
        eventId: "e1",
        payload: { channel_id: "c9", id: "m9", sender_id: "u1", content: "x" },
      })
    ).toEqual([]);
  });

  it("returns no commands for unknown events", () => {
    expect(realtimeEventToCommands("some_unknown_event", {})).toEqual([]);
  });
});