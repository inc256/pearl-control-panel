import { useSiteContent } from "@/hooks/useSiteContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/admin/ImageUpload";

type Hero = { title: string; subtitle: string; backgroundImage: string; ctaText: string };

export default function HeroSection() {
  const { data, setField, save, saving } = useSiteContent<Hero>("hero",
    { title: "", subtitle: "", backgroundImage: "", ctaText: "" });

  return (
    <Card>
      <CardHeader><CardTitle>Hero section</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={data.title} onChange={(e) => setField("title", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cta">CTA button text</Label>
            <Input id="cta" value={data.ctaText} onChange={(e) => setField("ctaText", e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="subtitle">Subtitle</Label>
          <Textarea id="subtitle" rows={3} value={data.subtitle} onChange={(e) => setField("subtitle", e.target.value)} />
        </div>
        <ImageUpload label="Background image" value={data.backgroundImage} onChange={(url) => setField("backgroundImage", url)} folder="hero" />
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save hero"}</Button>
      </CardContent>
    </Card>
  );
}
