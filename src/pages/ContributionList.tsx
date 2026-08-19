import { useEffect, useMemo, useState } from "react";
import ProtectedPage from "@/components/layout/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, Users, Wallet, TrendingUp, Clock, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Contribution = Tables<'contributions'>;

interface ContributionRow {
  id: string;
  memberName: string;
  total: number;
  paid: number;
  balance: number;
  lastPaymentDate: string | null;
}

export default function ContributionList() {
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = "Contributions — Pearl Hijja Admin";
    void fetchContributions();
  }, []);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("contributions")
        .select("id, first_name, second_name, contribution, total, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data || []) as Contribution[];

      const grouped = list.reduce<Record<string, ContributionRow>>((acc, item) => {
        const key = `${item.first_name}-${item.second_name || ""}`;
        const contributionArray = Array.isArray(item.contribution) ? (item.contribution as Array<{ amount?: number; date?: string }>) : [];
        const paid = contributionArray.reduce((sum, entry) => sum + (entry.amount || 0), 0);
        const total = Number(item.total || 0);
        const lastPaymentDate = contributionArray
          .slice()
          .reverse()
          .find((entry) => entry.date)?.date ?? null;

        const existing = acc[key];
        if (existing) {
          existing.total += total;
          existing.paid += paid;
          existing.balance = existing.total - existing.paid;
          existing.lastPaymentDate = existing.lastPaymentDate || lastPaymentDate;
          return acc;
        }

        acc[key] = {
          id: item.id,
          memberName: [item.first_name, item.second_name].filter(Boolean).join(" ").trim() || "Unnamed member",
          total,
          paid,
          balance: total - paid,
          lastPaymentDate,
        };

        return acc;
      }, {});

      setRows(Object.values(grouped));
    } catch (err: any) {
      console.error("Error fetching contributions", err);
      setError(err.message || "Failed to load contributions.");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const paid = rows.reduce((sum, row) => sum + row.paid, 0);
    const balance = total - paid;
    const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
    return { total, paid, balance, paidPercentage, memberCount: rows.length };
  }, [rows]);

  const getPaymentStatus = (balance: number, paid: number) => {
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

  const filteredRows = rows.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = row.memberName.toLowerCase().includes(searchLower);
    const status = getPaymentStatus(row.balance, row.paid);
    const matchesStatus = filterStatus === 'all' || status.label.toLowerCase().replace(' ', '-') === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedPage title="Contributions" description="A read-only view of contribution records">
      <div className="space-y-4 sm:space-y-6">
        {/* Summary Cards - Responsive Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-lg bg-blue-50 p-2 sm:p-3 dark:bg-blue-950/50">
                  <Users className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Members</p>
                  <p className="text-lg sm:text-2xl font-semibold">{summary.memberCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-lg bg-green-50 p-2 sm:p-3 dark:bg-green-950/50">
                  <Wallet className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Expected</p>
                  <p className="text-sm sm:text-2xl font-semibold truncate">UGX {summary.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-lg bg-emerald-50 p-2 sm:p-3 dark:bg-emerald-950/50">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Paid</p>
                  <p className="text-sm sm:text-2xl font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    UGX {summary.paid.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-lg bg-amber-50 p-2 sm:p-3 dark:bg-amber-950/50">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Balance</p>
                  <p className="text-sm sm:text-2xl font-semibold text-amber-600 dark:text-amber-400 truncate">
                    UGX {summary.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">Overall Payment Progress</span>
                <span className="text-sm sm:text-base font-medium">{summary.paidPercentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(summary.paidPercentage, 100)}%` }}
                />
              </div>
              <div className="flex flex-col xs:flex-row justify-between gap-1 text-[10px] sm:text-xs text-muted-foreground">
                <span>UGX {summary.paid.toLocaleString()} collected</span>
                <span className="hidden xs:inline">•</span>
                <span>UGX {summary.balance.toLocaleString()} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <Card className="border shadow-sm">
          <CardHeader className="space-y-2 border-b p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Contribution List
                </CardTitle>
                <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">
                  This view is read-only. No add, edit, or delete actions are available here.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-xs sm:text-sm">
                {filteredRows.length} of {rows.length} members
              </Badge>
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
                    className="pl-8 h-8 sm:h-9 text-xs sm:text-sm w-full"
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin" />
                <p className="mt-3 sm:mt-4 text-sm">Loading contributions...</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 sm:p-4 text-destructive m-3 sm:m-4">
                <p className="text-xs sm:text-sm">{error}</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
                <Wallet className="h-10 w-10 sm:h-12 sm:w-12 opacity-20" />
                <p className="mt-3 sm:mt-4 text-sm text-center px-4">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'No members match your filters' 
                    : 'No contributions recorded yet.'}
                </p>
                {(searchTerm || filterStatus !== 'all') && (
                  <p className="text-xs sm:text-sm mt-1">Try adjusting your search or filters</p>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Member</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Total</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Paid</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Balance</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Progress</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="font-semibold text-xs">Last Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => {
                        const status = getPaymentStatus(row.balance, row.paid);
                        const progress = row.total > 0 ? (row.paid / row.total) * 100 : 0;

                        return (
                          <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-sm">{row.memberName}</TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              UGX {row.total.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                              UGX {row.paid.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.balance > 0 ? (
                                <span className="font-medium text-amber-600 dark:text-amber-400 text-sm">
                                  UGX {row.balance.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-sm font-medium">{Math.round(progress)}%</span>
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={status.variant as "success" | "warning" | "destructive" | "secondary"}
                                className="capitalize text-[10px]"
                              >
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {row.lastPaymentDate ? (
                                <span className="text-sm">
                                  {new Date(row.lastPaymentDate).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View - Visible on mobile */}
                <div className="md:hidden divide-y divide-border">
                  {filteredRows.map((row) => {
                    const status = getPaymentStatus(row.balance, row.paid);
                    const progress = row.total > 0 ? (row.paid / row.total) * 100 : 0;
                    const isExpanded = expandedRows.has(row.id);

                    return (
                      <div key={row.id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm sm:text-base">{row.memberName}</span>
                              <Badge
                                variant={status.variant as "success" | "warning" | "destructive" | "secondary"}
                                className="capitalize text-[10px]"
                              >
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm">
                              <span className="text-muted-foreground">Balance:</span>
                              {row.balance > 0 ? (
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  UGX {row.balance.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Fully Paid ✓</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpand(row.id)}
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
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
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
                                <span className="ml-1 font-medium">UGX {row.total.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Paid:</span>
                                <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                                  UGX {row.paid.toLocaleString()}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Last Payment:</span>
                                <span className="ml-1">
                                  {row.lastPaymentDate ? (
                                    new Date(row.lastPaymentDate).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </span>
                              </div>
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
      </div>
    </ProtectedPage>
  );
}