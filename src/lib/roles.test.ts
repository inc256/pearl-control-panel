import { describe, expect, it } from "vitest";
import {
  hasAnyRole,
  canAccess,
  getSidebarItems,
  ROLES,
  hasRouteAccess,
  normalizeRole,
  normalizeRoles,
  getDefaultRoute,
} from "./roles";

describe("hasRouteAccess", () => {
  it("allows developer, media, and tech roles to access landing page routes", () => {
    expect(hasRouteAccess("developer", "/landing")).toBe(true);
    expect(hasRouteAccess("developer", "/landing/packages/new")).toBe(false);
    expect(hasRouteAccess("developer", "/landing/packages/123")).toBe(false);

    expect(hasRouteAccess("media", "/landing")).toBe(true);
    expect(hasRouteAccess("media", "/landing/packages/new")).toBe(false);
    expect(hasRouteAccess("media", "/landing/packages/123")).toBe(false);

    expect(hasRouteAccess("tech", "/landing")).toBe(true);
  });

  it("supports multi-role access for routes and navigation", () => {
    expect(hasRouteAccess(["business", "media"], "/landing")).toBe(true);
    expect(hasRouteAccess(["business", "media"], "/bookings")).toBe(false);
    expect(hasRouteAccess(["developer", "media"], "/roles")).toBe(true);
    expect(hasAnyRole(["business", "media"], ["media", "tech"])).toBe(true);
    expect(hasAnyRole(["business", "media"], ["secretary"])).toBe(false);

    expect(canAccess(["business", "media"], "/landing")).toBe(true);
    expect(canAccess(["business", "media"], "/payments")).toBe(false);

    const sidebar = getSidebarItems(["business", "media"]);
    expect(sidebar.some(item => item.route === "/landing")).toBe(true);
    expect(sidebar.some(item => item.route === "/payments")).toBe(false);
  });

  it("shows contribution list access for allowed roles and keeps Roles developer-only", () => {
    expect(canAccess("media", "/contributionlist")).toBe(true);
    expect(canAccess("business", "/contributionlist")).toBe(true);
    expect(canAccess("tech", "/contributionlist")).toBe(true);
    expect(canAccess("admin", "/contributionlist")).toBe(true);
    expect(canAccess("secretary", "/contributionlist")).toBe(true);
    expect(canAccess("developer", "/contributionlist")).toBe(true);

    expect(canAccess("media", "/contributions")).toBe(false);
    expect(canAccess("business", "/contributions")).toBe(false);
    expect(canAccess("tech", "/contributions")).toBe(false);
    expect(canAccess("admin", "/contributions")).toBe(false);
    expect(canAccess("secretary", "/contributions")).toBe(false);

    expect(hasRouteAccess("developer", "/roles")).toBe(true);
    expect(hasRouteAccess("admin", "/roles")).toBe(false);
    expect(hasRouteAccess("secretary", "/roles")).toBe(false);
  });


  it("only allows Developer to manage roles", () => {
    expect(ROLES.developer.canManageRoles).toBe(true);
    expect(ROLES.secretary.canManageRoles).toBe(false);
    expect(ROLES.tech.canManageRoles).toBe(false);
    expect(ROLES.media.canManageRoles).toBe(false);
    expect(ROLES.business.canManageRoles).toBe(false);
    expect(ROLES.admin.canManageRoles).toBe(false);
  });

  it("returns the proper default route for each allowed role", () => {
    expect(getDefaultRoute("developer")).toBe("/business-summary");
    expect(getDefaultRoute("secretary")).toBe("/business-statscan");
    expect(getDefaultRoute("admin")).toBe("/business-summary");
    expect(getDefaultRoute("business")).toBe("/business-summary");
    expect(getDefaultRoute("media")).toBe("/landing");
    expect(getDefaultRoute("tech")).toBe("/landing");
  });

  describe("normalizeRole", () => {
    it("normalizes roles and handles aliases", () => {
      expect(normalizeRole("Developer")).toBe("developer");
      expect(normalizeRole("technician")).toBe("tech");
      expect(normalizeRole("unknown")).toBe("media");
      expect(normalizeRoles(["Developer", "technician"])).toEqual(["developer", "tech"]);
    });
  });
});
