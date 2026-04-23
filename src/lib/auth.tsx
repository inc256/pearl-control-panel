import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      // If no session exists, sign in anonymously for temporary development
      if (!s) {
        const { data: anonSession } = await supabase.auth.signInAnonymously();
        setSession(anonSession.session);
        setUser(anonSession.session?.user ?? null);
      } else {
        setSession(s);
        setUser(s?.user ?? null);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };
  const signUp: AuthCtx["signUp"] = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: name ? { display_name: name } : undefined },
    });
    return { error: error?.message ?? null };
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  // Temporary workaround: if no session, keep trying to get one (anon or otherwise)
  useEffect(() => {
    if (!session && !loading) {
      const timer = setTimeout(() => {
        supabase.auth.getSession().then(async ({ data: { session: s } }) => {
          if (!s) {
            try {
              await supabase.auth.signInAnonymously();
            } catch (e) {
              console.warn("Anonymous sign in not available, will retry");
            }
          }
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [session, loading]);

  return <Ctx.Provider value={{ user, session, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
