import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(file: File, folder = "general"): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("cms").upload(path, file, {
    cacheControl: "3600", upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("cms").getPublicUrl(path);
  return data.publicUrl;
}
