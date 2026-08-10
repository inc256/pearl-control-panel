import ProtectedPage from "@/components/layout/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Eye, Pencil, Save, X, Trash2, Loader2, Wallet, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Contribution = Tables<'contributions'>;

interface Member {
  id: string;
  first_name: string;
  second_name: string | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  full_name: string;
}

interface ContributionWithMember extends Contribution {
  member_id?: string;
}

export default function Contributions({ pageTitle = "Contributions" }: { pageTitle?: string }) {
  const { toast } = useToast();
  const [contributions, setContributions] = useState<ContributionWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberPayments, setSelectedMemberPayments] = useState<Contribution[]>([]);
  const [selectedMemberName, setSelectedMemberName] = useState('');
  const [selectedMemberTotal, setSelectedMemberTotal] = useState(0);
  const [selectedMemberPaid, setSelectedMemberPaid] = useState(0);
  const [selectedMemberBalance, setSelectedMemberBalance] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Editing states
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null);
  const [editingContribution, setEditingContribution] = useState<{
    amount: string;
    date: string;
  }>({
    amount: '',
    date: ''
  });
  const [editingContributionIndex, setEditingContributionIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const [newMember, setNewMember] = useState({
    first_name: '',
    second_name: '',
    total_amount: ''
  });
  
  const [existingMember, setExistingMember] = useState({
    member_id: '',
    date: '',
    amount: ''
  });

  useEffect(() => {
    document.title = `${pageTitle} — Pearl Hijja Admin`;
    fetchData();
  }, [pageTitle]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: contributionsData, error: contributionsError } = await supabase
        .from('contributions')
        .select('*')
        .order('created_at', { ascending: false });

      if (contributionsError) {
        if (contributionsError.code === '42501' || contributionsError.message.includes('Unauthorized')) {
          setError('Please ensure you are logged in. Refreshing...');
          return;
        }
        throw contributionsError;
      }
      
      const contributionsList = contributionsData || [];
      setContributions(contributionsList);

      // Calculate member totals, paid amounts, and balances
      const memberMap = new Map<string, Member>();
      contributionsList.forEach((c) => {
        const key = `${c.first_name}-${c.second_name || ''}`;
        const totalAmount = c.total || 0;
        const contributionsArray = c.contribution as any[] || [];
        const paidAmount = contributionsArray.reduce((sum, contrib) => sum + (contrib.amount || 0), 0);
        const balance = totalAmount - paidAmount;
        const fullName = `${c.first_name} ${c.second_name || ''}`.trim();
        
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            id: c.id,
            first_name: c.first_name,
            second_name: c.second_name,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            balance: balance,
            full_name: fullName
          });
        } else {
          const member = memberMap.get(key)!;
          member.total_amount += totalAmount;
          member.paid_amount += paidAmount;
          member.balance = member.total_amount - member.paid_amount;
        }
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
        toast({
          title: "Error",
          description: "First name is required",
          variant: "destructive",
        });
        return;
      }

      const totalAmount = parseFloat(newMember.total_amount) || 0;

      const contributionData = {
        first_name: newMember.first_name.trim(),
        second_name: newMember.second_name?.trim() || null,
        contribution: [],
        total: totalAmount
      };

      const { error } = await supabase
        .from('contributions')
        .insert(contributionData);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `New member added with total of UGX ${totalAmount.toLocaleString()}`,
      });

      setNewMember({
        first_name: '',
        second_name: '',
        total_amount: ''
      });
      await fetchData();
    } catch (error: any) {
      console.error('Error creating contribution:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create contribution",
        variant: "destructive",
      });
    }
  };

  const handleExistingMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!existingMember.member_id) {
        toast({
          title: "Error",
          description: "Please select a member",
          variant: "destructive",
        });
        return;
      }

      if (!existingMember.amount || parseFloat(existingMember.amount) <= 0) {
        toast({
          title: "Error",
          description: "Amount is required and must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      if (!existingMember.date) {
        toast({
          title: "Error",
          description: "Payment date is required",
          variant: "destructive",
        });
        return;
      }

      const selectedMember = members.find(m => m.id === existingMember.member_id);
      if (!selectedMember) {
        toast({
          title: "Error",
          description: "Selected member not found",
          variant: "destructive",
        });
        return;
      }

      const amount = parseFloat(existingMember.amount);
      
      // Get the current contribution record for this member
      const memberContributions = contributions.filter(c => 
        c.first_name === selectedMember.first_name && 
        c.second_name === selectedMember.second_name
      );

      // Get the latest contribution record
      const latestContribution = memberContributions[0];
      if (!latestContribution) {
        throw new Error('Member contribution record not found');
      }

      const currentContributions = latestContribution.contribution as any[] || [];

      // Add new contribution to the array
      const updatedContributions = [
        ...currentContributions,
        {
          amount: amount,
          date: existingMember.date
        }
      ];

      const updateData = {
        contribution: updatedContributions
        // total stays the same - we don't update it when adding payments
      };

      const { error } = await supabase
        .from('contributions')
        .update(updateData)
        .eq('id', latestContribution.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Payment of UGX ${amount.toLocaleString()} added successfully`,
      });

      setExistingMember({
        member_id: '',
        date: '',
        amount: ''
      });
      await fetchData();
    } catch (error: any) {
      console.error('Error adding contribution:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add contribution",
        variant: "destructive",
      });
    }
  };

  // Update a specific contribution in the array
  const updateContribution = async (id: string, index: number) => {
    if (!editingContribution.amount || parseFloat(editingContribution.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!editingContribution.date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(id);
      
      const amount = parseFloat(editingContribution.amount);
      
      // Get the current contribution
      const currentContribution = contributions.find(c => c.id === id);
      if (!currentContribution) {
        throw new Error('Contribution not found');
      }

      const contributionsArray = currentContribution.contribution as any[] || [];
      
      // Update the specific contribution in the array
      contributionsArray[index] = {
        amount: amount,
        date: editingContribution.date
      };

      const updateData = {
        contribution: contributionsArray
        // total stays the same
      };

      const { error } = await supabase
        .from('contributions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment updated successfully",
      });

      setEditingContributionId(null);
      setEditingContributionIndex(null);
      setEditingContribution({ amount: '', date: '' });
      await fetchData();
    } catch (error: any) {
      console.error('Error updating contribution:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update payment",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete a specific contribution from the array
  const deleteContribution = async (id: string, index: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      setDeletingId(id);
      
      // Get the current contribution
      const currentContribution = contributions.find(c => c.id === id);
      if (!currentContribution) {
        throw new Error('Contribution not found');
      }

      const contributionsArray = currentContribution.contribution as any[] || [];
      
      // Remove the specific contribution
      contributionsArray.splice(index, 1);

      const updateData = {
        contribution: contributionsArray
        // total stays the same
      };

      const { error } = await supabase
        .from('contributions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error deleting contribution:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Start editing
  const startEdit = (contribution: Contribution, index: number) => {
    setEditingContributionId(contribution.id);
    setEditingContributionIndex(index);
    const contributionsArray = contribution.contribution as any[] || [];
    const targetContribution = contributionsArray[index] || {};
    setEditingContribution({
      amount: targetContribution.amount?.toString() || '',
      date: targetContribution.date || new Date().toISOString().split('T')[0]
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingContributionId(null);
    setEditingContributionIndex(null);
    setEditingContribution({ amount: '', date: '' });
  };

  const handleViewPayments = (memberKey: string, memberName: string) => {
    const payments = contributions.filter(c => {
      const key = `${c.first_name}-${c.second_name || ''}`;
      return key === memberKey;
    });
    
    // Sort payments by date (newest first)
    const sortedPayments = payments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Calculate totals
    let totalAmount = 0;
    let paidAmount = 0;
    sortedPayments.forEach(p => {
      totalAmount += p.total || 0;
      const contribs = p.contribution as any[] || [];
      paidAmount += contribs.reduce((sum, c) => sum + (c.amount || 0), 0);
    });
    const balance = totalAmount - paidAmount;
    
    setSelectedMemberPayments(sortedPayments);
    setSelectedMemberName(memberName);
    setSelectedMemberTotal(totalAmount);
    setSelectedMemberPaid(paidAmount);
    setSelectedMemberBalance(balance);
    setIsModalOpen(true);
  };

  // Group contributions by member
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
    const totalAmount = memberContribs.reduce((sum, c) => sum + (c.total || 0), 0);
    const paidAmount = memberContribs.reduce((sum, c) => {
      const contribs = c.contribution as any[] || [];
      return sum + contribs.reduce((s, contrib) => s + (contrib.amount || 0), 0);
    }, 0);
    const balance = totalAmount - paidAmount;
    const fullName = `${first.first_name} ${first.second_name || ''}`.trim();
    
    // Count total payments
    let paymentCount = 0;
    memberContribs.forEach(c => {
      const contribs = c.contribution as any[] || [];
      paymentCount += contribs.length;
    });
    
    return {
      key,
      full_name: fullName,
      totalAmount,
      paidAmount,
      balance,
      paymentCount
    };
  });

  if (loading) {
    return (
      <ProtectedPage title="Contributions" description="Track member contributions and payment history">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading contributions...</p>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage title={pageTitle} description="Track member contributions and payment history">
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
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="total_amount">Total Amount (UGX)</Label>
                <Input 
                  id="total_amount"
                  type="number" 
                  placeholder="0"
                  value={newMember.total_amount}
                  onChange={(e) => setNewMember({...newMember, total_amount: e.target.value})}
                  min="0"
                  step="0.01"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This is the total amount the member needs to pay
                </p>
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add new member
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add payment to existing member</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a member to add a new payment
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
                          {member.full_name} (Balance: UGX {member.balance.toLocaleString()})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="existing_date">Payment date *</Label>
                <Input 
                  id="existing_date"
                  type="date" 
                  value={existingMember.date}
                  onChange={(e) => setExistingMember({...existingMember, date: e.target.value})}
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
                  <Plus className="h-4 w-4 mr-2" />
                  Add payment
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Expected</p>
              <p className="text-2xl font-bold">
                UGX {members.reduce((sum, m) => sum + m.total_amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold">
                UGX {members.reduce((sum, m) => sum + m.paid_amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold">
                UGX {members.reduce((sum, m) => sum + m.balance, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <TableHead>Member</TableHead>
                  <TableHead>Total (UGX)</TableHead>
                  <TableHead>Paid (UGX)</TableHead>
                  <TableHead>Balance (UGX)</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.map((member) => (
                  <TableRow key={member.key}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>UGX {member.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>UGX {member.paidAmount.toLocaleString()}</TableCell>
                    <TableCell className={member.balance > 0 ? 'text-orange-600 font-bold' : 'text-green-600 font-bold'}>
                      UGX {member.balance.toLocaleString()}
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
                        onClick={() => handleViewPayments(member.key, member.full_name)}
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

      {/* Payment History Modal with Edit/Delete */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Payment History - {selectedMemberName}
            </DialogTitle>
            <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-medium">UGX {selectedMemberTotal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-medium text-green-600">UGX {selectedMemberPaid.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Balance: </span>
                <span className={`font-medium ${selectedMemberBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  UGX {selectedMemberBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedMemberPayments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No payment history available
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div>Date</div>
                  <div>Amount (UGX)</div>
                  <div className="text-right">Running Total</div>
                  <div className="text-right">Actions</div>
                </div>
                
                {selectedMemberPayments.map((payment) => {
                  const contributionsArray = payment.contribution as any[] || [];
                  
                  // Calculate running total
                  let runningTotal = 0;
                  
                  return (
                    <div key={payment.id} className="space-y-2">
                      {contributionsArray.map((contrib: any, index: number) => {
                        const isEditing = editingContributionId === payment.id && editingContributionIndex === index;
                        const amount = contrib.amount || 0;
                        const date = contrib.date || '';
                        
                        // Calculate running total
                        runningTotal += amount;
                        
                        return (
                          <div 
                            key={`${payment.id}-${index}`}
                            className={`grid grid-cols-4 gap-3 text-sm py-2 border-b border-gray-100 ${
                              isEditing ? 'bg-blue-50 rounded-lg p-2 -mx-2' : ''
                            }`}
                          >
                            {isEditing ? (
                              <>
                                <td>
                                  <Input 
                                    type="date"
                                    value={editingContribution.date}
                                    onChange={(e) => setEditingContribution({
                                      ...editingContribution,
                                      date: e.target.value
                                    })}
                                    className="h-8 text-xs"
                                  />
                                </td>
                                <td>
                                  <Input 
                                    type="number"
                                    step="0.01"
                                    value={editingContribution.amount}
                                    onChange={(e) => setEditingContribution({
                                      ...editingContribution,
                                      amount: e.target.value
                                    })}
                                    className="h-8 text-xs"
                                  />
                                </td>
                                <td className="text-right font-medium">
                                  UGX {runningTotal.toLocaleString()}
                                </td>
                                <td className="text-right">
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateContribution(payment.id, index)}
                                    disabled={updatingId === payment.id}
                                    className="mr-1"
                                  >
                                    {updatingId === payment.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={cancelEdit}
                                    disabled={updatingId === payment.id}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>
                                  {date ? 
                                    new Date(date).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    }) : 
                                    'No date'
                                  }
                                </td>
                                <td className="font-medium">
                                  UGX {amount.toLocaleString()}
                                </td>
                                <td className="text-right font-medium">
                                  UGX {runningTotal.toLocaleString()}
                                </td>
                                <td className="text-right">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => startEdit(payment, index)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => deleteContribution(payment.id, index)}
                                    disabled={deletingId === payment.id}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  >
                                    {deletingId === payment.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </td>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                
                <div className="mt-4 pt-3 border-t-2 border-gray-200">
                  <div className="grid grid-cols-4 gap-3 text-base font-bold">
                    <div>Total Paid</div>
                    <div>
                      UGX {selectedMemberPaid.toLocaleString()}
                    </div>
                    <div className="text-right text-green-600">
                      UGX {selectedMemberPaid.toLocaleString()}
                    </div>
                    <div></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}