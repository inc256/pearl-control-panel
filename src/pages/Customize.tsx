import AdminLayout from "@/components/admin/AdminLayout";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/admin/ImageUpload";

type CustomizeData = { primary: string; logo: string };

export default function Customize() {
  const { data, setField, save, saving } = useSiteContent<CustomizeData>("customize", { primary: "#5C0120", logo: "" });
  return (
    <AdminLayout title="Customize" description="Branding & theme placeholders">
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="primary">Primary brand color</Label>
            <div className="flex gap-2 items-center mt-1">
              <Input id="primary" type="color" value={data.primary} onChange={(e) => setField("primary", e.target.value)} className="h-10 w-20 p-1" />
              <Input value={data.primary} onChange={(e) => setField("primary", e.target.value)} className="max-w-xs" />
            </div>
          </div>
          <ImageUpload label="Logo" value={data.logo} onChange={(url) => setField("logo", url)} folder="branding" />
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
