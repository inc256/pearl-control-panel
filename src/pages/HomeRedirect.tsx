import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";

const DEFAULT_AUTHENTICATED_ROUTE = "/business-summary";

export default function HomeRedirect() {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "loading") return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    navigate(DEFAULT_AUTHENTICATED_ROUTE, { replace: true });
  }, [status, navigate, user]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
