import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const isMissingTableError = (error?: { message?: string }) => error?.message?.includes("Could not find the table");

type ContactInfo = {
  id: string;
  label: string;
  value: string;
  icon: string | null;
  type: string | null;
  order_position: number;
};

export default function ContactSection() {
  const [rows, setRows] = useState<ContactInfo[]>([]);
  const [editing, setEditing] = useState<Partial<ContactInfo> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("contact_info")
      .select("*")
      .order("order_position", { ascending: true });
    if (error) {
      if (isMissingTableError(error)) {
        setRows([]);
        return;
      }
      return toast.error(error.message);
    }
    setRows((data as ContactInfo[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.label) return toast.error("Label required");
    if (!editing?.value) return toast.error("Value required");
    setBusy(true);
    const payload = {
      label: editing.label,
      value: editing.value,
      icon: editing.icon ?? null,
      type: editing.type ?? null,
      order_position: editing.order_position ?? (rows.length + 1),
    };
    const res = editing.id
      ? await supabase.from("contact_info").update(payload).eq("id", editing.id)
      : await supabase.from("contact_info").insert(payload);
    setBusy(false);
    if (res.error) {
      if (isMissingTableError(res.error)) return toast.error("Contact info table not found.");
      return toast.error(res.error.message);
    }
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this contact item?")) return;
    const { error } = await supabase.from("contact_info").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) return toast.error("Contact info table not found.");
      return toast.error(error.message);
    }
    toast.success("Deleted");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0">
        <CardTitle>Contact info</CardTitle>
        <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" /> Add item</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-md border border-border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editing.id ? "Edit item" : "New contact item"}</h4>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div><Label>Label</Label><Input value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></div>
            <div><Label>Value</Label><Input value={editing.value ?? ""} onChange={(e) => setEditing({ ...editing, value: e.target.value })} /></div>
            <div><Label>Icon</Label><Input placeholder="e.g. phone, email" value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></div>
            <div><Label>Type</Label><Input placeholder="e.g. phone, email, address" value={editing.type ?? ""} onChange={(e) => setEditing({ ...editing, type: e.target.value })} /></div>
            <div><Label>Order position</Label><Input type="number" value={editing.order_position ?? rows.length + 1} onChange={(e) => setEditing({ ...editing, order_position: Number(e.target.value) })} /></div>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save contact item"}</Button>
          </div>
        )}
        {rows.length === 0 && !editing && <p className="text-muted-foreground text-sm">No contact info items yet.</p>}
        <div className="space-y-3">
          {rows.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-4 bg-card flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.value}</p>
                {item.type && <p className="text-xs text-muted-foreground">Type: {item.type}</p>}
                {item.icon && <p className="text-xs text-muted-foreground">Icon: {item.icon}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(item)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
