import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  CalendarCheck, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  TrendingUp, 
  Mail, 
  Plane,
  CreditCard,
  PoundSterling,
  CircleCheckBig,
  XCircle,
  Clock,
  Star
} from "lucide-react";

interface Stats {
  clients: number;
  bookings: number;
  bookingsPending: number;
  bookingsConfirmed: number;
  bookingsCompleted: number;
  bookingsCancelled: number;
  bookingRevenue: number;
  income: number;
  expenditure: number;
  net: number;
  paymentsReceived: number;
  paymentsDiscount: number;
  paymentsNet: number;
  paymentsOutstanding: number;
  PaymentsPending: number;
  paymentsPaid: number;
  contributionsTotal: number;
  contributionsPaid: number;
  contributionsBalance: number;
  contacts: number;
  travelers: number;
}

export default function BusinessSummary() {
  useEffect(() => { 
    document.title = "Business Summary — Pearl Hijja Admin"; 
  }, []);
  const [stats, setStats] = useState<Stats>({
    clients: 0,
    bookings: 0,
    bookingsPending: 0,
    bookingsConfirmed: 0,
    bookingsCompleted: 0,
    bookingsCancelled: 0,
    bookingRevenue: 0,
    income: 0,
    expenditure: 0,
    net: 0,
    paymentsReceived: 0,
    paymentsDiscount: 0,
    paymentsNet: 0,
    paymentsOutstanding: 0,
    PaymentsPending: 0,
    paymentsPaid: 0,
    contributionsTotal: 0,
    contributionsPaid: 0,
    contributionsBalance: 0,
    contacts: 0,
    travelers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        clientsRes,
        bookingsRes,
        incomeRes,
        expenditureRes,
        paymentsRes,
        contributionsRes,
        contactsRes
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: false }),
        supabase.from('income').select('amount'),
        supabase.from('expenditure').select('amount'),
        supabase.from('payments').select('total,discount,status'),
        supabase.from('contributions').select('contribution,total'),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true })
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (incomeRes.error) throw incomeRes.error;
      if (expenditureRes.error) throw expenditureRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (contributionsRes.error) throw contributionsRes.error;
      if (contactsRes.error) throw contactsRes.error;

      const bookings = bookingsRes.data || [];
      const payments = paymentsRes.data || [];
      const contributions = contributionsRes.data || [];
      const incomeRows = incomeRes.data || [];
      const expenditureRows = expenditureRes.data || [];

      const bookingRevenue = bookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
      const travelers = bookings.reduce((sum: number, b: any) => sum + (b.travelers_no || 0), 0);

      const incomeTotal = incomeRows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const expenditureTotal = expenditureRows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

      const paymentsTotal = payments.reduce((sum: number, p: any) => sum + (p.total || 0), 0);
      const paymentsDiscountTotal = payments.reduce((sum: number, p: any) => sum + (p.discount || 0), 0);
      const paymentsNetTotal = payments.reduce((sum: number, p: any) => sum + ((p.total || 0) - (p.discount || 0)), 0);

      let paymentsPendingCount = 0;
      let paymentsPaidCount = 0;
      payments.forEach((p: any) => {
        const statusText = (p.status && typeof p.status === 'object' && p.status.status) ? p.status.status : String(p.status || 'Pending');
        if (statusText.toLowerCase() === 'pending') paymentsPendingCount++;
        if (statusText.toLowerCase() === 'paid') paymentsPaidCount++;
      });

      const contributionsTotalAll = contributions.reduce((sum: number, c: any) => sum + (c.total || 0), 0);
      let contributionsPaidAll = 0;
      contributions.forEach((c: any) => {
        const arr = Array.isArray(c.contribution) ? c.contribution : [];
        contributionsPaidAll += arr.reduce((s: number, item: any) => s + (item.amount || 0), 0);
      });

      setStats({
        clients: clientsRes.count || 0,
        bookings: bookings.length,
        bookingsPending: bookings.filter((b: any) => (b.booking_status || '').toLowerCase() === 'pending').length,
        bookingsConfirmed: bookings.filter((b: any) => (b.booking_status || '').toLowerCase() === 'confirmed').length,
        bookingsCompleted: bookings.filter((b: any) => (b.booking_status || '').toLowerCase() === 'completed').length,
        bookingsCancelled: bookings.filter((b: any) => (b.booking_status || '').toLowerCase() === 'cancelled').length,
        bookingRevenue,
        income: incomeTotal,
        expenditure: expenditureTotal,
        net: incomeTotal - expenditureTotal,
        paymentsReceived: paymentsTotal,
        paymentsDiscount: paymentsDiscountTotal,
        paymentsNet: paymentsNetTotal,
        paymentsOutstanding: paymentsNetTotal - contributionsPaidAll,
        PaymentsPending: paymentsPendingCount,
        paymentsPaid: paymentsPaidCount,
        contributionsTotal: contributionsTotalAll,
        contributionsPaid: contributionsPaidAll,
        contributionsBalance: contributionsTotalAll - contributionsPaidAll,
        contacts: contactsRes.count || 0,
        travelers
      });
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load business summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Business Summary" description="Overall business performance at a glance">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading business summary...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Business Summary" description="Overall business performance at a glance">
        <Card className="border-destructive">
          <CardContent className="py-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const StatCard = ({ title, value, icon, hint, valueClass }: { title: string; value: string | number; icon: any; hint?: string; valueClass?: string }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          {icon}
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-lg sm:text-xl md:text-2xl font-semibold truncate ${valueClass || ''}`}>
          {value}
        </p>
        {hint && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="Business Summary" description="Overall business performance at a glance">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6">
        <StatCard title="Clients" value={stats.clients} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Bookings" value={stats.bookings} icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard title="Travelers" value={stats.travelers} icon={<Plane className="h-4 w-4" />} />
        <StatCard title="Contacts" value={stats.contacts} icon={<Mail className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6">
        <StatCard 
          title="Booking Revenue" 
          value={`UGX ${stats.bookingRevenue.toLocaleString()}`} 
          icon={<CreditCard className="h-4 w-4" />} 
        />
        <StatCard 
          title="Income" 
          value={`UGX ${stats.income.toLocaleString()}`} 
          icon={<ArrowUpCircle className="h-4 w-4" />} 
        />
        <StatCard 
          title="Expenditure" 
          value={`UGX ${stats.expenditure.toLocaleString()}`} 
          icon={<ArrowDownCircle className="h-4 w-4" />} 
        />
        <StatCard 
          title="Net Profit" 
          value={`UGX ${stats.net.toLocaleString()}`} 
          icon={<TrendingUp className="h-4 w-4" />} 
          valueClass={stats.net < 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6">
        <StatCard 
          title="Payments Received" 
          value={`UGX ${stats.paymentsReceived.toLocaleString()}`} 
          icon={<Wallet className="h-4 w-4" />} 
        />
        <StatCard 
          title="Payments Discount" 
          value={`UGX ${stats.paymentsDiscount.toLocaleString()}`} 
          icon={<PoundSterling className="h-4 w-4" />} 
        />
        <StatCard 
          title="Payments Net" 
          value={`UGX ${stats.paymentsNet.toLocaleString()}`} 
          icon={<CreditCard className="h-4 w-4" />} 
        />
        <StatCard 
          title="Payments Outstanding" 
          value={`UGX ${Math.max(stats.paymentsOutstanding, 0).toLocaleString()}`} 
          icon={<CircleCheckBig className="h-4 w-4" />} 
          valueClass={stats.paymentsOutstanding > 0 ? 'text-red-600' : 'text-green-600'}
          hint={`Paid ${stats.paymentsPaid} • Pending ${stats.PaymentsPending}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6">
        <StatCard 
          title="Contributions Expected" 
          value={`UGX ${stats.contributionsTotal.toLocaleString()}`} 
          icon={<Star className="h-4 w-4" />} 
        />
        <StatCard 
          title="Contributions Paid" 
          value={`UGX ${stats.contributionsPaid.toLocaleString()}`} 
          icon={<Wallet className="h-4 w-4" />} 
        />
        <StatCard 
          title="Contributions Balance" 
          value={`UGX ${stats.contributionsBalance.toLocaleString()}`} 
          icon={<TrendingUp className="h-4 w-4" />} 
          valueClass={stats.contributionsBalance > 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Pending</p>
              <p className="text-lg sm:text-xl font-bold">{stats.bookingsPending}</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Confirmed</p>
              <p className="text-lg sm:text-xl font-bold">{stats.bookingsConfirmed}</p>
            </div>
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Completed</p>
              <p className="text-lg sm:text-xl font-bold">{stats.bookingsCompleted}</p>
            </div>
            <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Cancelled</p>
              <p className="text-lg sm:text-xl font-bold">{stats.bookingsCancelled}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
