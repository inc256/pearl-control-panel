import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SIDEBAR_ITEMS } from "@/config/sidebar";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue, AuthProviderProps, User } from "./types";
import type { Session } from "@supabase/supabase-js";
import type { AppRole } from "@/types/roles";

const TEMP_AUTH_ROLES: AppRole[] = ["developer"];

const normalizeAuthRoles = (value: AppRole[] | AppRole | string | null | undefined): AppRole[] => {
  if (!value) {
    return [];
  }

  return (Array.isArray(value) ? value : [value]).filter(Boolean) as AppRole[];
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status: "loading" | "authenticated" | "unauthenticated" = isLoading ? "loading" : user ? "authenticated" : "unauthenticated";

  // 🔹 Refresh user
  const refreshUser = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setUser(null);
      setSession(null);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    setUser({ ...data.user, roles: TEMP_AUTH_ROLES } as User);
    setRoles(TEMP_AUTH_ROLES);
    setIsLoading(false);
  }, []);

  // 🔹 Auth state listener
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSession(session);

      if (!session?.user) {
        setUser(null);
        setRoles([]);
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      setUser({ ...session.user, roles: TEMP_AUTH_ROLES } as User);
      setRoles(TEMP_AUTH_ROLES);
      setIsLoading(false);
      setIsInitialized(true);
    });

    refreshUser().finally(() => setIsInitialized(true));

    return () => data.subscription.unsubscribe();
  }, [refreshUser]);

  // 🔹 Auth actions
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      setError(error.message);
      return { error: error.message };
    }

    setUser(data.user ? { ...data.user, roles: TEMP_AUTH_ROLES } : null);
    setRoles(data.user ? TEMP_AUTH_ROLES : []);
    setSession(data.session);
    setIsLoading(false);

    return { error: null };
  };

  const signUp = async (email: string, password: string, _name: string, _role: AppRole) => {
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return { error: error.message };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setError(null);
  };

  // 🔹 Context value
  const value: AuthContextValue = {
    user,
    session,
    roles,
    status,
    loading: isLoading,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signOut,
    refreshUser,
    refreshSession: refreshUser,
    refreshRoles: async () => {
      setRoles(user ? TEMP_AUTH_ROLES : []);
    },
    refreshRole: async () => {
      setRoles(user ? TEMP_AUTH_ROLES : []);
    },
    getSidebarItems: () => SIDEBAR_ITEMS,
    hasAnyRole: () => !!user,
    normalizeRoles: normalizeAuthRoles,
    canAccess: () => !!user,
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}