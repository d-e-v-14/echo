import { describe, it, expect } from "vitest";
import { resolvePreferredServer } from "./serverSelection";

const servers = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

describe("resolvePreferredServer", () => {
  it("returns null when there are no servers", () => {
    expect(resolvePreferredServer([])).toBeNull();
  });

  it("prefers the server from the URL query", () => {
    expect(
      resolvePreferredServer(servers, {
        serverIdFromQuery: "b",
        persistedServerId: "c",
      })
    ).toEqual({ id: "b", name: "Beta" });
  });

  it("falls back to the persisted/last-visited server", () => {
    expect(
      resolvePreferredServer(servers, { persistedServerId: "c" })
    ).toEqual({ id: "c", name: "Gamma" });
  });

  it("falls back to the first valid server when the saved one no longer exists", () => {
    expect(
      resolvePreferredServer(servers, {
        serverIdFromQuery: "missing",
        persistedServerId: "also-missing",
      })
    ).toEqual({ id: "a", name: "Alpha" });
  });

  it("falls back to the first server with no hints", () => {
    expect(resolvePreferredServer(servers)).toEqual({ id: "a", name: "Alpha" });
  });
});
