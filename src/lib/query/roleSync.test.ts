import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { invalidateServerPermissionQueries, invalidateAllCachedPermissions } from "./roleSync";
import { queryKeys } from "./keys";

describe("invalidateServerPermissionQueries", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it("invalidates role and channel-list queries for the server", () => {
    queryClient.setQueryData(queryKeys.serverChannels("s1"), [
      { id: "c1" },
      { id: "c2" },
    ]);
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateServerPermissionQueries(queryClient, "s1");

    const invalidatedKeys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidatedKeys).toContainEqual(queryKeys.serverRoles("s1"));
    expect(invalidatedKeys).toContainEqual(queryKeys.myServerRoles("s1"));
    expect(invalidatedKeys).toContainEqual(
      queryKeys.selfAssignableRoles("s1")
    );
    expect(invalidatedKeys).toContainEqual(queryKeys.serverChannels("s1"));
  });

  it("invalidates per-channel permissions for every cached channel of the server", () => {
    queryClient.setQueryData(queryKeys.serverChannels("s1"), [
      { id: "c1" },
      { id: "c2" },
      { id: "c3" },
    ]);
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateServerPermissionQueries(queryClient, "s1");

    const invalidatedKeys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidatedKeys).toContainEqual(queryKeys.channelPermissions("c1"));
    expect(invalidatedKeys).toContainEqual(queryKeys.channelPermissions("c2"));
    expect(invalidatedKeys).toContainEqual(queryKeys.channelPermissions("c3"));
  });

  it("falls back to invalidating all cached permissions when no channels are cached", () => {
    queryClient.setQueryData(queryKeys.channelPermissions("cx"), {
      canView: true,
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateServerPermissionQueries(queryClient, "s1");

    const invalidatedKeys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidatedKeys).toContainEqual(queryKeys.serverRoles("s1"));
    expect(
      spy.mock.calls.some((call) => typeof call[0]?.predicate === "function")
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.channelPermissions("cx"))?.isInvalidated
    ).toBe(true);
  });

  it("invalidateAllCachedPermissions marks every channel permission stale", () => {
    queryClient.setQueryData(queryKeys.channelPermissions("c1"), {
      canView: true,
    });
    queryClient.setQueryData(queryKeys.channelPermissions("c2"), {
      canSend: false,
    });
    queryClient.setQueryData(queryKeys.channelMessages("c1"), { items: [] });
    queryClient.setQueryData(queryKeys.serverChannels("s9"), [{ id: "c3" }]);

    invalidateAllCachedPermissions(queryClient);

    expect(
      queryClient.getQueryState(queryKeys.channelPermissions("c1"))
        ?.isInvalidated
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.channelPermissions("c2"))
        ?.isInvalidated
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.channelMessages("c1"))?.isInvalidated
    ).toBe(false);
  });
});