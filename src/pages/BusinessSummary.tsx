// pages/admin/business-summary.tsx
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateClientPackageTotal, resolveClientPaymentTotals, summarizePackagePayments } from "@/lib/clientPricing";
import StatCard from "@/components/ui/StatCard";
import { 
  Users, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  TrendingUp,
  CircleCheckBig,
  Star,
  Package,
  Target,
  UserCheck,
  ShoppingBag
} from "lucide-react";

interface Stats {
  clients: number;
  bookings: number;
  bookingsPending: number;
  bookingsConfirmed: number;
  bookingsCompleted: number;
  bookingsCancelled: number;
  income: number;
  expenditure: number;
  net: number;
  paymentsTotal: number;
  paymentsDiscount: number;
  paymentsNet: number;
  paymentsOutstanding: number;
  contributionsTotal: number;
  contributionsPaid: number;
  contributionsBalance: number;
  contacts: number;
  travelers: number;
  confirmedTravelers: number;
  fullyPaidClients: number;
  clientsList: Array<{
    id: string;
    name: string;
    packageName: string;
    balance: number;
    paid: number;
    packageTotal: number;
    discountAmount: number;
    additionalAmount: number;
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
  paymentsList: Array<{
    id: string;
    clientName: string;
    amount: number;
    discount: number;
    net: number;
    date: string;
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
    discountAmount: number;
    additionalAmount: number;
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
    income: 0,
    expenditure: 0,
    net: 0,
    paymentsTotal: 0,
    paymentsDiscount: 0,
    paymentsNet: 0,
    paymentsOutstanding: 0,
    contributionsTotal: 0,
    contributionsPaid: 0,
    contributionsBalance: 0,
    contacts: 0,
    travelers: 0,
    confirmedTravelers: 0,
    fullyPaidClients: 0,
    clientsList: [],
    fullyPaidClientsList: [],
    incomeList: [],
    expenditureList: [],
    paymentsList: [],
    contributionsPaidList: [],
    packageSummaries: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
        clientPaymentsRes,
        packagesRes,
        clientsData
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: false }),
        supabase.from('income').select('id, description, amount, date, created_at'),
        supabase.from('expenditure').select('id, description, amount, date, created_at'),
        supabase.from('payments').select('*, clients(first_name, second_name)'),
        supabase.from('contributions').select('id, first_name, second_name, contribution, total'),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id, first_name, second_name, package_id, discount_amount, additional_amount, balance, paid_amount, packages(name, price)'),
        supabase.from('packages').select('id, price'),
        supabase.from('clients').select('id, first_name, second_name')
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (incomeRes.error) throw incomeRes.error;
      if (expenditureRes.error) throw expenditureRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (contributionsRes.error) throw contributionsRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (clientPaymentsRes.error) throw clientPaymentsRes.error;
      if (packagesRes.error) throw packagesRes.error;

      const bookings = bookingsRes.data || [];
      const payments = paymentsRes.data || [];
      const contributions = contributionsRes.data || [];
      const incomeRows = incomeRes.data || [];
      const expenditureRows = expenditureRes.data || [];
      const clientsWithPackageData = clientPaymentsRes.data || [];
      const packagesData = packagesRes.data || [];
      const clientsDataList = clientsData.data || [];

      // Create client name lookup
      const clientNameMap: Record<string, string> = {};
      clientsDataList.forEach((client: any) => {
        clientNameMap[client.id] = [client.first_name, client.second_name].filter(Boolean).join(' ').trim() || 'Unknown Client';
      });

      // Create package price lookup
      const packagePriceMap: Record<number, number> = {};
      packagesData.forEach((pkg: any) => {
        packagePriceMap[pkg.id] = Number(pkg.price || 0);
      });

      // Get confirmed bookings only
      const confirmedBookings = bookings.filter(
        (b: any) => (b.booking_status || '').toLowerCase() === 'confirmed' ||
          (b.booking_status || '').toLowerCase() === 'completed'
      );

      const totalTravelers = bookings.reduce((sum: number, b: any) => sum + (b.travelers_no || 0), 0);
      const confirmedTravelers = confirmedBookings.reduce((sum: number, b: any) => sum + (b.travelers_no || 0), 0);

      const incomeTotal = incomeRows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const expenditureTotal = expenditureRows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

      // Payments calculations
      let paymentsTotal = 0;
      let paymentsDiscountTotal = 0;
      let paymentsNetTotal = 0;
      const paymentsList: any[] = [];

      payments.forEach((p: any) => {
        const total = p.total || 0;
        const discount = p.discount || 0;
        const net = total - discount;
        paymentsTotal += total;
        paymentsDiscountTotal += discount;
        paymentsNetTotal += net;

        const clientName = clientNameMap[p.client_id] || 'Unknown Client';
        paymentsList.push({
          id: p.id,
          clientName: clientName,
          amount: total,
          discount: discount,
          net: net,
          date: p.created_at || new Date().toISOString(),
        });
      });

      // Sort payments by date (newest first)
      paymentsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Contributions calculations
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

