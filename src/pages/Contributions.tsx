import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect } from "react";

const contributionRows = [
  { firstName: "Amina", lastName: "Nabirye", payments: [{ date: "2026-07-05", amount: 100 }, { date: "2026-07-19", amount: 150 }], total: 250 },
  { firstName: "Juma", lastName: "Ssemanda", payments: [{ date: "2026-07-07", amount: 200 }], total: 200 },
];

const memberOptions = contributionRows.map((member) => `${member.firstName} ${member.lastName}`);

export default function Contributions() {
  useEffect(() => { document.title = "Contributions — Pearl Hijja Admin"; }, []);

  return (
    <AdminLayout title="Contributions" description="Track member contributions and payment history">
      <div className="grid gap-6 xl:grid-cols-2 mb-6">
        <Card>
          <CardHeader><CardTitle>Add new member contribution</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1"><Label>First name</Label><Input placeholder="Amina" /></div>
            <div className="space-y-1"><Label>Last name</Label><Input placeholder="Nabirye" /></div>
            <div className="space-y-1"><Label>Payment date</Label><Input type="date" /></div>
            <div className="space-y-1"><Label>Amount</Label><Input type="number" placeholder="0" /></div>
            <div className="space-y-1"><Label>Total</Label><Input type="number" placeholder="0" /></div>
            <div className="flex items-end"><Button className="w-full">Save new member</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Add contribution to existing member</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2"><Label>Choose member</Label>
              <Select defaultValue={memberOptions[0]}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {memberOptions.map((member) => <SelectItem key={member} value={member}>{member}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Payment date</Label><Input type="date" /></div>
            <div className="space-y-1"><Label>Amount</Label><Input type="number" placeholder="0" /></div>
            <div className="md:col-span-2 flex items-end"><Button className="w-full">Add contribution</Button></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Contribution ledger</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First name</TableHead>
                <TableHead>Last name</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contributionRows.map((contribution) => (
                <TableRow key={contribution.firstName + contribution.lastName}>
                  <TableCell className="font-medium">{contribution.firstName}</TableCell>
                  <TableCell>{contribution.lastName}</TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {contribution.payments.map((item) => <div key={item.date}>{item.date}: ${item.amount.toLocaleString()}</div>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">${contribution.total.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}