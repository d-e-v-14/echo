import { describe, it, expect } from "vitest";
import { realtimeEventToCommands } from "./realtimeCache";

describe("realtimeEventToCommands", () => {
  it("invalidates the channel message page on new_message with a channel", () => {
    expect(
      realtimeEventToCommands("new_message", { channel_id: "c1" })
    ).toEqual([{ type: "invalidate", queryKeys: [["channel", "c1", "messages"]] }]);
  });

  it("reconciles the DM list on a DM message (message cache is updated directly)", () => {
    expect(
      realtimeEventToCommands("new_message", { thread_id: "t1" })
    ).toEqual([{ type: "invalidate", queryKeys: [["dms"]] }]);
  });

  it("reconciles the DM list on receive_dm", () => {
    expect(
      realtimeEventToCommands("receive_dm", { thread_id: "t1" })
    ).toEqual([{ type: "invalidate", queryKeys: [["dms"]] }]);
  });

  it("invalidates channel permissions, its messages and the server family on channel_updated", () => {
    const commands = realtimeEventToCommands("channel_updated", {
      server_id: "s1",
      channel_id: "c1",
    });
    expect(commands[0]).toEqual({
      type: "invalidate",
      queryKeys: [["server", "s1"], ["server", "s1", "channels"]],
    });
    expect(commands[1]).toEqual({
      type: "invalidate",
      queryKeys: [["channel", "c1", "permissions"], ["channel", "c1", "messages"]],
    });
  });

  it("invalidates notifications and unread counts on mention events", () => {
    expect(
      realtimeEventToCommands("mention_notification", {})
    ).toEqual([{ type: "invalidate", queryKeys: [["notifications"], ["unread-counts"]] }]);
    expect(
      realtimeEventToCommands("mention_marked_read", {})
    ).toEqual([{ type: "invalidate", queryKeys: [["notifications"], ["unread-counts"]] }]);
  });

  it("invalidates friends on friend events and presence", () => {
    expect(realtimeEventToCommands("friend_request_accepted", {})).toEqual([
      { type: "invalidate", queryKeys: [["friends"], ["friends", "requests"]] },
    ]);
    expect(realtimeEventToCommands("presence_updated", {})).toEqual([
      { type: "invalidate", queryKeys: [["friends"], ["friends", "requests"]] },
    ]);
  });

  it("removes (never persists) voice/presence state", () => {
    expect(realtimeEventToCommands("voice_state_update", {})).toEqual([
      { type: "remove", queryKeys: [["voice"], ["presence"]] },
    ]);
  });

  it("maps permissions_updated to the channel permissions family", () => {
    expect(realtimeEventToCommands("permissions_updated", { channel_id: "c1" })).toEqual([
      { type: "invalidate", queryKeys: [["channel", "c1", "permissions"]] },
    ]);
  });

  it("recognises envelope-wrapped payloads", () => {
    expect(
      realtimeEventToCommands("new_message", {
        eventId: "e1",
        payload: { channel_id: "c9" },
      })
    ).toEqual([{ type: "invalidate", queryKeys: [["channel", "c9", "messages"]] }]);
  });

  it("returns no commands for unknown events", () => {
    expect(realtimeEventToCommands("some_unknown_event", {})).toEqual([]);
  });
});
