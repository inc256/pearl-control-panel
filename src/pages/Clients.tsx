import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect } from "react";

const clientRows = [
  { firstName: "Amina", secondName: "Nabirye", paymentPlan: "Installments", nationalId: "CM1234567", address: "Kampala", appId: "APP-001", status: "ready" },
  { firstName: "Juma", secondName: "Ssemanda", paymentPlan: "Cash", nationalId: "CM7654321", address: "Entebbe", appId: "APP-002", status: "not ready" },
  { firstName: "Grace", secondName: "Ayo", paymentPlan: "Bank", nationalId: "CM2468101", address: "Wakiso", appId: "APP-003", status: "ready" },
];

export default function Clients() {
  useEffect(() => { document.title = "Clients — Pearl Hijja Admin"; }, []);

  return (
    <AdminLayout title="Clients" description="Manage client profiles, portal IDs, and readiness status">
      <Card className="mb-6">
        <CardHeader><CardTitle>Add or update client</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1"><Label>First name</Label><Input placeholder="Amina" /></div>
          <div className="space-y-1"><Label>Second name</Label><Input placeholder="Nabirye" /></div>
          <div className="space-y-1"><Label>Payment plan</Label>
            <Select defaultValue="installments">
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="installments">Installments</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>National ID</Label><Input placeholder="CM1234567" /></div>
          <div className="space-y-1"><Label>Address</Label><Input placeholder="Kampala" /></div>
          <div className="space-y-1"><Label>App ID</Label><Input placeholder="APP-001" /></div>
          <div className="space-y-1"><Label>Discount</Label><Input type="number" placeholder="0" /></div>
          <div className="space-y-1"><Label>Status</Label>
            <Select defaultValue="ready">
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="not ready">Not ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button className="w-full">Save client</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Client directory</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First name</TableHead>
                <TableHead>Second name</TableHead>
                <TableHead>Payment plan</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>App ID</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientRows.map((client) => (
                <TableRow key={client.appId}>
                  <TableCell className="font-medium">{client.firstName}</TableCell>
                  <TableCell>{client.secondName}</TableCell>
                  <TableCell>{client.paymentPlan}</TableCell>
                  <TableCell>{client.nationalId}</TableCell>
                  <TableCell>{client.address}</TableCell>
                  <TableCell>{client.appId}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === "ready" ? "default" : "secondary"} className="capitalize">{client.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}