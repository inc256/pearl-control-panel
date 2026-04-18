import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type FAQ = { id: string; question: string; answer: string | null; sort_order: number };

export default function FaqSection() {
  const [rows, setRows] = useState<FAQ[]>([]);
  const [editing, setEditing] = useState<Partial<FAQ> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("faqs").select("*").order("sort_order").order("created_at");
    setRows((data as FAQ[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.question) return toast.error("Question required");
    setBusy(true);
    const payload = { question: editing.question, answer: editing.answer ?? null, sort_order: editing.sort_order ?? 0 };
    const res = editing.id
      ? await supabase.from("faqs").update(payload).eq("id", editing.id)
      : await supabase.from("faqs").insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); setEditing(null); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>FAQs</CardTitle>
        <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" /> Add FAQ</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-md border border-border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editing.id ? "Edit FAQ" : "New FAQ"}</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div><Label>Question</Label><Input value={editing.question ?? ""} onChange={(e) => setEditing({ ...editing, question: e.target.value })} /></div>
            <div><Label>Answer</Label><Textarea rows={4} value={editing.answer ?? ""} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} /></div>
            <div className="max-w-[140px]"><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save FAQ"}</Button>
          </div>
        )}
        <div className="space-y-2">
          {rows.length === 0 && !editing && <p className="text-muted-foreground text-sm">No FAQs yet.</p>}
          {rows.map(f => (
            <div key={f.id} className="rounded-md border border-border p-3 flex items-start gap-3 bg-card">
              <div className="flex-1">
                <p className="font-medium text-sm">{f.question}</p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{f.answer}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(f)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
