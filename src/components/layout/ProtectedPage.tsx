import type { ReactNode } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import type { AppRole } from "@/types/roles";

interface ProtectedPageProps {
  children: ReactNode;
  title: string;
  description?: string;
  requiredRoles?: AppRole[];
}

export default function ProtectedPage({ children, title, description, requiredRoles }: ProtectedPageProps) {
  return (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <AdminLayout title={title} description={description}>
        {children}
      </AdminLayout>
    </ProtectedRoute>
  );
}
