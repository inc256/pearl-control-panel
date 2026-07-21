import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type B = { id: string; customer_name: string; package_name: string; status: string; created_at: string };

const bookingDetails = [
  {
    name: "Luutu Mubarak",
    phone: "0754399277",
    email: "mubarakluutu20@gmail.com",
    packageName: "December Umrah",
    travelers: 1,
    totalAmount: "UGX 6500000",
    paymentMethod: "Installments",
  },
  {
    name: "Amina Nabirye",
    phone: "0772123456",
    email: "amina@example.com",
    packageName: "Ramadan Umrah",
    travelers: 2,
    totalAmount: "UGX 9800000",
    paymentMethod: "Cash",
  },
];

export default function Bookings() {
  const [rows, setRows] = useState<B[]>([]);
  useEffect(() => {
    document.title = "Bookings — Pearl Hijja Admin";
    supabase.from("bookings").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows((data as B[]) ?? []));
  }, []);

  return (
    <AdminLayout title="Bookings" description="Client booking details and installment payment tracking">
      <Card className="mb-6">
        <CardHeader><CardTitle>Review and take action</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {bookingDetails.map((booking) => (
            <div key={booking.email} className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-foreground">{booking.name}</p>
              <p><span className="font-medium">Phone:</span> {booking.phone}</p>
              <p><span className="font-medium">Email:</span> {booking.email}</p>
              <p><span className="font-medium">Package:</span> {booking.packageName}</p>
              <p><span className="font-medium">Travelers:</span> {booking.travelers}</p>
              <p><span className="font-medium">Total Amount:</span> {booking.totalAmount}</p>
              <p><span className="font-medium">Payment Method:</span> {booking.paymentMethod}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm">Approve</Button>
                <Button size="sm" variant="outline">Request payment</Button>
                <Button size="sm" variant="secondary">Mark as reviewed</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All bookings</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            {rows.length === 0 && <p>No bookings yet</p>}
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border p-4 text-foreground space-y-2">
                <p><span className="font-medium">Name:</span> {r.customer_name}</p>
                <p><span className="font-medium">Package:</span> {r.package_name}</p>
                <p><span className="font-medium">Status:</span> {r.status}</p>
                <p><span className="font-medium">Date:</span> {new Date(r.created_at).toLocaleDateString()}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm">Approve</Button>
                  <Button size="sm" variant="outline">View</Button>
                  <Button size="sm" variant="secondary">Archive</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
