// pages/admin/business-stats.tsx
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Eye, 
  FileSpreadsheet, 
  X,
  Loader2, 
  Pencil, 
  Trash2, 
  Save,
  TrendingUp,
  Plus,
  Calendar,
  DollarSign,
  AlertCircle
} from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/components/ui/use-toast";

interface Income {
  id: number;
  created_at: string;
  date: string | null;
  description: string | null;
  amount: number | null;
}

interface Expenditure {
  id: number;
  created_at: string;
  date: string | null;
  description: string | null;
  amount: number | null;
}

export default function BusinessStats() {
  useEffect(() => { document.title = "Business Stats — Pearl Hijja Admin"; }, []);
  const { toast } = useToast();
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [showIncomeList, setShowIncomeList] = useState(false);
  const [showExpenditureList, setShowExpenditureList] = useState(false);
  const [incomeRows, setIncomeRows] = useState<Income[]>([]);
  const [expenditureRows, setExpenditureRows] = useState<Expenditure[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingExpenditure, setSavingExpenditure] = useState(false);
  const incomeModalRef = useRef<HTMLDivElement>(null);
  const expenditureModalRef = useRef<HTMLDivElement>(null);

  // Editing states
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
  const [editingExpenditureId, setEditingExpenditureId] = useState<number | null>(null);
  const [editingIncome, setEditingIncome] = useState<{ description: string; amount: string; date: string }>({
    description: '',
    amount: '',
    date: ''
  });
  const [editingExpenditure, setEditingExpenditure] = useState<{ description: string; amount: string; date: string }>({
    description: '',
    amount: '',
    date: ''
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Form states
  const [incomeForm, setIncomeForm] = useState({
    date: '',
    description: '',
    amount: ''
  });
  const [expenditureForm, setExpenditureForm] = useState({
    date: '',
    description: '',
    amount: ''
  });

  const incomeTotal = incomeRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const expenditureTotal = expenditureRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const net = incomeTotal - expenditureTotal;

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [incomeResult, expenditureResult] = await Promise.all([
        supabase.from('income').select('*').order('created_at', { ascending: false }),
        supabase.from('expenditure').select('*').order('created_at', { ascending: false })
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenditureResult.error) throw expenditureResult.error;

      setIncomeRows(incomeResult.data || []);
      setExpenditureRows(expenditureResult.data || []);
      setLoadingError(null);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setLoadingError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Click outside to close floating cards
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showIncomeList && !showExpenditureList) return;
      
      if (showIncomeList && incomeModalRef.current && !incomeModalRef.current.contains(event.target as Node)) {
        setShowIncomeList(false);
      }
      
      if (showExpenditureList && expenditureModalRef.current && !expenditureModalRef.current.contains(event.target as Node)) {
        setShowExpenditureList(false);
      }
    };
    
    // Small delay to prevent the click that opened the modal from triggering the close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 200);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showIncomeList, showExpenditureList]);

  // Save income
  const saveIncome = async () => {
    if (!incomeForm.description || !incomeForm.amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingIncome(true);
      
      const insertData: any = {
        description: incomeForm.description,
        amount: parseFloat(incomeForm.amount),
      };
      
      if (incomeForm.date) {
        insertData.date = incomeForm.date;
      }

      const { data, error } = await supabase
        .from('income')
        .insert(insertData)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Income record saved successfully",
      });

      setIncomeForm({ date: '', description: '', amount: '' });
      await fetchData();
    } catch (error: any) {
      console.error('Error saving income:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save income record",
        variant: "destructive",
      });
    } finally {
      setSavingIncome(false);
    }
  };

  // Save expenditure
  const saveExpenditure = async () => {
    if (!expenditureForm.description || !expenditureForm.amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingExpenditure(true);
      
      const insertData: any = {
        description: expenditureForm.description,
        amount: parseFloat(expenditureForm.amount),
      };
      
      if (expenditureForm.date) {
        insertData.date = expenditureForm.date;
      }

      const { data, error } = await supabase
        .from('expenditure')
        .insert(insertData)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expenditure record saved successfully",
      });

      setExpenditureForm({ date: '', description: '', amount: '' });
      await fetchData();
    } catch (error: any) {
      console.error('Error saving expenditure:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save expenditure record",
        variant: "destructive",
      });
    } finally {
      setSavingExpenditure(false);
    }
  };

  // Update income
  const updateIncome = async (id: number) => {
    if (!editingIncome.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    if (!editingIncome.amount || parseFloat(editingIncome.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(id);
      
      const updateData: any = {
        description: editingIncome.description.trim(),
        amount: parseFloat(editingIncome.amount),
      };
      
      if (editingIncome.date) {
        updateData.date = editingIncome.date;
      } else {
        updateData.date = null;
      }

      const { data, error } = await supabase
        .from('income')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No record was updated. The ID might not exist.');
      }

      toast({
        title: "Success",
        description: "Income record updated successfully",
      });

      setEditingIncomeId(null);
      setEditingIncome({ description: '', amount: '', date: '' });
      await fetchData();
    } catch (error: any) {
      console.error('Error updating income:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update income record",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Update expenditure
  const updateExpenditure = async (id: number) => {
    if (!editingExpenditure.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    if (!editingExpenditure.amount || parseFloat(editingExpenditure.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(id);
      
      const updateData: any = {
        description: editingExpenditure.description.trim(),
        amount: parseFloat(editingExpenditure.amount),
      };
      
      if (editingExpenditure.date) {
        updateData.date = editingExpenditure.date;
      } else {
        updateData.date = null;
      }

      const { data, error } = await supabase
        .from('expenditure')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No record was updated. The ID might not exist.');
      }

      toast({
        title: "Success",
        description: "Expenditure record updated successfully",
      });

      setEditingExpenditureId(null);
      setEditingExpenditure({ description: '', amount: '', date: '' });
      await fetchData();
    } catch (error: any) {
      console.error('Error updating expenditure:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update expenditure record",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete income
  const deleteIncome = async (id: number) => {
    if (!confirm('Are you sure you want to delete this income record?')) return;

    try {
      setDeletingId(id);
      const { data, error } = await supabase
        .from('income')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No record was deleted. The ID might not exist.');
      }

      toast({
        title: "Success",
        description: "Income record deleted successfully",
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error deleting income:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete income record",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Delete expenditure
  const deleteExpenditure = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expenditure record?')) return;

    try {
      setDeletingId(id);
      const { data, error } = await supabase
        .from('expenditure')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No record was deleted. The ID might not exist.');
      }

      toast({
        title: "Success",
        description: "Expenditure record deleted successfully",
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error deleting expenditure:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete expenditure record",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Start editing income
  const startEditIncome = (row: Income) => {
    setEditingIncomeId(row.id);
    setEditingIncome({
      description: row.description || '',
      amount: row.amount?.toString() || '',
      date: row.date || ''
    });
  };

  // Start editing expenditure
  const startEditExpenditure = (row: Expenditure) => {
    setEditingExpenditureId(row.id);
    setEditingExpenditure({
      description: row.description || '',
      amount: row.amount?.toString() || '',
      date: row.date || ''
    });
  };

  // Cancel editing
  const cancelEditIncome = () => {
    setEditingIncomeId(null);
    setEditingIncome({ description: '', amount: '', date: '' });
  };

  const cancelEditExpenditure = () => {
    setEditingExpenditureId(null);
    setEditingExpenditure({ description: '', amount: '', date: '' });
  };

  // Export functions
  const exportToXLS = (data: any[], title: string) => {
    const exportData = data.map(row => ({
      Date: row.date ? new Date(row.date).toLocaleDateString() : 'No Date',
      Description: row.description || '',
      Amount: row.amount || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
    toast({
      title: "Success",
      description: `${title} exported successfully`,
    });
  };

  // Helper function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No Date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `UGX ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `UGX ${(amount / 1000).toFixed(1)}K`;
    }
    return `UGX ${amount.toFixed(0)}`;
  };

  // Handler functions
  const handleViewIncome = () => {
    setShowIncomeList(true);
  };

  const handleViewExpenditure = () => {
    setShowExpenditureList(true);
  };

  const handleExportIncome = () => {
    if (incomeRows.length === 0) {
      toast({
        title: "Info",
        description: "No income records to export",
        variant: "default",
      });
      return;
    }
    exportToXLS(incomeRows, 'Income List');
  };

  const handleExportExpenditure = () => {
    if (expenditureRows.length === 0) {
      toast({
        title: "Info",
        description: "No expenditure records to export",
        variant: "default",
      });
      return;
    }
    exportToXLS(expenditureRows, 'Expenditure List');
  };

  const closeIncomeModal = () => {
    setShowIncomeList(false);
  };

  const closeExpenditureModal = () => {
    setShowExpenditureList(false);
  };

  if (loading) {
    return (
      <AdminLayout title="Business Stats" description="Track income, expenditure, and performance indicators">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Loading business stats...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Business Stats" description="Track income, expenditure, and performance indicators">
      {/* Error State */}
      {loadingError && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <CardContent className="py-4 flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm">Error loading data: {loadingError}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              className="ml-auto border-red-300 hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/30"
              type="button"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid - 3 cards */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-1 w-12 bg-primary rounded-full" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Financial Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Income Card */}
          <Card className="group relative overflow-hidden transition-all hover:shadow-lg border-0 shadow-sm">
            {/* FIX: Added pointer-events-none to the overlay */}
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-green-500 to-transparent pointer-events-none" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Income</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 truncate mt-1">
                    {formatCurrency(incomeTotal)}
                  </p>
                </div>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 shrink-0 ml-2">
                  <ArrowUpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleViewIncome}
                  className="text-xs flex-1 bg-primary hover:bg-primary/90 text-white"
                  disabled={incomeRows.length === 0}
                  type="button"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View all ({incomeRows.length})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportIncome}
                  disabled={incomeRows.length === 0}
                  className="text-xs flex-1"
                  type="button"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  XLS
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Expenditure Card */}
          <Card className="group relative overflow-hidden transition-all hover:shadow-lg border-0 shadow-sm">
            {/* FIX: Added pointer-events-none to the overlay */}
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-rose-500 to-transparent pointer-events-none" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenditure</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 truncate mt-1">
                    {formatCurrency(expenditureTotal)}
                  </p>
                </div>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800 shrink-0 ml-2">
                  <ArrowDownCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleViewExpenditure}
                  className="text-xs flex-1 bg-primary hover:bg-primary/90 text-white"
                  disabled={expenditureRows.length === 0}
                  type="button"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View all ({expenditureRows.length})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportExpenditure}
                  disabled={expenditureRows.length === 0}
                  className="text-xs flex-1"
                  type="button"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  XLS
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Net Profit Card */}
          <Card className="group relative overflow-hidden transition-all hover:shadow-lg border-0 shadow-sm">
            {/* FIX: Added pointer-events-none to the overlay */}
            <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${net >= 0 ? 'from-green-500' : 'from-red-500'} to-transparent pointer-events-none`} />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Profit</p>
                  <p className={`text-xl sm:text-2xl font-bold truncate mt-1 ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(net)}
                  </p>
                </div>
                <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border shrink-0 ml-2 ${
                  net >= 0 
                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                }`}>
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="mt-3">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${net >= 0 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'}`}
                >
                  {net >= 0 ? 'Profit' : 'Loss'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forms Section - Inputs aligned in perfect horizontal line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Add Income Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              Add Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Date
                </Label>
                <Input 
                  type="date" 
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Income Source</Label>
                <Input 
                  placeholder="e.g., Visa processing" 
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Amount (UGX)
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    className="h-9 text-sm flex-1"
                  />
                  <Button 
                    onClick={saveIncome} 
                    disabled={savingIncome}
                    className="h-9 bg-green-600 hover:bg-green-700 text-white whitespace-nowrap px-4"
                    type="button"
                  >
                    {savingIncome ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Expenditure Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
              Add Expenditure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Date
                </Label>
                <Input 
                  type="date"
                  value={expenditureForm.date}
                  onChange={(e) => setExpenditureForm({ ...expenditureForm, date: e.target.value })}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Expenditure</Label>
                <Input 
                  placeholder="e.g., Office rent"
                  value={expenditureForm.description}
                  onChange={(e) => setExpenditureForm({ ...expenditureForm, description: e.target.value })}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Amount (UGX)
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0"
                    value={expenditureForm.amount}
                    onChange={(e) => setExpenditureForm({ ...expenditureForm, amount: e.target.value })}
                    className="h-9 text-sm flex-1"
                  />
                  <Button 
                    onClick={saveExpenditure}
                    disabled={savingExpenditure}
                    className="h-9 bg-red-600 hover:bg-red-700 text-white whitespace-nowrap px-4"
                    type="button"
                  >
                    {savingExpenditure ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Modal for Income List */}
      {showIncomeList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card ref={incomeModalRef} className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b gap-3 sm:gap-0 pr-14">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Income List
                  <Badge variant="secondary" className="text-xs font-normal">
                    {incomeRows.length} records
                  </Badge>
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportIncome}
                  className="text-xs"
                  type="button"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  XLS
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={closeIncomeModal}
                  className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {incomeRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-muted-foreground">No income records found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Income Source</TableHead>
                          <TableHead className="text-right text-xs">Amount</TableHead>
                          <TableHead className="text-right text-xs">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeRows.map((row) => (
                          <TableRow key={row.id}>
                            {editingIncomeId === row.id ? (
                              <>
                                <TableCell>
                                  <Input 
                                    type="date"
                                    value={editingIncome.date}
                                    onChange={(e) => setEditingIncome({ ...editingIncome, date: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    value={editingIncome.description}
                                    onChange={(e) => setEditingIncome({ ...editingIncome, description: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number"
                                    step="0.01"
                                    value={editingIncome.amount}
                                    onChange={(e) => setEditingIncome({ ...editingIncome, amount: e.target.value })}
                                    className="h-8 text-xs text-right"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateIncome(row.id)}
                                    disabled={updatingId === row.id}
                                    className="mr-1"
                                    type="button"
                                  >
                                    {updatingId === row.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={cancelEditIncome}
                                    disabled={updatingId === row.id}
                                    type="button"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-sm">{formatDate(row.date)}</TableCell>
                                <TableCell className="text-sm">{row.description || 'N/A'}</TableCell>
                                <TableCell className="text-right text-sm font-medium text-green-600 dark:text-green-400">
                                  UGX {row.amount?.toLocaleString() || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => startEditIncome(row)}
                                    className="h-8 w-8 p-0"
                                    type="button"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => deleteIncome(row.id)}
                                    disabled={deletingId === row.id}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                    type="button"
                                  >
                                    {deletingId === row.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-right font-semibold text-base text-green-600 dark:text-green-400">
                      Total Income: UGX {incomeRows.reduce((sum, row) => sum + (row.amount || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Modal for Expenditure List */}
      {showExpenditureList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card ref={expenditureModalRef} className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b gap-3 sm:gap-0 pr-14">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Expenditure List
                  <Badge variant="secondary" className="text-xs font-normal">
                    {expenditureRows.length} records
                  </Badge>
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportExpenditure}
                  className="text-xs"
                  type="button"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  XLS
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={closeExpenditureModal}
                  className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {expenditureRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-muted-foreground">No expenditure records found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Expenditure</TableHead>
                          <TableHead className="text-right text-xs">Amount</TableHead>
                          <TableHead className="text-right text-xs">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenditureRows.map((row) => (
                          <TableRow key={row.id}>
                            {editingExpenditureId === row.id ? (
                              <>
                                <TableCell>
                                  <Input 
                                    type="date"
                                    value={editingExpenditure.date}
                                    onChange={(e) => setEditingExpenditure({ ...editingExpenditure, date: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    value={editingExpenditure.description}
                                    onChange={(e) => setEditingExpenditure({ ...editingExpenditure, description: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number"
                                    step="0.01"
                                    value={editingExpenditure.amount}
                                    onChange={(e) => setEditingExpenditure({ ...editingExpenditure, amount: e.target.value })}
                                    className="h-8 text-xs text-right"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateExpenditure(row.id)}
                                    disabled={updatingId === row.id}
                                    className="mr-1"
                                    type="button"
                                  >
                                    {updatingId === row.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={cancelEditExpenditure}
                                    disabled={updatingId === row.id}
                                    type="button"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-sm">{formatDate(row.date)}</TableCell>
                                <TableCell className="text-sm">{row.description || 'N/A'}</TableCell>
                                <TableCell className="text-right text-sm font-medium text-red-600 dark:text-red-400">
                                  UGX {row.amount?.toLocaleString() || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => startEditExpenditure(row)}
                                    className="h-8 w-8 p-0"
                                    type="button"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => deleteExpenditure(row.id)}
                                    disabled={deletingId === row.id}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                    type="button"
                                  >
                                    {deletingId === row.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-right font-semibold text-base text-red-600 dark:text-red-400">
                      Total Expenditure: UGX {expenditureRows.reduce((sum, row) => sum + (row.amount || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}