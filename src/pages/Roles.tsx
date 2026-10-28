import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyDataChanged } from "@/lib/dataCache";
import { useAuth } from "@/auth/useAuth";
import { ROLES, type AppRole } from "@/lib/roles";
import type { Database } from "@/integrations/supabase/types";
import { Shield, UserCog, Loader2, Users, Search, Filter, ChevronDown, ChevronUp, User, Mail, Key, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface UserRoleRow {
  user_id: string;
  role: string | null;
  email: string | null;
  display_name: string | null;
  approval_status?: string | null;
  requested_role?: string | null;
}

export default function Roles() {
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { roles, refreshRole } = useAuth();
  const myRole = roles[0] ?? "media";
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Roles — Pearl Hijja Admin";
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const db = supabase as any;
      const [{ data: rolesData, error: rolesError }, profilesResult] = await Promise.all([
        db.from('user_roles').select('user_id, role').order('user_id'),
        db.from('profiles').select('user_id, email, display_name, approval_status, requested_role').order('user_id'),
      ]);
      let profilesData = profilesResult.data;
      let profilesError = profilesResult.error;
      if (profilesError) {
        const legacyProfiles = await db.from('profiles').select('user_id, email, display_name').order('user_id');
        profilesData = legacyProfiles.data;
        profilesError = legacyProfiles.error;
      }

      if (rolesError) throw rolesError;
      if (profilesError) throw profilesError;

      const roleMap = new Map((rolesData || []).map(r => [r.user_id, r.role]));
      const combined = (profilesData || []).map(profile => ({
        user_id: profile.user_id,
        role: roleMap.get(profile.user_id) || null,
        email: profile.email || null,
        display_name: profile.display_name || null,
        approval_status: profile.approval_status || 'approved',
        requested_role: profile.requested_role || null,
      }));

      setRows(combined);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load roles";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!ROLES[myRole]?.canManageRoles) return;
    fetchData();

    const refreshChannel = supabase
      .channel(`roles-live-${myRole}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, fetchData)
      .subscribe();

    return () => {
      void supabase.removeChannel(refreshChannel);
    };
  }, [myRole, fetchData]);

  const updateRole = async (userId: string, newRole: string) => {
    if (!ROLES[myRole]?.canManageRoles) {
      toast({ title: "Unauthorized", description: "You cannot change roles", variant: "destructive" });
      return;
    }

    try {
      setSaving(userId);

      if (!newRole || newRole === 'none') {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
      } else {
        const normalizedRole = newRole as AppRole;
        const { error: upsertError } = await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role: normalizedRole as Database['public']['Enums']['app_role'] }, { onConflict: 'user_id' });

        if (upsertError) throw upsertError;
      }

      toast({
        title: "Success",
        description: "Role updated successfully",
      });

      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (currentUserId === userId) {
        await refreshRole();
      }

      await fetchData();
      notifyDataChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update role";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const approveUser = async (userId: string, requestedRole?: string | null) => {
    try {
      setSaving(userId);
      const { error } = await (supabase as any).rpc('approve_user_account', {
        target_user_id: userId,
        approved_role: requestedRole || null,
      });
      if (error) throw error;
      const assignedRole = requestedRole || 'business';
      setRows(currentRows => currentRows.map(row => row.user_id === userId
        ? { ...row, approval_status: 'approved', role: assignedRole, requested_role: assignedRole }
        : row));
      toast({ title: "Account approved", description: "The user can now access the system.", action: undefined });
      await fetchData();
      notifyDataChanged();
    } catch (err) {
      toast({ title: "Unable to approve account", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      setSaving(userId);
      const { error } = await (supabase as any).rpc('reject_user_account', { target_user_id: userId });
      if (error) throw error;
      setRows(currentRows => currentRows.map(row => row.user_id === userId
        ? { ...row, approval_status: 'rejected', role: null }
        : row));
      toast({ title: "Account disapproved", description: "The account is now shown as disapproved." });
      await fetchData();
      notifyDataChanged();
    } catch (err) {
      toast({ title: "Unable to disapprove account", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const deleteUser = async (userId: string, displayName?: string | null) => {
    if (!ROLES[myRole]?.canManageRoles) {
      toast({ title: "Unauthorized", description: "You cannot delete users", variant: "destructive" });
      return;
    }

    const currentUserId = (await supabase.auth.getUser()).data.user?.id;
    if (currentUserId === userId) {
      toast({ title: "Cannot delete user", description: "You cannot delete your own account", variant: "destructive" });
      return;
    }

    const userLabel = displayName || "this user";
    if (!window.confirm(`Delete ${userLabel}? This permanently removes the account and its role.`)) return;

    try {
      setSaving(userId);
      setRows(currentRows => currentRows.filter(row => row.user_id !== userId));
      const { error } = await supabase.rpc("delete_user_account", { target_user_id: userId });
      if (error) throw error;

      toast({ title: "Success", description: "User deleted successfully" });
      await fetchData();
      notifyDataChanged();
    } catch (err) {
      await fetchData();
      const message = err instanceof Error ? err.message : "Failed to delete user";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
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

  const getApprovalBadge = (status?: string | null) => {
    if (status === 'pending') return { label: 'Pending approval', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' };
    if (status === 'rejected') return { label: 'Disapproved', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' };
    return { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' };
  };

  const getRoleBadgeColor = (role: string | null) => {
    if (!role) return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
      editor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
      media: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
      finance: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
      manager: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  };

  // Filter rows
  const filteredRows = rows.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (row.display_name || '').toLowerCase().includes(searchLower) ||
      (row.email || '').toLowerCase().includes(searchLower);
    const matchesRole = filterRole === 'all' || row.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Stats
  const totalUsers = rows.length;
  const adminCount = rows.filter(r => r.role === 'admin').length;
  const editorCount = rows.filter(r => r.role === 'editor').length;
  const mediaCount = rows.filter(r => r.role === 'media').length;
  const financeCount = rows.filter(r => r.role === 'finance').length;
  const managerCount = rows.filter(r => r.role === 'manager').length;
  const noRoleCount = rows.filter(r => !r.role || r.role === 'none').length;

  if (!ROLES[myRole]?.canManageRoles) {
    return (
      <AdminLayout title="Roles" description="Manage user roles and permissions">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You do not have permission to manage roles.</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout title="Roles" description="Manage user roles and permissions">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-4 text-sm">Loading users...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Roles" description="Manage user roles and permissions">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-blue-50 p-1.5 sm:p-2 dark:bg-blue-950/50">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-sm sm:text-base font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-red-50 p-1.5 sm:p-2 dark:bg-red-950/50">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Admins</p>
                <p className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400">{adminCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-blue-50 p-1.5 sm:p-2 dark:bg-blue-950/50">
                <UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Editors</p>
                <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">{editorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-purple-50 p-1.5 sm:p-2 dark:bg-purple-950/50">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Media</p>
                <p className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400">{mediaCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-green-50 p-1.5 sm:p-2 dark:bg-green-950/50">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Finance</p>
                <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">{financeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-amber-50 p-1.5 sm:p-2 dark:bg-amber-950/50">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[8px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Managers</p>
                <p className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400">{managerCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {rows.some(row => row.approval_status === 'pending' || row.approval_status === 'rejected' || !row.role) && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-5 w-5 text-amber-600" />Pending account approvals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {rows.filter(row => row.approval_status === 'pending' || row.approval_status === 'rejected' || !row.role).map(row => (
              <div key={row.user_id} className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{row.display_name || 'Unnamed user'}</p>
                  <p className="text-xs text-muted-foreground truncate">{row.email || row.user_id}</p>
                  <Badge variant="outline" className="mt-1">Requested: {row.requested_role || 'media'}</Badge>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={saving === row.user_id} onClick={() => rejectUser(row.user_id)}>
                    <XCircle className="mr-2 h-4 w-4" />Disapprove
                  </Button>
                  <Button size="sm" disabled={saving === row.user_id} onClick={() => approveUser(row.user_id, row.requested_role)}>
                    {saving === row.user_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Card */}
      <Card className="border shadow-sm">
        <CardHeader className="space-y-2 border-b p-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserCog className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                User Roles
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage user roles and permissions across the system
              </p>
            </div>
            <Badge variant="outline" className="w-fit text-xs sm:text-sm">
              {filteredRows.length} of {rows.length} users
            </Badge>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col xs:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
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
            
            {/* Filters */}
            <div className={`flex flex-col sm:flex-row gap-2 transition-all duration-200 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 opacity-20" />
              <p className="mt-3 sm:mt-4 text-sm text-center px-4">
                {searchTerm || filterRole !== 'all' 
                  ? 'No users match your filters' 
                  : 'No users found'}
              </p>
              {(searchTerm || filterRole !== 'all') && (
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
                      <TableHead className="font-semibold text-xs">User</TableHead>
                      <TableHead className="font-semibold text-xs">Email</TableHead>
                      <TableHead className="font-semibold text-xs">Role</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const roleInfo = ROLES[row.role as AppRole];
                      const isSaving = saving === row.user_id;

                      return (
                        <TableRow key={row.user_id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-primary/10 p-1.5">
                                <User className="h-3.5 w-3.5 text-primary" />
                              </div>
                              {row.display_name || 'Unnamed User'}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {row.email || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge className={cn(getRoleBadgeColor(row.role), "border text-[10px]")}>
                                {roleInfo?.label || row.role || 'No Role'}
                              </Badge>
                              <Badge className={cn(getApprovalBadge(row.approval_status).className, "border text-[10px]")}>
                                {row.approval_status === 'approved' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                {getApprovalBadge(row.approval_status).label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {(row.approval_status === 'approved' || row.approval_status === 'pending') && (
                                <Button type="button" size="sm" variant="outline" className="min-w-[96px] text-destructive hover:text-destructive" onClick={() => rejectUser(row.user_id)} disabled={isSaving}><XCircle className="mr-1 h-3.5 w-3.5" />Disapprove</Button>
                              )}
                              {row.approval_status !== 'approved' && (
                                <Button type="button" size="sm" className="min-w-[88px]" onClick={() => approveUser(row.user_id, row.requested_role || row.role || 'business')} disabled={isSaving}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve</Button>
                              )}
                              <Select
                                value={row.role || 'none'}
                                onValueChange={(value) => updateRole(row.user_id, value === 'none' ? '' : value)}
                                disabled={isSaving}
                              >
                                <SelectTrigger className="w-36 sm:w-40 h-8 sm:h-9 text-xs sm:text-sm">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Role</SelectItem>
                                  {(Object.keys(ROLES) as AppRole[]).map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {ROLES[r].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteUser(row.user_id, row.display_name)}
                                disabled={isSaving}
                                aria-label={`Delete ${row.display_name || row.email || "user"}`}
                              >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {filteredRows.map((row) => {
                  const roleInfo = ROLES[row.role as AppRole];
                  const isSaving = saving === row.user_id;
                  const isExpanded = expandedRows.has(row.user_id);

                  return (
                    <div key={row.user_id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm sm:text-base">
                              {row.display_name || 'Unnamed User'}
                            </span>
                            <Badge className={cn(getRoleBadgeColor(row.role), "border text-[10px]")}>
                              {roleInfo?.label || row.role || 'No Role'}
                            </Badge>
                            <Badge className={cn(getApprovalBadge(row.approval_status).className, "border text-[10px]")}>
                              {row.approval_status === 'approved' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                              {getApprovalBadge(row.approval_status).label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs sm:text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {row.email || 'N/A'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpand(row.user_id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0 ml-2"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Key className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Role:</span>
                              <span className="font-medium">{roleInfo?.label || row.role || 'No Role'}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(row.approval_status === 'approved' || row.approval_status === 'pending') && (
                                <Button type="button" size="sm" variant="outline" className="min-w-[96px] text-destructive hover:text-destructive" onClick={() => rejectUser(row.user_id)} disabled={isSaving}><XCircle className="mr-1 h-3.5 w-3.5" />Disapprove</Button>
                              )}
                              {row.approval_status !== 'approved' && (
                                <Button type="button" size="sm" className="min-w-[88px]" onClick={() => approveUser(row.user_id, row.requested_role || row.role || 'business')} disabled={isSaving}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve</Button>
                              )}
                              <Select
                                value={row.role || 'none'}
                                onValueChange={(value) => updateRole(row.user_id, value === 'none' ? '' : value)}
                                disabled={isSaving}
                              >
                                <SelectTrigger className="flex-1 h-8 text-xs">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Role</SelectItem>
                                  {(Object.keys(ROLES) as AppRole[]).map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {ROLES[r].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-destructive hover:text-destructive"
                                onClick={() => deleteUser(row.user_id, row.display_name)}
                                disabled={isSaving}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
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
    </AdminLayout>
  );
}