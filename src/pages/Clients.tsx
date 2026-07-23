import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Plus, Trash2, Edit, RefreshCw, Wallet } from "lucide-react";

type Client = Tables<'clients'>;
type Package = Tables<'packages'>;
type Payment = Tables<'payments'>;

interface ClientWithDetails extends Client {
  packages?: {
    name: string | null;
    type: string | null;
    price: number | null;
  } | null;
  payments?: Payment[];
  calculated_balance?: number;
  calculated_paid?: number;
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
  
  const [newClient, setNewClient] = useState({
    first_name: '',
    second_name: '',
    national_id: '',
    address: '',
    app_id: '',
    package_id: '',
    status: 'ready'
  });

  useEffect(() => {
    document.title = "Clients — Pearl Hijja Admin";
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch clients with package info
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
      
      // Fetch payments for all clients
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*');

      if (paymentsError) throw paymentsError;

      // Calculate balances for each client
      const clientsWithBalance = (clientsData || []).map(client => {
        const clientPayments = (paymentsData || []).filter(p => p.client_id === client.id);
        const totalPaid = clientPayments.reduce((sum, p) => sum + ((p.total || 0) - (p.discount || 0)), 0);
        const packagePrice = client.packages?.price || 0;
        const balance = packagePrice - totalPaid;
        
        return {
          ...client,
          payments: clientPayments,
          calculated_paid: totalPaid,
          calculated_balance: balance
        };
      });

      setClients(clientsWithBalance);

      // Fetch packages for dropdown
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

  // Generate a unique App ID
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newClient.first_name.trim()) {
        setError('First name is required');
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

      const clientData = {
        first_name: newClient.first_name.trim(),
        second_name: newClient.second_name?.trim() || null,
        national_id: newClient.national_id?.trim() || null,
        address: newClient.address?.trim() || null,
        app_id: appId,
        package_id: parseInt(newClient.package_id),
        balance: 0,
        paid_amount: 0
      };

      if (editingId) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingId);

        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);