      // Process clients with discount and additional amounts
      const totalClientRows = (clientsWithPackageData as any[]).map((client: any) => {
        const packagePrice = Number(client.packages?.price || 0);
        const discountAmount = Number(client.discount_amount || 0);
        const additionalAmount = Number(client.additional_amount || 0);
        const packageTotal = calculateClientPackageTotal(packagePrice, discountAmount, additionalAmount);
        const fallbackPaid = payments
          .filter((payment: any) => payment.client_id === client.id)
          .reduce((sum: number, payment: any) => sum + ((payment.total ?? payment.amount ?? 0) - (payment.discount ?? 0)), 0);
        const { totalPaid, balance } = resolveClientPaymentTotals({
          packageTotal,
          paidAmount: client.paid_amount,
          fallbackPaid,
          balance: client.balance,
        });

        return {
          package_name: client.packages?.name || 'Unassigned',
          client_name: [client.first_name, client.second_name].filter(Boolean).join(' ') || 'Unnamed client',
          package_total: packageTotal,
          paid: totalPaid,
          balance,
          discount_amount: discountAmount,
          additional_amount: additionalAmount,
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
        discountAmount: Number(row.discount_amount || 0),
        additionalAmount: Number(row.additional_amount || 0),
      }));
      const incomeList = (incomeRows || []).map((row: any) => ({
        id: row.id,
        description: row.description || 'Income entry',
        amount: Number(row.amount || 0),
        date: row.date || row.created_at || null,
      })).filter((row) => Boolean(row.description));
      const expenditureList = (expenditureRows || []).map((row: any) => ({
        id: row.id,
        description: row.description || 'Expenditure entry',
        amount: Number(row.amount || 0),
        date: row.date || row.created_at || null,
      })).filter((row) => Boolean(row.description));

