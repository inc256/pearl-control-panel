import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  NotebookPen,
  Palette,
  PieChart,
  UserCog,
  Users,
} from "lucide-react";
import type { AppRole, NavigationConfig, SidebarItem } from "@/types/roles";

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { title: "Business Summary", route: "/business-summary", icon: PieChart, requiredRoles: ["developer", "admin", "business", "secretary", "media", "tech"] },
  { title: "Business Stats", route: "/business-statscan", icon: BarChart3, requiredRoles: ["developer", "secretary"] },
  { title: "Bookings", route: "/bookings", icon: ClipboardList, requiredRoles: ["developer", "secretary"] },
  { title: "Clients", route: "/clients", icon: Users, requiredRoles: ["developer", "secretary", "admin"] },
  { title: "Payments", route: "/payments", icon: CreditCard, requiredRoles: ["developer", "secretary"] },
  { title: "Contributions", route: "/contributions", icon: LayoutDashboard, requiredRoles: ["developer", "secretary"] },
  { title: "Contribution List", route: "/contributionlist", icon: ClipboardList, requiredRoles: ["developer", "secretary", "admin", "business", "media", "tech"] },
  { title: "Roles", route: "/roles", icon: UserCog, requiredRoles: ["developer", "secretary"] },
  { title: "Document Processing", route: "/document-processing", icon: NotebookPen, requiredRoles: ["developer", "admin", "secretary", "business"] },
  { title: "Brand Identity", route: "/brand-identity", icon: Palette, requiredRoles: ["developer", "media", "tech"] },
  { title: "Landing Page", route: "/landing", icon: FileText, requiredRoles: ["developer", "media", "tech"] },
];

const ROLE_DEFINITIONS: Record<AppRole, { label: string; description: string; canManageRoles: boolean; allowedRoutes: string[]; defaultRoute: string }> = {
  developer: {
    label: "Developer",
    description: "Full access with role management",
    canManageRoles: true,
    allowedRoutes: ["/", "/business-summary", "/business-statscan", "/bookings", "/clients", "/payments", "/contributions", "/contributionlist", "/roles", "/document-processing", "/brand-identity", "/landing", "/landing/packages/new", "/landing/packages"],
    defaultRoute: "/business-summary",
  },
  secretary: {
    label: "Secretary",
    description: "Business Stats, Bookings, Clients, Payments, Contributions, Contribution List",
    canManageRoles: true,
    allowedRoutes: ["/", "/business-summary", "/business-statscan", "/bookings", "/clients", "/payments", "/contributions", "/contributionlist", "/roles", "/document-processing"],
    defaultRoute: "/business-summary",
  },
  admin: {
    label: "Admin",
    description: "Business Summary, Clients, Contribution List",
    canManageRoles: false,
    allowedRoutes: ["/", "/business-summary", "/clients", "/contributionlist", "/document-processing"],
    defaultRoute: "/business-summary",
  },
  media: {
    label: "Media",
    description: "Business Summary, Landing Page and Contribution List",
    canManageRoles: false,
    allowedRoutes: ["/", "/business-summary", "/brand-identity", "/landing", "/landing/packages/new", "/landing/packages", "/contributionlist"],
    defaultRoute: "/business-summary",
  },
  business: {
    label: "Business",
    description: "Business Summary and Contribution List",
    canManageRoles: false,
    allowedRoutes: ["/", "/business-summary", "/contributionlist", "/document-processing"],
    defaultRoute: "/business-summary",
  },
  tech: {
    label: "Tech",
    description: "Business Summary, Contribution List and Landing access",
    canManageRoles: false,
    allowedRoutes: ["/", "/business-summary", "/brand-identity", "/landing", "/landing/packages/new", "/landing/packages", "/contributionlist"],
    defaultRoute: "/business-summary",
  },
};

export const NAVIGATION_CONFIG: NavigationConfig = {
  roles: ROLE_DEFINITIONS,
  sidebarItems: SIDEBAR_ITEMS,
};