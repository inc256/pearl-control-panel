import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ROLES, type AppRole } from "@/lib/roles";
import { Shield, UserCog, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface UserRoleRow {
  user_id: string;
  role: string | null;
  email: string | null;
  display_name: string | null;
}

export default function Roles() {
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { role: myRole, refreshRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Roles — Pearl Hijja Admin";
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: rolesData, error: rolesError }, { data: profilesData, error: profilesError }] = await Promise.all([
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('profiles').select('user_id, email, display_name'),
      ]);

      if (rolesError) throw rolesError;
      if (profilesError) throw profilesError;

      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      const combined = (rolesData || []).map(r => {
        const profile = profileMap.get(r.user_id);
        return {
          user_id: r.user_id,
          role: r.role,
          email: profile?.email || null,
          display_name: profile?.display_name || null,
        };
      });
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
  }, [myRole, fetchData]);

  const updateRole = async (userId: string, newRole: string) => {
    if (!ROLES[myRole]?.canManageRoles) {
      toast({ title: "Unauthorized", description: "You cannot change roles", variant: "destructive" });
      return;
    }

    try {
      setSaving(userId);

      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      if (newRole !== 'none') {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as AppRole });

        if (insertError) throw insertError;
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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Roles" description="Manage user roles and permissions">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            User Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">
                      {row.display_name || 'Unnamed User'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ROLES[row.role as AppRole]?.label || row.role || 'No Role'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={row.role || 'none'}
                        onValueChange={(value) => updateRole(row.user_id, value === 'none' ? '' : value)}
                        disabled={saving === row.user_id}
                      >
                        <SelectTrigger className="w-40">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
