import { describe, it, expect } from "vitest";
import {
  getHighestPriorityRoleColor,
  normalizeRoleColor,
  RoleColorInfo,
} from "./roleColors";

const makeRoles = (roles: RoleColorInfo[]) =>
  new Map(roles.map((role) => [role.id, role]));

describe("normalizeRoleColor", () => {
  it("returns null for empty or missing colors", () => {
    expect(normalizeRoleColor(null)).toBeNull();
    expect(normalizeRoleColor(undefined)).toBeNull();
    expect(normalizeRoleColor("")).toBeNull();
    expect(normalizeRoleColor("   ")).toBeNull();
  });

  it("trims valid colors", () => {
    expect(normalizeRoleColor(" #ff0000 ")).toBe("#ff0000");
  });
});

describe("getHighestPriorityRoleColor", () => {
  it("returns null when the member has no roles", () => {
    expect(getHighestPriorityRoleColor([], makeRoles([]))).toBeNull();
    expect(getHighestPriorityRoleColor(undefined, makeRoles([]))).toBeNull();
  });

  it("picks the owner color over every other role", () => {
    const roles = makeRoles([
      { id: "owner", role_type: "owner", position: 1000, color: "#FFD700" },
      { id: "admin", role_type: "admin", position: 999, color: "#e74c3c" },
      { id: "board", role_type: "custom", position: 1500, color: "#0000ff" },
    ]);

    expect(getHighestPriorityRoleColor(["owner", "admin", "board"], roles)).toBe(
      "#FFD700"
    );
  });

  it("picks admin over higher-positioned custom roles", () => {
    const roles = makeRoles([
      { id: "admin", role_type: "admin", position: 999, color: "#e74c3c" },
      { id: "board", role_type: "custom", position: 1001, color: "#0000ff" },
    ]);

    expect(getHighestPriorityRoleColor(["admin", "board"], roles)).toBe(
      "#e74c3c"
    );
  });

  it("orders custom roles by position", () => {
    const roles = makeRoles([
      { id: "sc", role_type: "self_assignable", position: 5, color: "#00ff00" },
      { id: "board", role_type: "custom", position: 10, color: "#0000ff" },
    ]);

    expect(getHighestPriorityRoleColor(["sc", "board"], roles)).toBe("#0000ff");
  });

  it("skips roles without a color", () => {
    const roles = makeRoles([
      { id: "board", role_type: "custom", position: 10, color: null },
      { id: "sc", role_type: "self_assignable", position: 5, color: "#00ff00" },
    ]);

    expect(getHighestPriorityRoleColor(["board", "sc"], roles)).toBe("#00ff00");
  });

  it("ignores unknown role ids", () => {
    const roles = makeRoles([
      { id: "member", role_type: "custom", position: 1, color: "#808080" },
    ]);

    expect(
      getHighestPriorityRoleColor(["missing", "member"], roles)
    ).toBe("#808080");
  });
});
