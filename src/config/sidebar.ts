import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  PieChart,
  UserCog,
  Users,
} from "lucide-react";
import type { AppRole, NavigationConfig, SidebarItem } from "@/types/roles";

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { title: "Business Summary", route: "/business-summary", icon: PieChart, requiredRoles: ["developer", "admin", "business", "secretary"] },
  { title: "Business Stats", route: "/business-statscan", icon: BarChart3, requiredRoles: ["developer", "secretary"] },
  { title: "Bookings", route: "/bookings", icon: ClipboardList, requiredRoles: ["developer", "secretary"] },
  { title: "Clients", route: "/clients", icon: Users, requiredRoles: ["developer", "secretary", "admin"] },
  { title: "Payments", route: "/payments", icon: CreditCard, requiredRoles: ["developer", "secretary"] },
  { title: "Contributions", route: "/contributions", icon: LayoutDashboard, requiredRoles: ["developer", "secretary"] },
  { title: "Contribution List", route: "/contributionlist", icon: ClipboardList, requiredRoles: ["developer", "secretary", "admin", "business", "media", "tech"] },
  { title: "Roles", route: "/roles", icon: UserCog, requiredRoles: ["developer"] },
  { title: "Landing Page", route: "/landing", icon: FileText, requiredRoles: ["developer", "media", "tech"], end: true },
];

const ROLE_DEFINITIONS: Record<AppRole, { label: string; description: string; canManageRoles: boolean; allowedRoutes: string[]; defaultRoute: string }> = {
  developer: {
    label: "Developer",
    description: "Full access with role management",
    canManageRoles: true,
    allowedRoutes: ["/", "/business-summary", "/business-statscan", "/bookings", "/clients", "/payments", "/contributions", "/contributionlist", "/roles", "/landing"],
    defaultRoute: "/business-summary",
  },
  secretary: {
    label: "Secretary",
    description: "Business Stats, Bookings, Clients, Payments, Contributions, Contribution List",
    canManageRoles: false,
    allowedRoutes: ["/", "/business-summary", "/business-statscan", "/bookings", "/clients", "/payments", "/contributions", "/contributionlist"],
    defaultRoute: "/business-statscan",
  },
  admin: {
    label: "Admin",
    description: "Business Summary, Clients, Contribution List",
    canManageRoles: false,
    allowedRoutes: ["/", "/business-summary", "/clients", "/contributionlist"],
    defaultRoute: "/business-summary",
  },
  media: {
    label: "Media",
    description: "Landing Page and Contribution List",
    canManageRoles: false,
    allowedRoutes: ["/", "/landing", "/contributionlist"],
    defaultRoute: "/landing",
  },
  business: {
    label: "Business",
    description: "Business Summary and Contribution List",
    canManageRoles: false,
    allowedRoutes: ["/", "/business-summary", "/contributionlist"],
    defaultRoute: "/business-summary",
  },
  tech: {
    label: "Tech",
    description: "Contribution List and Landing access",
    canManageRoles: false,
    allowedRoutes: ["/", "/landing", "/contributionlist"],
    defaultRoute: "/landing",
  },
};

export const NAVIGATION_CONFIG: NavigationConfig = {
  roles: ROLE_DEFINITIONS,
  sidebarItems: SIDEBAR_ITEMS,
};