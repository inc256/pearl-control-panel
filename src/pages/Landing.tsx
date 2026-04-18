import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HeroSection from "@/components/admin/landing/HeroSection";
import AboutSection from "@/components/admin/landing/AboutSection";
import PackagesSection from "@/components/admin/landing/PackagesSection";
import ToursSection from "@/components/admin/landing/ToursSection";
import HotelsSection from "@/components/admin/landing/HotelsSection";
import GallerySection from "@/components/admin/landing/GallerySection";
import BlogsSection from "@/components/admin/landing/BlogsSection";
import FaqSection from "@/components/admin/landing/FaqSection";
import ContactSection from "@/components/admin/landing/ContactSection";
import { useEffect, useState } from "react";

const TABS = [
  { v: "hero", l: "Hero" },
  { v: "about", l: "About" },
  { v: "packages", l: "Packages" },
  { v: "tours", l: "Tours" },
  { v: "hotels", l: "Hotels" },
  { v: "gallery", l: "Gallery" },
  { v: "blogs", l: "Blogs" },
  { v: "faq", l: "FAQ" },
  { v: "contact", l: "Contact" },
];

export default function Landing() {
  const [tab, setTab] = useState(() => localStorage.getItem("landing.tab") ?? "hero");
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
        <TabsContent value="hero"><HeroSection /></TabsContent>
        <TabsContent value="about"><AboutSection /></TabsContent>
        <TabsContent value="packages"><PackagesSection /></TabsContent>
        <TabsContent value="tours"><ToursSection /></TabsContent>
        <TabsContent value="hotels"><HotelsSection /></TabsContent>
        <TabsContent value="gallery"><GallerySection /></TabsContent>
        <TabsContent value="blogs"><BlogsSection /></TabsContent>
        <TabsContent value="faq"><FaqSection /></TabsContent>
        <TabsContent value="contact"><ContactSection /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
