import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { hasRouteAccess } from "@/lib/roles";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  if (!hasRouteAccess(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
