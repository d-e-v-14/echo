import { describe, it, expect } from "vitest";
import { resolveAuthForRoute } from "./guards";

describe("resolveAuthForRoute", () => {
  it("allows public routes without a session", () => {
    expect(
      resolveAuthForRoute("HOME", { hasSession: false, sessionValid: false })
    ).toEqual({ status: "ok" });
  });

  it("redirects signed-out users to signin", () => {
    expect(
      resolveAuthForRoute("SERVERS", { hasSession: false, sessionValid: false })
    ).toEqual({ status: "redirect", to: "signin" });
  });

  it("redirects invalid sessions to the expired screen", () => {
    expect(
      resolveAuthForRoute("FRIENDS", { hasSession: true, sessionValid: false })
    ).toEqual({ status: "redirect", to: "signin-expired" });
  });

  it("allows signed-in users through", () => {
    expect(
      resolveAuthForRoute("SERVERS", { hasSession: true, sessionValid: true })
    ).toEqual({ status: "ok" });
  });

  it("reports notFound for unknown routes", () => {
    expect(
      resolveAuthForRoute("NOPE" as any, { hasSession: true, sessionValid: true })
    ).toEqual({ status: "notFound" });
  });
});