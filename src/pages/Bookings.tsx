import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<'bookings'>;

type BookingWithDetails = Booking & {
  client_name?: string | null;
  package_name?: string | null;
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    document.title = "Bookings — Pearl Hijja Admin";
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching bookings...');

      // First, let's check if we can connect
      const { data: testData, error: testError } = await supabase
        .from('bookings')
        .select('count')
        .limit(1);

      console.log('Connection test:', { testData, testError });

      if (testError) {
        console.error('Connection test failed:', testError);
        setError(`Database connection error: ${testError.message}`);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Query error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      const normalizedBookings = (data || []).map((booking: any) => ({
        ...booking,
        client_name: booking.first_name ? `${booking.first_name}${booking.second_name ? ` ${booking.second_name}` : ''}`.trim() : 'Unknown Client',
        package_name: booking.package_id ? `Package ${booking.package_id}` : 'Unknown package',
      }));

      setBookings(normalizedBookings as BookingWithDetails[]);

    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setError(`Failed to load bookings: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const normalizedStatus = status.toLowerCase();
      
      console.log(`Updating booking ${bookingId} to ${normalizedStatus}`);
      
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: normalizedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Update successful:', data);
      await fetchBookings();
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      alert(`Failed to update booking status: ${error.message}`);
    }
  };

  const handleApproveBooking = async (booking: BookingWithDetails) => {
    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          booking_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      const nameParts = (booking.client_name || booking.first_name || 'Client').split(/\s+/).filter(Boolean);
      const firstName = (booking.first_name || nameParts[0] || 'Client').trim();
      const secondName = (booking.second_name || nameParts.slice(1).join(' ') || '').trim() || null;

      const clientPayload = {
        first_name: firstName || 'Client',
        second_name: secondName,
        national_id: null,
        address: null,
        app_id: '',
        package_id: booking.package_id ? Number(booking.package_id) : null,
        balance: 0,
        paid_amount: 0,
      };

      const { error: clientError } = await supabase
        .from('clients')
        .insert(clientPayload);

      if (clientError) throw clientError;

      localStorage.setItem('clients.prefill', JSON.stringify({
        first_name: clientPayload.first_name,
        second_name: clientPayload.second_name || '',
        national_id: '',
        address: '',
        app_id: '',
        package_id: booking.package_id ? String(booking.package_id) : '',
        status: 'ready'
      }));

      await fetchBookings();
      navigate('/clients');
    } catch (error: any) {
      console.error('Error approving booking:', error);
      alert(`Failed to approve booking: ${error.message}`);
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
      case 'completed':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeClass = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    const classes: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'confirmed': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700',
      'completed': 'bg-blue-100 text-blue-700'
    };
    return classes[status.toLowerCase()] || 'bg-gray-100 text-gray-600';
  };

  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter(b => b.booking_status?.toLowerCase() === statusFilter);

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
            <div className="text-center">
              <p className="text-red-500 font-semibold">{error}</p>
              <Button onClick={fetchBookings} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Bookings" description="Client booking details and installment payment tracking">
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All ({bookings.length})
            </Button>
            {['pending', 'confirmed', 'cancelled', 'completed'].map(status => {
              const count = bookings.filter(b => b.booking_status?.toLowerCase() === status).length;
              return count > 0 ? (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                </Button>
              ) : null;
            })}
          </div>
        </CardHeader>
      </Card>

      {/* Bookings Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBookings.length === 0 ? (
          <div className="col-span-full py-8 text-center text-muted-foreground">
            No bookings found
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {booking.client_name || booking.first_name || 'Unknown Client'}
                    </p>
                    {booking.email && (
                      <p className="text-xs text-muted-foreground">
                        {booking.email}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.booking_status)}`}>
                    {booking.booking_status || 'Pending'}
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Package:</span>{' '}
                    {booking.package_name || booking.package_id || 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium">Travelers:</span>{' '}
                    {booking.travelers_no || '1'}
                  </p>
                  <p>
                    <span className="font-medium">Total:</span>{' '}
                    {booking.total_amount ? `UGX ${booking.total_amount.toLocaleString()}` : 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(booking.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleApproveBooking(booking)}
                    disabled={booking.booking_status?.toLowerCase() === 'confirmed'}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateBookingStatus(booking.id, 'pending')}
                    disabled={booking.booking_status?.toLowerCase() === 'pending'}
                  >
                    Pending
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                    disabled={booking.booking_status?.toLowerCase() === 'cancelled'}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateBookingStatus(booking.id, 'completed')}
                    disabled={booking.booking_status?.toLowerCase() === 'completed'}
                  >
                    Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}