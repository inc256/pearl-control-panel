import ProtectedPage from "@/components/layout/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { 
  Calendar, 
  Users, 
  Phone, 
  Mail, 
  Package, 
  DollarSign, 
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Hash,
  TrendingUp,
  TrendingDown,
  Copy
} from "lucide-react";
import { toast } from "sonner";

type Booking = Tables<'bookings'>;
type PackageType = Tables<'packages'>;

type BookingWithDetails = Booking & {
  client_name?: string | null;
  package_name?: string | null;
  package_type?: string | null;
  package_price?: number | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  national_id?: string | null;
  payment_method_details?: {
    method: string;
    details: {
      note?: string;
      phone?: string;
      [key: string]: any;
    };
  };
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [packagesMap, setPackagesMap] = useState<Record<number, PackageType>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Bookings — Pearl Hijja Admin";
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch packages first
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('id, name, type, price');

      if (packagesError) throw packagesError;

      const packageMap: Record<number, PackageType> = {};
      (packagesData || []).forEach((pkg) => {
        packageMap[pkg.id] = pkg;
      });
      setPackagesMap(packageMap);

      // Then fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const normalizedBookings = (bookingsData || []).map((booking: any) => {
        let paymentDetails = null;
        let extractedPhone = null;
        let extractedNotes = null;
        
        if (booking.payment_method) {
          try {
            const parsed = typeof booking.payment_method === 'string' 
              ? JSON.parse(booking.payment_method) 
              : booking.payment_method;
            
            paymentDetails = parsed;
            
            if (parsed?.details) {
              extractedPhone = parsed.details.phone || null;
              extractedNotes = parsed.details.note || null;
            }
          } catch (e) {
            paymentDetails = { method: booking.payment_method };
          }
        }

        // Get package details from the map
        const pkg = packageMap[booking.package_id];
        const packageName = pkg?.name || `Package ${booking.package_id}`;
        const packageType = pkg?.type || null;

        return {
          ...booking,
          client_name: booking.first_name 
            ? `${booking.first_name}${booking.second_name ? ` ${booking.second_name}` : ''}`.trim() 
            : 'Unknown Client',
          package_name: packageName,
          package_type: packageType,
          package_price: pkg?.price || null,
          payment_method_details: paymentDetails,
          phone: booking.phone || extractedPhone || null,
          notes: booking.notes || extractedNotes || null,
        };
      });

      setBookings(normalizedBookings as BookingWithDetails[]);

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(`Failed to load data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const normalizedStatus = status.toLowerCase();
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: normalizedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      await loadData();
      toast.success(`Booking status updated to ${status}`);
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast.error(`Failed to update booking status: ${error.message}`);
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

      // Extract phone and notes from payment method if available
      let extractedPhone = booking.phone;
      let extractedNotes = booking.notes;
      
      if (booking.payment_method_details?.details) {
        extractedPhone = booking.payment_method_details.details.phone || booking.phone || null;
        extractedNotes = booking.payment_method_details.details.note || booking.notes || null;
      }

      // Build complete client data with ALL fields
      const clientData = {
        first_name: booking.first_name?.trim() || '',
        second_name: booking.second_name?.trim() || '',
        national_id: booking.national_id || '',
        phone: extractedPhone || '',
        email: booking.email || '',
        notes: extractedNotes || '',
        address: '',
        app_id: '',
        package_id: booking.package_id ? String(booking.package_id) : '',
        travelers_no: booking.travelers_no || 1,
        total_amount: booking.total_amount || 0,
        status: 'ready',
        discount_amount: '0',
        additional_amount: '0'
      };

      console.log('📝 Transferring client data:', clientData);

      // Store in localStorage for the Clients page
      localStorage.setItem('clients.prefill', JSON.stringify(clientData));

      await loadData();
      toast.success('Booking approved! Client data ready for transfer');
      navigate('/clients');
    } catch (error: any) {
      console.error('Error approving booking:', error);
      toast.error(`Failed to approve booking: ${error.message}`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const getStatusConfig = (status: string | null) => {
    if (!status) return { color: 'text-gray-600', bg: 'bg-gray-100', icon: AlertCircle, label: 'Unknown' };
    
    const configs: Record<string, any> = {
      'confirmed': { color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle, label: 'Confirmed' },
      'pending': { color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock, label: 'Pending' },
      'cancelled': { color: 'text-red-700', bg: 'bg-red-50', icon: XCircle, label: 'Cancelled' },
      'completed': { color: 'text-blue-700', bg: 'bg-blue-50', icon: CheckCircle, label: 'Completed' }
    };
    
    const matched = configs[status.toLowerCase()];
    return matched || { color: 'text-gray-600', bg: 'bg-gray-100', icon: AlertCircle, label: status };
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-UG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'N/A';
    
    if (num >= 1000000) {
      return `UGX ${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `UGX ${(num / 1000).toFixed(1)}K`;
    }
    return `UGX ${num.toFixed(0)}`;
  };

  const getStatusCount = (status: string) => {
    return bookings.filter(b => b.booking_status?.toLowerCase() === status).length;
  };

  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter(b => b.booking_status?.toLowerCase() === statusFilter);

  if (loading) {
    return (
      <ProtectedPage title="Bookings" description="Client booking details and installment payment tracking">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (error) {
    return (
      <ProtectedPage title="Bookings" description="Client booking details and installment payment tracking">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 font-semibold mb-2">{error}</p>
              <p className="text-sm text-muted-foreground mb-4">Please try again or contact support</p>
              <Button onClick={loadData} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage title="Bookings" description="Client booking details and installment payment tracking">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Bookings</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-semibold text-amber-600 mt-1">{getStatusCount('pending')}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Confirmed</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">{getStatusCount('confirmed')}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-semibold text-blue-600 mt-1">{getStatusCount('completed')}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cancelled</p>
                <p className="text-2xl font-semibold text-red-600 mt-1">{getStatusCount('cancelled')}</p>
              </div>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-2 mr-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filter by Status:</span>
        </div>
        <Button
          size="sm"
          variant={statusFilter === 'all' ? 'default' : 'ghost'}
          onClick={() => setStatusFilter('all')}
          className="text-xs"
        >
          All ({bookings.length})
        </Button>
        {['pending', 'confirmed', 'cancelled', 'completed'].map(status => {
          const count = getStatusCount(status);
          return count > 0 ? (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'default' : 'ghost'}
              onClick={() => setStatusFilter(status)}
              className="text-xs capitalize"
            >
              {status} ({count})
            </Button>
          ) : null;
        })}
      </div>

      {/* Bookings Grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredBookings.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground font-medium">No bookings found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const statusConfig = getStatusConfig(booking.booking_status);
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedBooking === booking.id;
            const hasNotes = booking.notes && booking.notes.trim().length > 0;
            const hasPhone = booking.phone && booking.phone.trim().length > 0;
            const hasNationalId = booking.national_id && booking.national_id.trim().length > 0;
            const paymentMethod = booking.payment_method_details?.method || 'N/A';
            const isInstallment = paymentMethod.toLowerCase().includes('installment');

            return (
              <Card 
                key={booking.id} 
                className="border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden bg-white flex flex-col"
              >
                <div className="p-4 sm:p-5 flex flex-col h-full">
                  {/* Header - Client Info */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">
                            {booking.client_name || booking.first_name || 'Unknown Client'}
                          </p>
                          {booking.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{booking.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.color} border-0 flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Booking Details */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3 flex-1">
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700">Package:</span>
                      <span className="text-muted-foreground text-xs truncate">
                        {booking.package_name}
                      </span>
                      {booking.package_type && (
                        <Badge variant="outline" className="text-[10px] capitalize ml-1">
                          {booking.package_type}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700">Travelers:</span>
                      <span className="text-muted-foreground text-xs">{booking.travelers_no || '1'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700">Total:</span>
                      <span className="text-muted-foreground text-xs font-medium truncate">
                        {formatCurrency(booking.total_amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 col-span-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700">Date:</span>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(booking.created_at)}
                      </span>
                    </div>

                    {hasPhone && (
                      <div className="flex items-center gap-1.5 col-span-2 bg-gray-50 rounded px-2 py-1 group">
                        <Phone className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700">Phone:</span>
                        <span className="text-gray-700 text-xs font-mono truncate flex-1">{booking.phone}</span>
                        <button
                          onClick={() => copyToClipboard(booking.phone || '', 'Phone number')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded"
                        >
                          <Copy className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                      </div>
                    )}

                    {hasNationalId && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700">National ID:</span>
                        <span className="text-muted-foreground text-xs font-mono truncate">{booking.national_id}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 col-span-2">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700">Payment:</span>
                      <span className="text-muted-foreground text-xs capitalize">
                        {paymentMethod}
                      </span>
                      {isInstallment && (
                        <span className="ml-1 text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">
                          Installment
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {hasNotes && (
                    <div className="border-t border-gray-100 pt-2 mb-2">
                      <button
                        onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 w-full"
                      >
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700">Notes:</span>
                        <span className="text-muted-foreground flex-1 text-left truncate">
                          {isExpanded ? booking.notes : `${(booking.notes || '').substring(0, 50)}${(booking.notes || '').length > 50 ? '...' : ''}`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 ml-auto flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-3 w-3 ml-auto flex-shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-2.5 bg-gray-50 rounded-md text-xs text-gray-600 break-words">
                          {booking.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions - 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100 mt-auto">
                    <Button
                      size="sm"
                      onClick={() => handleApproveBooking(booking)}
                      disabled={booking.booking_status?.toLowerCase() === 'confirmed'}
                      className="h-7 text-xs bg-primary hover:bg-primary/90 text-white"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBookingStatus(booking.id, 'pending')}
                      disabled={booking.booking_status?.toLowerCase() === 'pending'}
                      className="h-7 text-xs border-gray-300 hover:bg-gray-50"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      disabled={booking.booking_status?.toLowerCase() === 'cancelled'}
                      className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBookingStatus(booking.id, 'completed')}
                      disabled={booking.booking_status?.toLowerCase() === 'completed'}
                      className="h-7 text-xs border-gray-300 hover:bg-gray-50"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </ProtectedPage>
  );
}