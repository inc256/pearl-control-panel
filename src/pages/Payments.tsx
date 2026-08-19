import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { 
  Eye, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Wallet, 
  CreditCard, 
  Banknote,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { calculateClientPackageTotal } from "@/lib/clientPricing";

type Payment = Tables<'payments'>;
type Client = Tables<'clients'>;

interface PaymentWithDetails extends Payment {
  client_name?: string | null;
  client_app_id?: string | null;
  client_national_id?: string | null;
  client_balance?: number | null;
  package_name?: string | null;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [newPayment, setNewPayment] = useState({
    client_id: '',
    amount: '',
    date: '',
    plan: '',
    account_no: '',
    notes: ''
  });

  useEffect(() => {
    document.title = "Payments — Pearl Hijja Admin";
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const normalizedPayments = (paymentsData || []).map((payment: any) => ({
        ...payment,
        client_name: payment.client_id ? `Client ${payment.client_id}` : 'Unknown client',
        client_app_id: null,
        client_national_id: null,
        client_balance: null,
        package_name: null,
      }));
      
      setPayments(normalizedPayments as PaymentWithDetails[]);

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('first_name', { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newPayment.client_id) {
        setError('Please select a client');
        return;
      }

      if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
        setError('Amount is required and must be greater than 0');
        return;
      }

      const amount = parseFloat(newPayment.amount);
      const discount = 0;
      const netAmount = amount;

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          *,
          packages (
            price
          )
        `)
        .eq('id', newPayment.client_id)
        .single();

      if (clientError) throw clientError;

      const { data: existingPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', newPayment.client_id);

      if (paymentsError) throw paymentsError;

      const totalPaidSoFar = (existingPayments || []).reduce((sum, p) => {
        return sum + ((p.total || 0) - (p.discount || 0));
      }, 0) + netAmount;

      const packagePrice = clientData.packages?.price || 0;
      const discountAmount = Number((clientData as any).discount_amount || 0);
      const additionalAmount = Number((clientData as any).additional_amount || 0);
      const packageTotal = calculateClientPackageTotal(packagePrice, discountAmount, additionalAmount);
      const newBalance = packageTotal - totalPaidSoFar;

      const paymentHistory = [
        ...((existingPayments || []).map(p => ({
          date: p.booking_date || p.created_at,
          amount: p.total || 0,
          discount: p.discount || 0,
          notes: p.payment_history?.[0]?.notes || ''
        }))),
        {
          date: newPayment.date || new Date().toISOString().split('T')[0],
          amount: amount,
          discount: discount,
          notes: newPayment.notes || ''
        }
      ];

      const paymentData = {
        client_id: newPayment.client_id,
        plan: newPayment.plan || 'Cash',
        total: amount,
        discount: discount,
        account_no: newPayment.account_no || null,
        payment_history: paymentHistory,
        status: {
          status: newBalance <= 0 ? 'Paid' : newBalance < packageTotal ? 'Partially Paid' : 'Pending',
          notes: newPayment.notes || ''
        },
        payment_plan: {
          plan: newPayment.plan || 'Cash',
          installments: []
        }
      };

      const { error: insertError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          balance: newBalance,
          paid_amount: totalPaidSoFar
        })
        .eq('id', newPayment.client_id);

      if (updateError) throw updateError;

      setNewPayment({
        client_id: '',
        amount: '',
        date: '',
        plan: '',
        account_no: '',
        notes: ''
      });
      setError(null);
      await fetchData();

    } catch (error) {
      console.error('Error saving payment:', error);
      setError('Failed to save payment. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    
    try {
      const { data: paymentData, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      const { data: remainingPayments, error: remainingError } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', paymentData.client_id);

      if (remainingError) throw remainingError;

      const totalPaid = (remainingPayments || []).reduce((sum, p) => {
        return sum + ((p.total || 0) - (p.discount || 0));
      }, 0);

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*, packages(price)')
        .eq('id', paymentData.client_id)
        .single();

      if (clientError) throw clientError;

      const packagePrice = clientData.packages?.price || 0;
      const newBalance = packagePrice - totalPaid;

      await supabase
        .from('clients')
        .update({
          balance: newBalance,
          paid_amount: totalPaid
        })
        .eq('id', paymentData.client_id);

      await fetchData();
    } catch (error) {
      console.error('Error deleting payment:', error);
      setError('Failed to delete payment. Please try again.');
    }
  };

  const handleViewDetails = (payment: PaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: any) => {
    const statusText = status?.status || 'Pending';
    const configs: { [key: string]: { color: string; icon: JSX.Element } } = {
      'Paid': { 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <CheckCircle className="h-3 w-3" />
      },
      'Partially Paid': { 
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock className="h-3 w-3" />
      },
      'Pending': { 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertCircle className="h-3 w-3" />
      },
      'Not Ready': { 
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <XCircle className="h-3 w-3" />
      }
    };
    const config = configs[statusText] || configs['Pending'];
    return (
      <Badge className={`inline-flex items-center gap-1 text-[10px] sm:text-xs ${config.color} border`}>
        {config.icon}
        <span className="hidden sm:inline">{statusText}</span>
        <span className="sm:hidden">{statusText.substring(0, 3)}</span>
      </Badge>
    );
  };

  const getPlanIcon = (plan: string | null) => {
    switch (plan) {
      case 'Cash': return <Banknote className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'Bank': return <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'Installments': return <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />;
      default: return <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    const status = payment.status?.status || 'Pending';
    return status === filter;
  }).filter(payment => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const clientName = `${payment.client_name || ''}`.toLowerCase();
    const appId = `${payment.client_app_id || ''}`.toLowerCase();
    return clientName.includes(search) || appId.includes(search);
  });

  // Stats
  const totalPayments = payments.length;
  const totalAmount = payments.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalDiscount = payments.reduce((sum, p) => sum + (p.discount || 0), 0);
  const totalNet = payments.reduce((sum, p) => sum + ((p.total || 0) - (p.discount || 0)), 0);

  if (loading) {
    return (
      <AdminLayout title="Payments" description="Track payments, installment schedules, and balances">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Loading payments...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Payments" description="Track payments, installment schedules, and balances">
      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center justify-between text-sm sm:text-base">
          <span className="flex-1">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-sm underline hover:no-underline flex items-center gap-1 ml-2 shrink-0"
          >
            <X className="h-4 w-4" /> Dismiss
          </button>
        </div>
      )}

      {/* Create Payment Form */}
      <Card className="mb-4 sm:mb-6 border-0 shadow-sm">
        <CardHeader className="p-4 sm:p-6 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Create Payment Record
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {clients.length} clients available
              </p>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Choose Client <span className="text-red-500">*</span></Label>
                <Select 
                  value={newPayment.client_id}
                  onValueChange={(value) => setNewPayment({...newPayment, client_id: value})}
                  required
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <SelectItem value="no-clients" disabled>
                        No clients available
                      </SelectItem>
                    ) : (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.second_name || ''} 
                          {client.app_id && ` (${client.app_id})`}
                          {client.balance !== undefined && ` - Balance: UGX ${client.balance.toLocaleString()}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Payment Date <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  className="h-9 sm:h-10 text-sm"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Amount (UGX) <span className="text-red-500">*</span></Label>
                <Input 
                  type="number" 
                  className="h-9 sm:h-10 text-sm"
                  placeholder="0" 
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                  required
                  min="1"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Payment Plan <span className="text-red-500">*</span></Label>
                <Select 
                  value={newPayment.plan}
                  onValueChange={(value) => setNewPayment({...newPayment, plan: value})}
                  required
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="Installments">Installments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Account Number</Label>
                <Input 
                  className="h-9 sm:h-10 text-sm"
                  placeholder="AC-1001" 
                  value={newPayment.account_no}
                  onChange={(e) => setNewPayment({...newPayment, account_no: e.target.value})}
                />
              </div>
              
              <div className="flex items-end sm:col-span-2 lg:col-span-3">
                <Button type="submit" className="w-full h-9 sm:h-10 text-sm sm:text-base">
                  <Plus className="h-4 w-4 mr-2" />
                  Save Payment
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Payment Ledger */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="p-4 sm:p-6 border-b">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Payment Ledger
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-sm w-full sm:w-48"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                      type="button"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-9 px-3 sm:hidden"
                  type="button"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Filters
                  {showFilters ? <ChevronUp className="h-3 w-3 ml-2" /> : <ChevronDown className="h-3 w-3 ml-2" />}
                </Button>
              </div>
            </div>
            
            {/* Filters */}
            <div className={`flex flex-col sm:flex-row gap-2 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-36">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Not Ready">Not Ready</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData} size="sm" className="h-9 w-full sm:w-auto text-sm">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">💳</div>
              <p className="text-muted-foreground text-sm sm:text-base">No payments found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Client</TableHead>
                      <TableHead className="font-semibold text-xs hidden md:table-cell">App ID</TableHead>
                      <TableHead className="font-semibold text-xs hidden sm:table-cell">Plan</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-xs text-right hidden md:table-cell">Discount</TableHead>
                      <TableHead className="font-semibold text-xs text-right hidden lg:table-cell">Net</TableHead>
                      <TableHead className="font-semibold text-xs text-right hidden xl:table-cell">Balance</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-sm truncate max-w-[120px]">
                              {payment.client_name || 'Unknown client'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {payment.client_app_id ? (
                            <Badge variant="outline" className="font-mono bg-blue-50 border-blue-200 text-[10px]">
                              {payment.client_app_id}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          <div className="flex items-center gap-2">
                            {getPlanIcon(payment.plan)}
                            <span className="hidden xs:inline">{payment.plan || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          UGX {(payment.total || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-600 hidden md:table-cell">
                          UGX {(payment.discount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium text-emerald-600 hidden lg:table-cell">
                          UGX {((payment.total || 0) - (payment.discount || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm hidden xl:table-cell">
                          <span className={payment.client_balance && payment.client_balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                            UGX {(payment.client_balance || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(payment)}
                              className="h-8 w-8 p-0"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(payment.id)}
                              className="h-8 w-8 p-0"
                              title="Delete payment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden divide-y divide-border">
                {filteredPayments.map((payment) => {
                  const isExpanded = expandedRows.has(payment.id);
                  return (
                    <div key={payment.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {payment.client_name || 'Unknown client'}
                            </span>
                            {payment.client_app_id && (
                              <Badge variant="outline" className="font-mono bg-blue-50 border-blue-200 text-[10px]">
                                {payment.client_app_id}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getPlanIcon(payment.plan)}
                              <span>{payment.plan || 'N/A'}</span>
                            </div>
                            {getStatusBadge(payment.status)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpand(payment.id)}
                          className="h-8 w-8 p-0 shrink-0 ml-2"
                          type="button"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {/* Always visible basic info */}
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="ml-1 font-mono font-medium">
                            UGX {(payment.total || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Discount:</span>
                          <span className="ml-1 font-mono text-red-600">
                            UGX {(payment.discount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Net:</span>
                          <span className="ml-1 font-mono text-emerald-600 font-medium">
                            UGX {((payment.total || 0) - (payment.discount || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Balance:</span>
                          <span className={`ml-1 font-mono ${payment.client_balance && payment.client_balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            UGX {(payment.client_balance || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          {payment.account_no && (
                            <div className="flex items-center gap-2 text-xs">
                              <CreditCard className="h-3 w-3 text-muted-foreground" />
                              <span>Account: {payment.account_no}</span>
                            </div>
                          )}
                          {payment.status?.notes && (
                            <div className="flex items-start gap-2 text-xs">
                              <FileText className="h-3 w-3 text-muted-foreground mt-0.5" />
                              <span className="text-muted-foreground">{payment.status.notes}</span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(payment)}
                              className="flex-1 h-8 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(payment.id)}
                              className="flex-1 h-8 text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Modal - Responsive */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              {/* Client Info */}
              <div className="bg-muted/30 p-3 sm:p-4 rounded-lg">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Client</p>
                    <p className="text-sm sm:text-base font-medium">
                      {selectedPayment.client_name || 'Unknown client'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">App ID</p>
                    <p className="text-xs sm:text-sm font-mono font-medium">
                      {selectedPayment.client_app_id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">National ID</p>
                    <p className="text-xs sm:text-sm">{selectedPayment.client_national_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Payment Plan</p>
                    <p className="text-xs sm:text-sm flex items-center gap-2">
                      {getPlanIcon(selectedPayment.plan)}
                      {selectedPayment.plan || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-emerald-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Total</p>
                  <p className="text-xs sm:text-sm font-bold text-emerald-600">
                    UGX {(selectedPayment.total || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-red-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Discount</p>
                  <p className="text-xs sm:text-sm font-bold text-red-600">
                    UGX {(selectedPayment.discount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Net Paid</p>
                  <p className="text-xs sm:text-sm font-bold text-blue-600">
                    UGX {((selectedPayment.total || 0) - (selectedPayment.discount || 0)).toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Balance</p>
                  <p className={`text-xs sm:text-sm font-bold ${selectedPayment.client_balance && selectedPayment.client_balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    UGX {(selectedPayment.client_balance || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-muted/30 p-3 sm:p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Account Number</p>
                    <p className="text-xs sm:text-sm font-mono">{selectedPayment.account_no || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                    <div>{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">Notes</p>
                    <p className="text-xs sm:text-sm">{selectedPayment.status?.notes || 'No notes'}</p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {selectedPayment.payment_history && selectedPayment.payment_history.length > 0 && (
                <div>
                  <h4 className="text-sm sm:text-base font-medium mb-2">Payment History</h4>
                  <div className="border rounded-lg overflow-hidden">
                    {/* Desktop Payment History */}
                    <div className="hidden sm:block overflow-x-auto">
                      <div className="min-w-full">
                        <div className="grid grid-cols-4 gap-4 bg-muted/50 p-3 text-xs sm:text-sm font-medium">
                          <div>Date</div>
                          <div className="text-right">Amount</div>
                          <div className="text-right">Discount</div>
                          <div className="text-right">Net</div>
                        </div>
                        {selectedPayment.payment_history.map((item: any, index: number) => (
                          <div key={index} className="grid grid-cols-4 gap-4 p-3 border-t text-xs sm:text-sm">
                            <div>{new Date(item.date).toLocaleDateString()}</div>
                            <div className="text-right font-mono">UGX {(item.amount || 0).toLocaleString()}</div>
                            <div className="text-right font-mono text-red-600">UGX {(item.discount || 0).toLocaleString()}</div>
                            <div className="text-right font-mono text-emerald-600">
                              UGX {((item.amount || 0) - (item.discount || 0)).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mobile Payment History */}
                    <div className="sm:hidden divide-y divide-border">
                      {selectedPayment.payment_history.map((item: any, index: number) => (
                        <div key={index} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-medium">
                                {new Date(item.date).toLocaleDateString()}
                              </p>
                              {item.notes && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{item.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-emerald-600">
                                UGX {((item.amount || 0) - (item.discount || 0)).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Amount: UGX {(item.amount || 0).toLocaleString()}
                              </p>
                              {item.discount > 0 && (
                                <p className="text-[10px] text-red-600">
                                  Discount: UGX {(item.discount || 0).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t-2 border-primary/20 bg-muted/20 p-3 sm:p-4">
                      {/* Mobile totals */}
                      <div className="sm:hidden space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Amount:</span>
                          <span className="font-mono font-semibold">
                            UGX {selectedPayment.payment_history.reduce((sum: number, p: any) => sum + (p.amount || 0), 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Discount:</span>
                          <span className="font-mono font-semibold text-red-600">
                            UGX {selectedPayment.payment_history.reduce((sum: number, p: any) => sum + (p.discount || 0), 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                          <span>Net Total:</span>
                          <span className="font-mono text-emerald-600">
                            UGX {selectedPayment.payment_history.reduce((sum: number, p: any) => sum + ((p.amount || 0) - (p.discount || 0)), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Desktop totals */}
                      <div className="hidden sm:grid grid-cols-4 gap-4 text-sm font-bold">
                        <div className="text-primary">Total</div>
                        <div className="text-right font-mono">
                          UGX {selectedPayment.payment_history.reduce((sum: number, p: any) => sum + (p.amount || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-right font-mono text-red-600">
                          UGX {selectedPayment.payment_history.reduce((sum: number, p: any) => sum + (p.discount || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-right font-mono text-emerald-600">
                          UGX {selectedPayment.payment_history.reduce((sum: number, p: any) => sum + ((p.amount || 0) - (p.discount || 0)), 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}