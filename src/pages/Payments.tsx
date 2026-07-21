import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect } from "react";

const paymentRows = [
  {
    clientName: "Luutu Mubarak",
    appId: "APP-001",
    date: "2026-07-03",
    plan: "Installments",
    payments: [{ date: "2026-07-03", amount: 500 }, { date: "2026-07-17", amount: 700 }],
    total: 1200,
    pilgrims: 1,
    discount: 0,
    accountNumber: "AC-1001",
  },
  {
    clientName: "Amina Nabirye",
    appId: "APP-002",
    date: "2026-07-10",
    plan: "Cash",
    payments: [{ date: "2026-07-10", amount: 1800 }],
    total: 1800,
    pilgrims: 2,
    discount: 100,
    accountNumber: "AC-1002",
  },
];

export default function Payments() {
  useEffect(() => { document.title = "Payments — Pearl Hijja Admin"; }, []);

  return (
    <AdminLayout title="Payments" description="Track payments, installment schedules, and balances">
      <Card className="mb-6">
        <CardHeader><CardTitle>Create payment record</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1 xl:col-span-2"><Label>Choose client</Label>
            <Select defaultValue={paymentRows[0].clientName}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {paymentRows.map((payment) => (
                  <SelectItem key={payment.appId} value={payment.clientName}>{payment.clientName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Date</Label><Input type="date" /></div>
          <div className="space-y-1"><Label>Amount</Label><Input type="number" placeholder="0" /></div>
          <div className="flex items-end"><Button className="w-full">Save payment</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment ledger</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client name</TableHead>
                <TableHead>App ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pilgrims</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead>Account number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRows.map((payment) => (
                <TableRow key={payment.appId}>
                  <TableCell className="font-medium">{payment.clientName}</TableCell>
                  <TableCell className="font-medium">{payment.appId}</TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{payment.plan}</TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {payment.payments.map((item) => <div key={item.date}>{item.date}: ${item.amount.toLocaleString()}</div>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">${payment.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{payment.pilgrims}</TableCell>
                  <TableCell className="text-right">${payment.discount.toLocaleString()}</TableCell>
                  <TableCell>{payment.accountNumber}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}