import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const Auth = lazy(() => import("@/pages/Auth"));
const Landing = lazy(() => import("@/pages/Landing"));
const HomeRedirect = lazy(() => import("@/pages/HomeRedirect"));
const PackageEditor = lazy(() => import("@/pages/PackageEditor"));
const Bookings = lazy(() => import("@/pages/Bookings"));
const BusinessStats = lazy(() => import("@/pages/BusinessStats"));
const BusinessSummary = lazy(() => import("@/pages/BusinessSummary"));
const Roles = lazy(() => import("@/pages/Roles"));
const Clients = lazy(() => import("@/pages/Clients"));
const Payments = lazy(() => import("@/pages/Payments"));
const ContributionList = lazy(() => import("@/pages/ContributionList"));
const Contributions = lazy(() => import("@/pages/Contributions"));
const NotFound = lazy(() => import("@/pages/NotFound"));

import AuthLayout from "@/layouts/AuthLayout";
import UserLayout from "@/layouts/UserLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import PublicRoute from "@/routes/PublicRoute";
import { Navigate } from "react-router-dom";

export interface AppRouteConfig {
  path: string;
  element: JSX.Element;
}

function withProtectedRoute(element: JSX.Element): JSX.Element {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export const routeConfig: AppRouteConfig[] = [
  {
    path: "/auth",
    element: (
      <PublicRoute>
        <AuthLayout>
          <Auth />
        </AuthLayout>
      </PublicRoute>
    ),
  },
  {
    path: "/",
    element: withProtectedRoute(
      
        <UserLayout title="Dashboard" description="Welcome back">
          <HomeRedirect />
        </UserLayout>
    ),
  },
  {
    path: "/landing",
    element: withProtectedRoute(<Landing />),
  },
  {
    path: "/landing/packages/:id",
    element: withProtectedRoute(<PackageEditor />),
  },
  {
    path: "/landing/packages/new",
    element: withProtectedRoute(<PackageEditor />),
  },
  {
    path: "/bookings",
    element: withProtectedRoute(<Bookings />),
  },
  {
    path: "/business-stats",
    element: <Navigate to="/business-statscan" replace />,
  },
  {
    path: "/business-statscan",
    element: withProtectedRoute(<BusinessStats />),
  },
  {
    path: "/business-summary",
    element: withProtectedRoute(<BusinessSummary />),
  },
  {
    path: "/clients",
    element: withProtectedRoute(<Clients />),
  },
  {
    path: "/payments",
    element: withProtectedRoute(<Payments />),
  },
  {
    path: "/contributions",
    element: withProtectedRoute(<Contributions />),
  },
  {
    path: "/contributionlist",
    element: withProtectedRoute(<ContributionList />),
  },
  {
    path: "/contribution-list",
    element: <Navigate to="/contributionlist" replace />,
  },
  {
    path: "/roles",
    element: withProtectedRoute(<Roles />),
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export function toRouteObjects(): RouteObject[] {
  return routeConfig.map((route) => ({
    path: route.path,
    element: route.element,
  }));
}
