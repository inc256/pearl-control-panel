import type { AppRole } from "@/types/roles";

export const ROLE_HIERARCHY: Record<AppRole, AppRole[]> = {
  developer: ["developer", "secretary", "admin", "business", "media", "tech", "editor", "client", "agent"],
  secretary: ["secretary", "editor", "client", "agent"],
  admin: ["admin", "business", "media", "client", "agent"],
  media: ["media", "client", "agent"],
  business: ["business", "client", "agent"],
  editor: ["editor", "client", "agent"],
  tech: ["tech", "client", "agent"],
  client: ["client"],
  agent: ["agent"],
};

export const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  developer: "Developer",
  secretary: "Secretary",
  admin: "Admin",
  media: "Media",
  business: "Business",
  editor: "Editor",
  tech: "Tech",
  client: "Client",
  agent: "Agent",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  developer: "Full access with role management",
  secretary: "Can manage bookings, clients, payments, and contributions",
  admin: "Can manage business summary, clients, and contribution list",
  media: "Can manage landing page and contribution list",
  business: "Can view business summary and contribution list",
  editor: "Can view stats, clients, and payments",
  tech: "Can view contribution list",
  client: "Can view contribution list",
  agent: "Can view contribution list",
};

export const getRolesFromHierarchy = (role: AppRole): AppRole[] => ROLE_HIERARCHY[role] || [role];

export const hasPermissionByHierarchy = (userRoles: AppRole[], requiredRole: AppRole): boolean => {
  return userRoles.some((userRole) => getRolesFromHierarchy(userRole).includes(requiredRole));
};

export const getHighestRole = (roles: AppRole[]): AppRole | null => {
  const hierarchy: AppRole[] = ["developer", "secretary", "admin", "business", "media", "tech", "editor", "client", "agent"];
  return hierarchy.find((role) => roles.includes(role)) ?? null;
};

export const isValidRole = (role: string): role is AppRole => {
  return ["developer", "secretary", "admin", "media", "business", "editor", "tech", "client", "agent"].includes(role);
};
