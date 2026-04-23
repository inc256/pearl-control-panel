import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Accommodation = { city: "Makkah" | "Madinah" | "Aziziya" | string; hotelName: string; starRating: number; description: string };
type Lecture = { title: string; description: string };
type Include = { text: string };
type Flights = { airline: string; departure: string; return: string; notes: string };
type Transportation = { type: string; description: string };
type MinaArafat = { minaTentType: string; tentFeatures: string; arafatDetails: string };
type Meals = { makkah: string; madinah: string; mina: string };

type Pkg = {
  id?: string;
  name: string;
  type: "hajj" | "umrah";
  price: number;
  start_date: string;
  end_date: string;
  flights: Flights;
  accommodations: Accommodation[];
  transportation: Transportation;
  mina_arafat: MinaArafat;
  meals: Meals;
  lectures: Lecture[];
  includes: Include[];
};

const empty: Pkg = {
  name: "", type: "umrah", price: 0, start_date: "", end_date: "",
  flights: { airline: "", departure: "", return: "", notes: "" },
  accommodations: [],
  transportation: { type: "", description: "" },
  mina_arafat: { minaTentType: "", tentFeatures: "", arafatDetails: "" },
  meals: { makkah: "", madinah: "", mina: "" },
  lectures: [],
  includes: [],
};

