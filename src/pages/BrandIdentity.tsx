import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ChevronDown, ChevronUp, ImagePlus, Loader2, Palette, Plus, Rocket, Save, ShieldCheck, Target, Trash2, Type, Users } from "lucide-react";

type Identity = {
  brand_name: string; primary_color: string; secondary_color: string; tertiary_color: string;
  primary_logo: string; secondary_logo: string; submark: string;
  primary_typeface: string; secondary_typeface: string; tertiary_typeface: string;
  primary_color_palette: string[]; secondary_color_palette: string[]; brand_rules: string[];
  slogan_motto: string; vision_mission: string; business_overview: string; business_objectives: string[];
  primary_audience: string; secondary_audience: string; competitors: string; opportunities: string;
  strategies: string; challenges: string; weaknesses: string; brand_values: string[]; brand_personality: string;
};

const EMPTY: Identity = {
  brand_name: "", primary_color: "#6b1d2b", secondary_color: "#b8925a", tertiary_color: "#f9f2f4",
  primary_logo: "", secondary_logo: "", submark: "", primary_typeface: "", secondary_typeface: "", tertiary_typeface: "",
  primary_color_palette: [], secondary_color_palette: [], brand_rules: [], slogan_motto: "", vision_mission: "",
  business_overview: "", business_objectives: [], primary_audience: "", secondary_audience: "", competitors: "",
  opportunities: "", strategies: "", challenges: "", weaknesses: "", brand_values: [], brand_personality: "",
};


