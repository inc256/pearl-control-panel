import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export default function HomeRedirect() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    const config = ROLES[role];
    if (config) {
      navigate(config.defaultRoute, { replace: true });
    } else {
      navigate('/landing', { replace: true });
    }
  }, [role, loading, navigate, user]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
