import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { getDefaultRoute } from "@/lib/rbac";

export default function HomeRedirect() {
  const { user, status, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "loading") return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    const targetRoute = getDefaultRoute(roles);
    if (targetRoute !== window.location.pathname) {
      navigate(targetRoute, { replace: true });
    }
  }, [status, navigate, user, roles]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
