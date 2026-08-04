import { describe, expect, it } from "vitest";
import { hasRouteAccess, ROLES } from "./roles";

describe("hasRouteAccess", () => {
  it("allows tech, media, and developer roles to access landing page editing routes", () => {
    expect(hasRouteAccess("tech", "/landing")).toBe(true);
    expect(hasRouteAccess("tech", "/landing/packages/new")).toBe(true);
    expect(hasRouteAccess("tech", "/landing/packages/123")).toBe(true);

    expect(hasRouteAccess("media", "/landing")).toBe(true);
    expect(hasRouteAccess("media", "/landing/packages/new")).toBe(true);
    expect(hasRouteAccess("media", "/landing/packages/123")).toBe(true);

    expect(hasRouteAccess("developer", "/landing")).toBe(true);
    expect(hasRouteAccess("developer", "/landing/packages/new")).toBe(true);
    expect(hasRouteAccess("developer", "/landing/packages/123")).toBe(true);
  });

  it("only allows Developer and Secretary to manage roles", () => {
    expect(ROLES.developer.canManageRoles).toBe(true);
    expect(ROLES.secretary.canManageRoles).toBe(true);
    expect(ROLES.tech.canManageRoles).toBe(false);
    expect(ROLES.media.canManageRoles).toBe(false);
    expect(ROLES.business.canManageRoles).toBe(false);
    expect(ROLES.admin.canManageRoles).toBe(false);
    expect(ROLES.editor.canManageRoles).toBe(false);
  });
});
