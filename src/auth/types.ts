import type { ReactNode } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { AppRole } from "@/types/roles";

export interface AuthProviderProps {
  children: ReactNode;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  status: "loading" | "authenticated" | "unauthenticated";
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface User extends SupabaseUser {
  roles?: AppRole[];
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role: AppRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshRole: () => Promise<void>;
  getSidebarItems: () => ReturnType<typeof import("@/lib/roles").getSidebarItems>;
  hasAnyRole: (requiredRoles: AppRole[]) => boolean;
  normalizeRoles: (roles: (string | null | undefined)[] | string | null | undefined) => AppRole[];
  canAccess: (path: string) => boolean;
}

export type AuthContextValue = AuthState & AuthActions;

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}
