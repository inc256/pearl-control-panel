import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type FAQ = {
  id: string;
  category: string | null;
  question: string;
  answer: string | null;
  created_at: string;
  updated_at: string;
};

export default function FaqSection() {
  const [rows, setRows] = useState<FAQ[]>([]);
  const [editing, setEditing] = useState<Partial<FAQ> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("faqs").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows((data as FAQ[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.question) return toast.error("Question required");
    setBusy(true);
    const payload = {
      category: editing.category ?? null,
      question: editing.question,
      answer: editing.answer ?? null,
    };
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
    <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-6">
        <CardTitle className="text-base font-semibold">FAQs</CardTitle>
        <Button size="sm" className="rounded-lg" onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Add FAQ</Button>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-6">
        {editing && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editing.id ? "Edit FAQ" : "New FAQ"}</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div><Label>Category</Label><Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
            <div><Label>Question</Label><Input value={editing.question ?? ""} onChange={(e) => setEditing({ ...editing, question: e.target.value })} /></div>
            <div><Label>Answer</Label><Textarea rows={4} value={editing.answer ?? ""} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} /></div>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save FAQ"}</Button>
          </div>
        )}
        <div className="space-y-2">
          {rows.length === 0 && !editing && <p className="text-muted-foreground text-sm">No FAQs yet.</p>}
          {rows.map(f => (
            <div key={f.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-muted/20">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{f.question}</p>
                  {f.category && <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{f.category}</span>}
                </div>
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
