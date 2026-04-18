import { useSiteContent } from "@/hooks/useSiteContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Contact = { phone: string; email: string; location: string; whatsapp: string };

export default function ContactSection() {
  const { data, setField, save, saving } = useSiteContent<Contact>("contact",
    { phone: "", email: "", location: "", whatsapp: "" });
  return (
    <Card>
      <CardHeader><CardTitle>Contact information</CardTitle></CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div><Label htmlFor="ph">Phone</Label><Input id="ph" value={data.phone} onChange={(e) => setField("phone", e.target.value)} /></div>
        <div><Label htmlFor="em">Email</Label><Input id="em" type="email" value={data.email} onChange={(e) => setField("email", e.target.value)} /></div>
        <div className="md:col-span-2"><Label htmlFor="lo">Location / address</Label><Input id="lo" value={data.location} onChange={(e) => setField("location", e.target.value)} /></div>
        <div className="md:col-span-2"><Label htmlFor="wa">WhatsApp link</Label><Input id="wa" placeholder="https://wa.me/..." value={data.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} /></div>
        <div className="md:col-span-2"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save contact"}</Button></div>
      </CardContent>
    </Card>
  );
}
