import { useEffect, useMemo, useState } from "react";
import ProtectedPage from "@/components/layout/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, Wallet, TrendingUp, Clock, Search, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportToExcel } from "@/lib/exportToExcel";

type Contribution = Tables<'contributions'>;

interface ContributionRow {
  id: string;
  memberName: string;
  total: number;
  paid: number;
  balance: number;
  excess: number;
  lastPaymentDate: string | null;
}

type ContributionStatus = {
  label: string;
  variant: "default" | "secondary" | "destructive";
};

const formatContributionAmount = (amount: number) =>
  `UGX ${new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount)}`;

export default function ContributionList() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
        const paid = contributionArray.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const total = Number(item.total || 0);
        const lastPaymentDate = contributionArray
          .slice()
          .reverse()
          .find((entry) => entry.date)?.date ?? null;

        const existing = acc[key];
        if (existing) {
          existing.total += total;
          existing.paid += paid;
          existing.balance = Math.max(existing.total - existing.paid, 0);
          existing.excess = Math.max(existing.paid - existing.total, 0);
          existing.lastPaymentDate = existing.lastPaymentDate || lastPaymentDate;
          return acc;
        }

        acc[key] = {
          id: item.id,
          memberName: [item.first_name, item.second_name].filter(Boolean).join(" ").trim() || "Unnamed member",
          total,
          paid,
          balance: Math.max(total - paid, 0),
          excess: Math.max(paid - total, 0),
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
    const balance = rows.reduce((sum, row) => sum + row.balance, 0);
    const excess = rows.reduce((sum, row) => sum + row.excess, 0);
    const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
    return { total, paid, balance, excess, paidPercentage, memberCount: rows.length };
  }, [rows]);

  const getPaymentStatus = (balance: number, paid: number, excess: number): ContributionStatus => {
    if (excess > 0) return { label: "Over-contributed", variant: "default" };
    if (balance === 0 && paid > 0) return { label: "Fully Paid", variant: "default" };
    if (balance > 0 && paid > 0) return { label: "Partial", variant: "secondary" };
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

  const displayedRows = rows.filter((row) =>
    row.memberName.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleExportContributions = () => {
    if (displayedRows.length === 0) {
      toast({ title: "No contributions to export", description: "Search for a member or add a contribution first." });
      return;
    }

    exportToExcel(displayedRows.map((row) => ({
      "Member": row.memberName,
      "Total Amount": row.total,
      "Paid Amount": row.paid,
      "Extra Contribution": row.excess,
      "Balance": row.balance,
      "Status": getPaymentStatus(row.balance, row.paid, row.excess).label,
      "Last Payment": row.lastPaymentDate || "",
    })), "contribution-list");
    toast({ title: "Contributions exported", description: `${displayedRows.length} member${displayedRows.length === 1 ? "" : "s"} exported to Excel.` });
  };

  return (
    <ProtectedPage title="Contributions" description="Contribution records and collection progress">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-7 w-1 rounded-full bg-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Collection overview</h2>
              <p className="text-xs text-muted-foreground">Expected contributions, payments received, and outstanding amounts</p>
            </div>
          </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="rounded-2xl border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-xl bg-primary/10 p-2 text-primary sm:p-3">
                  <Wallet className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Expected</p>
                  <p className="text-sm font-semibold leading-snug tabular-nums sm:text-2xl">{formatContributionAmount(summary.total)}</p>
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
                    {formatContributionAmount(summary.paid)}
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
                  <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-sm">Extra</p>
                  <p className="break-words text-xs font-semibold leading-snug tabular-nums text-primary sm:text-2xl">
                    {formatContributionAmount(summary.excess)}
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
                    {formatContributionAmount(summary.balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-7 w-1 rounded-full bg-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Payment progress</h2>
              <p className="text-xs text-muted-foreground">Overall collection against expected contributions</p>
            </div>
          </div>
        <Card className="rounded-2xl border-border bg-gradient-to-br from-primary/[0.04] via-card to-card shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">Overall Payment Progress</span>
                <span className="text-sm font-semibold tabular-nums text-primary sm:text-base">{summary.paidPercentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(summary.paidPercentage, 100)}%` }}
                />
              </div>
              <div className="flex flex-col xs:flex-row justify-between gap-1 text-[10px] sm:text-xs text-muted-foreground">
                <span>{formatContributionAmount(summary.paid)} collected</span>
                <span className="hidden xs:inline">•</span>
                <span>{formatContributionAmount(summary.balance)} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </section>

        <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="space-y-4 border-b border-border/70 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                  <Wallet className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                  Contribution List
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  This view is read-only. No add, edit, or delete actions are available here.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="w-fit border-primary/15 bg-primary/5 text-xs text-primary sm:text-sm">
                  {displayedRows.length} of {rows.length} members
                </Badge>
                <Button variant="outline" size="sm" onClick={handleExportContributions} className="h-8 rounded-lg text-xs sm:h-9 sm:text-sm" type="button">
                  <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Export Excel
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:h-4 sm:w-4" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search contributors by name"
                className="h-10 w-full rounded-xl border-border bg-background pl-9 text-sm sm:max-w-md"
              />
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
            ) : displayedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
                <Wallet className="h-10 w-10 sm:h-12 sm:w-12 opacity-20" />
                <p className="mt-3 sm:mt-4 text-sm text-center px-4">
                  {searchTerm
                    ? 'No members match your search'
                    : 'No contributions recorded yet.'}
                </p>
                {searchTerm && (
                  <p className="text-xs sm:text-sm mt-1">Try a different member name.</p>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden overflow-x-auto md:block">
                  <Table className="min-w-[1050px]">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-xs">Member</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Total</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Paid</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Extra</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Balance</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Progress</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="font-semibold text-xs">Last Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRows.map((row) => {
                        const status = getPaymentStatus(row.balance, row.paid, row.excess);
                        const progress = row.total > 0 ? (row.paid / row.total) * 100 : 0;

                        return (
                          <TableRow key={row.id} className="transition-colors hover:bg-muted/30">
                            <TableCell className="whitespace-nowrap font-medium text-sm">{row.memberName}</TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">
                              {formatContributionAmount(row.total)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums text-primary">
                              {formatContributionAmount(row.paid)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                              {row.excess > 0 ? (
                                <span className="font-medium text-primary">{formatContributionAmount(row.excess)}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums">
                              {row.balance > 0 ? (
                                <span className="text-sm font-medium text-muted-foreground">
                                  {formatContributionAmount(row.balance)}
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
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={status.variant}
                                className={`capitalize text-[10px] ${status.label === "Over-contributed" ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15" : ""}`}
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
                  {displayedRows.map((row) => {
                    const status = getPaymentStatus(row.balance, row.paid, row.excess);
                    const progress = row.total > 0 ? (row.paid / row.total) * 100 : 0;
                    const isExpanded = expandedRows.has(row.id);

                    return (
                      <div key={row.id} className="p-4 transition-colors hover:bg-muted/20 sm:p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm sm:text-base">{row.memberName}</span>
                              <Badge
                                variant={status.variant}
                                className={`capitalize text-[10px] ${status.label === "Over-contributed" ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15" : ""}`}
                              >
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm">
                              <span className="text-muted-foreground">Balance:</span>
                              {row.balance > 0 ? (
                                <span className="font-medium text-muted-foreground">
                                  {formatContributionAmount(row.balance)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {row.excess > 0 ? `Extra: ${formatContributionAmount(row.excess)}` : "Fully Paid"}
                                </span>
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
                                <span className="ml-1 font-medium tabular-nums">{formatContributionAmount(row.total)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Paid:</span>
                                <span className="ml-1 break-words font-medium tabular-nums text-primary">
                                  {formatContributionAmount(row.paid)}
                                </span>
                              </div>
                              {row.excess > 0 && (
                                <div>
                                  <span className="text-muted-foreground">Extra:</span>
                                  <span className="ml-1 break-words font-medium tabular-nums text-primary">
                                    {formatContributionAmount(row.excess)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Balance:</span>
                                <span className="ml-1 break-words font-medium tabular-nums">
                                  {formatContributionAmount(row.balance)}
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