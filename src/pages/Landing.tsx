import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PackagesSection from "@/components/admin/landing/PackagesSection";
import HotelsSection from "@/components/admin/landing/HotelsSection";
import GallerySection from "@/components/admin/landing/GallerySection";
import BlogsSection from "@/components/admin/landing/BlogsSection";
import FaqSection from "@/components/admin/landing/FaqSection";
import { ArrowUpRight, CircleHelp, FileText, ImageIcon, LayoutDashboard, PackageIcon, Hotel, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const TABS = [
  { v: "overview", l: "Overview" },
  { v: "packages", l: "Packages" },
  { v: "hotels", l: "Hotels" },
  { v: "gallery", l: "Gallery" },
  { v: "blogs", l: "Blogs" },
  { v: "faq", l: "FAQ" },
];

type OverviewStats = {
  packages: number;
  hotels: number;
  gallery: number;
  blogs: number;
  faqs: number;
};

const getCount = async (table: string) => {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) {
    if (error.message.toLowerCase().includes("could not find the table") || error.message.toLowerCase().includes("does not exist")) {
      return 0;
    }
    throw error;
  }
  return count ?? 0;
};

function LandingOverview() {
  const [stats, setStats] = useState<OverviewStats>({
    packages: 0,
    hotels: 0,
    gallery: 0,
    blogs: 0,
    faqs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [packages, hotels, gallery, blogs, faqs] = await Promise.all([
          getCount("packages"),
          getCount("hotels"),
          getCount("gallery"),
          getCount("blogs"),
          getCount("faqs"),
        ]);

        setStats({ packages, hotels, gallery, blogs, faqs });
      } catch (error) {
        console.error("Landing overview load error:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const cards = [
    { label: "Packages", value: stats.packages, helper: "Travel offers", icon: <PackageIcon className="h-5 w-5" />, accent: "bg-primary/10 text-primary" },
    { label: "Hotels", value: stats.hotels, helper: "Stay options", icon: <Hotel className="h-5 w-5" />, accent: "bg-primary/10 text-primary" },
    { label: "Gallery", value: stats.gallery, helper: "Images & videos", icon: <ImageIcon className="h-5 w-5" />, accent: "bg-primary/10 text-primary" },
    { label: "Blogs", value: stats.blogs, helper: "Published posts", icon: <FileText className="h-5 w-5" />, accent: "bg-primary/10 text-primary" },
    { label: "FAQs", value: stats.faqs, helper: "Support entries", icon: <CircleHelp className="h-5 w-5" />, accent: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} className="border border-primary/10 bg-gradient-to-br from-white to-primary/[0.02] shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`rounded-lg p-2 ${card.accent}`}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {loading ? "—" : card.value}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [tab, setTab] = useState(() => localStorage.getItem("landing.tab") ?? "overview");
  useEffect(() => { document.title = "Landing Page — Pearl Hijja Admin"; }, []);
  useEffect(() => { localStorage.setItem("landing.tab", tab); }, [tab]);

  return (
    <AdminLayout title="Landing Page" description="Landing page content and overview in one place">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="mb-5 overflow-x-auto px-0">
          <TabsList className="flex w-full min-w-max gap-1 rounded-xl bg-muted/70 p-1 md:w-max">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-sm"
              >
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <LandingOverview />
        </TabsContent>
        <TabsContent value="packages" className="space-y-4"><PackagesSection /></TabsContent>
        <TabsContent value="hotels" className="space-y-4"><HotelsSection /></TabsContent>
        <TabsContent value="gallery" className="space-y-4"><GallerySection /></TabsContent>
        <TabsContent value="blogs" className="space-y-4"><BlogsSection /></TabsContent>
        <TabsContent value="faq" className="space-y-4"><FaqSection /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
