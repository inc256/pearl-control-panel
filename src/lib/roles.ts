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
    description: 'Can manage roles and access core operations',
    canManageRoles: true,
    allowedRoutes: ['/', '/business-statscan', '/bookings', '/clients', '/payments', '/contributions'],
    defaultRoute: '/business-statscan',
  },
  tech: {
    label: 'Tech',
    description: 'Landing page and package editor only',
    canManageRoles: false,
    allowedRoutes: ['/', '/landing', '/landing/packages/new', '/landing/packages/:id'],
    defaultRoute: '/landing',
  },
  business: {
    label: 'Business',
    description: 'Business summary and stats only',
    canManageRoles: false,
    allowedRoutes: ['/', '/business-summary', '/business-statscan'],
    defaultRoute: '/business-summary',
  },
  media: {
    label: 'Media',
    description: 'Landing page preview only',
    canManageRoles: false,
    allowedRoutes: ['/', '/landing'],
    defaultRoute: '/landing',
  },
  admin: {
    label: 'Admin',
    description: 'Legacy admin role - full access',
    canManageRoles: true,
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
