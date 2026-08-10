import type { ReactNode } from "react";
import AdminLayout from "@/layouts/AdminLayout";

interface UserLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export default function UserLayout({ children, title, description }: UserLayoutProps) {
  return (
    <AdminLayout title={title} description={description}>
      {children}
    </AdminLayout>
  );
}
