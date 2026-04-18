import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/admin/ImageUpload";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Tour = { id: string; title: string; description: string | null; image: string | null };

export default function ToursSection() {
  const [rows, setRows] = useState<Tour[]>([]);
  const [editing, setEditing] = useState<Partial<Tour> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("tours").select("*").order("created_at", { ascending: false });
    setRows((data as Tour[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title) return toast.error("Title required");
    setBusy(true);
    const payload = { title: editing.title, description: editing.description ?? null, image: editing.image ?? null };
    const res = editing.id
      ? await supabase.from("tours").update(payload).eq("id", editing.id)
      : await supabase.from("tours").insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); setEditing(null); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this tour?")) return;
    const { error } = await supabase.from("tours").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Tours</CardTitle>
        <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" /> Add tour</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-md border border-border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editing.id ? "Edit tour" : "New tour"}</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div><Label>Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <ImageUpload value={editing.image ?? ""} onChange={(url) => setEditing({ ...editing, image: url })} folder="tours" />
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save tour"}</Button>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.length === 0 && !editing && <p className="text-muted-foreground text-sm">No tours yet.</p>}
          {rows.map(t => (
            <div key={t.id} className="rounded-md border border-border overflow-hidden bg-card">
              {t.image && <img src={t.image} alt={t.title} className="h-36 w-full object-cover" />}
              <div className="p-3">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
