export type AppRole = 'admin' | 'editor' | 'tech' | 'business' | 'secretary' | 'media' | 'developer';

export interface RoleConfig {
  label: string;
  description: string;
  canManageRoles: boolean;
  allowedRoutes: string[];
  defaultRoute: string;
}

export const ROLES: Record<AppRole, RoleConfig> = {
  developer: {
    label: 'Developer',
    description: 'Full access with role management',
    canManageRoles: true,
    allowedRoutes: ['/', '/landing', '/landing/packages/new', '/landing/packages/:id', '/business-summary', '/business-statscan', '/bookings', '/clients', '/payments', '/contributions', '/roles'],
    defaultRoute: '/business-summary',
  },
  secretary: {
    label: 'Secretary',
    description: 'Full access including Business Summary',
    canManageRoles: true,
    allowedRoutes: ['/', '/landing', '/business-summary', '/business-statscan', '/bookings', '/clients', '/payments', '/contributions', '/roles'],
    defaultRoute: '/business-summary',
  },
  tech: {
    label: 'Tech',
    description: 'Business Summary and Landing editing',
    canManageRoles: false,
    allowedRoutes: ['/', '/business-summary', '/landing'],
    defaultRoute: '/landing',
  },
  business: {
    label: 'Business',
    description: 'Business Summary and Bookings only',
    canManageRoles: false,
    allowedRoutes: ['/', '/business-summary', '/bookings'],
    defaultRoute: '/business-summary',
  },
  media: {
    label: 'Media',
    description: 'Business Summary and Landing editing',
    canManageRoles: false,
    allowedRoutes: ['/', '/business-summary', '/landing'],
    defaultRoute: '/business-summary',
  },
  admin: {
    label: 'Admin',
    description: 'Legacy admin role - full access',
    canManageRoles: false,
    allowedRoutes: ['/', '/landing', '/landing/packages/new', '/landing/packages/:id', '/business-summary', '/business-statscan', '/bookings', '/clients', '/payments', '/contributions', '/roles'],
    defaultRoute: '/business-summary',
  },
  editor: {
    label: 'Editor',
    description: 'Legacy editor role - broad access',
    canManageRoles: false,
    allowedRoutes: ['/', '/landing', '/landing/packages/new', '/landing/packages/:id', '/business-summary', '/business-statscan', '/bookings', '/clients', '/payments', '/contributions'],
    defaultRoute: '/business-statscan',
  },
};

export const DEVELOPER_EMAIL = 'lunainc256@gmail.com';

export function normalizeRole(role: string | undefined | null): AppRole {
  if (!role) return 'media';
  const normalized = role.toLowerCase();
  if (['developer', 'admin'].includes(normalized)) return 'developer';
  if (['secretary', 'editor'].includes(normalized)) return 'secretary';
  if (['tech', 'technician'].includes(normalized)) return 'tech';
  if (['business', 'manager'].includes(normalized)) return 'business';
  if (['media', 'marketing'].includes(normalized)) return 'media';
  return 'media';
}

export function hasRouteAccess(role: AppRole, path: string): boolean {
  const config = ROLES[role];
  if (!config) return false;
  if (path === '/' || config.allowedRoutes.includes('/')) return true;

  for (const allowed of config.allowedRoutes) {
    if (path === allowed) return true;
    if (allowed.includes(':id')) {
      const pattern = allowed.replace(':id', '[^/]+');
      const regex = new RegExp('^' + pattern.replace(/\//g, '\\/') + '$');
      if (regex.test(path)) return true;
    } else if (path.startsWith(allowed + '/')) {
      return true;
    }
  }
  return false;
}
