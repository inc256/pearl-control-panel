import { createContext } from "react";
import type { AuthContextValue } from "./types";

/**
 * Strict context:
 * - null by default
 * - forces useAuth() to validate provider presence
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Centralized error message (reusable + consistent)
 */
export const AUTH_CONTEXT_ERROR =
  "useAuth must be used within an AuthProvider";