      // Package summaries with discounts and additional amounts
      const packageSummaries = summarizePackagePayments(totalClientRows).map((summary: any) => {
        const packageClients = totalClientRows.filter((row: any) => row.package_name === summary.name);
        const totalDiscount = packageClients.reduce((sum: number, row: any) => sum + (row.discount_amount || 0), 0);
        const totalAdditional = packageClients.reduce((sum: number, row: any) => sum + (row.additional_amount || 0), 0);

        return {
          ...summary,
          discountAmount: totalDiscount,
          additionalAmount: totalAdditional,
        };
      });

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
        paymentsTotal: paymentsTotal,
        paymentsDiscount: paymentsDiscountTotal,
        paymentsNet: paymentsNetTotal,
        paymentsOutstanding: paymentsNetTotal - contributionsPaidAll,
        contributionsTotal: contributionsTotalAll,
        contributionsPaid: contributionsPaidAll,
        contributionsBalance: contributionsTotalAll - contributionsPaidAll,
        contacts: contactsRes.count || 0,
        travelers: totalTravelers,
        confirmedTravelers: confirmedTravelers,
        fullyPaidClients,
        clientsList,
        fullyPaidClientsList,
        incomeList,
        expenditureList,
        paymentsList,
        contributionsPaidList,
        packageSummaries
      });
      setLastUpdated(new Date());
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

  // Detail renderers
  const renderClientDetail = (item: any, index: number) => (
    <div className="flex justify-between items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          <Badge variant="outline" className="text-[10px] h-5">
            {item.packageName}
          </Badge>
          {item.discountAmount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              -UGX {item.discountAmount.toLocaleString()}
            </Badge>
          )}
          {item.additionalAmount > 0 && (
            <Badge variant="default" className="text-[10px] h-5 bg-blue-500">
              +UGX {item.additionalAmount.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${item.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          UGX {item.balance.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground">Balance</p>
      </div>
    </div>
  );

  const renderFullyPaidDetail = (item: any) => (
    <div className="flex justify-between items-center">
      <div>
        <span className="font-medium">{item.name}</span>
        <p className="text-xs text-muted-foreground">{item.packageName}</p>
      </div>
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CircleCheckBig className="h-3 w-3 mr-1" />
        Fully Paid
      </Badge>
    </div>
  );

  const renderIncomeDetail = (item: any) => (
    <div className="flex justify-between items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground">
          {item.date ? new Date(item.date).toLocaleDateString('en-UG', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : '—'}
        </p>
      </div>
      <span className="font-semibold text-green-600 dark:text-green-400 shrink-0">
        +UGX {item.amount.toLocaleString()}
      </span>
    </div>
  );

  const renderExpenditureDetail = (item: any) => (
    <div className="flex justify-between items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground">
          {item.date ? new Date(item.date).toLocaleDateString('en-UG', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : '—'}
        </p>
      </div>
      <span className="font-semibold text-red-600 dark:text-red-400 shrink-0">
        -UGX {item.amount.toLocaleString()}
      </span>
    </div>
  );

  const renderContributionDetail = (item: any) => (
    <div className="flex justify-between items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          Total: UGX {item.total.toLocaleString()}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          UGX {item.paid.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">Paid</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout title="Business Summary" description="Overall business performance at a glance">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Loading business summary...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Business Summary" description="Overall business performance at a glance">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <CardContent className="py-6 text-center text-red-600 dark:text-red-400">
            <div className="text-4xl mb-3">⚠️</div>
            {error}
            <button
              onClick={fetchStats}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Business Summary" description="Overall business performance at a glance">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 bg-primary rounded-full" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Key Metrics
          </h2>
        </div>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Key Metrics Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Clients"
          value={stats.clients}
          icon={<Users className="h-5 w-5" />}
          color="primary"
          details={stats.clientsList}
          detailTitle="All Clients"
          renderDetail={renderClientDetail}
          viewButtonText="View"
        />

        <StatCard
          title="Fully Paid"
          value={stats.fullyPaidClients}
          icon={<CircleCheckBig className="h-5 w-5" />}
          color="green"
          hint={`${stats.clients > 0 ? Math.round((stats.fullyPaidClients / stats.clients) * 100) : 0}% of clients`}
          details={stats.fullyPaidClientsList}
          detailTitle="Fully Paid Clients"
          renderDetail={renderFullyPaidDetail}
          viewButtonText="View"
        />
      </div>

      {/* Financial Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-1 w-12 bg-primary rounded-full" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Financial Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            title="Total Income"
            value={stats.income}
            icon={<ArrowUpCircle className="h-5 w-5" />}
            color="green"
            valuePrefix="UGX "
            valueClass="text-green-600 dark:text-green-400"
            details={stats.incomeList}
            detailTitle="Income Transactions"
            renderDetail={renderIncomeDetail}
            viewButtonText="View"
          />

          <StatCard
            title="Total Expenditure"
            value={stats.expenditure}
            icon={<ArrowDownCircle className="h-5 w-5" />}
            color="rose"
            valuePrefix="UGX "
            valueClass="text-red-600 dark:text-red-400"
            details={stats.expenditureList}
            detailTitle="Expenditure Transactions"
            renderDetail={renderExpenditureDetail}
            viewButtonText="View"
          />

          <StatCard
            title="Net Profit"
            value={stats.net}
            icon={<TrendingUp className="h-5 w-5" />}
            color={stats.net >= 0 ? "green" : "red"}
            valuePrefix="UGX "
            valueClass={stats.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
            hint={stats.net >= 0 ? "Profit" : "Loss"}
          />
        </div>
      </div>

      {/* Contributions Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-1 w-12 bg-primary rounded-full" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Contributions
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            title="Contributions Total"
            value={stats.contributionsTotal}
            icon={<Star className="h-5 w-5" />}
            color="primary"
            valuePrefix="UGX "
          />

          <StatCard
            title="Contributions Paid"
            value={stats.contributionsPaid}
            icon={<Wallet className="h-5 w-5" />}
            color="green"
            valuePrefix="UGX "
            details={stats.contributionsPaidList}
            detailTitle="Contributions Paid"
            renderDetail={renderContributionDetail}
            viewButtonText="View"
          />

          <StatCard
            title="Contributions Balance"
            value={stats.contributionsBalance}
            icon={<Target className="h-5 w-5" />}
            color={stats.contributionsBalance > 0 ? "red" : "green"}
            valuePrefix="UGX "
            valueClass={stats.contributionsBalance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
          />
        </div>
      </div>

      {/* Package Summary Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-1 w-12 bg-primary rounded-full" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Package Performance
          </h2>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            {stats.packageSummaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-muted-foreground">No package data available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.packageSummaries.map((item, index) => {
                  const percentagePaid = item.totalToPay > 0 ? (item.totalPaid / item.totalToPay) * 100 : 0;
                  const hasDiscount = item.discountAmount > 0;
                  const hasAdditional = item.additionalAmount > 0;

                  return (
                    <div
                      key={index}
                      className="rounded-xl border p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-lg flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-primary" />
                            {item.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.clients} client{item.clients !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            percentagePaid >= 100
                              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : percentagePaid >= 70
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-gray-50 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400"
                          }
                        >
                          {percentagePaid >= 100 ? (
                            <CircleCheckBig className="h-3 w-3 mr-1" />
                          ) : null}
                          {percentagePaid >= 100 ? "Complete" : `${Math.round(percentagePaid)}%`}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total to Pay</span>
                          <span className="font-medium">UGX {item.totalToPay.toLocaleString()}</span>
                        </div>

                        {hasDiscount && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Discounts</span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              -UGX {item.discountAmount.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {hasAdditional && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Additional Amounts</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              +UGX {item.additionalAmount.toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Paid</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            UGX {item.totalPaid.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-muted-foreground">Remaining Balance</span>
                          <span
                            className={`font-semibold ${
                              item.balance > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}
                          >
                            UGX {item.balance.toLocaleString()}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                          <div
                            className={
                              `h-full rounded-full transition-all duration-500 ${
                                percentagePaid >= 100
                                  ? "bg-green-500"
                                  : percentagePaid >= 70
                                  ? "bg-amber-500"
                                  : "bg-primary"
                              }`
                            }
                            style={{ width: `${Math.min(percentagePaid, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}