import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PackagesSection from "@/components/admin/landing/PackagesSection";
import HotelsSection from "@/components/admin/landing/HotelsSection";
import GallerySection from "@/components/admin/landing/GallerySection";
import BlogsSection from "@/components/admin/landing/BlogsSection";
import FaqSection from "@/components/admin/landing/FaqSection";
import { useEffect, useState } from "react";

const TABS = [
  { v: "packages", l: "Packages" },
  { v: "hotels", l: "Hotels" },
  { v: "gallery", l: "Gallery" },
  { v: "blogs", l: "Blogs" },
  { v: "faq", l: "FAQ" },
];

export default function Landing() {
  const [tab, setTab] = useState(() => localStorage.getItem("landing.tab") ?? "packages");
  useEffect(() => { document.title = "Landing CMS — Pearl Hijja Admin"; }, []);
  useEffect(() => { localStorage.setItem("landing.tab", tab); }, [tab]);

  return (
    <AdminLayout title="Landing Page CMS" description="Edit every section of your public website">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4">
          <TabsList className="inline-flex w-max">
            {TABS.map(t => <TabsTrigger key={t.v} value={t.v}>{t.l}</TabsTrigger>)}
          </TabsList>
        </div>
        <TabsContent value="packages"><PackagesSection /></TabsContent>
        <TabsContent value="hotels"><HotelsSection /></TabsContent>
        <TabsContent value="gallery"><GallerySection /></TabsContent>
        <TabsContent value="blogs"><BlogsSection /></TabsContent>
        <TabsContent value="faq"><FaqSection /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
