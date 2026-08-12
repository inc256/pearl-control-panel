import type { AppRole } from "@/types/roles";

export const ROLE_HIERARCHY: Record<AppRole, AppRole[]> = {
  developer: ["developer", "secretary", "admin", "business", "media", "tech"],
  secretary: ["secretary"],
  admin: ["admin", "business", "media", "tech"],
  media: ["media"],
  business: ["business", "media", "tech"],
  tech: ["tech"],
};

export const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  developer: "Developer",
  secretary: "Secretary",
  admin: "Admin",
  media: "Media",
  business: "Business",
  tech: "Tech",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  developer: "Full access with role management",
  secretary: "Can manage bookings, clients, payments, and contributions",
  admin: "Can manage business summary, clients, and contribution list",
  media: "Can manage landing page and contribution list",
  business: "Can view business summary and contribution list",
  tech: "Can view contribution list",
};

export const getRolesFromHierarchy = (role: AppRole): AppRole[] => ROLE_HIERARCHY[role] || [role];

export const hasPermissionByHierarchy = (userRoles: AppRole[], requiredRole: AppRole): boolean => {
  return userRoles.some((userRole) => getRolesFromHierarchy(userRole).includes(requiredRole));
};

export const getHighestRole = (roles: AppRole[]): AppRole | null => {
  const hierarchy: AppRole[] = ["developer", "secretary", "admin", "business", "media", "tech"];
  return hierarchy.find((role) => roles.includes(role)) ?? null;
};

export const isValidRole = (role: string): role is AppRole => {
  return ["developer", "secretary", "admin", "media", "business", "tech"].includes(role);
};
