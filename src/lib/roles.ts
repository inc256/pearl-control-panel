import type { AppRole, RoleDefinition } from "@/types/roles";
import { NAVIGATION_CONFIG } from "@/config/sidebar";

export type { AppRole, RoleDefinition, SidebarItem } from "@/types/roles";
export {
  hasRole,
  hasAnyRole,
  canAccess,
  canVisitRoute,
  filterSidebar,
  getSidebarItems,
  getDefaultRoute,
  canManageRoles,
  hasRouteAccess,
  normalizeRole,
  normalizeRoles,
  can,
  type RbacAction,
} from "@/lib/rbac";

export interface RoleConfig extends RoleDefinition {}

export const ROLES: Record<AppRole, RoleConfig> = NAVIGATION_CONFIG.roles as Record<AppRole, RoleConfig>;
