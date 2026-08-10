import { useEffect, useMemo, useState } from "react";
import ProtectedPage from "@/components/layout/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, Users, Wallet, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  return (
    <ProtectedPage title="Contributions" description="A read-only view of contribution records">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/50">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Members</p>
                  <p className="text-2xl font-semibold">{summary.memberCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/50">
                  <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expected</p>
                  <p className="text-2xl font-semibold">UGX {summary.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/50">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                    UGX {summary.paid.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/50">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                  <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                    UGX {summary.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Payment Progress</span>
                <span className="font-medium">{summary.paidPercentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(summary.paidPercentage, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl">Contribution List</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This view is read-only. No add, edit, or delete actions are available here.
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {rows.length} members
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="mt-4 text-sm">Loading contributions...</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                <p className="text-sm">{error}</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Wallet className="h-12 w-12 opacity-20" />
                <p className="mt-4 text-sm">No contributions recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">Member</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                      <TableHead className="text-right font-semibold">Paid</TableHead>
                      <TableHead className="text-right font-semibold">Balance</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Last Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const status = getPaymentStatus(row.balance, row.paid);
                      const progress = row.total > 0 ? (row.paid / row.total) * 100 : 0;

                      return (
                        <TableRow key={row.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{row.memberName}</TableCell>
                          <TableCell className="text-right font-medium">
                            UGX {row.total.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                            UGX {row.paid.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.balance > 0 ? (
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                UGX {row.balance.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                status.variant as "success" | "warning" | "destructive" | "secondary"
                              }
                              className="capitalize"
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
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}