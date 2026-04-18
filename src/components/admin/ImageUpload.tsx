import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/lib/upload";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = { value?: string | null; onChange: (url: string) => void; folder?: string; label?: string };

export default function ImageUpload({ value, onChange, folder = "general", label = "Image" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setBusy(true);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-32 w-auto rounded-md border border-border object-cover" />
          <button type="button" onClick={() => onChange("")}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="h-32 w-full md:w-64 rounded-md border-2 border-dashed border-border grid place-items-center text-muted-foreground text-xs">
          No image selected
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Upload
        </Button>
        <Input placeholder="Or paste image URL" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="sm:max-w-md" />
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    </div>
  );
}
