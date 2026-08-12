import { NAVIGATION_CONFIG } from "@/config/sidebar";
import type { AppRole, SidebarItem } from "@/types/roles";

export type MaybeRole = AppRole | string | null | undefined;

const ROLE_PRIORITY: AppRole[] = ["developer", "secretary", "admin", "business", "media", "tech"];

const ROLE_ALIASES: Record<string, AppRole> = {
  technician: "tech",
  marketing: "media",
};

const KNOWN_ROLES = new Set<AppRole>([
  "developer",
  "secretary",
  "admin",
  "media",
  "business",
  "tech",
]);

export function normalizeRole(role: string | undefined | null): AppRole {
  if (!role) return "media";
  const normalized = role.toLowerCase();
  if (KNOWN_ROLES.has(normalized as AppRole)) {
    return normalized as AppRole;
  }
  return ROLE_ALIASES[normalized] || "media";
}

export function normalizeRoles(roles: (string | null | undefined)[] | string | null | undefined): AppRole[] {
  const values = Array.isArray(roles) ? roles : [roles];
  return [...new Set(values.map(normalizeRole).filter(Boolean) as AppRole[])];
}

export function hasRole(roles: MaybeRole[] | MaybeRole, role: MaybeRole): boolean {
  const normalizedRoles = normalizeRoles(roles);
  return normalizedRoles.includes(normalizeRoles(role)[0]);
}

export function hasAnyRole(roles: MaybeRole[] | MaybeRole, requiredRoles: MaybeRole[]): boolean {
  return requiredRoles.some((requiredRole) => hasRole(roles, requiredRole));
}

export function canAccess(roles: MaybeRole[] | MaybeRole, path: string): boolean {
  const normalizedRoles = normalizeRoles(roles);
  return normalizedRoles.some((role) => hasRouteAccess(role, path));
}

export function canVisitRoute(roles: MaybeRole[] | MaybeRole, path: string): boolean {
  return canAccess(roles, path);
}

function normalizeRoutePath(path: string): string {
  if (!path) return "/";
  const trimmed = path.trim();
  if (trimmed === "/contribution-list") return "/contributionlist";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function hasRouteAccess(roleOrRoles: MaybeRole[] | MaybeRole, path: string): boolean {
  const roles = normalizeRoles(roleOrRoles);
  const normalizedPath = normalizeRoutePath(path);

  return roles.some((role) => {
    const config = NAVIGATION_CONFIG.roles[role as AppRole];
    if (!config) return false;
    if (normalizedPath === "/") return config.allowedRoutes.includes("/");

    return config.allowedRoutes.some((allowed) => {
      const normalizedAllowed = normalizeRoutePath(allowed);
      if (normalizedPath === normalizedAllowed) return true;
      const sidebarItem = NAVIGATION_CONFIG.sidebarItems.find((item) => normalizeRoutePath(item.route) === normalizedAllowed);
      if (!sidebarItem?.end && normalizedPath.startsWith(normalizedAllowed + "/")) return true;
      return false;
    });
  });
}

export function getSidebarItems(roles: MaybeRole[] | MaybeRole) {
  const normalizedRoles = normalizeRoles(roles);

  return NAVIGATION_CONFIG.sidebarItems.filter((item) => hasAnyRole(normalizedRoles, item.requiredRoles));
}

export function filterSidebar(roles: MaybeRole[] | MaybeRole) {
  const normalizedRoles = normalizeRoles(roles);
  return NAVIGATION_CONFIG.sidebarItems.filter((item) => canVisitRoute(normalizedRoles, item.route));
}

export type SidebarItemWithAccess = SidebarItem & { disabled: boolean };

export function getSidebarItemsWithAccess(roles: MaybeRole[] | MaybeRole): SidebarItemWithAccess[] {
  return NAVIGATION_CONFIG.sidebarItems.map((item) => ({
    ...item,
    disabled: !canAccess(roles, item.route),
  }));
}

export function getDefaultRoute(roles: MaybeRole[] | MaybeRole): string {
  const normalizedRoles = normalizeRoles(roles);
  const priorityRole = ROLE_PRIORITY.find((role) => normalizedRoles.includes(role));
  if (!priorityRole) return "/contributionlist";
  const config = NAVIGATION_CONFIG.roles[priorityRole];
  return config?.defaultRoute ?? "/contributionlist";
}

export function canManageRoles(roles: MaybeRole[] | MaybeRole): boolean {
  return normalizeRoles(roles).some((role) => NAVIGATION_CONFIG.roles[role as AppRole]?.canManageRoles);
}
