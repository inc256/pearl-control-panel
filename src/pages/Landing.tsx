import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PackagesSection from "@/components/admin/landing/PackagesSection";
import HotelsSection from "@/components/admin/landing/HotelsSection";
import GallerySection from "@/components/admin/landing/GallerySection";
import BlogsSection from "@/components/admin/landing/BlogsSection";
import FaqSection from "@/components/admin/landing/FaqSection";
import { CircleHelp, FileText, ImageIcon, LayoutDashboard, PackageIcon, Hotel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const TABS = [
  { v: "overview", l: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { v: "packages", l: "Packages", icon: <PackageIcon className="h-4 w-4" /> },
  { v: "hotels", l: "Hotels", icon: <Hotel className="h-4 w-4" /> },
  { v: "gallery", l: "Gallery", icon: <ImageIcon className="h-4 w-4" /> },
  { v: "blogs", l: "Blogs", icon: <FileText className="h-4 w-4" /> },
  { v: "faq", l: "FAQ", icon: <CircleHelp className="h-4 w-4" /> },
] as const;

type LandingTab = (typeof TABS)[number]["v"];

function isLandingTab(value: string): value is LandingTab {
  return TABS.some((tab) => tab.v === value);
}

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
          <Card key={card.label} className="rounded-2xl border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`rounded-xl p-2.5 ${card.accent}`}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight text-foreground">
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
  const [tab, setTab] = useState<LandingTab>(() => {
    const savedTab = localStorage.getItem("landing.tab");
    return savedTab && isLandingTab(savedTab) ? savedTab : "overview";
  });
  const [visitedTabs, setVisitedTabs] = useState<LandingTab[]>(() => [tab]);
  useEffect(() => { document.title = "Landing Page — Pearl Hijja Admin"; }, []);
  useEffect(() => { localStorage.setItem("landing.tab", tab); }, [tab]);

  const handleTabChange = (value: string) => {
    if (!isLandingTab(value)) return;
    setTab(value);
    setVisitedTabs((visited) => visited.includes(value) ? visited : [...visited, value]);
  };

  return (
    <AdminLayout title="Landing Page" description="Manage the Pearl Hijja website experience">
      <div className="mx-auto w-full max-w-[1600px]">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <div className="mb-6 overflow-x-auto rounded-2xl border border-border bg-muted/30 p-1.5">
          <TabsList className="flex h-auto w-full min-w-max justify-start gap-1 bg-transparent p-0 md:w-full">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="gap-2 rounded-xl border border-transparent px-3 py-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground focus-visible:ring-primary data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-1 sm:px-4 sm:text-sm"
              >
                {t.icon}
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent forceMount value="overview" className="mt-0 space-y-4 data-[state=inactive]:hidden">
          {visitedTabs.includes("overview") && (
            <>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">Content overview</h3>
                <p className="mt-1 text-sm text-muted-foreground">A quick look at the content across your public website.</p>
              </div>
              <LandingOverview />
            </>
          )}
        </TabsContent>
        <TabsContent forceMount value="packages" className="mt-0 space-y-4 data-[state=inactive]:hidden">
          {visitedTabs.includes("packages") && <PackagesSection />}
        </TabsContent>
        <TabsContent forceMount value="hotels" className="mt-0 space-y-4 data-[state=inactive]:hidden">
          {visitedTabs.includes("hotels") && <HotelsSection />}
        </TabsContent>
        <TabsContent forceMount value="gallery" className="mt-0 space-y-4 data-[state=inactive]:hidden">
          {visitedTabs.includes("gallery") && <GallerySection />}
        </TabsContent>
        <TabsContent forceMount value="blogs" className="mt-0 space-y-4 data-[state=inactive]:hidden">
          {visitedTabs.includes("blogs") && <BlogsSection />}
        </TabsContent>
        <TabsContent forceMount value="faq" className="mt-0 space-y-4 data-[state=inactive]:hidden">
          {visitedTabs.includes("faq") && <FaqSection />}
        </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
