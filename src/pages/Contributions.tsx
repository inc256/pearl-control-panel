import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Eye } from "lucide-react";

type Contribution = Tables<'contributions'>;

interface Member {
  id: string;
  first_name: string;
  second_name: string | null;
  total_contributions: number;
}

interface ContributionWithMember extends Contribution {
  member_id?: string;
}

export default function Contributions() {
  const [contributions, setContributions] = useState<ContributionWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberPayments, setSelectedMemberPayments] = useState<Contribution[]>([]);
  const [selectedMemberName, setSelectedMemberName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newMember, setNewMember] = useState({
    first_name: '',
    second_name: ''
  });
  
  const [existingMember, setExistingMember] = useState({
    member_id: '',
    contribution_date: '',
    amount: ''
  });

  useEffect(() => {
    document.title = "Contributions — Pearl Hijja Admin";
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: contributionsData, error: contributionsError } = await supabase
        .from('contributions')
        .select('*')
        .order('contribution_date', { ascending: false });

      if (contributionsError) {
        if (contributionsError.code === '42501' || contributionsError.message.includes('Unauthorized')) {
          setError('Please ensure you are logged in. Refreshing...');
          return;
        }
        throw contributionsError;
      }
      
      const contributionsList = contributionsData || [];
      setContributions(contributionsList);

      const memberMap = new Map<string, Member>();
      contributionsList.forEach((c) => {
        const key = `${c.first_name}-${c.second_name || ''}`;
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            id: c.id,
            first_name: c.first_name,
            second_name: c.second_name,
            total_contributions: 0
          });
        }
        const member = memberMap.get(key)!;
        member.total_contributions += (c.total || 0);
      });

      setMembers(Array.from(memberMap.values()));
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load contributions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newMember.first_name.trim()) {
        setError('First name is required');
        return;
      }

      const contributionData = {
        first_name: newMember.first_name.trim(),
        second_name: newMember.second_name?.trim() || null,
        contribution_date: new Date().toISOString().split('T')[0],
        contribution: { amount: 0 },
        total: 0
      };

      const { error } = await supabase
        .from('contributions')
        .insert(contributionData);

      if (error) throw error;
      
      setNewMember({
        first_name: '',
        second_name: ''
      });
      setError(null);
      await fetchData();
    } catch (error) {
      console.error('Error creating contribution:', error);
      setError('Failed to create contribution. Please try again.');
    }
  };

  const handleExistingMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!existingMember.member_id) {
        setError('Please select a member');
        return;
      }

      if (!existingMember.amount || parseFloat(existingMember.amount) <= 0) {
        setError('Amount is required and must be greater than 0');
        return;
      }

      if (!existingMember.contribution_date) {
        setError('Payment date is required');
        return;
      }

      const selectedMember = members.find(m => m.id === existingMember.member_id);
      if (!selectedMember) {
        setError('Selected member not found');
        return;
      }

      const amount = parseFloat(existingMember.amount);
      const contributionData = {
        first_name: selectedMember.first_name,
        second_name: selectedMember.second_name,
        contribution_date: existingMember.contribution_date,
        contribution: { amount },
        total: selectedMember.total_contributions + amount
      };

      const { error } = await supabase
        .from('contributions')
        .insert(contributionData);

      if (error) throw error;
      
      setExistingMember({
        member_id: '',
        contribution_date: '',
        amount: ''
      });
      setError(null);
      await fetchData();
    } catch (error) {
      console.error('Error adding contribution:', error);
      setError('Failed to add contribution. Please try again.');
    }
  };

  const handleViewPayments = (memberKey: string, memberName: string) => {
    const payments = contributions.filter(c => {
      const key = `${c.first_name}-${c.second_name || ''}`;
      return key === memberKey;
    });
    
    // Sort payments by date (newest first)
    const sortedPayments = payments.sort((a, b) => 
      new Date(b.contribution_date).getTime() - new Date(a.contribution_date).getTime()
    );
    
    setSelectedMemberPayments(sortedPayments);
    setSelectedMemberName(memberName);
    setIsModalOpen(true);
  };

  // Group contributions by member for the ledger
  const groupedContributions = contributions.reduce((acc: { [key: string]: Contribution[] }, curr) => {
    const key = `${curr.first_name}-${curr.second_name || ''}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);
    return acc;
  }, {});

  const memberRows = Object.entries(groupedContributions).map(([key, memberContribs]) => {
    const first = memberContribs[0];
    const sortedPayments = memberContribs.sort((a, b) => 
      new Date(a.contribution_date).getTime() - new Date(b.contribution_date).getTime()
    );
    const total = sortedPayments.reduce((sum, c) => sum + (c.total || 0), 0);
    
    return {
      key,
      first_name: first.first_name,
      second_name: first.second_name || '',
      total,
      paymentCount: sortedPayments.length
    };
  });

  if (loading) {
    return (
      <AdminLayout title="Contributions" description="Track member contributions and payment history">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading contributions...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Contributions" description="Track member contributions and payment history">
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

      <div className="grid gap-6 xl:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Add new member</CardTitle>
            <p className="text-sm text-muted-foreground">
              {members.length} members currently registered
            </p>
          </CardHeader>
          <form onSubmit={handleNewMemberSubmit}>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="first_name">First name *</Label>
                <Input 
                  id="first_name"
                  placeholder="Amina" 
                  value={newMember.first_name}
                  onChange={(e) => setNewMember({...newMember, first_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="second_name">Last name</Label>
                <Input 
                  id="second_name"
                  placeholder="Nabirye" 
                  value={newMember.second_name}
                  onChange={(e) => setNewMember({...newMember, second_name: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button type="submit" className="w-full">Add new member</Button>
              </div>
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add contribution to existing member</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a member to add a new contribution
            </p>
          </CardHeader>
          <form onSubmit={handleExistingMemberSubmit}>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="member_select">Choose member *</Label>
                <Select 
                  value={existingMember.member_id}
                  onValueChange={(value) => setExistingMember({...existingMember, member_id: value})}
                  required
                >
                  <SelectTrigger id="member_select">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.length === 0 ? (
                      <SelectItem value="no-members" disabled>
                        No members available
                      </SelectItem>
                    ) : (
                      members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {`${member.first_name} ${member.second_name || ''}`.trim()} 
                          (Total: UGX {member.total_contributions.toLocaleString()})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="existing_contribution_date">Payment date *</Label>
                <Input 
                  id="existing_contribution_date"
                  type="date" 
                  value={existingMember.contribution_date}
                  onChange={(e) => setExistingMember({...existingMember, contribution_date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="existing_amount">Amount (UGX) *</Label>
                <Input 
                  id="existing_amount"
                  type="number" 
                  placeholder="0" 
                  value={existingMember.amount}
                  onChange={(e) => setExistingMember({...existingMember, amount: e.target.value})}
                  required
                  min="1"
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={members.length === 0}
                >
                  Add contribution
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contribution ledger</CardTitle>
          <p className="text-sm text-muted-foreground">
            {memberRows.length} member{memberRows.length !== 1 ? 's' : ''} with contributions
          </p>
        </CardHeader>
        <CardContent>
          {memberRows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No contributions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First name</TableHead>
                  <TableHead>Last name</TableHead>
                  <TableHead>Total (UGX)</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.map((member) => (
                  <TableRow key={member.key}>
                    <TableCell className="font-medium">{member.first_name}</TableCell>
                    <TableCell>{member.second_name}</TableCell>
                    <TableCell className="font-medium">
                      UGX {member.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {member.paymentCount} payment{member.paymentCount !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPayments(member.key, `${member.first_name} ${member.second_name}`.trim())}
                        className="inline-flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Payment History - {selectedMemberName}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedMemberPayments.length} payment{selectedMemberPayments.length !== 1 ? 's' : ''} in total
            </p>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedMemberPayments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No payment history available
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div>Date</div>
                  <div>Amount (UGX)</div>
                  <div className="text-right">Running Total</div>
                </div>
                
                {selectedMemberPayments.map((payment, index) => {
                  // Calculate running total (from oldest to newest)
                  const sortedPayments = [...selectedMemberPayments].sort(
                    (a, b) => new Date(a.contribution_date).getTime() - new Date(b.contribution_date).getTime()
                  );
                  const runningTotal = sortedPayments
                    .slice(0, sortedPayments.findIndex(p => p.id === payment.id) + 1)
                    .reduce((sum, p) => sum + (p.total || 0), 0);
                  
                  const isLatest = index === 0;
                  const amount = payment.total || 0;
                  
                  return (
                    <div 
                      key={payment.id} 
                      className={`grid grid-cols-3 gap-4 text-sm py-2 border-b border-gray-100 ${
                        isLatest ? 'bg-blue-50 rounded-lg p-2 -mx-2' : ''
                      }`}
                    >
                      <div>
                        {new Date(payment.contribution_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                        {isLatest && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="font-medium">
                        UGX {amount.toLocaleString()}
                      </div>
                      <div className="text-right font-medium">
                        UGX {runningTotal.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
                
                <div className="mt-4 pt-3 border-t-2 border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-base font-bold">
                    <div>Total</div>
                    <div>
                      UGX {selectedMemberPayments.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-right text-green-600">
                      UGX {selectedMemberPayments.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}