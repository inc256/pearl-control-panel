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
  X
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
  const [isMobile, setIsMobile] = useState(false);
  
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
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const getStatusBadge = (status: any) => {
    const statusText = status?.status || 'Pending';
    const configs: { [key: string]: { color: string; icon: JSX.Element } } = {
      'Paid': { 
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
      },
      'Partially Paid': { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
      },
      'Pending': { 
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
      },
      'Not Ready': { 
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
      }
    };
    const config = configs[statusText] || configs['Pending'];
    return (
      <Badge className={`inline-flex items-center gap-1 text-xs sm:text-sm ${config.color}`}>
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

  if (loading) {
    return (
      <AdminLayout title="Payments" description="Track payments, installment schedules, and balances">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading payments...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Payments" description="Track payments, installment schedules, and balances">
      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm sm:text-base">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Payment Form */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Create payment record</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {clients.length} clients available
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-sm">Choose client *</Label>
                <Select 
                  value={newPayment.client_id}
                  onValueChange={(value) => setNewPayment({...newPayment, client_id: value})}
                  required
                >
                  <SelectTrigger className="text-sm">
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
              <div className="space-y-1">
                <Label className="text-sm">Payment date *</Label>
                <Input 
                  type="date" 
                  className="text-sm"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Amount (UGX) *</Label>
                <Input 
                  type="number" 
                  className="text-sm"
                  placeholder="0" 
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                  required
                  min="1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Payment plan *</Label>
                <Select 
                  value={newPayment.plan}
                  onValueChange={(value) => setNewPayment({...newPayment, plan: value})}
                  required
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="Installments">Installments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Account number</Label>
                <Input 
                  className="text-sm"
                  placeholder="AC-1001" 
                  value={newPayment.account_no}
                  onChange={(e) => setNewPayment({...newPayment, account_no: e.target.value})}
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-3">
                <Button type="submit" className="w-full text-sm sm:text-base">
                  <Plus className="h-4 w-4 mr-2" />
                  Save payment
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Payment Ledger */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Payment ledger</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-48 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-36 text-sm">
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
              <Button variant="outline" onClick={fetchData} size="sm" className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {filteredPayments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No payments found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Client</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">App ID</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Plan</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Amount</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right hidden md:table-cell">Discount</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right hidden lg:table-cell">Net</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right hidden xl:table-cell">Balance</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50">
                      <TableCell className="text-xs sm:text-sm py-2 sm:py-3">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hidden xs:inline" />
                          <span className="font-medium truncate max-w-[60px] xs:max-w-[80px] sm:max-w-[120px] md:max-w-[150px]">
                            {payment.client_name || 'Unknown client'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                        {payment.client_app_id ? (
                          <Badge variant="outline" className="font-mono bg-blue-50 text-xs">
                            {payment.client_app_id}
                          </Badge>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {getPlanIcon(payment.plan)}
                          <span className="hidden xs:inline">{payment.plan || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right font-medium">
                        UGX {(payment.total || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right text-red-600 hidden md:table-cell">
                        UGX {(payment.discount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right font-medium text-green-600 hidden lg:table-cell">
                        UGX {((payment.total || 0) - (payment.discount || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right hidden xl:table-cell">
                        <span className={payment.clients?.balance && payment.clients.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          UGX {(payment.client_balance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => handleViewDetails(payment)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => handleDelete(payment.id)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              {/* Client Info */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
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
                <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Total</p>
                  <p className="text-xs sm:text-sm font-bold text-green-600">
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
                  <p className={`text-xs sm:text-sm font-bold ${selectedPayment.clients?.balance && selectedPayment.clients.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    UGX {(selectedPayment.client_balance || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
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
                  <div className="border rounded-lg overflow-x-auto">
                    <div className="min-w-[300px]">
                      <div className="grid grid-cols-4 gap-2 sm:gap-4 bg-gray-50 p-2 sm:p-3 text-[10px] sm:text-sm font-medium">
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Discount</div>
                        <div className="hidden xs:block">Notes</div>
                      </div>
                      {selectedPayment.payment_history.map((item: any, index: number) => (
                        <div key={index} className="grid grid-cols-4 gap-2 sm:gap-4 p-2 sm:p-3 border-t text-[10px] sm:text-sm">
                          <div>{new Date(item.date).toLocaleDateString()}</div>
                          <div>UGX {(item.amount || 0).toLocaleString()}</div>
                          <div className="text-red-600">UGX {(item.discount || 0).toLocaleString()}</div>
                          <div className="hidden xs:block text-muted-foreground truncate">{item.notes || '-'}</div>
                        </div>
                      ))}
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