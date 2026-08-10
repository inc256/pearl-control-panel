import { supabase as supabaseClient } from "@/integrations/supabase/client";

export const supabase = supabaseClient;

export const isSupabaseConnected = async () => {
  try {
    const { error } = await supabase.from("user_roles").select("role", { head: true, count: "exact" });
    return !error;
  } catch {
    return false;
  }
};
