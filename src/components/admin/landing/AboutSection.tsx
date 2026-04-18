import { useSiteContent } from "@/hooks/useSiteContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RichEditor from "@/components/admin/RichEditor";

type About = { content: string };

export default function AboutSection() {
  const { data, setField, save, saving } = useSiteContent<About>("about", { content: "" });
  return (
    <Card>
      <CardHeader><CardTitle>About section</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <RichEditor value={data.content} onChange={(html) => setField("content", html)} placeholder="Tell your story…" />
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save about"}</Button>
      </CardContent>
    </Card>
  );
}
