import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type B = { id: string; customer_name: string; package_name: string; status: string; created_at: string };

export default function Bookings() {
  const [rows, setRows] = useState<B[]>([]);
  useEffect(() => {
    document.title = "Bookings — Pearl Hijja Admin";
    supabase.from("bookings").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows((data as B[]) ?? []));
  }, []);
  const variant = (s: string) => s === "confirmed" ? "default" : s === "cancelled" ? "destructive" : "secondary";

  return (
    <AdminLayout title="Bookings" description="Demo bookings table — backend logic coming soon">
      <Card>
        <CardHeader><CardTitle>All bookings</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No bookings yet</TableCell></TableRow>}
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.customer_name}</TableCell>
                    <TableCell>{r.package_name}</TableCell>
                    <TableCell><Badge variant={variant(r.status) as any} className="capitalize">{r.status}</Badge></TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
