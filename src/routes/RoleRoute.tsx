import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import type { AppRole } from "@/types/roles";

interface RoleRouteProps {
  children: React.ReactNode;
  role: AppRole;
}

export function RoleRoute({ children, role }: RoleRouteProps) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Preparing your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
