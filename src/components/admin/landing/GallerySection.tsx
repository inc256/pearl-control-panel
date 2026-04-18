import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/upload";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Img = { id: string; url: string; caption: string | null };

export default function GallerySection() {
  const [rows, setRows] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("gallery_images").select("*").order("created_at", { ascending: false });
    setRows((data as Img[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadImage(f, "gallery");
        await supabase.from("gallery_images").insert({ url });
      }
      toast.success("Uploaded");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Gallery</CardTitle>
        <Button size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />} Upload images
        </Button>
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 && <p className="text-muted-foreground text-sm">No images yet.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {rows.map(img => (
            <div key={img.id} className="relative group rounded-md overflow-hidden border border-border">
              <img src={img.url} alt="" className="aspect-square object-cover w-full" />
              <button onClick={() => remove(img.id)}
                className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
