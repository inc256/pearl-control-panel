import ProtectedPage from "@/components/layout/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  Wallet, 
  Search,
  Users,
  Package,
  Phone,
  MapPin,
  IdCard,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Filter,
  ChevronDown,
  ChevronUp,
  Menu
} from "lucide-react";
import { calculateClientPackageTotal } from "@/lib/clientPricing";

type Client = Tables<'clients'>;
type Package = Tables<'packages'>;
type Payment = Tables<'payments'>;

interface ClientPackageSummary {
  name: string | null;
  type: string | null;
  price: number | null;
}

interface ClientWithDetails extends Client {
  packages?: ClientPackageSummary | ClientPackageSummary[] | null;
  payments?: Payment[];
  calculated_balance?: number;
  calculated_paid?: number;
  calculated_package_total?: number;
  phone?: string | null;
  notes?: string | null;
}

export default function Clients() {
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generatingAppId, setGeneratingAppId] = useState(false);
  const [selectedClientPayments, setSelectedClientPayments] = useState<Payment[]>([]);
  const [selectedClientName, setSelectedClientName] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientWithDetails | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPackage, setFilterPackage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [newClient, setNewClient] = useState({
    first_name: '',
    second_name: '',
    national_id: '',
    phone: '',
    notes: '',
    address: '',
    app_id: '',
    package_id: '',
    discount_amount: '0',
    additional_amount: '0',
    status: 'ready'
  });

  useEffect(() => {
    document.title = "Clients — Pearl Hijja Admin";

    const storedPrefill = localStorage.getItem('clients.prefill');
    if (storedPrefill) {
      try {
        const parsed = JSON.parse(storedPrefill);
        setNewClient(prev => ({
          ...prev,
          first_name: parsed.first_name ?? prev.first_name,
          second_name: parsed.second_name ?? prev.second_name,
          national_id: parsed.national_id ?? prev.national_id,
          phone: parsed.phone ?? prev.phone,
          notes: parsed.notes ?? prev.notes,
          address: parsed.address ?? prev.address,
          app_id: parsed.app_id ?? prev.app_id,
          package_id: parsed.package_id ?? prev.package_id,
          discount_amount: parsed.discount_amount ?? prev.discount_amount,
          additional_amount: parsed.additional_amount ?? prev.additional_amount,
          status: parsed.status ?? prev.status,
        }));
        setEditingId(null);
      } catch (error) {
        console.error('Failed to parse client prefill data:', error);
      } finally {
        localStorage.removeItem('clients.prefill');
      }
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          packages (
            name,
            type,
            price
          )
        `)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*');

      if (paymentsError) throw paymentsError;

      const clientsWithBalance = (clientsData || []).map(client => {
        const clientPayments = (paymentsData || []).filter(p => p.client_id === client.id);
        const totalPaid = clientPayments.reduce((sum, p) => sum + ((p.total || 0) - (p.discount || 0)), 0);
        const packageInfo = Array.isArray(client.packages) ? client.packages[0] : client.packages;
        const packagePrice = packageInfo?.price ?? 0;
        const discountAmount = Number((client as any).discount_amount || 0);
        const additionalAmount = Number((client as any).additional_amount || 0);
        const packageTotal = calculateClientPackageTotal(packagePrice, discountAmount, additionalAmount);
        const balance = packageTotal - totalPaid;
        
        return {
          ...client,
          payments: clientPayments,
          calculated_paid: totalPaid,
          calculated_balance: balance,
          calculated_package_total: packageTotal
        };
      });

      setClients(clientsWithBalance);

      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .order('name', { ascending: true });

      if (packagesError) throw packagesError;
      setPackages(packagesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAppId = async () => {
    try {
      setGeneratingAppId(true);
      
      const { data: latestClient, error } = await supabase
        .from('clients')
        .select('app_id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      
      if (latestClient && latestClient.length > 0 && latestClient[0].app_id) {
        const lastId = latestClient[0].app_id;
        const match = lastId.match(/APP-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const formattedNumber = String(nextNumber).padStart(3, '0');
      const newAppId = `APP-${formattedNumber}`;

      const { data: existing, error: checkError } = await supabase
        .from('clients')
        .select('app_id')
        .eq('app_id', newAppId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        let counter = nextNumber + 1;
        let found = false;
        
        while (!found && counter < 10000) {
          const testId = `APP-${String(counter).padStart(3, '0')}`;
          const { data: testExisting } = await supabase
            .from('clients')
            .select('app_id')
            .eq('app_id', testId)
            .maybeSingle();
          
          if (!testExisting) {
            setNewClient({...newClient, app_id: testId});
            found = true;
            break;
          }
          counter++;
        }
      } else {
        setNewClient({...newClient, app_id: newAppId});
      }
    } catch (error) {
      console.error('Error generating App ID:', error);
      setError('Failed to generate App ID. Please try again.');
    } finally {
      setGeneratingAppId(false);
    }
  };

  const handleGenerateAppId = async () => {
    await generateAppId();
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newClient.first_name.trim()) {
        setError('First name is required');
        return;
      }

      if (!newClient.second_name.trim()) {
        setError('Last name is required');
        return;
      }

      if (!newClient.package_id) {
        setError('Please select a package');
        return;
      }

      let appId = newClient.app_id?.trim() || null;
      if (!appId) {
        const { data: latestClient } = await supabase
          .from('clients')
          .select('app_id')
          .order('created_at', { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (latestClient && latestClient.length > 0 && latestClient[0].app_id) {
          const lastId = latestClient[0].app_id;
          const match = lastId.match(/APP-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        appId = `APP-${String(nextNumber).padStart(3, '0')}`;
      }

      const selectedPackage = packages.find(pkg => pkg.id.toString() === newClient.package_id);
      const packagePrice = Number(selectedPackage?.price || 0);
      const discountAmount = parseFloat(newClient.discount_amount) || 0;
      const additionalAmount = parseFloat(newClient.additional_amount) || 0;
      const packageTotal = calculateClientPackageTotal(packagePrice, discountAmount, additionalAmount);

      const clientData = {
        first_name: newClient.first_name.trim(),
        second_name: newClient.second_name.trim(),
        national_id: newClient.national_id?.trim() || null,
        address: newClient.address?.trim() || null,
        app_id: appId,
        package_id: parseInt(newClient.package_id),
        discount_amount: discountAmount,
        additional_amount: additionalAmount,
        balance: packageTotal,
        paid_amount: 0
      };

      const clientDataWithExtra = {
        ...clientData,
        phone: newClient.phone?.trim() || null,
        notes: newClient.notes?.trim() || null,
      };

      if (!editingId) {
        const { data: existingClients, error: duplicateError } = await supabase
          .from('clients')
          .select('id, first_name, second_name, package_id')
          .ilike('first_name', clientData.first_name)
          .ilike('second_name', clientData.second_name)
          .eq('package_id', clientData.package_id);

        if (duplicateError) throw duplicateError;

        const hasDuplicate = (existingClients || []).some((client: any) => {
          const sameFirstName = (client.first_name || '').toLowerCase() === clientData.first_name.toLowerCase();
          const sameLastName = (client.second_name || '').toLowerCase() === clientData.second_name.toLowerCase();
          const samePackage = Number(client.package_id) === Number(clientData.package_id);
          return sameFirstName && sameLastName && samePackage;
        });

        if (hasDuplicate) {
          setError('A client with the same first name, last name, and package already exists. At least one of these must be different.');
          return;
        }
      }

      if (editingId) {
        const { error } = await supabase
          .from('clients')
          .update(clientDataWithExtra as Tables<'clients'>['Update'] & { phone?: string | null; notes?: string | null })
          .eq('id', editingId);

        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientDataWithExtra as Tables<'clients'>['Insert'] & { phone?: string | null; notes?: string | null });

        if (error) throw error;
      }

      setNewClient({
        first_name: '',
        second_name: '',
        national_id: '',
        phone: '',
        notes: '',
        address: '',
        app_id: '',
        package_id: '',
        discount_amount: '0',
        additional_amount: '0',
        status: 'ready'
      });
      setError(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving client:', error);
      setError('Failed to save client. Please try again.');
    }
  };

  const handleDeleteClick = (client: ClientWithDetails) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;

    try {
      const { error: deleteError } = await (supabase.rpc as any)('delete_client_and_payments', {
        p_client_id: clientToDelete.id
      });

      if (deleteError) {
        throw deleteError;
      }

      setClientToDelete(null);
      setIsDeleteDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error deleting client:', error);
      setError('Failed to delete client and its payments. Please try again.');
    }
  };

  const handleEdit = (client: ClientWithDetails) => {
    setEditingId(client.id);
    setNewClient({
      first_name: client.first_name,
      second_name: client.second_name || '',
      national_id: client.national_id || '',
      phone: client.phone || '',
      notes: client.notes || '',
      address: client.address || '',
      app_id: client.app_id || '',
      package_id: client.package_id?.toString() || '',
      discount_amount: String((client as any).discount_amount || 0),
      additional_amount: String((client as any).additional_amount || 0),
      status: 'ready'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewClient({
      first_name: '',
      second_name: '',
      national_id: '',
      phone: '',
      notes: '',
      address: '',
      app_id: '',
      package_id: '',
      discount_amount: '0',
      additional_amount: '0',
      status: 'ready'
    });
  };

  const handleViewPayments = (client: ClientWithDetails) => {
    setSelectedClientPayments(client.payments || []);
    setSelectedClientName(`${client.first_name} ${client.second_name || ''}`.trim());
    setIsPaymentModalOpen(true);
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

  const getPackageTypeBadge = (type: string | null) => {
    if (!type) return null;
    const colors: { [key: string]: string } = {
      'hajj': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'umrah': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getBalanceStatus = (balance: number | undefined) => {
    if (balance === undefined || balance === null) return 'unknown';
    if (balance <= 0) return 'paid';
    if (balance < 100000) return 'low';
    return 'high';
  };

  const getBalanceBadge = (balance: number | undefined) => {
    const status = getBalanceStatus(balance);
    const configs = {
      paid: { 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        label: 'Fully Paid'
      },
      low: { 
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: AlertCircle,
        label: 'Low Balance'
      },
      high: { 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: TrendingUp,
        label: 'Balance Due'
      },
      unknown: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Minus,
        label: 'N/A'
      }
    };
    return configs[status];
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      client.first_name.toLowerCase().includes(searchLower) ||
      (client.second_name || '').toLowerCase().includes(searchLower) ||
      (client.national_id || '').toLowerCase().includes(searchLower) ||
      (client.app_id || '').toLowerCase().includes(searchLower) ||
      (client.phone || '').toLowerCase().includes(searchLower);
    
    const matchesPackage = filterPackage === 'all' || client.package_id?.toString() === filterPackage;
    const matchesStatus = filterStatus === 'all' || getBalanceStatus(client.calculated_balance) === filterStatus;
    
    return matchesSearch && matchesPackage && matchesStatus;
  });

  // Stats
  const totalClients = clients.length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.calculated_paid || 0), 0);
  const totalBalance = clients.reduce((sum, c) => sum + (c.calculated_balance || 0), 0);
  const fullyPaid = clients.filter(c => (c.calculated_balance || 0) <= 0).length;

  if (loading) {
    return (
      <ProtectedPage title="Clients" description="Manage client profiles, portal IDs, and readiness status">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage title="Clients" description="Manage client profiles, portal IDs, and readiness status">
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center justify-between text-sm sm:text-base">
          <span className="flex-1">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-sm underline hover:no-underline flex items-center gap-1 ml-2 shrink-0"
          >
            <X className="h-4 w-4" /> Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Clients</p>
                <p className="text-lg sm:text-2xl font-bold">{totalClients}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">UGX {totalRevenue.toLocaleString()}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600 truncate">UGX {totalBalance.toLocaleString()}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Fully Paid</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{fullyPaid}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Client Form - Responsive */}
      <Card className="mb-4 sm:mb-6 border-0 shadow-sm">
        <CardHeader className="border-b p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                {editingId ? 'Update Client' : 'Add New Client'}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {clients.length} clients • {packages.length} packages
              </p>
            </div>
            {editingId && (
              <Button variant="outline" onClick={handleCancelEdit} className="shrink-0 text-sm h-9">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="inline-block h-1 w-1 rounded-full bg-blue-500" />
                  Draft mode: fill freely. Nothing is saved until you click Add client.
                </p>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  First name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  placeholder="e.g., Amina" 
                  value={newClient.first_name}
                  onChange={(e) => setNewClient({...newClient, first_name: e.target.value})}
                  required
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Last name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  placeholder="e.g., Nabirye" 
                  value={newClient.second_name}
                  onChange={(e) => setNewClient({...newClient, second_name: e.target.value})}
                  required
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <IdCard className="h-3 w-3" />
                  National ID
                </Label>
                <Input 
                  placeholder="e.g., CM1234567" 
                  value={newClient.national_id}
                  onChange={(e) => setNewClient({...newClient, national_id: e.target.value})}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </Label>
                <Input 
                  placeholder="e.g., 07XXXXXXXX" 
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              
              <div className="lg:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Notes
                </Label>
                <Textarea 
                  placeholder="Additional notes about the client" 
                  value={newClient.notes}
                  onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                  className="min-h-[36px] h-9 sm:h-10 resize-none text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Address
                </Label>
                <Input 
                  placeholder="e.g., Kampala" 
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Package <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={newClient.package_id}
                  onValueChange={(value) => setNewClient({...newClient, package_id: value})}
                  required
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.length === 0 ? (
                      <SelectItem value="no-packages" disabled>
                        No packages available
                      </SelectItem>
                    ) : (
                      packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id.toString()}>
                          {pkg.name} 
                          {pkg.type && ` (${pkg.type})`}
                          {pkg.price && ` - UGX ${pkg.price.toLocaleString()}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Discount (UGX)
                </Label>
                <Input 
                  type="number"
                  min="0"
                  placeholder="0" 
                  value={newClient.discount_amount}
                  onChange={(e) => setNewClient({...newClient, discount_amount: e.target.value})}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Extra amount (UGX)
                </Label>
                <Input 
                  type="number"
                  min="0"
                  placeholder="0" 
                  value={newClient.additional_amount}
                  onChange={(e) => setNewClient({...newClient, additional_amount: e.target.value})}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">App ID</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="APP-001" 
                    value={newClient.app_id}
                    onChange={(e) => setNewClient({...newClient, app_id: e.target.value})}
                    readOnly={!editingId}
                    className={`h-9 sm:h-10 text-sm ${!editingId ? 'bg-muted/50' : ''}`}
                  />
                  {!editingId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={handleGenerateAppId}
                      disabled={generatingAppId}
                      className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                    >
                      <RefreshCw className={`h-4 w-4 ${generatingAppId ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
                {!editingId && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Click refresh to generate unique App ID
                  </p>
                )}
              </div>
              
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <Button type="submit" className="flex-1 h-9 sm:h-10 text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingId ? 'Update Client' : 'Add Client'}
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Client Directory - Responsive */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b p-4 sm:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Client Directory
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {filteredClients.length} of {clients.length} client{clients.length !== 1 ? 's' : ''} shown
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm w-full sm:w-[180px] lg:w-[200px]"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-9 px-3 sm:hidden"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {showFilters ? <ChevronUp className="h-3 w-3 ml-2" /> : <ChevronDown className="h-3 w-3 ml-2" />}
                </Button>
              </div>
            </div>
            
            {/* Filters - Responsive */}
            <div className={`flex flex-col sm:flex-row gap-2 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
              <Select value={filterPackage} onValueChange={setFilterPackage}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-[150px]">
                  <SelectValue placeholder="Package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                  <SelectItem value="low">Low Balance</SelectItem>
                  <SelectItem value="high">Balance Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-muted-foreground text-sm sm:text-base">
                {searchTerm || filterPackage !== 'all' || filterStatus !== 'all' 
                  ? 'No clients match your filters' 
                  : 'No clients found'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs">Client</TableHead>
                      <TableHead className="font-semibold text-xs">Package</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Price (UGX)</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Paid (UGX)</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Balance (UGX)</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs">App ID</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const balanceConfig = getBalanceBadge(client.calculated_balance);
                      const BalanceIcon = balanceConfig.icon;
                      const packageInfo = Array.isArray(client.packages) ? client.packages[0] : client.packages;
                      return (
                        <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3">
                            <div>
                              <div className="font-medium text-sm">{client.first_name} {client.second_name || ''}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <IdCard className="h-3 w-3" />
                                {client.national_id || 'No ID'}
                              </div>
                              {client.phone && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="h-3 w-3" />
                                  {client.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {packageInfo ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm">{packageInfo.name}</span>
                                {packageInfo.type && (
                                  <Badge className={`${getPackageTypeBadge(packageInfo.type)} border text-[10px]`}>
                                    {packageInfo.type}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No package</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {client.calculated_package_total !== undefined ? 
                              client.calculated_package_total.toLocaleString() : 
                              '-'
                            }
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-emerald-600 font-medium">
                            {client.calculated_paid?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">
                            {client.calculated_balance !== undefined ? (
                              <span className={client.calculated_balance <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {client.calculated_balance.toLocaleString()}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${balanceConfig.color} border flex items-center gap-1 w-fit text-[10px]`}>
                              <BalanceIcon className="h-3 w-3" />
                              {balanceConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {client.app_id ? (
                              <Badge variant="outline" className="font-mono bg-blue-50 border-blue-200 text-[10px]">
                                {client.app_id}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewPayments(client)}
                                disabled={!client.payments || client.payments.length === 0}
                                className="h-8 w-8 p-0"
                                title="View payments"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(client)}
                                className="h-8 w-8 p-0"
                                title="Edit client"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(client)}
                                className="h-8 w-8 p-0"
                                title="Delete client"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden divide-y divide-border">
                {filteredClients.map((client) => {
                  const balanceConfig = getBalanceBadge(client.calculated_balance);
                  const BalanceIcon = balanceConfig.icon;
                  const packageInfo = Array.isArray(client.packages) ? client.packages[0] : client.packages;
                  const isExpanded = expandedRows.has(client.id);
                  
                  return (
                    <div key={client.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {client.first_name} {client.second_name || ''}
                            </span>
                            {client.app_id && (
                              <Badge variant="outline" className="font-mono bg-blue-50 border-blue-200 text-[10px]">
                                {client.app_id}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {packageInfo && (
                              <span className="text-xs text-muted-foreground">
                                {packageInfo.name}
                              </span>
                            )}
                            {packageInfo?.type && (
                              <Badge className={`${getPackageTypeBadge(packageInfo.type)} border text-[10px]`}>
                                {packageInfo.type}
                              </Badge>
                            )}
                            <Badge className={`${balanceConfig.color} border flex items-center gap-1 text-[10px]`}>
                              <BalanceIcon className="h-2.5 w-2.5" />
                              {balanceConfig.label}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpand(client.id)}
                          className="h-8 w-8 p-0 shrink-0 ml-2"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {/* Always visible basic info */}
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Package Total:</span>
                          <span className="ml-1 font-mono">
                            {client.calculated_package_total?.toLocaleString() || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Paid:</span>
                          <span className="ml-1 font-mono text-emerald-600">
                            {client.calculated_paid?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Balance:</span>
                          <span className={`ml-1 font-mono ${(client.calculated_balance || 0) <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {client.calculated_balance?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ID:</span>
                          <span className="ml-1 font-mono">{client.national_id || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          {client.phone && (
                            <div className="flex items-center gap-2 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.address && (
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>{client.address}</span>
                            </div>
                          )}
                          {client.notes && (
                            <div className="flex items-start gap-2 text-xs">
                              <FileText className="h-3 w-3 text-muted-foreground mt-0.5" />
                              <span className="text-muted-foreground">{client.notes}</span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPayments(client)}
                              disabled={!client.payments || client.payments.length === 0}
                              className="flex-1 h-8 text-xs"
                            >
                              <Wallet className="h-3 w-3 mr-1" />
                              Payments ({client.payments?.length || 0})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(client)}
                              className="flex-1 h-8 text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(client)}
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

      {/* Delete Dialog - Responsive */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 text-base sm:text-lg">
              <Trash2 className="h-5 w-5" />
              Delete Client?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                This action is permanent. It will remove the client record and delete all associated payments for{' '}
                <span className="font-semibold text-foreground">
                  {clientToDelete ? `${clientToDelete.first_name} ${clientToDelete.second_name || ''}`.trim() : 'this client'}
                </span>
                .
              </p>
              {clientToDelete?.payments && clientToDelete.payments.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                  <p className="text-sm font-medium">
                    ⚠️ {clientToDelete.payments.length} payment{clientToDelete.payments.length !== 1 ? 's' : ''} will also be removed.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setClientToDelete(null)} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment History Modal - Responsive */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Payment History
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {selectedClientName} • {selectedClientPayments.length} payment{selectedClientPayments.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)} className="h-8 w-8 p-0 shrink-0 self-end sm:self-auto">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(90vh-80px)] sm:max-h-[calc(80vh-80px)]">
              {selectedClientPayments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <div className="text-4xl mb-3">💳</div>
                  <p className="text-sm sm:text-base">No payment history available</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {/* Header - Hide on small screens */}
                  <div className="hidden sm:grid grid-cols-4 gap-4 text-sm font-semibold text-muted-foreground border-b pb-3">
                    <div>Date</div>
                    <div className="text-right">Amount (UGX)</div>
                    <div className="text-right">Discount (UGX)</div>
                    <div className="text-right">Net (UGX)</div>
                  </div>
                  
                  {/* Payment rows */}
                  {selectedClientPayments.map((payment, index) => (
                    <div key={index} className="border-b border-muted/30 pb-3 sm:pb-0 sm:border-none">
                      {/* Mobile view */}
                      <div className="sm:hidden space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            {new Date(payment.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-sm font-semibold text-emerald-600">
                            UGX {((payment.total || 0) - (payment.discount || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Amount: UGX {payment.total?.toLocaleString() || 0}</span>
                          <span>Discount: UGX {payment.discount?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                      
                      {/* Desktop view */}
                      <div className="hidden sm:grid grid-cols-4 gap-4 text-sm py-3 hover:bg-muted/5 transition-colors rounded-lg">
                        <div className="font-medium">
                          {new Date(payment.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-right font-mono">
                          {payment.total?.toLocaleString() || 0}
                        </div>
                        <div className="text-right font-mono text-red-600">
                          {payment.discount?.toLocaleString() || 0}
                        </div>
                        <div className="text-right font-mono text-emerald-600 font-semibold">
                          {((payment.total || 0) - (payment.discount || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Totals */}
                  <div className="mt-4 pt-4 border-t-2 border-primary/20">
                    {/* Mobile totals */}
                    <div className="sm:hidden space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-mono font-semibold">
                          UGX {selectedClientPayments.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Discount:</span>
                        <span className="font-mono font-semibold text-red-600">
                          UGX {selectedClientPayments.reduce((sum, p) => sum + (p.discount || 0), 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Net Total:</span>
                        <span className="font-mono text-emerald-600">
                          UGX {selectedClientPayments.reduce((sum, p) => sum + ((p.total || 0) - (p.discount || 0)), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Desktop totals */}
                    <div className="hidden sm:grid grid-cols-4 gap-4 text-base font-bold">
                      <div className="text-primary">Total</div>
                      <div className="text-right font-mono">
                        {selectedClientPayments.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-right font-mono text-red-600">
                        {selectedClientPayments.reduce((sum, p) => sum + (p.discount || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-right font-mono text-emerald-600">
                        {selectedClientPayments.reduce((sum, p) => sum + ((p.total || 0) - (p.discount || 0)), 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}