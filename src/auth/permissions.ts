import type { AppRole } from "@/types/roles";

export interface PermissionConfig {
  [key: string]: {
    roles: AppRole[];
    description: string;
  };
}

export const PERMISSIONS: PermissionConfig = {
  "dashboard:view": { roles: ["developer", "secretary", "admin", "business", "media", "tech", "editor", "client", "agent"], description: "View dashboard" },
  "dashboard:admin": { roles: ["developer", "secretary", "admin"], description: "Access admin dashboard features" },
  "users:view": { roles: ["developer"], description: "View users" },
  "users:create": { roles: ["developer"], description: "Create users" },
  "bookings:view": { roles: ["developer", "secretary", "editor", "admin", "business", "client", "agent"] , description: "View bookings" },
  "clients:view": { roles: ["developer", "secretary", "admin", "editor"], description: "View clients" },
  "media:view": { roles: ["developer", "media"], description: "View media" },
  "finance:view": { roles: ["developer", "secretary", "admin"], description: "View finance" },
  "reports:view": { roles: ["developer", "secretary", "admin", "business", "editor"], description: "View reports" },
  "settings:view": { roles: ["developer"], description: "View settings" },
};

export type Permission = keyof typeof PERMISSIONS;

export const hasPermission = (userRoles: AppRole[], permission: Permission): boolean => {
  const config = PERMISSIONS[permission];
  if (!config) return false;
  return userRoles.some((role) => config.roles.includes(role));
};

export const hasAllPermissions = (userRoles: AppRole[], permissions: Permission[]): boolean => {
  return permissions.every((permission) => hasPermission(userRoles, permission));
};

export const hasAnyPermission = (userRoles: AppRole[], permissions: Permission[]): boolean => {
  return permissions.some((permission) => hasPermission(userRoles, permission));
};

export const getUserPermissions = (userRoles: AppRole[]): Permission[] => {
  return Object.keys(PERMISSIONS).filter((permission) => hasPermission(userRoles, permission as Permission)) as Permission[];
};
