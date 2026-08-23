import { describe, it, expect } from "vitest";
import {
  policyForQueryKey,
  DEFAULT_POLICY,
  STABLE_POLICY,
  MEDIUM_POLICY,
  MEMBER_POLICY,
  DM_POLICY,
  SEARCH_POLICY,
  REALTIME_POLICY,
  EPHEMERAL_POLICY,
} from "./cachePolicy";
import { queryKeys } from "./keys";

const MINUTE = 60_000;

describe("policyForQueryKey", () => {
  it("assigns the stable policy to the current user", () => {
    expect(policyForQueryKey(queryKeys.me)).toEqual(STABLE_POLICY);
  });

  it("assigns the medium policy to the servers list", () => {
    expect(policyForQueryKey(queryKeys.servers)).toEqual(MEDIUM_POLICY);
  });

  it("assigns the member policy to server members", () => {
    expect(
      policyForQueryKey(queryKeys.serverMembers("s1"))
    ).toEqual(MEMBER_POLICY);
    expect(policyForQueryKey(queryKeys.serverMembers("s1")).staleTimeMs).toBe(
      60_000
    );
  });

  it("assigns the stable policy to roles, medium to details/channels", () => {
    expect(policyForQueryKey(queryKeys.serverRoles("s1"))).toEqual(
      STABLE_POLICY
    );
    expect(policyForQueryKey(queryKeys.serverDetails("s1"))).toEqual(
      MEDIUM_POLICY
    );
    expect(policyForQueryKey(queryKeys.serverChannels("s1"))).toEqual(
      MEDIUM_POLICY
    );
  });

  it("uses a session-based (long) policy for cached channel messages", () => {
    const policy = policyForQueryKey(
      queryKeys.channelMessages("c1")
    ) as typeof STABLE_POLICY;
    expect(policy.staleTimeMs).toBe(30 * MINUTE);
    expect(policy.gcTimeMs).toBe(30 * MINUTE);
  });

  it("uses the medium policy for channel permissions", () => {
    expect(
      policyForQueryKey(queryKeys.channelPermissions("c1"))
    ).toEqual(MEDIUM_POLICY);
  });

  it("uses the DM policy for the DM list and medium for a thread's messages", () => {
    expect(policyForQueryKey(queryKeys.dms)).toEqual(DM_POLICY);
    expect(policyForQueryKey(queryKeys.dmMessages("t1"))).toEqual(
      MEDIUM_POLICY
    );
  });

  it("uses the search policy for query-keyed search", () => {
    expect(policyForQueryKey(queryKeys.serverSearch("s1", "q"))).toEqual(
      SEARCH_POLICY
    );
    expect(policyForQueryKey(["search-dm", "t1", "q"])).toEqual(SEARCH_POLICY);
  });

  it("uses the realtime policy for notifications and unread counts", () => {
    expect(policyForQueryKey(queryKeys.notifications)).toEqual(
      REALTIME_POLICY
    );
    expect(policyForQueryKey(queryKeys.unreadCounts)).toEqual(REALTIME_POLICY);
  });

  it("uses the medium policy for pinned messages", () => {
    expect(
      policyForQueryKey(queryKeys.pinnedMessages({ channel_id: "c1" }))
    ).toEqual(MEDIUM_POLICY);
  });

  it("uses the stable policy for user profiles", () => {
    expect(policyForQueryKey(queryKeys.userProfile("u1"))).toEqual(
      STABLE_POLICY
    );
  });

  it("falls back to the default policy for unknown roots", () => {
    expect(policyForQueryKey(["totally", "unknown"])).toEqual(DEFAULT_POLICY);
  });

  it("exposes the ephemeral policy for voice/presence state", () => {
    expect(EPHEMERAL_POLICY).toEqual({ staleTimeMs: 0, gcTimeMs: 0 });
    expect(policyForQueryKey(["voice", "c1"])).toEqual(EPHEMERAL_POLICY);
    expect(policyForQueryKey(["presence", "c1"])).toEqual(EPHEMERAL_POLICY);
  });
});
