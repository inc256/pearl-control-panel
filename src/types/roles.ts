import type { LucideIcon } from "lucide-react";

export type AppRole =
  | "developer"
  | "secretary"
  | "admin"
  | "media"
  | "business"
  | "tech";

export interface Permission {
  key: string;
  allowedRoles: AppRole[];
}

export interface RoleDefinition {
  label: string;
  description: string;
  canManageRoles: boolean;
  allowedRoutes: string[];
  defaultRoute: string;
  permissions?: Permission[];
}

export interface SidebarItem {
  title: string;
  route: string;
  icon: LucideIcon;
  requiredRoles: AppRole[];
  end?: boolean;
}

export interface NavigationConfig {
  roles: Record<AppRole, RoleDefinition>;
  sidebarItems: SidebarItem[];
}
