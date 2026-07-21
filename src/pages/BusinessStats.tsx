import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Package, ClipboardList, TrendingUp, ArrowDownCircle, ArrowUpCircle, BarChart3 } from "lucide-react";

const incomeRows = [
  { date: "2026-07-01", income: "Visa processing", amount: 1200 },
  { date: "2026-07-08", income: "Group package deposit", amount: 5400 },
  { date: "2026-07-15", income: "Air ticket margin", amount: 2200 },
];

const expenditureRows = [
  { date: "2026-07-02", expenditure: "Office rent", amount: 850 },
  { date: "2026-07-09", expenditure: "Transport deposit", amount: 1350 },
  { date: "2026-07-18", expenditure: "Marketing", amount: 640 },
];

const contributionRows = [
  { firstName: "Amina", lastName: "Nabirye", payments: [{ date: "2026-07-05", amount: 100 }, { date: "2026-07-19", amount: 150 }], total: 250 },
  { firstName: "Juma", lastName: "Ssemanda", payments: [{ date: "2026-07-07", amount: 200 }], total: 200 },
];

export default function BusinessStats() {
  useEffect(() => { document.title = "Business Stats — Pearl Hijja Admin"; }, []);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const incomeTotal = incomeRows.reduce((sum, row) => sum + row.amount, 0);
  const expenditureTotal = expenditureRows.reduce((sum, row) => sum + row.amount, 0);
  const contributionTotal = contributionRows.reduce((sum, row) => sum + row.total, 0);
  const net = incomeTotal - expenditureTotal;
  const profitMargin = incomeTotal > 0 ? ((net / incomeTotal) * 100).toFixed(1) : "0.0";

  useEffect(() => {
    const load = async () => {
      const checks = await Promise.all([
        supabase.from("packages").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
      ]);
      const firstError = checks.find((result) => result.error)?.error;
      setLoadingError(firstError?.message ?? null);
    };
    load();
  }, []);

  return (
    <AdminLayout title="Business Stats" description="Track income, expenditure, and performance indicators">
      <div className="rounded-xl p-6 md:p-8 mb-6 text-primary-foreground" style={{ background: "var(--gradient-burgundy)" }}>
        <p className="text-xs uppercase tracking-wider opacity-80">Pearl Hijja and Umrah Services (U) Ltd</p>
        <h2 className="font-serif text-2xl md:text-3xl mt-1">Welcome to Pearl Admin Console.</h2>
        <p className="opacity-90 text-sm mt-2 max-w-xl">Manage the business statistics and performance indicators.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6 mb-6">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ArrowUpCircle className="h-4 w-4" />Income</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">${incomeTotal.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ArrowDownCircle className="h-4 w-4" />Expenditure</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">${expenditureTotal.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Net</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">${net.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4" />Contribution Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">${contributionTotal.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" />Packages</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">128</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ClipboardList className="h-4 w-4" />Bookings</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">42</p></CardContent></Card>
      </div>

      {loadingError && <Card className="mb-6 border-destructive"><CardContent className="py-4 text-sm text-destructive">{loadingError}</CardContent></Card>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1"><Label>Date</Label><Input type="date" /></div>
              <div className="space-y-1"><Label>Income source</Label><Input placeholder="Visa processing" /></div>
              <div className="space-y-1"><Label>Amount</Label><Input type="number" placeholder="0" /></div>
            </div>
            <Button>Save income record</Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Income</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeRows.map((row) => (
                  <TableRow key={row.date + row.income}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.income}</TableCell>
                    <TableCell className="text-right">${row.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Full income list</p>
              <div className="max-h-72 overflow-y-auto space-y-2 text-sm text-muted-foreground pr-1">
                {incomeRows.map((row) => <p key={row.date + row.income}>{row.date} - {row.income} - ${row.amount.toLocaleString()}</p>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenditure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1"><Label>Date</Label><Input type="date" /></div>
              <div className="space-y-1"><Label>Expenditure</Label><Input placeholder="Office rent" /></div>
              <div className="space-y-1"><Label>Amount</Label><Input type="number" placeholder="0" /></div>
            </div>
            <Button variant="outline">Save expenditure record</Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Expenditure</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenditureRows.map((row) => (
                  <TableRow key={row.date + row.expenditure}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.expenditure}</TableCell>
                    <TableCell className="text-right">${row.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Full expenditure list</p>
              <div className="max-h-72 overflow-y-auto space-y-2 text-sm text-muted-foreground pr-1">
                {expenditureRows.map((row) => <p key={row.date + row.expenditure}>{row.date} - {row.expenditure} - ${row.amount.toLocaleString()}</p>)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}