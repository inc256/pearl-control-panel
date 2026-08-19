import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue, AuthProviderProps, User } from "./types";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import type { AppRole } from "@/types/roles";
import { getSidebarItems as getSidebarItemsImpl, hasAnyRole as hasAnyRoleImpl, canAccess as canAccessImpl, normalizeRoles } from "@/lib/rbac";

const SYNC_CHANNEL = "rbac-sync";
const SYNC_STORAGE_KEY = "rbac:last-updated";
const REMEMBER_ME_KEY = "remember_me";

const normalizeAuthRoles = (value: AppRole[] | AppRole | string | null | undefined): AppRole[] => {
  if (!value) {
    return [];
  }

  return (Array.isArray(value) ? value : [value]).filter(Boolean) as AppRole[];
};

async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error || !data) {
    return [];
  }

  return normalizeRoles(data.map((item) => item.role));
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  // isLoading now ONLY reflects the initial app load — it blocks the UI.
  const [isLoading, setIsLoading] = useState(true);
  // isRefreshing reflects background revalidation (focus, token refresh, etc.)
  // and never unmounts children.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const status: "loading" | "authenticated" | "unauthenticated" = isLoading ? "loading" : user ? "authenticated" : "unauthenticated";

  // `background` = true means "don't touch isLoading, this is a silent revalidation"
  const load = useCallback(async (background = false) => {
    const requestId = ++requestIdRef.current;

    if (background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const shouldRestoreSession = (() => {
        try {
          return localStorage.getItem(REMEMBER_ME_KEY) !== "false";
        } catch {
          return true;
        }
      })();

      const { data, error } = await supabase.auth.getSession();

      if (error || !data?.session?.user || !shouldRestoreSession) {
        if (!mountedRef.current || requestIdRef.current !== requestId) return;
        if (!shouldRestoreSession) {
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            // ignore — session may already be cleared
          }
        }
        setUser(null);
        setRoles([]);
        setSession(null);
        return;
      }

      const sessionUser = { ...data.session.user, roles: [] as AppRole[] } as User;
      setUser(sessionUser);
      setSession(data.session);

      try {
        const fetchedRoles = await fetchUserRoles(data.session.user.id);
        if (!mountedRef.current || requestIdRef.current !== requestId) return;
        setRoles(fetchedRoles);
        setUser({ ...data.session.user, roles: fetchedRoles } as User);
      } catch (roleError) {
        console.error("Failed to fetch user roles:", roleError);
        setRoles([]);
        setUser({ ...data.session.user, roles: [] as AppRole[] } as User);
      }

      try {
        localStorage.setItem(SYNC_STORAGE_KEY, String(Date.now()));
      } catch {
        // ignore private browsing / storage disabled
      }
      channelRef.current?.postMessage({ type: "rbac-updated" });
    } catch (unexpectedError) {
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      console.error("Failed to load session:", unexpectedError);
      setUser(null);
      setSession(null);
      setRoles([]);
      setError((unexpectedError as Error)?.message ?? "Failed to load user");
    } finally {
      if (mountedRef.current && requestIdRef.current === requestId) {
        if (background) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
        setIsInitialized(true);
      }
    }
  }, []);

  // 🔹 Auth state listener — only do a BLOCKING load for events that
  // actually change who's signed in. TOKEN_REFRESHED fires silently on
  // every tab refocus and must not unmount the app.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      // The first INITIAL_SESSION event is handled by the explicit initial load below.
      // Loading it again can race the blocking request and leave isLoading stuck.
      if (event === "INITIAL_SESSION") {
        return;
      }

      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load(false);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    load(false); // initial load — this one is allowed to block
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(SYNC_CHANNEL);
    channelRef.current = bc;
    bc.onmessage = (evt) => {
      if (evt.data?.type === "rbac-updated") {
        load(true); // background — roles changed in another tab, don't unmount
      }
    };
    return () => {
      bc.close();
      channelRef.current = null;
    };
  }, [load]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === SYNC_STORAGE_KEY) {
        load(true); // background sync from another tab
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  // 🔹 Auth actions
  const signIn = async (email: string, password: string, rememberMe = true) => {
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      setError(error.message);
      return { error: error.message };
    }

    try {
      localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
    } catch {
      // ignore private browsing / storage disabled
    }

    await load(false);
    return { error: null };
  };

  const signUp = async (email: string, password: string, displayName: string, role: AppRole) => {
    setError(null);

    const normalizedDisplayName = displayName.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: normalizedDisplayName,
          role,
        },
      },
    });

    if (error) {
      setError(error.message);
      return { error: error.message };
    }

    // Profile and role rows are created server-side by the auth trigger using
    // raw_user_meta_data, so client-side inserts are blocked by RLS.
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setError(null);
  };

  const refreshRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      return;
    }

    const refreshedRoles = await fetchUserRoles(user.id);
    setRoles(refreshedRoles);
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel(`user_roles_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshRoles, user?.id]);

  // 🔹 Context value
  const value: AuthContextValue = {
    user,
    session,
    roles,
    status,
    loading: isLoading,
    isLoading,
    isRefreshing,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signOut,
    refreshUser: () => load(true),
    refreshSession: () => load(true),
    refreshRoles: async () => {
      if (!user) {
        setRoles([]);
        return;
      }

      const refreshedRoles = await fetchUserRoles(user.id);
      setRoles(refreshedRoles);
    },
    refreshRole: async () => {
      if (!user) {
        setRoles([]);
        return;
      }

      const refreshedRoles = await fetchUserRoles(user.id);
      setRoles(refreshedRoles);
    },
    getSidebarItems: () => getSidebarItemsImpl(roles),
    hasAnyRole: (requiredRoles) => hasAnyRoleImpl(roles, requiredRoles),
    normalizeRoles: normalizeAuthRoles,
    canAccess: (path) => canAccessImpl(roles, path),
  };

  // Only the very first load blocks the UI. Every later revalidation
  // (focus, token refresh, cross-tab sync) happens silently in the
  // background and never unmounts `children`.
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}