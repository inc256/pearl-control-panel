import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, FileText, Loader2, Printer, Save, Share2, Trash2 } from "lucide-react";

const todayIso = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

interface DocumentRow {
  id: string;
  title: string;
  reference: string;
  writer_name: string;
  writer_title: string;
  document_date: string;
  content: string;
  updated_at: string;
}

export default function DocumentProcessing() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState(`PHU/${new Date().getFullYear()}/001`);
  const [writerName, setWriterName] = useState("");
  const [writerTitle, setWriterTitle] = useState("");
  const [documentDate, setDocumentDate] = useState(todayIso());
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.8);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("processed_documents")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setDocuments((data || []).map((document: any) => ({
        id: document.id,
        title: document.title || "",
        reference: document.reference || "",
        writer_name: document.writer_name || "",
        writer_title: document.writer_title || "",
        document_date: document.document_date || todayIso(),
        content: document.content || "",
        updated_at: document.updated_at || new Date().toISOString(),
      })) as DocumentRow[]);
    } catch (error) {
      toast({ title: "Unable to load documents", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    document.title = "Document Processing — Pearl Hijja Admin";
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const updateScale = () => setPreviewScale(Math.min(1, Math.max(0.28, (container.clientWidth - 32) / 794)));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const newDocument = () => {
    const year = new Date().getFullYear();
    setDocumentId(null);
    setTitle("");
    setReference(`PHU/${year}/${String(documents.length + 1).padStart(3, "0")}`);
    setWriterName("");
    setWriterTitle("");
    setDocumentDate(todayIso());
    setContent("");
  };

  const saveDocument = async () => {
    if (!title.trim()) {
      toast({ title: "Document title required", variant: "destructive" });
      return;
    }
    if (!content.trim()) {
      toast({ title: "Document content required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const db = supabase as any;
      let saved: DocumentRow[] | null = null;

      if (documentId) {
        const payload = { title: title.trim(), reference: reference.trim(), writer_name: writerName.trim(), writer_title: writerTitle.trim(), document_date: documentDate, content, updated_at: new Date().toISOString() };
        let result = await db.from("processed_documents").update(payload).eq("id", documentId).select("id,title,reference,writer_name,writer_title,document_date,content,updated_at");
        if (result.error && /document_date/i.test(result.error.message || "")) {
          const { document_date: _documentDate, ...legacyPayload } = payload;
          result = await db.from("processed_documents").update(legacyPayload).eq("id", documentId).select("id,title,reference,writer_name,writer_title,content,updated_at");
        }
        if (result.error) throw result.error;
        saved = result.data;
      } else {
        const payload = { title: title.trim(), reference: reference.trim(), writer_name: writerName.trim(), writer_title: writerTitle.trim(), document_date: documentDate, content, created_by: userData.user?.id };
        let result = await db.from("processed_documents").insert(payload).select("id,title,reference,writer_name,writer_title,document_date,content,updated_at");
        if (result.error && /document_date/i.test(result.error.message || "")) {
          const { document_date: _documentDate, ...legacyPayload } = payload;
          result = await db.from("processed_documents").insert(legacyPayload).select("id,title,reference,writer_name,writer_title,content,updated_at");
        }
        if (result.error) throw result.error;
        saved = result.data;
      }

      if (saved?.[0]) setDocumentId(saved[0].id);
      await fetchDocuments();
      toast({ title: "Document saved" });
    } catch (error) {
      toast({ title: "Unable to save document", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!window.confirm("Delete this document?")) return;

    const removedDocument = documents.find((document) => document.id === id);
    setDeletingId(id);
    setDocuments((currentDocuments) => currentDocuments.filter((document) => document.id !== id));
    if (documentId === id) newDocument();

    try {
      const { error } = await (supabase as any).from("processed_documents").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Document deleted" });
    } catch (error) {
      if (removedDocument) {
        setDocuments((currentDocuments) => [...currentDocuments, removedDocument].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
      }
      toast({ title: "Unable to delete document", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const shareDocument = async () => {
    const shareData = { title: title || "Document", text: `${title}\n\n${content}` };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        toast({ title: "Document copied", description: "The document text is ready to share." });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast({ title: "Unable to share document", description: error.message, variant: "destructive" });
      }
    }
  };

  return (
    <AdminLayout title="Document Processing" description="Write, preview and print A4 documents">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #a4-document-preview, #a4-document-preview * { visibility: visible !important; }
          #a4-document-preview { position: absolute; left: 0; top: 0; width: 794px !important; height: 1123px !important; margin: 0 !important; transform: none !important; box-shadow: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
      <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Saved documents</span>
          <Select value={documentId || "new"} onValueChange={(value) => { if (value === "new") { newDocument(); return; } const item = documents.find((document) => document.id === value); if (!item) return; setDocumentId(item.id); setTitle(item.title || ""); setReference(item.reference || ""); setWriterName(item.writer_name || ""); setWriterTitle(item.writer_title || ""); setDocumentDate(item.document_date || todayIso()); setContent(item.content || ""); }}>
            <SelectTrigger className="w-full sm:w-[320px]"><SelectValue placeholder={loading ? "Loading documents..." : "Select a document"} /></SelectTrigger>
            <SelectContent><SelectItem value="new">Create new document</SelectItem>{documents.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={newDocument}>New document</Button>{documentId && <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={deletingId === documentId} onClick={() => deleteDocument(documentId)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}</div>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Write document</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document title</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Confirmation of Umrah Package Booking" className="text-base font-medium" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">RE</label>
                <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. PHU/HR/2025/042" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Writer name</label>
                <Input value={writerName} onChange={(event) => setWriterName(event.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Writer title</label>
                <Input value={writerTitle} onChange={(event) => setWriterTitle(event.target.value)} placeholder="e.g. Managing Director" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document date</label>
                <Input type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} />
              </div>
            </div>
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Type or paste your document text here..." className="min-h-[180px] max-h-[360px] resize-y font-serif text-base leading-7 sm:min-h-[240px] lg:min-h-[280px]" />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button onClick={saveDocument} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>
              <Button type="button" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print A4</Button>
              <Button type="button" variant="outline" onClick={shareDocument}><Share2 className="mr-2 h-4 w-4" />Share</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden bg-slate-100 p-3 dark:bg-slate-900 sm:p-4 lg:col-span-2 2xl:col-span-1">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Eye className="h-4 w-4" />A4 preview</div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm dark:bg-slate-800">Fit to screen</span>
          </div>
          <div ref={previewContainerRef} className="flex justify-center overflow-hidden rounded-lg bg-slate-200/70 p-4 dark:bg-slate-950/40">
            <div style={{ width: 794 * previewScale, height: 1123 * previewScale }}>
              <article
                id="a4-document-preview"
                className="relative overflow-hidden bg-white text-[#2b1a1e] shadow-xl print:shadow-none"
                style={{ width: 794, height: 1123, transform: `scale(${previewScale})`, transformOrigin: "top left" }}
              >
                <img src="/SubMark%20Logo%20Transparent%20Burgandy.png" alt="" className="absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-[58%] object-contain opacity-[0.12]" />
                <div className="relative z-10 flex h-full flex-col px-[68px] py-[58px]">
                  <header className="flex items-center gap-5 border-b-2 border-[#6b1d2b] pb-4">
                    <img src="/Primary%20Logo%20Transparent%20Burgandy.png" alt="Pearl Hijja and Umrah Services" className="h-[92px] w-[92px] shrink-0 object-contain" />
                    <div className="flex-1 text-center">
                      <div className="text-[28px] font-bold leading-tight text-[#6b1d2b]">Pearl Hijja &amp; Umrah Services</div>
                      <div className="mt-1 text-sm italic text-[#6f5a5e]">Travel with confidence</div>
                      <div className="mt-2 text-[13px] leading-[1.55] text-[#2b1a1e]">
                        <div><b className="text-[#6b1d2b]">Location:</b> Liberty Tower, Kampala Road, Opposite King Fahad Plaza</div>
                        <div><b className="text-[#6b1d2b]">Office:</b> Level 4, Room B09 · Kampala, Uganda</div>
                        <div><b className="text-[#6b1d2b]">Contact:</b> 0705447319 · 0702184524 · 0756505926</div>
                      </div>
                    </div>
                  </header>

                  <div className="mt-5 flex justify-between rounded-sm border-l-[3px] border-[#b8925a] bg-[#f9f2f4] px-4 py-3 text-[13px] text-[#6f5a5e]">
                    <span><b className="text-[#6b1d2b]">Ref:</b> {reference || "PHU/________"}</span>
                    <span><b className="text-[#6b1d2b]">Date:</b> {documentDate ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${documentDate}T12:00:00`)) : ""}</span>
                  </div>
                  <div className="mt-5 text-[16px] font-bold uppercase text-[#4e1420]">RE: {title || "Untitled document"}</div>
                  <div className="mt-4 text-[15px] font-serif leading-[1.6]">
                    <div className="whitespace-pre-wrap break-words" style={{ fontSize: content.length > 2200 ? 13 : content.length > 1400 ? 14 : 15 }}>
                      {content || "Your document text will appear here."}
                    </div>
                  </div>
                  <div className="mt-7 text-[14px]">
                    <div>Yours sincerely,</div>
                    <div className="mt-5 w-[230px] border-t border-[#6f5a5e] pt-1 text-[17px] font-bold text-[#6b1d2b]">{writerName || "Writer name"}</div>
                    <div className="mt-1 text-[13px] text-[#6f5a5e]">{writerTitle || "Writer title"}</div>
                    <div className="text-[12px] italic text-[#6f5a5e]">Pearl Hijja &amp; Umrah Services</div>
                  </div>
                  <div className="flex-1" />
                  <footer className="mt-4 flex justify-between border-t-2 border-[#6b1d2b] pt-3 text-[11px] text-[#6f5a5e]">
                    <span>Liberty Tower, Kampala Road, Opposite King Fahad Plaza</span><span>www.pearlhijjaandumrah.com</span>
                  </footer>
                </div>
              </article>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
