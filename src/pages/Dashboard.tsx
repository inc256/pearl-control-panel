import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, BookOpen, Image as ImageIcon, MapPin, Building2, HelpCircle, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Stats = Record<string, number>;

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    document.title = "Dashboard — Pearl Hijja Admin";
    const tables = ["packages", "tours", "hotels", "gallery_images", "blogs", "faqs", "bookings"] as const;
    Promise.all(tables.map(t => supabase.from(t).select("*", { count: "exact", head: true })))
      .then(results => {
        const next: Stats = {};
        tables.forEach((t, i) => next[t] = results[i].count ?? 0);
        setStats(next);
      });
  }, []);

  const tiles = [
    { key: "packages", label: "Packages", icon: Package, to: "/landing", accent: true },
    { key: "tours", label: "Tours", icon: MapPin, to: "/landing" },
    { key: "hotels", label: "Hotels", icon: Building2, to: "/landing" },
    { key: "gallery_images", label: "Gallery images", icon: ImageIcon, to: "/landing" },
    { key: "blogs", label: "Blogs", icon: BookOpen, to: "/landing" },
    { key: "faqs", label: "FAQs", icon: HelpCircle, to: "/landing" },
    { key: "bookings", label: "Bookings", icon: ClipboardList, to: "/bookings" },
  ];

  return (
    <AdminLayout title="Dashboard" description="Overview of your CMS content">
      <div className="rounded-xl p-6 md:p-8 mb-6 text-primary-foreground" style={{ background: "var(--gradient-burgundy)" }}>
        <p className="text-xs uppercase tracking-wider opacity-80">Pearl Hijja and Umrah Services (U) Ltd</p>
        <h2 className="font-serif text-2xl md:text-3xl mt-1">Welcome to your admin console.</h2>
        <p className="opacity-90 text-sm mt-2 max-w-xl">Manage your landing page content, build packages, and prepare for bookings — all in one place.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/landing">Edit landing page</Link></Button>
          <Button asChild variant="outline" size="sm" className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/landing/packages/new">+ New package</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tiles.map(t => (
          <Link to={t.to} key={t.key}>
            <Card className="hover:shadow-[var(--shadow-elegant)] transition-shadow h-full">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.label}</CardTitle>
                <t.icon className={"h-4 w-4 " + (t.accent ? "text-primary" : "text-muted-foreground")} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">{stats[t.key] ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