export default function BrandIdentity() {
  const { toast } = useToast();
  const [identity, setIdentity] = useState<Identity>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const update = <K extends keyof Identity>(key: K, value: Identity[K]) => setIdentity(current => ({ ...current, [key]: value }));

  useEffect(() => {
    document.title = "Brand Identity — Pearl Hijja Admin";
    void (async () => {
      const { data, error } = await (supabase as any).from("brand_identity").select("*").eq("id", 1).maybeSingle();
      if (error) toast({ title: "Unable to load brand identity", description: error.message, variant: "destructive" });
      else if (data) setIdentity(current => ({ ...current, ...data }));
      setLoading(false);
    })();
  }, [toast]);

  const uploadLogo = async (field: "primary_logo" | "secondary_logo" | "submark", file?: File) => {
    if (!file) return;
    setUploading(field);
    try {
      const path = `${field}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      update(field, data.publicUrl);
      toast({ title: "Asset uploaded" });
    } catch (error) {
      toast({ title: "Unable to upload asset", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const cleanedIdentity = {
        ...identity,
        primary_color_palette: identity.primary_color_palette.filter(Boolean).map(value => value.trim()).filter(Boolean),
        secondary_color_palette: identity.secondary_color_palette.filter(Boolean).map(value => value.trim()).filter(Boolean),
        brand_rules: identity.brand_rules.map(value => value.trim()).filter(Boolean),
        business_objectives: identity.business_objectives.map(value => value.trim()).filter(Boolean),
        brand_values: identity.brand_values.map(value => value.trim()).filter(Boolean),
      };
      const { error } = await (supabase as any).from("brand_identity").upsert({ ...cleanedIdentity, id: 1, updated_by: userData.user?.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast({ title: "Brand identity saved" });
    } catch (error) {
      toast({ title: "Unable to save brand identity", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const textField = (label: string, key: keyof Identity, multiline = false, placeholder = "") => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {multiline ? <Textarea rows={4} value={String(identity[key] || "") } onChange={event => update(key, event.target.value)} placeholder={placeholder} /> : <Input value={String(identity[key] || "") } onChange={event => update(key, event.target.value)} placeholder={placeholder} />}
    </div>
  );

  const listField = (label: string, key: "brand_rules" | "business_objectives" | "brand_values", placeholder: string) => {
    const items = identity[key].length ? identity[key] : [""];
    const changeItem = (index: number, value: string) => update(key, items.map((item, itemIndex) => itemIndex === index ? value : item));
    const removeItem = (index: number) => update(key, items.filter((_, itemIndex) => itemIndex !== index));
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${key}-${index}`} className="flex gap-2">
              <Input value={item} onChange={event => changeItem(index, event.target.value)} placeholder={`${placeholder} ${index + 1}`} />
              <Button type="button" variant="outline" size="icon" onClick={() => removeItem(index)} aria-label={`Remove ${label}`} disabled={items.length === 1 && index === 0 && !item}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => update(key, [...identity[key], ""])}><Plus className="mr-2 h-4 w-4" />Add {label.toLowerCase()}</Button>
      </div>
    );
  };

  const paletteField = (label: string, key: "primary_color_palette" | "secondary_color_palette") => {
    const colors = identity[key].length ? identity[key] : [identity.primary_color];
    const setColors = (next: string[]) => update(key, next.filter((color, index, all) => color.trim() && all.indexOf(color) === index));
    const moveColor = (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= colors.length) return;
      const next = [...colors];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      setColors(next);
    };
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="space-y-2">
          {colors.map((color, index) => (
            <div key={`${key}-${index}`} className="grid grid-cols-[48px_minmax(0,1fr)_36px] gap-2 rounded-lg border bg-background p-2 sm:grid-cols-[48px_minmax(0,1fr)_36px_36px_36px]">
              <input type="color" aria-label={`${label} ${index + 1}`} value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#000000"} onChange={event => setColors(colors.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="h-10 w-12 cursor-pointer rounded border bg-background p-1" />
              <Input value={color} onChange={event => setColors(colors.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="#6b1d2b" />
              <Button type="button" variant="outline" size="icon" className="col-start-1 sm:col-start-auto" onClick={() => moveColor(index, -1)} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={() => moveColor(index, 1)} disabled={index === colors.length - 1}><ChevronDown className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setColors(colors.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => update(key, [...colors, ""])}><Plus className="mr-2 h-4 w-4" />Add palette colour</Button>
      </div>
    );
  };

  const LogoField = ({ label, field }: { label: string; field: "primary_logo" | "secondary_logo" | "submark" }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-3 text-center sm:flex-row sm:text-left">
        {identity[field] ? <img src={identity[field]} alt={label} className="h-20 w-20 rounded object-contain bg-slate-50 p-1" /> : <div className="flex h-20 w-20 items-center justify-center rounded bg-muted"><ImagePlus className="h-6 w-6 text-muted-foreground" /></div>}
        <div className="min-w-0 w-full">
          <Input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={event => uploadLogo(field, event.target.files?.[0])} className="w-full text-xs sm:max-w-sm" />
          {uploading === field && <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Uploading</p>}
        </div>
      </div>
    </div>
  );

  if (loading) return <AdminLayout title="Brand Identity"><div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout title="Brand Identity" description="Define and maintain the Pearl Hijja visual and strategic brand">
      <div className="sticky top-0 z-20 -mx-3 mb-5 flex items-center justify-between gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:rounded-xl lg:border lg:px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{identity.brand_name || "Brand identity"}</p>
          <p className="hidden text-xs text-muted-foreground sm:block">Changes are saved to the shared brand profile.</p>
        </div>
        <Button onClick={save} disabled={saving} className="shrink-0">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          <span className="hidden sm:inline">Save Brand Identity</span><span className="sm:hidden">Save</span>
        </Button>
      </div>

      <section className="mb-5 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="grid md:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Palette className="h-4 w-4" />Brand overview</div>
            <h2 className="mt-3 text-xl font-semibold sm:text-2xl">{identity.brand_name || "Name your brand"}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{identity.slogan_motto || "Add your brand slogan and keep every team message consistent."}</p>
          </div>
          <div className="flex h-full min-h-24 items-stretch border-t md:min-w-64 md:border-l md:border-t-0">
            {[identity.primary_color, identity.secondary_color, identity.tertiary_color].map((color, index) => <div key={index} className="flex-1" style={{ backgroundColor: color }} />)}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden border-border/70 shadow-sm"><CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-6"><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Core identity</CardTitle></CardHeader><CardContent className="space-y-5 p-4 sm:p-6">
          {textField("Brand name", "brand_name")}
          <div className="grid gap-4 sm:grid-cols-3">
            {([['Primary color','primary_color'],['Secondary color','secondary_color'],['Tertiary color','tertiary_color']] as const).map(([label, key]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="flex gap-2"><input aria-label={label} type="color" value={identity[key]} onChange={e => update(key, e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-background p-1" /><Input value={identity[key]} onChange={e => update(key, e.target.value)} /></div></div>)}
          </div>
          <div className="grid gap-4 md:grid-cols-3"><LogoField label="Brand primary logo" field="primary_logo" /><LogoField label="Brand secondary logo" field="secondary_logo" /><LogoField label="Brand submark" field="submark" /></div>
          {textField("Brand slogan / motto", "slogan_motto")}
        </CardContent></Card>

        <Card className="overflow-hidden border-border/70 shadow-sm"><CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-6"><CardTitle className="flex items-center gap-2"><Type className="h-5 w-5 text-primary" />Typography & colour system</CardTitle></CardHeader><CardContent className="space-y-5 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">{textField("Primary typeface", "primary_typeface")}{textField("Secondary typeface", "secondary_typeface")}{textField("Tertiary typeface", "tertiary_typeface")}</div>
          <div className="grid gap-5 lg:grid-cols-2">{paletteField("Primary colour palette", "primary_color_palette")}{paletteField("Secondary colour palette", "secondary_color_palette")}</div>
          {listField("Brand rules", "brand_rules", "Brand rule")}
        </CardContent></Card>

        <Card className="overflow-hidden border-border/70 shadow-sm"><CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-6"><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Purpose & direction</CardTitle></CardHeader><CardContent className="space-y-5 p-4 sm:p-6">
          {textField("Brand vision / mission", "vision_mission", true)}{textField("Business overview", "business_overview", true)}{listField("Business objectives", "business_objectives", "Business objective")}
        </CardContent></Card>

        <Card className="overflow-hidden border-border/70 shadow-sm"><CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-6"><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Audience & market</CardTitle></CardHeader><CardContent className="space-y-5 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">{textField("Primary audience", "primary_audience", true)}{textField("Secondary audience", "secondary_audience", true)}</div>
          {textField("Competitors", "competitors", true)}{textField("Opportunities", "opportunities", true)}
        </CardContent></Card>

        <Card className="overflow-hidden border-border/70 shadow-sm xl:col-span-2"><CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-6"><CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" />Strategy & brand character</CardTitle></CardHeader><CardContent className="grid gap-5 p-4 md:grid-cols-2 sm:p-6">
          {textField("Strategies", "strategies", true)}{textField("Challenges", "challenges", true)}{textField("Weaknesses", "weaknesses", true)}
          <div className="rounded-xl border bg-muted/10 p-3"><ShieldCheck className="mb-3 h-5 w-5 text-primary" />{listField("Brand values", "brand_values", "Brand value")}</div>
          <div className="md:col-span-2">{textField("Brand personality", "brand_personality", true)}</div>
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}
