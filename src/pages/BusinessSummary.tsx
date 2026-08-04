import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateClientPackageTotal, summarizePackagePayments } from "@/lib/clientPricing";
import { 
  Users, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  TrendingUp,
  CircleCheckBig,
  Star,
  Eye,
  X
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
  fullyPaidClients: number;
  clientsList: Array<{
    id: string;
    name: string;
    packageName: string;
    balance: number;
    paid: number;
    packageTotal: number;
  }>;
  fullyPaidClientsList: Array<{
    id: string;
    name: string;
    packageName: string;
    balance: number;
  }>;
  incomeList: Array<{
    id: number;
    description: string;
    amount: number;
    date: string | null;
  }>;
  expenditureList: Array<{
    id: number;
    description: string;
    amount: number;
    date: string | null;
  }>;
  contributionsPaidList: Array<{
    id: string;
    name: string;
    paid: number;
    total: number;
    balance: number;
  }>;
  packageSummaries: Array<{
    name: string;
    clients: number;
    totalToPay: number;
    totalPaid: number;
    balance: number;
  }>;
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
    travelers: 0,
    fullyPaidClients: 0,
    clientsList: [],
    fullyPaidClientsList: [],
    incomeList: [],
    expenditureList: [],
    contributionsPaidList: [],
    packageSummaries: []
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
        contactsRes,
        clientPaymentsRes
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: false }),
        supabase.from('income').select('amount'),
        supabase.from('expenditure').select('amount'),
        supabase.from('payments').select('client_id,total,discount,status'),
        supabase.from('contributions').select('id, first_name, second_name, contribution, total'),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id, first_name, second_name, package_id, discount_amount, additional_amount, balance, paid_amount, packages(name, price)')
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (incomeRes.error) throw incomeRes.error;
      if (expenditureRes.error) throw expenditureRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (contributionsRes.error) throw contributionsRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (clientPaymentsRes.error) throw clientPaymentsRes.error;

      const bookings = bookingsRes.data || [];
      const payments = paymentsRes.data || [];
      const contributions = contributionsRes.data || [];
      const incomeRows = incomeRes.data || [];
      const expenditureRows = expenditureRes.data || [];
      const clientsWithPackageData = clientPaymentsRes.data || [];

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
      const contributionsPaidList = (contributions || []).map((c: any) => {
        const arr = Array.isArray(c.contribution) ? c.contribution : [];
        const paid = arr.reduce((s: number, item: any) => s + (item.amount || 0), 0);
        contributionsPaidAll += paid;
        const contributorName = [c.first_name, c.second_name].filter(Boolean).join(' ').trim();
        return {
          id: c.id,
          name: contributorName || 'Unnamed contribution',
          paid,
          total: Number(c.total || 0),
          balance: Number(c.total || 0) - paid,
        };
      }).filter((item) => item.paid > 0);

      const totalClientRows = (clientsWithPackageData as any[]).map((client: any) => {
        const packagePrice = Number(client.packages?.price || 0);
        const discountAmount = Number(client.discount_amount || 0);
        const additionalAmount = Number(client.additional_amount || 0);
        const packageTotal = calculateClientPackageTotal(packagePrice, discountAmount, additionalAmount);
        const fallbackPaid = payments
          .filter((payment: any) => payment.client_id === client.id)
          .reduce((sum: number, payment: any) => sum + ((payment.total ?? payment.amount ?? 0) - (payment.discount ?? 0)), 0);
        const totalPaid = Number(client.paid_amount ?? fallbackPaid ?? 0);
        const balance = typeof client.balance === 'number'
          ? Number(client.balance)
          : Math.max(packageTotal - totalPaid, 0);

        return {
          package_name: client.packages?.name || 'Unassigned',
          client_name: [client.first_name, client.second_name].filter(Boolean).join(' ') || 'Unnamed client',
          package_total: packageTotal,
          paid: totalPaid,
          balance,
        };
      });

      const fullyPaidClients = totalClientRows.filter((row: any) => Number(row.balance || 0) <= 0).length;
      const fullyPaidClientsList = totalClientRows.filter((row: any) => Number(row.balance || 0) <= 0).map((row) => ({
        id: row.client_name,
        name: row.client_name,
        packageName: row.package_name,
        balance: Number(row.balance || 0),
      }));
      const clientsList = totalClientRows.map((row) => ({
        id: row.client_name,
        name: row.client_name,
        packageName: row.package_name,
        balance: Number(row.balance || 0),
        paid: Number(row.paid || 0),
        packageTotal: Number(row.package_total || 0),
      }));
      const incomeList = (incomeRows || []).map((row: any) => ({
        id: row.id,
        description: row.description || 'Income entry',
        amount: Number(row.amount || 0),
        date: row.date || row.created_at || null,
      }));
      const expenditureList = (expenditureRows || []).map((row: any) => ({
        id: row.id,
        description: row.description || 'Expenditure entry',
        amount: Number(row.amount || 0),
        date: row.date || row.created_at || null,
      }));

      setStats({
        clients: clientsRes.count || 0,
        bookings: bookings.length,
        bookingsPending: bookings.filter((b: any) => (b.booking_status || '').toLowerCase() === 'pending').length,
        bookingsConfirmed: bookings.filter((b: any) => (b.booking_status || '').toLowerCase() === 'confirmed').length,
        bookingsCompleted: bookings.filter((b: any) => (b.booking_status || '').toLowerCase() === 'completed').length,
        bookingsCancelled: bookings.filter((b: any) => (b.booking_status || '').toLowerCase() === 'cancelled').length,
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
        travelers,
        fullyPaidClients,
        clientsList,
        fullyPaidClientsList,
        incomeList,
        expenditureList,
        contributionsPaidList,
        packageSummaries: summarizePackagePayments(totalClientRows)
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

  const StatCard = ({ title, value, icon, hint, valueClass, details, emptyText, detailTitle, renderDetail }: { title: string; value: string | number; icon: any; hint?: string; valueClass?: string; details?: any[]; emptyText?: string; detailTitle?: string; renderDetail?: (item: any) => React.ReactNode }) => {
    const [open, setOpen] = useState(false);

    return (
      <div className="relative">
        <Card className="h-full transition-all duration-200 hover:shadow-lg">
          <div className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  {icon}
                  <span className="truncate">{title}</span>
                </CardTitle>
                {details && (
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className={`text-lg sm:text-xl md:text-2xl font-semibold truncate ${valueClass || ''}`}>
                {value}
              </p>
              {hint && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{hint}</p>}
            </CardContent>
          </div>
        </Card>

        {open && details && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl shadow-2xl">
              <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-full border bg-background p-2 text-muted-foreground transition hover:text-primary">
                <X className="h-4 w-4" />
              </button>
              <CardHeader className="pb-2 pr-12">
                <CardTitle className="text-sm">{detailTitle || title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 overflow-y-auto max-h-[70vh]">
                {details.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{emptyText || 'No items available.'}</p>
                ) : (
                  details.map((item, index) => (
                    <div key={item.id ?? index} className="rounded-md border bg-muted/30 p-3 text-sm">
                      {renderDetail ? renderDetail(item) : <span>{String(item)}</span>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout title="Business Summary" description="Overall business performance at a glance">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-6">
        <StatCard 
          title="Clients" 
          value={stats.clients} 
          icon={<Users className="h-4 w-4" />} 
          details={stats.clientsList}
          detailTitle="Client list"
          emptyText="No clients available."
          renderDetail={(item) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.packageName}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Paid UGX {Number(item.paid || 0).toLocaleString()} • Balance UGX {Number(item.balance || 0).toLocaleString()}
              </div>
            </div>
          )}
        />
        <StatCard 
          title="Fully Paid Clients" 
          value={stats.fullyPaidClients} 
          icon={<CircleCheckBig className="h-4 w-4" />} 
          details={stats.fullyPaidClientsList}
          detailTitle="Fully paid clients"
          emptyText="No fully paid clients yet."
          renderDetail={(item) => (
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.packageName}</span>
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6">
        <StatCard 
          title="Income" 
          value={`UGX ${stats.income.toLocaleString()}`} 
          icon={<ArrowUpCircle className="h-4 w-4" />} 
          details={stats.incomeList}
          detailTitle="Income entries"
          emptyText="No income entries recorded."
          renderDetail={(item) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.description}</span>
                <span className="text-xs text-muted-foreground">{item.date ? new Date(item.date).toLocaleDateString() : '—'}</span>
              </div>
              <span className="text-xs text-muted-foreground">UGX {Number(item.amount || 0).toLocaleString()}</span>
            </div>
          )}
        />
        <StatCard 
          title="Expenditure" 
          value={`UGX ${stats.expenditure.toLocaleString()}`} 
          icon={<ArrowDownCircle className="h-4 w-4" />} 
          details={stats.expenditureList}
          detailTitle="Expenditure entries"
          emptyText="No expenditure entries recorded."
          renderDetail={(item) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.description}</span>
                <span className="text-xs text-muted-foreground">{item.date ? new Date(item.date).toLocaleDateString() : '—'}</span>
              </div>
              <span className="text-xs text-muted-foreground">UGX {Number(item.amount || 0).toLocaleString()}</span>
            </div>
          )}
        />
        <StatCard 
          title="Net Profit" 
          value={`UGX ${stats.net.toLocaleString()}`} 
          icon={<TrendingUp className="h-4 w-4" />} 
          valueClass={stats.net < 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6">
        <StatCard 
          title="Contributions Expected" 
          value={`UGX ${stats.contributionsTotal.toLocaleString()}`} 
          icon={<Star className="h-4 w-4" />} 
        />
        <StatCard 
          title="Contributions Paid" 
          value={`UGX ${stats.contributionsPaid.toLocaleString()}`} 
          icon={<Wallet className="h-4 w-4" />} 
          details={stats.contributionsPaidList}
          detailTitle="Paid contributions"
          emptyText="No paid contributions recorded."
          renderDetail={(item) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">UGX {Number(item.paid || 0).toLocaleString()}</span>
              </div>
              <span className="text-xs text-muted-foreground">Total UGX {Number(item.total || 0).toLocaleString()} • Balance UGX {Number(item.balance || 0).toLocaleString()}</span>
            </div>
          )}
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
          <CardTitle>Package Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.packageSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No package payment data available.</p>
            ) : (
              stats.packageSummaries.map((item) => (
                <div key={item.name} className="rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.clients} client{item.clients === 1 ? '' : 's'}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">To Pay</p>
                        <p className="font-semibold">UGX {item.totalToPay.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paid</p>
                        <p className="font-semibold">UGX {item.totalPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Balance</p>
                        <p className={`font-semibold ${item.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          UGX {item.balance.toLocaleString()}
                        </p>
                      </div>
                    </div>
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
