import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichEditor from "@/components/admin/RichEditor";
import ImageUpload from "@/components/admin/ImageUpload";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const isMissingTableError = (error?: { message?: string }) => error?.message?.includes("Could not find the table");

type AboutSectionRow = {
  id: string;
  section_title: string;
  content: string;
  image_url: string | null;
  order_position: number;
};

export default function AboutSection() {
  const [rows, setRows] = useState<AboutSectionRow[]>([]);
  const [editing, setEditing] = useState<Partial<AboutSectionRow> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("about_us")
      .select("*")
      .order("order_position", { ascending: true });
    if (error) {
      if (isMissingTableError(error)) {
        setRows([]);
        return;
      }
      return toast.error(error.message);
    }
    setRows((data as AboutSectionRow[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.section_title) return toast.error("Section title required");
    if (!editing.content) return toast.error("Content required");
    setBusy(true);
    const payload = {
      section_title: editing.section_title,
      content: editing.content,
      image_url: editing.image_url ?? null,
      order_position: editing.order_position ?? (rows.length + 1),
    };
    const res = editing.id
      ? await supabase.from("about_us").update(payload).eq("id", editing.id)
      : await supabase.from("about_us").insert(payload);
    setBusy(false);
    if (res.error) {
      if (isMissingTableError(res.error)) return toast.error("About sections table not found.");
      return toast.error(res.error.message);
    }
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this about section?")) return;
    const { error } = await supabase.from("about_us").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) return toast.error("About sections table not found.");
      return toast.error(error.message);
    }
    toast.success("Deleted");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0">
        <CardTitle>About Us sections</CardTitle>
        <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" /> Add section</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-md border border-border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editing.id ? "Edit section" : "New section"}</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div><Label>Title</Label><Input value={editing.section_title ?? ""} onChange={(e) => setEditing({ ...editing, section_title: e.target.value })} /></div>
            <ImageUpload value={editing.image_url ?? ""} onChange={(url) => setEditing({ ...editing, image_url: url })} folder="about" />
            <div><Label>Content</Label><RichEditor value={editing.content ?? ""} onChange={(html) => setEditing({ ...editing, content: html })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Order position</Label><Input type="number" value={editing.order_position ?? rows.length + 1} onChange={(e) => setEditing({ ...editing, order_position: Number(e.target.value) })} /></div>
            </div>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save section"}</Button>
          </div>
        )}
        {rows.length === 0 && !editing && <p className="text-muted-foreground text-sm">No about sections yet.</p>}
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-md border border-border overflow-hidden bg-card">
              {row.image_url && <img src={row.image_url} alt={row.section_title} className="h-44 w-full object-cover" />}
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold">{row.section_title}</p>
                    <p className="text-sm text-muted-foreground">Order {row.order_position}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(row)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
