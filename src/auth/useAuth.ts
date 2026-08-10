import { useContext } from "react";
import { AuthContext, AUTH_CONTEXT_ERROR } from "./AuthContext";
import type { AuthContextValue } from "./types";

/**
 * useAuth hook
 * - Enforces provider usage
 * - Fails loudly (correct behavior)
 * - Helps debugging instantly
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    // Optional: better dev debugging
    if (import.meta.env.DEV) {
      console.error(AUTH_CONTEXT_ERROR);
    }

    throw new Error(AUTH_CONTEXT_ERROR);
  }

  return context;
}