import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<'bookings'>;

type BookingWithDetails = Booking & {
  clients: {
    first_name: string;
    second_name: string | null;
    national_id: string | null;
    app_id: string | null;
  } | null;
  packages: {
    name: string | null;
    price: number | null;
    type: string | null;
  } | null;
};

export default function Bookings() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Bookings — Pearl Hijja Admin";
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          clients (
            first_name,
            second_name,
            national_id,
            app_id
          ),
          packages (
            name,
            price,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: status })
        .eq('id', bookingId);

      if (error) throw error;
      await fetchBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'text-gray-600';
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Bookings" description="Client booking details and installment payment tracking">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Bookings" description="Client booking details and installment payment tracking">
        <Card>
          <CardContent className="py-8">
            <p className="text-red-500 text-center">{error}</p>
            <Button onClick={fetchBookings} className="mt-4 mx-auto block">
              Retry
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Bookings" description="Client booking details and installment payment tracking">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
          <p className="text-sm text-muted-foreground">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {bookings.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-muted-foreground">
              No bookings found
            </div>
          ) : (
            bookings.slice(0, 6).map((booking) => (
              <div key={booking.id} className="rounded-lg border p-4 space-y-2">
                <p className="font-semibold text-foreground">
                  {booking.clients 
                    ? `${booking.clients.first_name} ${booking.clients.second_name || ''}`.trim()
                    : booking.first_name}
                </p>
                <p>
                  <span className="font-medium">Package:</span>{' '}
                  {booking.packages?.name || booking.package_id || 'N/A'}
                </p>
                <p>
                  <span className="font-medium">Travelers:</span>{' '}
                  {booking.travelers_no || 'N/A'}
                </p>
                <p>
                  <span className="font-medium">Total Amount:</span>{' '}
                  {booking.total_amount ? `UGX ${booking.total_amount.toLocaleString()}` : 'N/A'}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={getStatusColor(booking.booking_status)}>
                    {booking.booking_status || 'pending'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Date:</span>{' '}
                  {new Date(booking.created_at).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                    disabled={booking.booking_status === 'confirmed'}
                  >
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateBookingStatus(booking.id, 'pending')}
                  >
                    Mark pending
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All bookings</CardTitle>
          <p className="text-sm text-muted-foreground">
            {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No bookings found</p>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="rounded-lg border p-4 text-foreground space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {booking.clients 
                          ? `${booking.clients.first_name} ${booking.clients.second_name || ''}`.trim()
                          : booking.first_name}
                      </p>
                      {booking.clients?.national_id && (
                        <p className="text-xs text-muted-foreground">
                          ID: {booking.clients.national_id}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.booking_status)} bg-gray-100`}>
                      {booking.booking_status || 'pending'}
                    </span>
                  </div>
                  <p>
                    <span className="font-medium">Package:</span>{' '}
                    {booking.packages?.name || booking.package_id || 'N/A'}
                    {booking.packages?.type && ` (${booking.packages.type})`}
                  </p>
                  <p>
                    <span className="font-medium">Travelers:</span> {booking.travelers_no || 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium">Total Amount:</span>{' '}
                    {booking.total_amount ? `UGX ${booking.total_amount.toLocaleString()}` : 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium">Booking Date:</span>{' '}
                    {new Date(booking.booking_date || booking.created_at).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(booking.created_at).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button 
                      size="sm" 
                      onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                      disabled={booking.booking_status === 'confirmed'}
                    >
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateBookingStatus(booking.id, 'pending')}
                    >
                      Pending
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}