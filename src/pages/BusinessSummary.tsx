// pages/admin/business-summary.tsx
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateClientPackageTotal, resolveClientPaymentTotals, summarizePackagePayments } from "@/lib/clientPricing";
import StatCard from "@/components/ui/StatCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DATA_CHANGED_EVENT, clearSessionCache, readSessionCache, writeSessionCache } from "@/lib/dataCache";
import { useAuth } from "@/auth/useAuth";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
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
  ShoppingBag,
  AlertCircle
} from "lucide-react";

const SUMMARY_CACHE_KEY = "pearl:business-summary";
const PACKAGE_CHART_COLORS = ["#5C0120", "#7D2945", "#9E526A", "#BF7B8F", "#D9AAB8", "#8A7B80"];

interface ContributorBirthday {
  id: string;
  name: string;
  dateOfBirth: string;
  nextBirthday: string;
  monthsUntil: number;
  daysUntil: number;
  countdownLabel: string;
}

const getBirthdayCountdown = (dateOfBirth: string, today = new Date()) => {
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let nextBirthday = new Date(currentDate.getFullYear(), month - 1, day);

  if (nextBirthday < currentDate) {
    nextBirthday = new Date(currentDate.getFullYear() + 1, month - 1, day);
  }

  let monthsUntil = (nextBirthday.getFullYear() - currentDate.getFullYear()) * 12
    + nextBirthday.getMonth() - currentDate.getMonth();
  if (nextBirthday.getDate() < currentDate.getDate()) {
    monthsUntil -= 1;
  }
  const monthAnchor = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthsUntil, currentDate.getDate());
  const daysUntil = Math.max(0, Math.round((nextBirthday.getTime() - monthAnchor.getTime()) / 86400000));

  return {
    nextBirthday,
    monthsUntil,
    daysUntil,
    countdownLabel: monthsUntil === 0 && daysUntil === 0
      ? 'Today'
      : `${monthsUntil} month${monthsUntil === 1 ? '' : 's'}, ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
  };
};

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
  contributorBirthdays: ContributorBirthday[];
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
  packageClientDetails: Array<{
    packageName: string;
    clientName: string;
    paid: number;
    balance: number;
  }>;
}

export const normalizeBusinessSummaryStats = (input: Partial<Stats> = {}): Stats => {
  const defaults: Stats = {
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
    contributorBirthdays: [],
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
    packageSummaries: [],
    packageClientDetails: [],
  };

  return {
    ...defaults,
    ...input,
    contributorBirthdays: Array.isArray(input.contributorBirthdays) ? input.contributorBirthdays : defaults.contributorBirthdays,
    clientsList: Array.isArray(input.clientsList) ? input.clientsList : defaults.clientsList,
    fullyPaidClientsList: Array.isArray(input.fullyPaidClientsList) ? input.fullyPaidClientsList : defaults.fullyPaidClientsList,
    incomeList: Array.isArray(input.incomeList) ? input.incomeList : defaults.incomeList,
    expenditureList: Array.isArray(input.expenditureList) ? input.expenditureList : defaults.expenditureList,
    paymentsList: Array.isArray(input.paymentsList) ? input.paymentsList : defaults.paymentsList,
    contributionsPaidList: Array.isArray(input.contributionsPaidList) ? input.contributionsPaidList : defaults.contributionsPaidList,
    packageSummaries: Array.isArray(input.packageSummaries) ? input.packageSummaries : defaults.packageSummaries,
    packageClientDetails: Array.isArray(input.packageClientDetails) ? input.packageClientDetails : defaults.packageClientDetails,
  };
};

export const normalizePackageName = (value: string | null | undefined) => {
  const trimmed = String(value ?? "Unassigned").trim();
  const cleaned = trimmed
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return cleaned || "unassigned";
};

export default function BusinessSummary() {
  const { roles } = useAuth();
  const canViewDetailedBusinessSummary = roles.some((role) => ["developer", "secretary", "admin", "business"].includes(role));

  useEffect(() => {
    document.title = "Business Summary — Pearl Hijja Admin";
  }, []);

  const [stats, setStats] = useState<Stats>(() => normalizeBusinessSummaryStats());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedMonthTab, setSelectedMonthTab] = useState<"income" | "expenditure">("income");

  const fetchStats = async (forceRefresh = false) => {
    const cachedStats = !forceRefresh ? readSessionCache<Stats>(SUMMARY_CACHE_KEY) : null;
    if (cachedStats) {
      const normalizedCachedStats = normalizeBusinessSummaryStats(cachedStats);
      setStats(normalizedCachedStats);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

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
        supabase.from('contributions').select('id, first_name, second_name, date_of_birth, contribution, total'),
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

      const contributorBirthdays = Array.from(
        new Map((contributions || [])
          .filter((c: any) => typeof c.date_of_birth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date_of_birth))
          .map((c: any) => {
            const name = [c.first_name, c.second_name].filter(Boolean).join(' ').trim() || 'Unnamed contributor';
            const birthday = getBirthdayCountdown(c.date_of_birth);
            return [name.toLowerCase(), {
              id: c.id,
              name,
              dateOfBirth: c.date_of_birth,
              nextBirthday: birthday.nextBirthday.toISOString(),
              monthsUntil: birthday.monthsUntil,
              daysUntil: birthday.daysUntil,
              countdownLabel: birthday.countdownLabel,
            } satisfies ContributorBirthday] as const;
          }))
      ).map(([, birthday]) => birthday)
        .sort((a, b) => {
          const aDate = new Date(a.nextBirthday).getTime();
          const bDate = new Date(b.nextBirthday).getTime();
          return aDate - bDate;
        });

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
        const cleanedName = String(summary.name ?? "Unassigned").trim() || "Unassigned";
        const packageClients = totalClientRows.filter((row: any) => normalizePackageName(row.package_name) === normalizePackageName(cleanedName));
        const totalDiscount = packageClients.reduce((sum: number, row: any) => sum + (row.discount_amount || 0), 0);
        const totalAdditional = packageClients.reduce((sum: number, row: any) => sum + (row.additional_amount || 0), 0);

        return {
          ...summary,
          name: cleanedName,
          discountAmount: totalDiscount,
          additionalAmount: totalAdditional,
        };
      });

      const packageClientDetails = totalClientRows.map((row: any) => ({
        packageName: String(row.package_name ?? "Unassigned").trim() || "Unassigned",
        clientName: row.client_name,
        paid: Number(row.paid || 0),
        balance: Number(row.balance || 0),
      }));

      const nextStats: Stats = {
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
        contributorBirthdays,
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
        packageSummaries,
        packageClientDetails
      };
      const normalizedNextStats = normalizeBusinessSummaryStats(nextStats);
      writeSessionCache(SUMMARY_CACHE_KEY, normalizedNextStats);
      setStats(normalizedNextStats);
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

  useEffect(() => {
    const handleDataChanged = () => {
      clearSessionCache(SUMMARY_CACHE_KEY);
      void fetchStats(true);
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
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
            <Badge variant="outline" className="text-[10px] h-5">
              +UGX {item.additionalAmount.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${item.balance > 0 ? 'text-destructive' : 'text-primary'}`}>
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
      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
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
      <span className="font-semibold text-primary shrink-0">
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
      <span className="font-semibold text-destructive shrink-0">
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
        <p className="text-sm font-medium text-primary">
          UGX {item.paid.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">Paid</p>
      </div>
    </div>
  );

  const renderContributorBirthdayDetail = (item: ContributorBirthday) => (
    <div className="flex justify-between items-center gap-4">
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          DOB: {new Date(`${item.dateOfBirth}T00:00:00`).toLocaleDateString('en-UG', {
            year: 'numeric', month: 'short', day: 'numeric'
          })}
        </p>
      </div>
      <Badge variant="outline" className="shrink-0 text-[10px]">
        {item.countdownLabel}
      </Badge>
    </div>
  );

  const formatCompactCurrency = (amount: number) => {
    const value = Number(amount || 0);
    if (Math.abs(value) >= 1000000) {
      const compactValue = (value / 1000000).toFixed(Math.abs(value) >= 10000000 ? 0 : 1).replace(/\.0$/, '');
      return `UGX ${compactValue}M`;
    }
    if (Math.abs(value) >= 1000) {
      const compactValue = (value / 1000).toFixed(Math.abs(value) >= 100000 ? 0 : 1).replace(/\.0$/, '');
      return `UGX ${compactValue}K`;
    }
    return `UGX ${Math.round(value).toLocaleString()}`;
  };

  const selectedPackageClients = useMemo(() => {
    if (!selectedPackageName) return [];
    const targetPackage = normalizePackageName(selectedPackageName);

    const directMatches = stats.packageClientDetails.filter((item) => normalizePackageName(item.packageName) === targetPackage);
    const clientListMatches = stats.clientsList
      .filter((item) => normalizePackageName(item.packageName) === targetPackage)
      .map((client) => ({
        packageName: client.packageName,
        clientName: client.name,
        paid: Number(client.paid || 0),
        balance: Number(client.balance || 0),
      }));

    const merged = [...directMatches, ...clientListMatches];
    const seen = new Set<string>();

    return merged.filter((client) => {
      const uniqueKey = `${client.packageName}|${client.clientName}`;
      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      return true;
    });
  }, [selectedPackageName, stats.clientsList, stats.packageClientDetails]);

  const monthlyFinancialData = useMemo(() => {
    const now = new Date();
    const monthMap = new Map<string, { monthKey: string; month: string; income: number; expenditure: number; net: number }>();

    for (let i = 11; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      monthMap.set(key, {
        monthKey: key,
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        income: 0,
        expenditure: 0,
        net: 0,
      });
    }

    stats.incomeList.forEach((entry) => {
      if (!entry.date) return;
      const date = new Date(entry.date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const monthEntry = monthMap.get(key);
      if (monthEntry) {
        monthEntry.income += Number(entry.amount || 0);
      }
    });

    stats.expenditureList.forEach((entry) => {
      if (!entry.date) return;
      const date = new Date(entry.date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const monthEntry = monthMap.get(key);
      if (monthEntry) {
        monthEntry.expenditure += Number(entry.amount || 0);
      }
    });

    return Array.from(monthMap.values())
      .map((entry) => ({
        ...entry,
        net: entry.income - entry.expenditure,
      }))
      .filter((entry) => entry.income > 0 || entry.expenditure > 0);
  }, [stats.incomeList, stats.expenditureList]);

  const selectedMonthEntries = useMemo(() => {
    if (!selectedMonthKey) return null;

    const [year, month] = selectedMonthKey.split('-').map(Number);
    const monthDate = new Date(year, month, 1);
    const monthLabel = monthDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const incomeEntries = stats.incomeList
      .filter((entry) => {
        if (!entry.date) return false;
        const date = new Date(entry.date);
        return !Number.isNaN(date.getTime())
          && date.getFullYear() === year
          && date.getMonth() === month;
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    const expenditureEntries = stats.expenditureList
      .filter((entry) => {
        if (!entry.date) return false;
        const date = new Date(entry.date);
        return !Number.isNaN(date.getTime())
          && date.getFullYear() === year
          && date.getMonth() === month;
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    return {
      monthLabel,
      incomeEntries,
      expenditureEntries,
    };
  }, [selectedMonthKey, stats.incomeList, stats.expenditureList]);

  useEffect(() => {
    if (selectedMonthKey) {
      setSelectedMonthTab("income");
    }
  }, [selectedMonthKey]);

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
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-6 text-center text-destructive">
            <div className="mb-3 flex justify-center"><AlertCircle className="h-8 w-8" /></div>
            {error}
            <button
              onClick={fetchStats}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-destructive/20 bg-background px-4 py-2 text-sm font-medium hover:bg-destructive/5 transition"
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
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <section className="rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/10 via-card to-card px-5 py-5 shadow-sm sm:px-7 sm:py-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pearl Hijja workspace</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Your operations, in clear view</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Clients, pilgrimage bookings, collections, and package progress brought together in one place.
              </p>
            </div>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString('en-UG', { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>
        </section>

        <section className="order-1">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-7 w-1 rounded-full bg-primary" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Key metrics</h3>
              <p className="text-xs text-muted-foreground">Client progress and payment completion</p>
            </div>
          </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            title="Total Clients"
            value={stats.clients}
            icon={<Users className="h-5 w-5" />}
            color="primary"
            className="border border-border bg-card shadow-sm"
            details={stats.clientsList}
            detailTitle="All Clients"
            renderDetail={renderClientDetail}
            viewButtonText="View"
          />

          <StatCard
            title="Fully Paid"
            value={stats.fullyPaidClients}
            icon={<CircleCheckBig className="h-5 w-5" />}
            color="primary"
            className="border border-border bg-card shadow-sm"
            hint={`${stats.clients > 0 ? Math.round((stats.fullyPaidClients / stats.clients) * 100) : 0}% of clients`}
            details={stats.fullyPaidClientsList}
            detailTitle="Fully Paid Clients"
            renderDetail={renderFullyPaidDetail}
            viewButtonText="View"
          />
        </div>
        </section>

      <section className="order-4">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-7 w-1 rounded-full bg-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Business activity</h3>
            <p className="text-xs text-muted-foreground">Monthly finances and client distribution across packages</p>
          </div>
        </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Financial activity by month
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer
              config={{
                income: { label: "Income", color: "#5C0120" },
                expenditure: { label: "Expenditure", color: "#9E526A" }
              }}
              className="w-full min-h-[260px] sm:min-h-[300px]"
            >
              <BarChart
                data={monthlyFinancialData}
                margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                barSize={18}
                onClick={(state: any) => {
                  const payload = state?.activePayload?.[0]?.payload ?? state?.payload;
                  const monthKey = payload?.monthKey;
                  if (monthKey) setSelectedMonthKey(monthKey);
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                <ChartTooltip
                  cursor={{ fill: "rgba(92, 1, 32, 0.06)" }}
                  content={<ChartTooltipContent formatter={(value) => [formatCompactCurrency(Number(value)), "Amount"]} />}
                />
                <Bar dataKey="income" radius={[6, 6, 0, 0]} fill="#5C0120" />
                <Bar dataKey="expenditure" radius={[6, 6, 0, 0]} fill="#9E526A" />
              </BarChart>
            </ChartContainer>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#5C0120]" />Income</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#9E526A]" />Expenditure</div>
            </div>
            {selectedMonthEntries ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => {
                setSelectedMonthKey(null);
                setSelectedMonthTab("income");
              }}>
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <Card
                  className="relative z-10 w-full max-w-3xl overflow-hidden border border-primary/10 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <CardHeader className="border-b bg-primary/5">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{selectedMonthEntries.monthLabel}</CardTitle>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonthKey(null);
                          setSelectedMonthTab("income");
                        }}
                        className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
                      >
                        Close
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="max-h-[75vh] overflow-y-auto p-4">
                    <div className="mb-4 flex rounded-lg bg-muted p-1">
                      {(["income", "expenditure"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setSelectedMonthTab(tab)}
                          className={cn(
                            "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                            selectedMonthTab === tab
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tab === "income" ? "Income" : "Expenditure"}
                        </button>
                      ))}
                    </div>

                    {selectedMonthTab === "income" ? (
                      selectedMonthEntries.incomeEntries.length > 0 ? (
                        <div className="space-y-2">
                          {selectedMonthEntries.incomeEntries.map((entry) => (
                            <div key={entry.id} className="rounded-md border border-border bg-background p-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-foreground truncate">{entry.description}</span>
                                <span className="shrink-0 font-semibold text-primary">+UGX {Number(entry.amount || 0).toLocaleString()}</span>
                              </div>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {entry.date ? new Date(entry.date).toLocaleDateString('en-UG', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                }) : '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No income entries for this month.</p>
                      )
                    ) : selectedMonthEntries.expenditureEntries.length > 0 ? (
                      <div className="space-y-2">
                        {selectedMonthEntries.expenditureEntries.map((entry) => (
                          <div key={entry.id} className="rounded-md border border-border bg-background p-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground truncate">{entry.description}</span>
                              <span className="shrink-0 font-semibold text-destructive">-UGX {Number(entry.amount || 0).toLocaleString()}</span>
                            </div>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {entry.date ? new Date(entry.date).toLocaleDateString('en-UG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }) : '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No expenditure entries for this month.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Click a month to see the income and expenditure items recorded in it.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {monthlyFinancialData.length > 0 ? `Latest net position: ${formatCompactCurrency(monthlyFinancialData[monthlyFinancialData.length - 1]?.net ?? 0)}.` : "No monthly data recorded yet."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              Clients by package
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.packageSummaries.length > 0 ? (
              <>
                <ChartContainer
                  config={{
                    clients: { label: "Clients", color: "#5C0120" }
                  }}
                  className="w-full min-h-[260px] sm:min-h-[300px]"
                >
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value, name) => [Number(value).toLocaleString(), String(name)]} />}
                    />
                    <Pie
                      data={stats.packageSummaries.filter((item) => item.clients > 0)}
                      dataKey="clients"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      onClick={(entry) => {
                        if (typeof entry.name === "string") setSelectedPackageName(entry.name);
                      }}
                      className="cursor-pointer"
                    >
                      {stats.packageSummaries.filter((item) => item.clients > 0).map((item, index) => (
                        <Cell key={item.name} fill={PACKAGE_CHART_COLORS[index % PACKAGE_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                  {stats.packageSummaries.filter((item) => item.clients > 0).map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PACKAGE_CHART_COLORS[index % PACKAGE_CHART_COLORS.length] }} />
                      {item.name}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {stats.packageSummaries.reduce((sum, item) => sum + item.clients, 0)} clients are distributed across the active package mix.
                </p>
              </>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No client-package distribution data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </section>

      {canViewDetailedBusinessSummary && (
        <>
          {/* Financial Section */}
          <section className="order-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-7 w-1 rounded-full bg-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Financial overview</h3>
                <p className="text-xs text-muted-foreground">Income, expenditure, and net position</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <StatCard
                title="Total Income"
                value={stats.income}
                icon={<ArrowUpCircle className="h-5 w-5" />}
                color="primary"
                valuePrefix="UGX "
                valueClass="text-primary"
                className="border border-border bg-card shadow-sm"
                details={stats.incomeList}
                detailTitle="Income Transactions"
                renderDetail={renderIncomeDetail}
                viewButtonText="View"
                sortable
                itemsPerPage={100}
                exportRows={stats.incomeList.map((item) => ({
                  Description: item.description,
                  Date: item.date ? new Date(item.date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
                  Amount: Number(item.amount || 0),
                }))}
                exportFilename="financial-overview-income"
                exportSheetName="Income"
              />

              <StatCard
                title="Total Expenditure"
                value={stats.expenditure}
                icon={<ArrowDownCircle className="h-5 w-5" />}
                color="primary"
                valuePrefix="UGX "
                valueClass="text-destructive"
                className="border border-border bg-card shadow-sm"
                details={stats.expenditureList}
                detailTitle="Expenditure Transactions"
                renderDetail={renderExpenditureDetail}
                viewButtonText="View"
                sortable
                itemsPerPage={100}
                exportRows={stats.expenditureList.map((item) => ({
                  Description: item.description,
                  Date: item.date ? new Date(item.date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
                  Amount: Number(item.amount || 0),
                }))}
                exportFilename="financial-overview-expenditure"
                exportSheetName="Expenditure"
              />

              <StatCard
                title="Net"
                value={stats.net}
                icon={<TrendingUp className="h-5 w-5" />}
                color="primary"
                valuePrefix="UGX "
                valueClass={stats.net >= 0 ? "text-primary" : "text-destructive"}
                className="border border-border bg-card shadow-sm"
                details={[]}
                detailTitle="Net Summary"
                viewButtonText="View"
              />
            </div>
          </section>
        </>
      )}

      {canViewDetailedBusinessSummary && (
        <>
          {/* Contributions Section */}
          <section className="order-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-7 w-1 rounded-full bg-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Contributions</h3>
                <p className="text-xs text-muted-foreground">Collected funds and remaining balance</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <StatCard
                title="Contributions Total"
                value={stats.contributionsTotal}
                icon={<Star className="h-5 w-5" />}
                color="primary"
                valuePrefix="UGX "
                className="border border-border bg-card shadow-sm"
              />

              <StatCard
                title="Contributions Paid"
                value={stats.contributionsPaid}
                icon={<Wallet className="h-5 w-5" />}
                color="primary"
                valuePrefix="UGX "
                className="border border-border bg-card shadow-sm"
                details={stats.contributionsPaidList}
                detailTitle="Contributions Paid"
                renderDetail={renderContributionDetail}
                viewButtonText="View"
              />

              <StatCard
                title="Contributions Balance"
                value={stats.contributionsBalance}
                icon={<Target className="h-5 w-5" />}
                color="primary"
                valuePrefix="UGX "
                valueClass={stats.contributionsBalance > 0 ? "text-destructive" : "text-primary"}
                className="border border-border bg-card shadow-sm"
              />
            </div>
          </section>
        </>
      )}

      {canViewDetailedBusinessSummary && (
        <>
          {/* Package Summary Section */}
          <section className="order-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-7 w-1 rounded-full bg-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Package performance</h3>
                <p className="text-xs text-muted-foreground">Progress, pricing, and collections by package</p>
              </div>
            </div>

            <Card className="border-border bg-card shadow-sm">
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
                      const balanceDue = Math.max(item.totalToPay - item.totalPaid, 0);
                      const hasDiscount = item.discountAmount > 0;
                      const hasAdditional = item.additionalAmount > 0;

                      return (
                        <div
                          key={index}
                          className="group w-full rounded-xl border border-border bg-background p-4 text-left shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md"
                        >
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 flex items-center gap-2 text-primary">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                  <ShoppingBag className="h-4 w-4" />
                                </div>
                                <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.clients} client{item.clients !== 1 ? 's' : ''}
                              </p>
                            </div>

                            <Badge
                              variant="outline"
                              className={
                                percentagePaid >= 100
                                  ? "border-primary/20 bg-primary/5 text-primary"
                                  : "border-border bg-muted text-muted-foreground"
                              }
                            >
                              {percentagePaid >= 100 ? (
                                <CircleCheckBig className="mr-1 h-3 w-3" />
                              ) : null}
                              {percentagePaid >= 100 ? "Complete" : `${Math.round(percentagePaid)}%`}
                            </Badge>
                          </div>

                          <div className="mb-4 rounded-xl bg-muted/40 p-3">
                            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              <span>Total package value</span>
                              <span>Target</span>
                            </div>
                            <p className="mt-2 text-xl font-bold text-foreground">UGX {item.totalToPay.toLocaleString()}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid</p>
                              <p className="mt-1 font-semibold text-primary">UGX {item.totalPaid.toLocaleString()}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Balance</p>
                              <p className="mt-1 font-semibold text-destructive">UGX {balanceDue.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            {hasDiscount && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Discounts</span>
                                <span className="font-medium text-destructive">
                                  -UGX {item.discountAmount.toLocaleString()}
                                </span>
                              </div>
                            )}

                            {hasAdditional && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Extras</span>
                                <span className="font-medium text-primary">
                                  +UGX {item.additionalAmount.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                              <span>Collection progress</span>
                              <span>{Math.round(percentagePaid)}%</span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
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
          </section>
        </>
      )}

      {selectedPackageName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPackageName(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <Card className="relative z-10 w-full max-w-2xl overflow-hidden border border-primary/10 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <CardHeader className="border-b bg-primary/5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{selectedPackageName} clients</CardTitle>
                <button
                  type="button"
                  onClick={() => setSelectedPackageName(null)}
                  className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
                >
                  Close
                </button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[75vh] overflow-y-auto p-4">
              {selectedPackageClients.length > 0 ? (
                <div className="space-y-2">
                  {selectedPackageClients.map((client) => (
                    <div key={client.clientName} className="rounded-md border border-border bg-background p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{client.clientName}</p>
                        <span className="font-semibold text-primary">
                          Paid: UGX {client.paid.toLocaleString()}
                        </span>
                      </div>
                      <p className={`mt-1 text-xs ${client.balance > 0 ? 'text-destructive' : 'text-primary'}`}>
                        Balance: UGX {client.balance.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No clients recorded for this package.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}