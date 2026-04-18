import AdminLayout from "@/components/admin/AdminLayout";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type SettingsData = { siteName: string; tagline: string };

export default function Settings() {
  const { data, setField, save, saving } = useSiteContent<SettingsData>("settings", { siteName: "", tagline: "" });
  return (
    <AdminLayout title="Settings" description="General system settings">
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label htmlFor="sn">Site name</Label><Input id="sn" value={data.siteName} onChange={(e) => setField("siteName", e.target.value)} /></div>
          <div><Label htmlFor="tg">Tagline</Label><Input id="tg" value={data.tagline} onChange={(e) => setField("tagline", e.target.value)} /></div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
