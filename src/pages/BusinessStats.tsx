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
  Package, ClipboardList, TrendingUp, ArrowDownCircle, 
  ArrowUpCircle, BarChart3, Eye, FileText, FileSpreadsheet, X,
  Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from "@/components/ui/use-toast";

interface Income {
  id: number;
  created_at: string;
  description: string | null;
  amount: number | null;
}

interface Expenditure {
  id: number;
  created_at: string;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [packageCount, setPackageCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

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
      const [incomeResult, expenditureResult, packagesResult, bookingsResult] = await Promise.all([
        supabase.from('income').select('*').order('created_at', { ascending: false }),
        supabase.from('expenditure').select('*').order('created_at', { ascending: false }),
        supabase.from('packages').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true })
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenditureResult.error) throw expenditureResult.error;
      if (packagesResult.error) throw packagesResult.error;
      if (bookingsResult.error) throw bookingsResult.error;

      setIncomeRows(incomeResult.data || []);
      setExpenditureRows(expenditureResult.data || []);
      setPackageCount(packagesResult.count || 0);
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
      const { data, error } = await supabase
        .from('income')
        .insert({
          description: incomeForm.description,
          amount: parseInt(incomeForm.amount),
          created_at: incomeForm.date || new Date().toISOString()
        })
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
      const { data, error } = await supabase
        .from('expenditure')
        .insert({
          description: expenditureForm.description,
          amount: parseInt(expenditureForm.amount),
          created_at: expenditureForm.date || new Date().toISOString()
        })
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

  // Export functions
  const exportToPDF = (data: any[], title: string, type: 'income' | 'expenditure') => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    
    const tableData = data.map(row => [
      new Date(row.created_at).toLocaleDateString(),
      row.description || '',
      `$${row.amount?.toLocaleString() || 0}`
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
      Date: new Date(row.created_at).toLocaleDateString(),
      Description: row.description || '',
      Amount: row.amount || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
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
              ${incomeTotal.toLocaleString()}
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
              ${expenditureTotal.toLocaleString()}
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
              ${net.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Packages</span>
              <span className="xs:hidden">Pkg</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold">{packageCount}</p>
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
              onPDF={() => exportToPDF(incomeRows, 'Income List', 'income')}
              onXLS={() => exportToXLS(incomeRows, 'Income List')}
              count={incomeRows.length}
              disabled={loading}
            />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Date</Label>
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
                <Label className="text-xs sm:text-sm">Amount ($)</Label>
                <Input 
                  type="number" 
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
              onPDF={() => exportToPDF(expenditureRows, 'Expenditure List', 'expenditure')}
              onXLS={() => exportToXLS(expenditureRows, 'Expenditure List')}
              count={expenditureRows.length}
              disabled={loading}
            />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Date</Label>
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
                <Label className="text-xs sm:text-sm">Amount ($)</Label>
                <Input 
                  type="number" 
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
                  onClick={() => exportToPDF(incomeRows, 'Income List', 'income')}
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-xs sm:text-sm">{formatDate(row.created_at)}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{row.description || 'N/A'}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm font-medium">
                              ${row.amount?.toLocaleString() || 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <p className="text-right font-semibold text-sm sm:text-base">
                      Total: ${incomeRows.reduce((sum, row) => sum + (row.amount || 0), 0).toLocaleString()}
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
                  onClick={() => exportToPDF(expenditureRows, 'Expenditure List', 'expenditure')}
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenditureRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-xs sm:text-sm">{formatDate(row.created_at)}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{row.description || 'N/A'}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm font-medium">
                              ${row.amount?.toLocaleString() || 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <p className="text-right font-semibold text-sm sm:text-base">
                      Total: ${expenditureRows.reduce((sum, row) => sum + (row.amount || 0), 0).toLocaleString()}
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