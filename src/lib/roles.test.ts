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
  it("allows only developer and media roles to access landing page routes", () => {
    expect(hasRouteAccess("developer", "/landing")).toBe(true);
    expect(hasRouteAccess("developer", "/landing/packages/new")).toBe(false);
    expect(hasRouteAccess("developer", "/landing/packages/123")).toBe(false);

    expect(hasRouteAccess("media", "/landing")).toBe(true);
    expect(hasRouteAccess("media", "/landing/packages/new")).toBe(false);
    expect(hasRouteAccess("media", "/landing/packages/123")).toBe(false);

    expect(hasRouteAccess("tech", "/landing")).toBe(false);
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

  it("shows the contribution list for non-secretary and non-editor roles, while keeping Roles developer-only", () => {
    const clientSidebar = getSidebarItems("client");
    expect(clientSidebar.some(item => item.title === "Contribution List")).toBe(true);
    expect(clientSidebar.some(item => item.title === "Roles")).toBe(false);
    expect(canAccess("client", "/contributions")).toBe(true);
    expect(canAccess("client", "/roles")).toBe(false);

    const agentSidebar = getSidebarItems("agent");
    expect(agentSidebar.some(item => item.title === "Contribution List")).toBe(true);
    expect(agentSidebar.some(item => item.title === "Roles")).toBe(false);

    const clientSidebarItems = getSidebarItems("client");
    expect(clientSidebarItems.some(item => item.route === "/roles")).toBe(false);
    expect(clientSidebarItems.some(item => item.route === "/contributionlist")).toBe(true);
    expect(clientSidebarItems.some(item => item.route === "/contributions")).toBe(false);
    expect(canAccess("client", "/contributionlist")).toBe(true);
    expect(canAccess("client", "/contributions")).toBe(true);

    const mediaSidebarItems = getSidebarItems("media");
    expect(mediaSidebarItems.some(item => item.route === "/contributions")).toBe(false);
    expect(mediaSidebarItems.some(item => item.route === "/contributionlist")).toBe(true);

    const editorSidebarItems = getSidebarItems("editor");
    expect(editorSidebarItems.some(item => item.route === "/contributionlist")).toBe(false); // editor should not see it
    expect(hasRouteAccess("editor", "/contributionlist")).toBe(false);

    const developerSidebarItems = getSidebarItems("developer");
    expect(developerSidebarItems.some(item => item.route === "/contributionlist")).toBe(true);
    expect(hasRouteAccess("developer", "/contributionlist")).toBe(true);

    const adminSidebarItems = getSidebarItems("admin");
    expect(adminSidebarItems.some(item => item.route === "/contributionlist")).toBe(true);

    const secretarySidebarItems = getSidebarItems("secretary");
    expect(secretarySidebarItems.some(item => item.route === "/contributionlist")).toBe(false);
  });


  it("only allows Developer to manage roles", () => {
    expect(ROLES.developer.canManageRoles).toBe(true);
    expect(ROLES.secretary.canManageRoles).toBe(false);
    expect(ROLES.tech.canManageRoles).toBe(false);
    expect(ROLES.media.canManageRoles).toBe(false);
    expect(ROLES.business.canManageRoles).toBe(false);
    expect(ROLES.admin.canManageRoles).toBe(false);
    expect(ROLES.editor.canManageRoles).toBe(false);
  });

  it("uses the contribution list as the default route for client and agent users", () => {
    expect(getDefaultRoute("client")).toBe("/contributionlist");
    expect(getDefaultRoute("agent")).toBe("/contributionlist");
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
