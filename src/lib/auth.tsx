import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRole, DEVELOPER_EMAIL, hasRouteAccess, type AppRole } from "@/lib/roles";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string, role?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>('media');
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string, email: string | undefined) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error || !data || data.length === 0) {
        if (email === DEVELOPER_EMAIL) {
          setRole('developer');
          return;
        }
        setRole('media');
        return;
      }

      const rawRoles = data.map(r => r.role as string);
      const normalized = rawRoles.map(r => normalizeRole(r));
      const best = normalized.includes('developer') ? 'developer'
        : normalized.includes('secretary') ? 'secretary'
        : normalized.includes('tech') ? 'tech'
        : normalized.includes('business') ? 'business'
        : normalized.includes('media') ? 'media'
        : normalized.includes('admin') ? 'developer'
        : normalized.includes('editor') ? 'secretary'
        : 'media';

      setRole(best);
    } catch {
      setRole(email === DEVELOPER_EMAIL ? 'developer' : 'media');
    }
  };

  const refreshRole = async () => {
    if (!user) return;
    await fetchRole(user.id, user.email);
  };

  useEffect(() => {
    let mounted = true;
    let currentUserId: string | null = null;

    const handleAuthState = async (session: Session | null) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setSession(session);
      setUser(u);
      const uid = u?.id ?? null;
      if (uid && uid !== currentUserId) {
        currentUserId = uid;
        await fetchRole(uid, u.email);
      } else if (!uid) {
        setRole('media');
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthState(session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthState(session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };
  const signUp: AuthCtx["signUp"] = async (email, password, name, role) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { 
        emailRedirectTo: `${window.location.origin}/`, 
        data: { 
          display_name: name, 
          role: role || undefined 
        } 
      },
    });
    return { error: error?.message ?? null };
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ user, session, role, loading, signIn, signUp, signOut, refreshRole }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};

