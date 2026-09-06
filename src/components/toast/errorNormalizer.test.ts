import { describe, expect, it } from "vitest";
import {
  getAuthErrorMessage,
  getErrorMessage,
} from "./errorNormalizer";

describe("getErrorMessage", () => {
  it("returns the fallback for unknown errors", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage(undefined, "Custom fallback")).toBe("Custom fallback");
    expect(getErrorMessage("nonsense")).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("maps HTTP status codes to safe messages", () => {
    expect(getErrorMessage({ response: { status: 401 } })).toBe(
      "Your session has expired. Please sign in again."
    );
    expect(getErrorMessage({ response: { status: 403 } })).toBe(
      "You don't have permission to do that."
    );
    expect(getErrorMessage({ response: { status: 404 } })).toBe(
      "We couldn't find what you were looking for."
    );
    expect(getErrorMessage({ response: { status: 429 } })).toBe(
      "You're moving a little fast. Please wait a moment and try again."
    );
    expect(getErrorMessage({ response: { status: 500 } })).toBe(
      "Something went wrong on our end. Please try again."
    );
    expect(getErrorMessage({ response: { status: 503 } })).toBe(
      "Echo is temporarily unavailable. Please try again shortly."
    );
  });

  it("handles axios-shaped errors (isAxiosError flag)", () => {
    const error = {
      isAxiosError: true,
      message: "Request failed with status code 500",
      response: { status: 500 },
    };
    expect(getErrorMessage(error)).toBe(
      "Something went wrong on our end. Please try again."
    );
  });

  it("detects network failures", () => {
    expect(getErrorMessage({ code: "ERR_NETWORK" })).toBe(
      "You're offline. Please check your connection and try again."
    );
    expect(getErrorMessage(new Error("Network Error"))).toBe(
      "You're offline. Please check your connection and try again."
    );
  });

  it("detects timeouts", () => {
    expect(getErrorMessage({ code: "ECONNABORTED" })).toBe(
      "The request took too long. Please try again."
    );
    expect(getErrorMessage(new Error("timeout of 5000ms exceeded"))).toBe(
      "The request took too long. Please try again."
    );
  });

  it("never leaks backend-provided messages", () => {
    const error = {
      response: {
        status: 500,
        data: { error: "SQLite: disk I/O error at /var/app/db.sqlite" },
      },
    };
    const message = getErrorMessage(error);
    expect(message).not.toContain("SQLite");
    expect(message).not.toContain("/var/app");
  });
});

describe("getAuthErrorMessage", () => {
  it("does not reveal account existence for 401/403", () => {
    const message = getAuthErrorMessage({ response: { status: 401 } });
    expect(message).toContain("credentials");
  });

  it("explains server unavailability for network failures", () => {
    expect(getAuthErrorMessage({ code: "ERR_NETWORK" })).toContain(
      "couldn't reach Echo"
    );
  });

  it("returns a generic message for unknown errors", () => {
    expect(getAuthErrorMessage("boom")).toContain("Please try again");
  });
});