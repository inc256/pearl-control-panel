import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSiteContent<T extends Record<string, any>>(key: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.from("site_content").select("data").eq("key", key).maybeSingle().then(({ data: row, error }) => {
      if (!active) return;
      if (error) toast.error(error.message);
      if (row?.data) setData({ ...fallback, ...(row.data as T) });
      setLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setField = <K extends keyof T>(k: K, v: T[K]) => setData(prev => ({ ...prev, [k]: v }));

  const save = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase.from("site_content").upsert({ key, data: data as any });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  }, [key, data]);

  return { data, setData, setField, save, saving, loading };
}
