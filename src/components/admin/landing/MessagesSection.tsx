import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const isMissingTableError = (error?: { message?: string }) => error?.message?.includes("Could not find the table");

type Message = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  created_at: string;
};

export default function MessagesSection() {
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      if (isMissingTableError(error)) {
        setRows([]);
        return;
      }
      return toast.error(error.message);
    }
    setRows((data as Message[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) return toast.error("Contact messages table not found.");
      return toast.error(error.message);
    }
    toast.success("Deleted");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Contact messages</CardTitle>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 && <p className="text-muted-foreground text-sm">No contact messages yet.</p>}
        <div className="space-y-3">
          {rows.map((msg) => (
            <div key={msg.id} className="rounded-md border border-border p-4 bg-card">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{msg.first_name} {msg.last_name}</p>
                  <p className="text-sm text-muted-foreground">{msg.subject}</p>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</div>
              </div>
              <div className="grid gap-2 mt-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div><span className="font-medium text-foreground">Email:</span> {msg.email}</div>
                <div><span className="font-medium text-foreground">Phone:</span> {msg.phone || "—"}</div>
              </div>
              <div className="mt-3 whitespace-pre-line text-sm">{msg.message}</div>
              <div className="mt-4 flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => remove(msg.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
