import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Pencil, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/useAuth";
import { canManageRoles } from "@/utils/permissions";

const isMissingTableError = (error?: { message?: string }) => error?.message?.includes("Could not find the table");

 type Img = {
   id: string;
   title: string | null;
   image_url: string;
   media_type: 'image' | 'video';
   alt_text: string | null;
   category: string | null;
   order_position: number;
 };

export default function GallerySection() {
  const { roles } = useAuth();
  const [rows, setRows] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<Img> | null>(null);
   const ref = useRef<HTMLInputElement>(null);
   const canEditGallery = canManageRoles(roles) || roles.includes("media") || roles.includes("tech");

   const getMediaType = (file: File): 'image' | 'video' => {
     if (file.type.startsWith("video/")) return "video";
     if (file.type.startsWith("image/")) return "image";
     // Fallback: check file extension
     const ext = file.name.split('.').pop()?.toLowerCase();
     const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
     if (ext && videoExts.includes(ext)) return "video";
     return "image";
   };

   const load = async () => {
    const { data, error } = await supabase.from("gallery").select("*").order("order_position", { ascending: true });
    if (error) {
      if (isMissingTableError(error)) {
        setRows([]);
        return;
      }
      return toast.error(error.message);
    }
    setRows((data as Img[]) ?? []);
  };

  useEffect(() => { load(); }, []);

   const onUpload = async (files: FileList | null) => {
     if (!files?.length) return;
     setBusy(true);
     try {
        for (const [index, f] of Array.from(files).entries()) {
          const mediaType = getMediaType(f);
          const url = await uploadImage(f, "gallery");
         const { error } = await supabase.from("gallery").insert({
           image_url: url,
           media_type: mediaType,
           order_position: rows.length + index + 1,
         });
         if (error) throw error;
       }
       toast.success("Uploaded");
       load();
     } catch (e: any) {
       if (isMissingTableError(e)) toast.error("Gallery table not found."); else toast.error(e.message);
     } finally { setBusy(false); }
   };

  const save = async () => {
    if (!editing?.id) return;
    setBusy(true);
    const payload = {
      title: editing.title ?? null,
      alt_text: editing.alt_text ?? null,
      category: editing.category ?? null,
      order_position: editing.order_position ?? 0,
    };
    const { error } = await supabase.from("gallery").update(payload).eq("id", editing.id);
    setBusy(false);
    if (error) {
      if (isMissingTableError(error)) return toast.error("Gallery table not found.");
      return toast.error(error.message);
    }
    toast.success("Updated");
    setEditing(null);
    load();
  };

   const remove = async (id: string) => {
     if (!confirm("Delete this media?")) return;
     const { error } = await supabase.from("gallery").delete().eq("id", id);
    if (error) {
      if (isMissingTableError(error)) return toast.error("Gallery table not found.");
      return toast.error(error.message);
    }
    toast.success("Deleted");
    load();
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Gallery</CardTitle>
        <div className="flex items-center gap-2">
           {canEditGallery && (
             <Button size="sm" disabled={busy} onClick={() => ref.current?.click()}>
               {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />} Upload media
             </Button>
           )}
          {editing && <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel edit</Button>}
        </div>
         <input ref={ref} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-md border border-border p-4 space-y-4 bg-muted/30">
             <div className="flex items-center justify-between">
               <h4 className="font-semibold">Edit gallery item</h4>
               <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
             </div>
            <div><Label>Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
            <div><Label>Alt text</Label><Input value={editing.alt_text ?? ""} onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })} /></div>
            <div><Label>Order position</Label><Input type="number" value={editing.order_position ?? rows.length} onChange={(e) => setEditing({ ...editing, order_position: Number(e.target.value) })} /></div>
             <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </div>
        )}
         {rows.length === 0 && <p className="text-muted-foreground text-sm">No gallery items yet.</p>}
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
           {rows.map(img => (
             <div key={img.id} className="rounded-md border border-border overflow-hidden bg-card group">
                {img.media_type === "video" ? (
                  <video src={img.image_url} controls className="h-44 w-full object-cover" aria-label={img.alt_text ?? img.title ?? "Gallery video"}>
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img src={img.image_url} alt={img.alt_text ?? img.title ?? "Gallery image"} className="h-44 w-full object-cover" />
                )}
               <div className="p-3 space-y-2">
                 {img.title && <p className="font-medium">{img.title}</p>}
                 {img.category && <p className="text-sm text-muted-foreground">Category: {img.category}</p>}
                 <div className="flex gap-2">
                   <Button size="sm" variant="ghost" onClick={() => copyLink(img.image_url)}><Copy className="h-4 w-4" /></Button>
                   {canEditGallery && (
                     <>
                       <Button size="sm" variant="ghost" onClick={() => setEditing(img)}><Pencil className="h-4 w-4" /></Button>
                       <Button size="sm" variant="ghost" onClick={() => remove(img.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                     </>
                   )}
                 </div>
               </div>
             </div>
           ))}
         </div>
      </CardContent>
    </Card>
  );
}
