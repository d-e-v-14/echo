import { describe, it, expect } from "vitest";
import { isNearBottom } from "./scrollUtils";

const el = (scrollHeight: number, scrollTop: number, clientHeight: number) =>
  ({ scrollHeight, scrollTop, clientHeight }) as unknown as HTMLElement;

describe("isNearBottom", () => {
  it("is true when close to the bottom", () => {
    expect(isNearBottom(el(1000, 900, 100))).toBe(true);
  });

  it("is false when far from the bottom", () => {
    expect(isNearBottom(el(1000, 400, 100))).toBe(false);
  });

  it("honours a custom threshold", () => {
    expect(isNearBottom(el(1000, 750, 100), 200)).toBe(true);
    expect(isNearBottom(el(1000, 700, 100), 200)).toBe(false);
  });
});