export default function PackageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [pkg, setPkg] = useState<Pkg>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = (isNew ? "New package" : "Edit package") + " — Pearl Hijja Admin";
    if (isNew) return;
    supabase.from("packages").select("*").eq("id", id!).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      if (data) setPkg({ ...empty, ...(data as any) });
      setLoading(false);
    });
  }, [id, isNew]);

  const set = <K extends keyof Pkg>(k: K, v: Pkg[K]) => setPkg(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!pkg.name.trim()) return toast.error("Package name is required");
    setSaving(true);
    const payload = {
      name: pkg.name, type: pkg.type, price: pkg.price,
      start_date: pkg.start_date || null, end_date: pkg.end_date || null,
      flights: pkg.flights, accommodations: pkg.accommodations as any,
      transportation: pkg.transportation, mina_arafat: pkg.mina_arafat,
      meals: pkg.meals, lectures: pkg.lectures as any, includes: pkg.includes as any,
    };
    const res = isNew
      ? await supabase.from("packages").insert(payload).select("id").single()
      : await supabase.from("packages").update(payload).eq("id", id!).select("id").single();
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Package saved");
    if (isNew && res.data?.id) navigate(`/landing/packages/${res.data.id}`, { replace: true });
  };

  if (loading) return <AdminLayout title="Loading…"><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AdminLayout>;

  // Helper for dynamic lists
  const addAccommodation = () => set("accommodations", [...pkg.accommodations, { city: "Makkah", hotelName: "", starRating: 5, description: "" }]);
  const addLecture = () => set("lectures", [...pkg.lectures, { title: "", description: "" }]);
  const addInclude = () => set("includes", [...pkg.includes, { text: "" }]);

  return (
    <AdminLayout title={isNew ? "New package" : "Edit package"} description="Build a structured Hajj or Umrah package">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/landing"><ArrowLeft className="h-4 w-4 mr-1" /> Back to packages</Link></Button>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save package</Button>
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="flights">Flights</TabsTrigger>
            <TabsTrigger value="accom">Accommodation</TabsTrigger>
            <TabsTrigger value="transport">Transportation</TabsTrigger>
            <TabsTrigger value="mina">Mina & Arafat</TabsTrigger>
            <TabsTrigger value="meals">Meals</TabsTrigger>
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
            <TabsTrigger value="includes">Includes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <Card><CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Package name</Label><Input value={pkg.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Premium Umrah 14-Day" /></div>
              <div>
                <Label>Type</Label>
                <Select value={pkg.type} onValueChange={(v) => set("type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umrah">Umrah</SelectItem>
                    <SelectItem value="hajj">Hajj</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Price (USD)</Label><Input type="number" min={0} value={pkg.price} onChange={(e) => set("price", Number(e.target.value))} /></div>
              <div><Label>Travel start</Label><Input type="date" value={pkg.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
              <div><Label>Travel end</Label><Input type="date" value={pkg.end_date} onChange={(e) => set("end_date", e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flights">
          <Card><CardHeader><CardTitle>Flights</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div><Label>Airline</Label><Input value={pkg.flights.airline} onChange={(e) => set("flights", { ...pkg.flights, airline: e.target.value })} /></div>
              <div><Label>Departure details</Label><Input value={pkg.flights.departure} onChange={(e) => set("flights", { ...pkg.flights, departure: e.target.value })} /></div>
              <div><Label>Return details</Label><Input value={pkg.flights.return} onChange={(e) => set("flights", { ...pkg.flights, return: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={3} value={pkg.flights.notes} onChange={(e) => set("flights", { ...pkg.flights, notes: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accom">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Accommodation</CardTitle>
              <Button size="sm" onClick={addAccommodation}><Plus className="h-4 w-4 mr-1" /> Add stay</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {pkg.accommodations.length === 0 && <p className="text-sm text-muted-foreground">No accommodations added. Add one for each city.</p>}
              {pkg.accommodations.map((a, i) => (
                <div key={i} className="rounded-md border border-border p-4 grid md:grid-cols-2 gap-3 relative bg-muted/20">
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => set("accommodations", pkg.accommodations.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <div>
                    <Label>City</Label>
                    <Select value={a.city} onValueChange={(v) => { const next = [...pkg.accommodations]; next[i] = { ...a, city: v }; set("accommodations", next); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Makkah">Makkah</SelectItem>
                        <SelectItem value="Madinah">Madinah</SelectItem>
                        <SelectItem value="Aziziya">Aziziya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Hotel name</Label><Input value={a.hotelName} onChange={(e) => { const next = [...pkg.accommodations]; next[i] = { ...a, hotelName: e.target.value }; set("accommodations", next); }} /></div>
                  <div><Label>Star rating</Label><Input type="number" min={1} max={5} value={a.starRating} onChange={(e) => { const next = [...pkg.accommodations]; next[i] = { ...a, starRating: Number(e.target.value) }; set("accommodations", next); }} /></div>
                  <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={a.description} onChange={(e) => { const next = [...pkg.accommodations]; next[i] = { ...a, description: e.target.value }; set("accommodations", next); }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transport">
          <Card><CardHeader><CardTitle>Transportation</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div><Label>Transport type</Label><Input value={pkg.transportation.type} onChange={(e) => set("transportation", { ...pkg.transportation, type: e.target.value })} placeholder="e.g. VIP Bus" /></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={pkg.transportation.description} onChange={(e) => set("transportation", { ...pkg.transportation, description: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mina">
          <Card><CardHeader><CardTitle>Mina & Arafat (Hajj specific)</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div><Label>Mina tent type</Label><Input value={pkg.mina_arafat.minaTentType} onChange={(e) => set("mina_arafat", { ...pkg.mina_arafat, minaTentType: e.target.value })} /></div>
              <div><Label>Tent features</Label><Input value={pkg.mina_arafat.tentFeatures} onChange={(e) => set("mina_arafat", { ...pkg.mina_arafat, tentFeatures: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Arafat details</Label><Textarea rows={3} value={pkg.mina_arafat.arafatDetails} onChange={(e) => set("mina_arafat", { ...pkg.mina_arafat, arafatDetails: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meals">
          <Card><CardHeader><CardTitle>Meals</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div><Label>Makkah meals</Label><Textarea rows={3} value={pkg.meals.makkah} onChange={(e) => set("meals", { ...pkg.meals, makkah: e.target.value })} /></div>
              <div><Label>Madinah meals</Label><Textarea rows={3} value={pkg.meals.madinah} onChange={(e) => set("meals", { ...pkg.meals, madinah: e.target.value })} /></div>
              <div><Label>Mina meals</Label><Textarea rows={3} value={pkg.meals.mina} onChange={(e) => set("meals", { ...pkg.meals, mina: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lectures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Lectures & Ceremonies</CardTitle>
              <Button size="sm" onClick={addLecture}><Plus className="h-4 w-4 mr-1" /> Add lecture</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {pkg.lectures.length === 0 && <p className="text-sm text-muted-foreground">No lectures added.</p>}
              {pkg.lectures.map((l, i) => (
                <div key={i} className="rounded-md border border-border p-4 grid md:grid-cols-2 gap-3 relative bg-muted/20">
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => set("lectures", pkg.lectures.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <div className="md:col-span-2"><Label>Title</Label><Input value={l.title} onChange={(e) => { const next = [...pkg.lectures]; next[i] = { ...l, title: e.target.value }; set("lectures", next); }} /></div>
                  <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={l.description} onChange={(e) => { const next = [...pkg.lectures]; next[i] = { ...l, description: e.target.value }; set("lectures", next); }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="includes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Includes</CardTitle>
              <Button size="sm" onClick={addInclude}><Plus className="h-4 w-4 mr-1" /> Add item</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {pkg.includes.length === 0 && <p className="text-sm text-muted-foreground">No items added. Examples: Visa, Flight, Hotel.</p>}
              {pkg.includes.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={it.text} placeholder={`Item #${i + 1}`} onChange={(e) => { const next = [...pkg.includes]; next[i] = { text: e.target.value }; set("includes", next); }} />
                  <Button variant="ghost" size="icon" onClick={() => set("includes", pkg.includes.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
