import { describe, expect, it } from "vitest";
import { can, hasRole, hasAnyRole } from "./rbac";

describe("rbac helpers", () => {
  it("allows role checks for developers and denies other roles", () => {
    expect(hasRole(["developer"], "developer")).toBe(true);
    expect(hasRole(["admin"], "developer")).toBe(false);
  });

  it("supports action-based access checks", () => {
    expect(can(["developer"], "view", "/roles")).toBe(true);
    expect(can(["admin"], "view", "/roles")).toBe(false);
    expect(can(["developer"], "manage", "/roles")).toBe(true);
  });

  it("supports any-role checks", () => {
    expect(hasAnyRole(["media", "admin"], ["developer", "admin"])).toBe(true);
    expect(hasAnyRole(["media"], ["developer", "admin"])).toBe(false);
  });
});
