import { describe, it, expect } from "vitest";
import { buildPath, parsePath, canonicalize, isSafePath } from "./paths";
import type { RouteName } from "./types";

const params = (raw: string) =>
  new URLSearchParams(raw) as unknown as { get(name: string): string | null };

describe("buildPath", () => {
  it("builds static paths", () => {
    expect(buildPath("HOME")).toBe("/");
    expect(buildPath("SERVERS")).toBe("/servers");
    expect(buildPath("PROFILE_SETTINGS")).toBe("/profile-settings");
  });

  it("builds parameterised paths", () => {
    expect(buildPath("MESSAGES_DM", { userId: "u1" })).toBe("/messages?dm=u1");
    expect(buildPath("SERVER_SETTINGS", { serverId: "s1" })).toBe(
      "/server-settings?serverId=s1"
    );
    expect(buildPath("INVITE", { code: "abc" })).toBe("/invite/abc");
  });

  it("encodes parameter values", () => {
    expect(buildPath("MESSAGES_DM", { userId: "a b" })).toBe(
      "/messages?dm=a%20b"
    );
    expect(buildPath("INVITE", { code: "a/b" })).toBe("/invite/a%2Fb");
  });

  it("throws for virtual routes", () => {
    expect(() => buildPath("NOT_FOUND")).toThrow();
  });

  it("throws for unknown routes", () => {
    expect(() => buildPath("NOPE" as RouteName)).toThrow();
  });
});

describe("parsePath", () => {
  it("parses static routes", () => {
    expect(parsePath("/servers", params(""))).toEqual({
      name: "SERVERS",
      params: {},
    });
    expect(parsePath("/home", params(""))).toBeNull();
  });

  it("parses invite codes", () => {
    expect(parsePath("/invite/xyz", params(""))).toEqual({
      name: "INVITE",
      params: { code: "xyz" },
    });
    expect(parsePath("/invite/xyz/", params(""))?.name).toBe("INVITE");
    expect(parsePath("/invite/", params(""))).toBeNull();
  });

  it("disambiguates dm routes before the static messages route", () => {
    expect(parsePath("/messages", params("dm=u1"))).toEqual({
      name: "MESSAGES_DM",
      params: { userId: "u1" },
    });
    expect(parsePath("/messages", params(""))).toEqual({
      name: "MESSAGES",
      params: {},
    });
  });

  it("parses server-settings", () => {
    expect(parsePath("/server-settings", params("serverId=s9"))).toEqual({
      name: "SERVER_SETTINGS",
      params: { serverId: "s9" },
    });
    expect(parsePath("/server-settings", params(""))).toBeNull();
  });
});

describe("canonicalize", () => {
  it("round-trips parameterised routes to their canonical form", () => {
    expect(canonicalize("/messages", params("dm=u1"))).toBe("/messages?dm=u1");
    expect(canonicalize("/invite/abc/", params(""))).toBe("/invite/abc");
  });

  it("leaves unmatched paths unchanged", () => {
    expect(canonicalize("/no/such/page", params(""))).toBe("/no/such/page");
  });
});

describe("isSafePath", () => {
  it("accepts internal paths", () => {
    expect(isSafePath("/servers")).toBe(true);
    expect(isSafePath("/servers?serverId=s1")).toBe(true);
    expect(isSafePath("/messages?dm=u1&x=%20")).toBe(true);
  });

  it("rejects external and malformed paths", () => {
    expect(isSafePath("https://evil.com")).toBe(false);
    expect(isSafePath("//evil.com")).toBe(false);
    expect(isSafePath("javascript:alert(1)")).toBe(false);
    expect(isSafePath("")).toBe(false);
    expect(isSafePath(undefined)).toBe(false);
  });
});