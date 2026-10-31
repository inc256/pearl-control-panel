import ProtectedPage from "@/components/layout/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { 
  Eye, 
  Pencil, 
  Save, 
  X, 
  Trash2, 
  Loader2, 
  Wallet, 
  Plus,
  Users,
  TrendingUp,
  Clock,
  UserPlus,
  Search,
  Filter,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { notifyDataChanged, readSessionCache, writeSessionCache } from "@/lib/dataCache";
import { exportToExcel } from "@/lib/exportToExcel";

type Contribution = Tables<'contributions'>;

const CONTRIBUTIONS_CACHE_KEY = "pearl:contributions";
const formatContributionAmount = (amount: number) =>
  `UGX ${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(amount)}`;

interface Member {
  id: string;
  first_name: string;
  second_name: string | null;
  date_of_birth: string | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  excess: number;
  full_name: string;
}

interface ContributionWithMember extends Contribution {
  member_id?: string;
}

function buildMembers(contributionsList: ContributionWithMember[]): Member[] {
  const memberMap = new Map<string, Member>();

  contributionsList.forEach((c) => {
    const key = `${c.first_name}-${c.second_name || ''}`;
    const totalAmount = c.total || 0;
    const contributionsArray = c.contribution as any[] || [];
    const paidAmount = contributionsArray.reduce((sum, contrib) => sum + (contrib.amount || 0), 0);
    const fullName = `${c.first_name} ${c.second_name || ''}`.trim();

    if (!memberMap.has(key)) {
      memberMap.set(key, {
        id: c.id,
        first_name: c.first_name,
        second_name: c.second_name,
        date_of_birth: c.date_of_birth,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        balance: Math.max(totalAmount - paidAmount, 0),
        excess: Math.max(paidAmount - totalAmount, 0),
        full_name: fullName
      });
      return;
    }

    const member = memberMap.get(key)!;
    member.total_amount += totalAmount;
    member.paid_amount += paidAmount;
    member.balance = Math.max(member.total_amount - member.paid_amount, 0);
    member.excess = Math.max(member.paid_amount - member.total_amount, 0);
  });

  return Array.from(memberMap.values());
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
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
  const [editingMember, setEditingMember] = useState<{
    ids: string[];
    first_name: string;
    second_name: string;
    date_of_birth: string;
    total_amount: string;
  } | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [deletingMemberKey, setDeletingMemberKey] = useState<string | null>(null);
  
  const [newMember, setNewMember] = useState({
    first_name: '',
    second_name: '',
    date_of_birth: '',
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

  const fetchData = async (forceRefresh = false) => {
    const cachedContributions = !forceRefresh
      ? readSessionCache<ContributionWithMember[]>(CONTRIBUTIONS_CACHE_KEY)
      : null;
    if (cachedContributions) {
      setContributions(cachedContributions);
      setMembers(buildMembers(cachedContributions));
      setLoading(false);
      return;
    }

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
      writeSessionCache(CONTRIBUTIONS_CACHE_KEY, contributionsList);
      setContributions(contributionsList);
      setMembers(buildMembers(contributionsList));
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
        date_of_birth: newMember.date_of_birth || null,
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
        date_of_birth: '',
        total_amount: ''
      });
      await fetchData(true);
      notifyDataChanged();
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
      await fetchData(true);
      notifyDataChanged();
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
      await fetchData(true);
      notifyDataChanged();
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

      await fetchData(true);
      notifyDataChanged();
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

  const startMemberEdit = (member: typeof memberRows[number]) => {
    setEditingMember({
      ids: member.memberContribs.map((contribution) => contribution.id),
      first_name: member.first_name,
      second_name: member.second_name || '',
      date_of_birth: member.date_of_birth || '',
      total_amount: member.totalAmount.toString()
    });
  };

  const saveMemberEdit = async () => {
    if (!editingMember?.first_name.trim()) {
      toast({ title: 'Error', description: 'First name is required', variant: 'destructive' });
      return;
    }
    if (!editingMember.total_amount || Number(editingMember.total_amount) < 0) {
      toast({ title: 'Error', description: 'Total amount must be zero or greater', variant: 'destructive' });
      return;
    }

    try {
      setSavingMember(true);
      const totalAmount = Number(editingMember.total_amount);
      await Promise.all(editingMember.ids.map((id, index) => supabase
        .from('contributions')
        .update({
          first_name: editingMember.first_name.trim(),
          second_name: editingMember.second_name.trim() || null,
          date_of_birth: editingMember.date_of_birth || null,
          total: index === 0 ? totalAmount : 0
        })
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error;
        })));
      setEditingMember(null);
      toast({ title: 'Success', description: 'Contributor details updated successfully' });
      await fetchData(true);
      notifyDataChanged();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update contributor', variant: 'destructive' });
    } finally {
      setSavingMember(false);
    }
  };

  const deleteMember = async (member: typeof memberRows[number]) => {
    if (!confirm(`Delete ${member.full_name} and all their payment history?`)) return;

    try {
      setDeletingMemberKey(member.key);
      const { error } = await supabase
        .from('contributions')
        .delete()
        .in('id', member.memberContribs.map((contribution) => contribution.id));

      if (error) throw error;
      setIsModalOpen(false);
      toast({ title: 'Success', description: 'Contributor deleted successfully' });
      await fetchData(true);
      notifyDataChanged();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete contributor', variant: 'destructive' });
    } finally {
      setDeletingMemberKey(null);
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
    const balance = Math.max(totalAmount - paidAmount, 0);
    
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
    const balance = Math.max(totalAmount - paidAmount, 0);
    const excess = Math.max(paidAmount - totalAmount, 0);
    const fullName = `${first.first_name} ${first.second_name || ''}`.trim();
    
    // Count total payments
    let paymentCount = 0;
    memberContribs.forEach(c => {
      const contribs = c.contribution as any[] || [];
      paymentCount += contribs.length;
    });
    
    return {
      key,
      memberContribs,
      first_name: first.first_name,
      second_name: first.second_name,
      date_of_birth: first.date_of_birth,
      full_name: fullName,
      totalAmount,
      paidAmount,
      balance,
      excess,
      paymentCount
    };
  });

  const getPaymentStatus = (balance: number, paid: number, excess = 0) => {
    if (excess > 0) return { label: "Over-contributed", variant: "default" };
    if (balance === 0 && paid > 0) return { label: "Fully Paid", variant: "success" };
    if (balance > 0 && paid > 0) return { label: "Partial", variant: "warning" };
    if (paid === 0 && balance > 0) return { label: "Not Started", variant: "destructive" };
    return { label: "N/A", variant: "secondary" };
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

  // Filter members
  const filteredMemberRows = memberRows.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = member.full_name.toLowerCase().includes(searchLower);
    const status = getPaymentStatus(member.balance, member.paidAmount, member.excess);
    const matchesStatus = filterStatus === 'all' || status.label.toLowerCase().replace(' ', '-') === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleExportContributions = () => {
    if (filteredMemberRows.length === 0) {
      toast({ title: "No contributions to export", description: "Adjust the filters or add a contribution first." });
      return;
    }

    exportToExcel(filteredMemberRows.map((member) => ({
      "Member": member.full_name,
      "Date of Birth": member.date_of_birth || "",
      "Total Amount": member.totalAmount,
      "Paid Amount": member.paidAmount,
      "Balance": member.balance,
      "Payment Count": member.paymentCount,
      "Status": getPaymentStatus(member.balance, member.paidAmount, member.excess).label,
    })), "contributions");
    toast({ title: "Contributions exported", description: `${filteredMemberRows.length} member${filteredMemberRows.length === 1 ? "" : "s"} exported to Excel.` });
  };

  // Stats
  const totalMembers = members.length;
  const totalExpected = members.reduce((sum, m) => sum + m.total_amount, 0);
  const totalPaid = members.reduce((sum, m) => sum + m.paid_amount, 0);
  const totalBalance = members.reduce((sum, m) => sum + m.balance, 0);
  const collectionProgress = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  if (loading) {
    return (
      <ProtectedPage title="Contributions" description="Track member contributions and payment history">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-4 text-sm">Loading contributions...</p>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage title={pageTitle} description="Track member contributions and payment history">
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive sm:mb-6 sm:p-4 sm:text-base">
          <span className="flex-1">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-sm underline hover:no-underline flex items-center gap-1 ml-2 shrink-0"
          >
            <X className="h-4 w-4" /> Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards - Responsive */}
      <div className="mx-auto mb-4 grid w-full max-w-[1600px] grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="rounded-xl bg-primary/10 p-2 text-primary sm:p-3">
                <Users className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Members</p>
                <p className="text-lg sm:text-2xl font-semibold">{totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="rounded-xl bg-primary/10 p-2 text-primary sm:p-3">
                <Wallet className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Expected</p>
                <p className="break-words text-xs font-semibold leading-snug tabular-nums sm:text-2xl">
                  {formatContributionAmount(totalExpected)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="rounded-xl bg-primary/10 p-2 text-primary sm:p-3">
                <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Paid</p>
                <p className="break-words text-xs font-semibold leading-snug tabular-nums text-primary sm:text-2xl">
                  {formatContributionAmount(totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="rounded-xl bg-primary/10 p-2 text-primary sm:p-3">
                <Clock className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Balance</p>
                <p className="break-words text-xs font-semibold leading-snug tabular-nums text-foreground sm:text-2xl">
                  {formatContributionAmount(totalBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-4 rounded-2xl border-border bg-gradient-to-br from-primary/[0.04] via-card to-card shadow-sm sm:mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-xs sm:text-sm text-muted-foreground">Overall Collection Progress</span>
              <span className="text-sm font-semibold tabular-nums text-primary sm:text-base">{collectionProgress.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(collectionProgress, 100)}%` }}
              />
            </div>
            <div className="flex flex-col xs:flex-row justify-between gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <span>{formatContributionAmount(totalPaid)} collected</span>
              <span className="hidden xs:inline">•</span>
              <span>{formatContributionAmount(totalBalance)} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Forms - Side by Side */}
      <div className="mx-auto mb-4 grid w-full max-w-[1600px] gap-4 sm:mb-6 sm:gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Add New Member
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {members.length} members currently registered
            </p>
          </CardHeader>
          <form onSubmit={handleNewMemberSubmit}>
            <CardContent className="p-3 sm:p-6">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    First name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="first_name"
                    placeholder="e.g., Amina" 
                    value={newMember.first_name}
                    onChange={(e) => setNewMember({...newMember, first_name: e.target.value})}
                    required
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Last name
                  </Label>
                  <Input 
                    id="second_name"
                    placeholder="e.g., Nabirye" 
                    value={newMember.second_name}
                    onChange={(e) => setNewMember({...newMember, second_name: e.target.value})}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Date of birth
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newMember.date_of_birth}
                    onChange={(e) => setNewMember({...newMember, date_of_birth: e.target.value})}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Total Amount (UGX) <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="total_amount"
                    type="number" 
                    placeholder="0"
                    value={newMember.total_amount}
                    onChange={(e) => setNewMember({...newMember, total_amount: e.target.value})}
                    min="0"
                    step="0.01"
                    required
                    className="h-9 sm:h-10 text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    This is the total amount the member needs to pay
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full h-9 sm:h-10 text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add new member
                  </Button>
                </div>
              </div>
            </CardContent>
          </form>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Add Payment
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Select a member to add a new payment
            </p>
          </CardHeader>
          <form onSubmit={handleExistingMemberSubmit}>
            <CardContent className="p-3 sm:p-6">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Choose member <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={existingMember.member_id}
                    onValueChange={(value) => setExistingMember({...existingMember, member_id: value})}
                    required
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm">
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
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Payment date <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="existing_date"
                    type="date" 
                    value={existingMember.date}
                    onChange={(e) => setExistingMember({...existingMember, date: e.target.value})}
                    required
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Amount (UGX) <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="existing_amount"
                    type="number" 
                    placeholder="0" 
                    value={existingMember.amount}
                    onChange={(e) => setExistingMember({...existingMember, amount: e.target.value})}
                    required
                    min="1"
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button 
                    type="submit" 
                    className="w-full h-9 sm:h-10 text-sm"
                    disabled={members.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add payment
                  </Button>
                </div>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>

      {/* Contribution Ledger */}
      <Card className="mx-auto w-full max-w-[1600px] overflow-hidden rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/70 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Contribution Ledger
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {filteredMemberRows.length} of {memberRows.length} member{memberRows.length !== 1 ? 's' : ''} with contributions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="w-fit border-primary/15 bg-primary/5 text-xs text-primary sm:text-sm">
                {filteredMemberRows.length} members
              </Badge>
              <Button variant="outline" size="sm" onClick={handleExportContributions} className="h-8 rounded-lg text-xs sm:h-9 sm:text-sm" type="button">
                <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Search and Filters - Responsive */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col xs:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl border-border bg-background pl-9 text-sm sm:max-w-md"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 shrink-0"
              >
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Filters</span>
                {showFilters ? <ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
              </Button>
            </div>
            
            {/* Filters - Collapsible */}
            <div className={`flex flex-col sm:flex-row gap-2 transition-all duration-200 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="fully-paid">Fully Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="over-contributed">Over-contributed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredMemberRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 opacity-20" />
              <p className="mt-3 sm:mt-4 text-sm text-center px-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No members match your filters' 
                  : 'No contributions found'}
              </p>
              {(searchTerm || filterStatus !== 'all') && (
                <p className="text-xs sm:text-sm mt-1">Try adjusting your search or filters</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-xs">Contributor</TableHead>
                      <TableHead className="font-semibold text-xs">Financial summary</TableHead>
                      <TableHead className="font-semibold text-xs">Progress</TableHead>
                      <TableHead className="font-semibold text-xs">Payments</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMemberRows.map((member) => {
                      const status = getPaymentStatus(member.balance, member.paidAmount, member.excess);
                      const progress = member.totalAmount > 0 ? (member.paidAmount / member.totalAmount) * 100 : 0;
                      const badgeVariant = status.variant as "default" | "success" | "warning" | "destructive" | "secondary";

                      return (
                        <TableRow key={member.key} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="min-w-[180px]">
                            <p className="font-medium text-sm">{member.full_name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              DOB: {member.date_of_birth || 'Not provided'}
                            </p>
                          </TableCell>
                          <TableCell className="min-w-[210px]">
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Total</p>
                                <p className="mt-0.5 font-medium">{formatContributionAmount(member.totalAmount)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Paid</p>
                                <p className="mt-0.5 font-medium text-primary">{formatContributionAmount(member.paidAmount)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Balance</p>
                                <p className={cn("mt-0.5 font-medium", member.balance > 0 ? "text-foreground" : "text-muted-foreground")}>
                                  {member.balance > 0 ? formatContributionAmount(member.balance) : member.excess > 0 ? `${formatContributionAmount(member.excess)} extra` : '—'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[120px] space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium">{Math.round(progress)}%</span>
                                <Badge variant={badgeVariant} className="capitalize text-[10px]">
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-500"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex whitespace-nowrap items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {member.paymentCount} payment{member.paymentCount !== 1 ? 's' : ''}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPayments(member.key, member.full_name)}
                              className="inline-flex items-center gap-1 sm:gap-2 h-7 sm:h-8 text-xs sm:text-sm"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startMemberEdit(member)}
                              className="h-7 w-7 p-0"
                              title="Edit contributor"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMember(member)}
                              disabled={deletingMemberKey === member.key}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              title="Delete contributor"
                            >
                              {deletingMemberKey === member.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {filteredMemberRows.map((member) => {
                  const status = getPaymentStatus(member.balance, member.paidAmount, member.excess);
                  const progress = member.totalAmount > 0 ? (member.paidAmount / member.totalAmount) * 100 : 0;
                  const isExpanded = expandedRows.has(member.key);
                  const badgeVariant = status.variant as "default" | "success" | "warning" | "destructive" | "secondary";

                  return (
                    <div key={member.key} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm sm:text-base">{member.full_name}</span>
                            <Badge
                              variant={badgeVariant}
                              className="capitalize text-[10px]"
                            >
                              {status.label}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            DOB: {member.date_of_birth || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm">
                            <span className="text-muted-foreground">Balance:</span>
                            {member.balance > 0 ? (
                              <span className="font-medium text-foreground">
                                {formatContributionAmount(member.balance)}
                              </span>
                            ) : (
                              <span className="text-primary font-medium">{member.excess > 0 ? `${formatContributionAmount(member.excess)} overpaid` : "Fully Paid ✓"}</span>
                            )}
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">Payments:</span>
                            <span className="font-medium">{member.paymentCount}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpand(member.key)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0 ml-2"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>

                      {/* Progress bar always visible */}
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs font-medium">{Math.round(progress)}%</span>
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total:</span>
                              <span className="ml-1 font-medium">{formatContributionAmount(member.totalAmount)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Paid:</span>
                              <span className="ml-1 font-medium text-primary">
                                {formatContributionAmount(member.paidAmount)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPayments(member.key, member.full_name)}
                            className="w-full h-8 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            View Payments ({member.paymentCount})
                          </Button>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => startMemberEdit(member)} className="flex-1 h-8 text-xs">
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit contributor
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteMember(member)} disabled={deletingMemberKey === member.key} className="h-8 px-3 text-xs text-red-500">
                              {deletingMemberKey === member.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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

      {/* Payment History Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
              <Wallet className="h-5 w-5 text-primary" />
              Payment History - {selectedMemberName}
            </DialogTitle>
            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-medium">{formatContributionAmount(selectedMemberTotal)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-sm font-medium text-primary">{formatContributionAmount(selectedMemberPaid)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-sm font-medium text-foreground">
                  {formatContributionAmount(selectedMemberBalance)}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedMemberPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 opacity-20" />
                <p className="mt-4 text-sm">No payment history available</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="hidden sm:grid grid-cols-4 gap-3 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div>Date</div>
                  <div>Amount (UGX)</div>
                  <div className="text-right">Running Total</div>
                  <div className="text-right">Actions</div>
                </div>
                
                {selectedMemberPayments.map((payment) => {
                  const contributionsArray = payment.contribution as any[] || [];
                  let runningTotal = 0;
                  
                  return (
                    <div key={payment.id} className="space-y-2">
                      {contributionsArray.map((contrib: any, index: number) => {
                        const isEditing = editingContributionId === payment.id && editingContributionIndex === index;
                        const amount = contrib.amount || 0;
                        const date = contrib.date || '';
                        runningTotal += amount;
                        
                        return (
                          <div 
                            key={`${payment.id}-${index}`}
                            className={`grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 text-sm py-2 border-b border-gray-100 dark:border-gray-800 ${
                              isEditing ? 'rounded-lg bg-primary/5 p-3 -mx-2' : ''
                            }`}
                          >
                            {isEditing ? (
                              <>
                                <div className="sm:col-span-1">
                                  <Label className="text-xs text-muted-foreground sm:hidden">Date</Label>
                                  <Input 
                                    type="date"
                                    value={editingContribution.date}
                                    onChange={(e) => setEditingContribution({
                                      ...editingContribution,
                                      date: e.target.value
                                    })}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="sm:col-span-1">
                                  <Label className="text-xs text-muted-foreground sm:hidden">Amount</Label>
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
                                </div>
                                <div className="sm:col-span-1 text-right font-medium">
                                  <span className="text-xs text-muted-foreground sm:hidden">Running Total: </span>
                                  UGX {runningTotal.toLocaleString()}
                                </div>
                                <div className="sm:col-span-1 text-right">
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateContribution(payment.id, index)}
                                    disabled={updatingId === payment.id}
                                    className="mr-1 h-8 w-8 p-0"
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
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <span className="text-xs text-muted-foreground sm:hidden">Date: </span>
                                  {date ? 
                                    new Date(date).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    }) : 
                                    'No date'
                                  }
                                </div>
                                <div className="font-medium">
                                  <span className="text-xs text-muted-foreground sm:hidden">Amount: </span>
                                  UGX {amount.toLocaleString()}
                                </div>
                                <div className="text-right font-medium">
                                  <span className="text-xs text-muted-foreground sm:hidden">Running Total: </span>
                                  UGX {runningTotal.toLocaleString()}
                                </div>
                                <div className="text-right">
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
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                
                <div className="mt-4 pt-3 border-t-2 border-primary/20">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-base font-bold">
                    <div className="text-primary">Total Paid</div>
                    <div className="text-right font-mono">
                      UGX {selectedMemberPaid.toLocaleString()}
                    </div>
                    <div className="text-right font-mono text-primary">
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

      <Dialog open={editingMember !== null} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit contributor</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-first-name">First name</Label>
                  <Input id="edit-first-name" value={editingMember.first_name} onChange={(e) => setEditingMember({...editingMember, first_name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-second-name">Last name</Label>
                  <Input id="edit-second-name" value={editingMember.second_name} onChange={(e) => setEditingMember({...editingMember, second_name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-date-of-birth">Date of birth</Label>
                <Input id="edit-date-of-birth" type="date" value={editingMember.date_of_birth} onChange={(e) => setEditingMember({...editingMember, date_of_birth: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-total-amount">Total amount (UGX)</Label>
                <Input id="edit-total-amount" type="number" min="0" step="0.01" value={editingMember.total_amount} onChange={(e) => setEditingMember({...editingMember, total_amount: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
                <Button type="button" onClick={saveMemberEdit} disabled={savingMember}>
                  {savingMember ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}