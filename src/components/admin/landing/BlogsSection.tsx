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

type Blog = { id: string; title: string; content: string | null; image: string | null };

export default function BlogsSection() {
  const [rows, setRows] = useState<Blog[]>([]);
  const [editing, setEditing] = useState<Partial<Blog> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("blogs").select("*").order("created_at", { ascending: false });
    setRows((data as Blog[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title) return toast.error("Title required");
    setBusy(true);
    const payload = { title: editing.title, content: editing.content ?? null, image: editing.image ?? null };
    const res = editing.id
      ? await supabase.from("blogs").update(payload).eq("id", editing.id)
      : await supabase.from("blogs").insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); setEditing(null); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    const { error } = await supabase.from("blogs").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Blogs</CardTitle>
        <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" /> New post</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-md border border-border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editing.id ? "Edit post" : "New post"}</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div><Label>Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <ImageUpload value={editing.image ?? ""} onChange={(url) => setEditing({ ...editing, image: url })} folder="blogs" />
            <div><Label>Content</Label>
              <RichEditor value={editing.content ?? ""} onChange={(html) => setEditing({ ...editing, content: html })} />
            </div>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save post"}</Button>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.length === 0 && !editing && <p className="text-muted-foreground text-sm">No posts yet.</p>}
          {rows.map(b => (
            <div key={b.id} className="rounded-md border border-border overflow-hidden bg-card flex flex-col">
              {b.image && <img src={b.image} alt={b.title} className="h-40 w-full object-cover" />}
              <div className="p-3 flex-1 flex flex-col">
                <p className="font-medium">{b.title}</p>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(b)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
