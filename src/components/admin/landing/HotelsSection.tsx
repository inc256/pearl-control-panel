import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/admin/ImageUpload";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Hotel = { id: string; name: string; location: string | null; image: string | null };

export default function HotelsSection() {
  const [rows, setRows] = useState<Hotel[]>([]);
  const [editing, setEditing] = useState<Partial<Hotel> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("hotels").select("*").order("created_at", { ascending: false });
    setRows((data as Hotel[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name) return toast.error("Name required");
    setBusy(true);
    const payload = { name: editing.name, location: editing.location ?? null, image: editing.image ?? null };
    const res = editing.id
      ? await supabase.from("hotels").update(payload).eq("id", editing.id)
      : await supabase.from("hotels").insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); setEditing(null); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this hotel?")) return;
    const { error } = await supabase.from("hotels").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Hotels</CardTitle>
        <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" /> Add hotel</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-md border border-border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editing.id ? "Edit hotel" : "New hotel"}</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></div>
            <ImageUpload value={editing.image ?? ""} onChange={(url) => setEditing({ ...editing, image: url })} folder="hotels" />
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save hotel"}</Button>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.length === 0 && !editing && <p className="text-muted-foreground text-sm">No hotels yet.</p>}
          {rows.map(h => (
            <div key={h.id} className="rounded-md border border-border overflow-hidden bg-card">
              {h.image && <img src={h.image} alt={h.name} className="h-36 w-full object-cover" />}
              <div className="p-3">
                <p className="font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{h.location}</p>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(h)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
