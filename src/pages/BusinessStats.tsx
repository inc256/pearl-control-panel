import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Eye, 
  FileText, 
  FileSpreadsheet, 
  X,
  Loader2, 
  Pencil, 
  Trash2, 
  Save,
  TrendingUp,
  ClipboardList
} from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
  const [bookingCount, setBookingCount] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

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
      const [incomeResult, expenditureResult, bookingsResult] = await Promise.all([
        supabase.from('income').select('*').order('created_at', { ascending: false }),
        supabase.from('expenditure').select('*').order('created_at', { ascending: false }),
        supabase.from('bookings').select('id', { count: 'exact', head: true })
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenditureResult.error) throw expenditureResult.error;
      if (bookingsResult.error) throw bookingsResult.error;

      setIncomeRows(incomeResult.data || []);
      setExpenditureRows(expenditureResult.data || []);
      setBookingCount(bookingsResult.count || 0);
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
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowIncomeList(false);
        setShowExpenditureList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      console.log('Saving income with data:', insertData);

      const { data, error } = await supabase
        .from('income')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Save response:', data);

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

      console.log('Saving expenditure with data:', insertData);

      const { data, error } = await supabase
        .from('expenditure')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Save response:', data);

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

  // Update income with better error handling
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
      
      // Only include date if it's provided
      if (editingIncome.date) {
        updateData.date = editingIncome.date;
      } else {
        updateData.date = null; // Explicitly set to null if empty
      }

      console.log('Updating income ID:', id);
      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('income')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update response:', data);

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

  // Update expenditure with better error handling
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
      
      // Only include date if it's provided
      if (editingExpenditure.date) {
        updateData.date = editingExpenditure.date;
      } else {
        updateData.date = null; // Explicitly set to null if empty
      }

      console.log('Updating expenditure ID:', id);
      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('expenditure')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update response:', data);

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

  // Delete income with better error handling
  const deleteIncome = async (id: number) => {
    if (!confirm('Are you sure you want to delete this income record?')) return;

    try {
      setDeletingId(id);
      console.log('Deleting income ID:', id);

      const { data, error } = await supabase
        .from('income')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Delete response:', data);

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

  // Delete expenditure with better error handling
  const deleteExpenditure = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expenditure record?')) return;

    try {
      setDeletingId(id);
      console.log('Deleting expenditure ID:', id);

      const { data, error } = await supabase
        .from('expenditure')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Delete response:', data);

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
  const exportToPDF = (data: any[], title: string) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    
    const tableData = data.map(row => [
      row.date ? new Date(row.date).toLocaleDateString() : 'No Date',
      row.description || '',
      `UGX${row.amount?.toLocaleString() || 0}`
    ]);

    doc.autoTable({
      head: [['Date', 'Description', 'Amount']],
      body: tableData,
      startY: 20,
    });
    
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

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

  // Render mobile action buttons
  const ActionButtons = ({ 
    onView, 
    onPDF, 
    onXLS, 
    count, 
    disabled = false 
  }: { 
    onView: () => void; 
    onPDF: () => void; 
    onXLS: () => void; 
    count: number;
    disabled?: boolean;
  }) => (
    <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onView}
        disabled={disabled || count === 0}
        className="flex-1 sm:flex-none"
      >
        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
        <span className="text-xs sm:text-sm">View ({count})</span>
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onPDF}
        disabled={disabled || count === 0}
        className="flex-1 sm:flex-none"
      >
        <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
        <span className="text-xs sm:text-sm">PDF</span>
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onXLS}
        disabled={disabled || count === 0}
        className="flex-1 sm:flex-none"
      >
        <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
        <span className="text-xs sm:text-sm">XLS</span>
      </Button>
    </div>
  );

  return (
    <AdminLayout title="Business Stats" description="Track income, expenditure, and performance indicators">
      {/* Hero Section */}
      <div className="rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 text-primary-foreground" style={{ background: "var(--gradient-burgundy)" }}>
        <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-80">Pearl Hijja and Umrah Services (U) Ltd</p>
        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl mt-1">Welcome to Pearl Admin Console.</h2>
        <p className="opacity-90 text-xs sm:text-sm mt-1 sm:mt-2 max-w-xl">Manage the business statistics and performance indicators.</p>
      </div>

      {loadingError && (
        <Card className="mb-4 sm:mb-6 border-destructive">
          <CardContent className="py-3 sm:py-4 text-xs sm:text-sm text-destructive">
            Error loading data: {loadingError}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid - 2 columns on wide screen, 1 column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-2">
              <ArrowUpCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Income</span>
              <span className="xs:hidden">Inc</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold truncate">
              UGX{incomeTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-2">
              <ArrowDownCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Expenditure</span>
              <span className="xs:hidden">Exp</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold truncate">
              UGX{expenditureTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold truncate ${net < 0 ? 'text-red-500' : net > 0 ? 'text-green-500' : ''}`}>
              UGX{net.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-2">
              <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Bookings</span>
              <span className="xs:hidden">Bkg</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold">{bookingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Add Income Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="text-base sm:text-lg">Add Income</CardTitle>
            <ActionButtons 
              onView={() => setShowIncomeList(true)}
              onPDF={() => exportToPDF(incomeRows, 'Income List')}
              onXLS={() => exportToXLS(incomeRows, 'Income List')}
              count={incomeRows.length}
              disabled={loading}
            />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Date (optional)</Label>
                <Input 
                  type="date" 
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Income source</Label>
                <Input 
                  placeholder="Visa processing" 
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Amount (UGX)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <Button 
              onClick={saveIncome} 
              disabled={savingIncome}
              className="w-full sm:w-auto"
            >
              {savingIncome ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save income record'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Add Expenditure Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="text-base sm:text-lg">Add Expenditure</CardTitle>
            <ActionButtons 
              onView={() => setShowExpenditureList(true)}
              onPDF={() => exportToPDF(expenditureRows, 'Expenditure List')}
              onXLS={() => exportToXLS(expenditureRows, 'Expenditure List')}
              count={expenditureRows.length}
              disabled={loading}
            />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Date (optional)</Label>
                <Input 
                  type="date"
                  value={expenditureForm.date}
                  onChange={(e) => setExpenditureForm({ ...expenditureForm, date: e.target.value })}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Expenditure</Label>
                <Input 
                  placeholder="Office rent"
                  value={expenditureForm.description}
                  onChange={(e) => setExpenditureForm({ ...expenditureForm, description: e.target.value })}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Amount (UGX)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0"
                  value={expenditureForm.amount}
                  onChange={(e) => setExpenditureForm({ ...expenditureForm, amount: e.target.value })}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={saveExpenditure}
              disabled={savingExpenditure}
              className="w-full sm:w-auto"
            >
              {savingExpenditure ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save expenditure record'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Floating Modal for Income List */}
      {showIncomeList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
          <Card ref={modalRef} className="w-full max-w-full sm:max-w-3xl lg:max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col mx-2 sm:mx-4">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b gap-2 sm:gap-0">
              <CardTitle className="text-base sm:text-xl">
                Income List
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToPDF(incomeRows, 'Income List')}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToXLS(incomeRows, 'Income List')}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  XLS
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowIncomeList(false)}
                  className="flex-1 sm:flex-none"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 sm:p-4">
              {incomeRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No income records found</p>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Date</TableHead>
                          <TableHead className="text-xs sm:text-sm">Income</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
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
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-xs sm:text-sm">{formatDate(row.date)}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{row.description || 'N/A'}</TableCell>
                                <TableCell className="text-right text-xs sm:text-sm font-medium">
                                  UGX{row.amount?.toLocaleString() || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => startEditIncome(row)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => deleteIncome(row.id)}
                                    disabled={deletingId === row.id}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
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
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <p className="text-right font-semibold text-sm sm:text-base">
                      Total: UGX{incomeRows.reduce((sum, row) => sum + (row.amount || 0), 0).toLocaleString()}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
          <Card ref={modalRef} className="w-full max-w-full sm:max-w-3xl lg:max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col mx-2 sm:mx-4">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b gap-2 sm:gap-0">
              <CardTitle className="text-base sm:text-xl">
                Expenditure List
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToPDF(expenditureRows, 'Expenditure List')}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToXLS(expenditureRows, 'Expenditure List')}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  XLS
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowExpenditureList(false)}
                  className="flex-1 sm:flex-none"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 sm:p-4">
              {expenditureRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No expenditure records found</p>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Date</TableHead>
                          <TableHead className="text-xs sm:text-sm">Expenditure</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
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
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-xs sm:text-sm">{formatDate(row.date)}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{row.description || 'N/A'}</TableCell>
                                <TableCell className="text-right text-xs sm:text-sm font-medium">
                                  UGX{row.amount?.toLocaleString() || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => startEditExpenditure(row)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => deleteExpenditure(row.id)}
                                    disabled={deletingId === row.id}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
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
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <p className="text-right font-semibold text-sm sm:text-base">
                      Total: UGX{expenditureRows.reduce((sum, row) => sum + (row.amount || 0), 0).toLocaleString()}
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