        if (error) throw error;
      }

      setNewClient({
        first_name: '',
        second_name: '',
        national_id: '',
        address: '',
        app_id: '',
        package_id: '',
        status: 'ready'
      });
      setError(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving client:', error);
      setError('Failed to save client. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting client:', error);
      setError('Failed to delete client. Please try again.');
    }
  };

  const handleEdit = (client: ClientWithDetails) => {
    setEditingId(client.id);
    setNewClient({
      first_name: client.first_name,
      second_name: client.second_name || '',
      national_id: client.national_id || '',
      address: client.address || '',
      app_id: client.app_id || '',
      package_id: client.package_id?.toString() || '',
      status: 'ready'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewClient({
      first_name: '',
      second_name: '',
      national_id: '',
      address: '',
      app_id: '',
      package_id: '',
      status: 'ready'
    });
  };

  const handleViewPayments = (client: ClientWithDetails) => {
    setSelectedClientPayments(client.payments || []);
    setSelectedClientName(`${client.first_name} ${client.second_name || ''}`.trim());
    setIsPaymentModalOpen(true);
  };

  const getPackageTypeBadge = (type: string | null) => {
    if (!type) return null;
    const colors: { [key: string]: string } = {
      'hajj': 'bg-green-100 text-green-800',
      'umrah': 'bg-blue-100 text-blue-800'
    };
    return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getBalanceStatus = (balance: number | undefined) => {
    if (balance === undefined || balance === null) return 'unknown';
    if (balance <= 0) return 'paid';
    if (balance < 100000) return 'low';
    return 'high';
  };

  const getBalanceBadge = (balance: number | undefined) => {
    const status = getBalanceStatus(balance);
    const colors = {
      paid: 'bg-green-100 text-green-800',
      low: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
      unknown: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      paid: 'Fully Paid',
      low: 'Low Balance',
      high: 'Balance Due',
      unknown: 'N/A'
    };
    return { color: colors[status], label: labels[status] };
  };

  if (loading) {
    return (
      <AdminLayout title="Clients" description="Manage client profiles, portal IDs, and readiness status">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading clients...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Clients" description="Manage client profiles, portal IDs, and readiness status">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId ? 'Update client' : 'Add new client'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {clients.length} clients currently registered • {packages.length} packages available
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>First name *</Label>
              <Input 
                placeholder="Amina" 
                value={newClient.first_name}
                onChange={(e) => setNewClient({...newClient, first_name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Second name</Label>
              <Input 
                placeholder="Nabirye" 
                value={newClient.second_name}
                onChange={(e) => setNewClient({...newClient, second_name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <Label>National ID</Label>
              <Input 
                placeholder="CM1234567" 
                value={newClient.national_id}
                onChange={(e) => setNewClient({...newClient, national_id: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input 
                placeholder="Kampala" 
                value={newClient.address}
                onChange={(e) => setNewClient({...newClient, address: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <Label>Package *</Label>
              <Select 
                value={newClient.package_id}
                onValueChange={(value) => setNewClient({...newClient, package_id: value})}
                required
              >
                <SelectTrigger>
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
            <div className="space-y-1">
              <Label>App ID</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="APP-001" 
                  value={newClient.app_id}
                  onChange={(e) => setNewClient({...newClient, app_id: e.target.value})}
                  readOnly={!editingId}
                  className={!editingId ? 'bg-gray-50' : ''}
                />
                {!editingId && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={handleGenerateAppId}
                    disabled={generatingAppId}
                    className="shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${generatingAppId ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
              {!editingId && (
                <p className="text-xs text-muted-foreground">
                  Click the refresh icon to generate a unique App ID
                </p>
              )}
            </div>
            <div className="flex items-end gap-2 xl:col-span-2">
              <Button type="submit" className="flex-1" disabled={!newClient.app_id && !editingId}>
                <Plus className="h-4 w-4 mr-2" />
                {editingId ? 'Update client' : 'Add client'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client directory</CardTitle>
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? 's' : ''} registered
          </p>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No clients found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Price (UGX)</TableHead>
                  <TableHead>Paid (UGX)</TableHead>
                  <TableHead>Balance (UGX)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>App ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const balanceStatus = getBalanceBadge(client.calculated_balance);
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{client.first_name} {client.second_name || ''}</div>
                          <div className="text-xs text-muted-foreground">{client.national_id || 'No ID'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.packages ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{client.packages.name}</span>
                            {client.packages.type && (
                              <Badge className={getPackageTypeBadge(client.packages.type)}>
                                {client.packages.type}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No package</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.packages?.price ? 
                          client.packages.price.toLocaleString() : 
                          '-'
                        }
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        UGX {client.calculated_paid?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {client.calculated_balance !== undefined ? (
                          <span className={client.calculated_balance <= 0 ? 'text-green-600' : 'text-red-600'}>
                            UGX {client.calculated_balance.toLocaleString()}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={balanceStatus.color}>
                          {balanceStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.app_id ? (
                          <Badge variant="outline" className="font-mono bg-blue-50">
                            {client.app_id}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPayments(client)}
                            disabled={!client.payments || client.payments.length === 0}
                          >
                            <Wallet className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Payment History - {selectedClientName}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedClientPayments.length} payment{selectedClientPayments.length !== 1 ? 's' : ''} recorded
                </p>
              </div>
              <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Close</Button>
            </div>
            
            <div className="p-4">
              {selectedClientPayments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No payment history available
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div>Date</div>
                    <div>Amount (UGX)</div>
                    <div>Discount (UGX)</div>
                    <div className="text-right">Net (UGX)</div>
                  </div>
                  
                  {selectedClientPayments.map((payment, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-gray-100">
                      <div>
                        {new Date(payment.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="font-medium">
                        UGX {(payment.total || 0).toLocaleString()}
                      </div>
                      <div className="text-red-600">
                        UGX {(payment.discount || 0).toLocaleString()}
                      </div>
                      <div className="text-right text-green-600 font-medium">
                        UGX {((payment.total || 0) - (payment.discount || 0)).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 pt-3 border-t-2 border-gray-200">
                    <div className="grid grid-cols-4 gap-4 text-base font-bold">
                      <div>Total</div>
                      <div>
                        UGX {selectedClientPayments.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-red-600">
                        UGX {selectedClientPayments.reduce((sum, p) => sum + (p.discount || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-right text-green-600">
                        UGX {selectedClientPayments.reduce((sum, p) => sum + ((p.total || 0) - (p.discount || 0)), 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}