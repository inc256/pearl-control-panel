import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Eye, Loader2, Printer, Save, Trash2 } from "lucide-react";

const todayIso = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

interface PageCapacities {
  first: number;
  middle: number;
  last: number;
  single: number;
}

const paginateContent = (text: string, fontSize: number, capacities: PageCapacities) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to measure document text for pagination.");
  context.font = `${fontSize}px serif`;
  const availableWidth = 794 - 68 * 2;

  const lines = text.split("\n").flatMap((paragraph) => {
    if (!paragraph) return [""];

    const wrapped: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      let remainingWord = word;
      while (remainingWord && context.measureText(remainingWord).width > availableWidth) {
        let splitAt = 1;
        while (
          splitAt < remainingWord.length &&
          context.measureText(remainingWord.slice(0, splitAt + 1)).width <= availableWidth
        ) {
          splitAt++;
        }
        if (line) {
          wrapped.push(line);
          line = "";
        }
        wrapped.push(remainingWord.slice(0, splitAt));
        remainingWord = remainingWord.slice(splitAt);
      }
      const nextLine = line ? `${line} ${remainingWord}` : remainingWord;
      if (line && context.measureText(nextLine).width > availableWidth) {
        wrapped.push(line);
        line = remainingWord;
      } else if (remainingWord) {
        line = nextLine;
      }
    }
    wrapped.push(line);
    return wrapped;
  });

  if (!text) return [""];

  if (lines.length <= capacities.single) return [lines.join("\n")];

  const pages: string[] = [];
  let lineOffset = 0;
  let pageIndex = 0;
  while (lineOffset < lines.length) {
    const remaining = lines.length - lineOffset;
    const lastPage = remaining <= capacities.last;
    const pageCapacity = pageIndex === 0 ? capacities.first : lastPage ? capacities.last : capacities.middle;
    const pageLineCount = lastPage ? remaining : Math.min(pageCapacity, remaining);
    pages.push(lines.slice(lineOffset, lineOffset + pageLineCount).join("\n"));
    lineOffset += pageLineCount;
    pageIndex++;
  }
  return pages;
};

interface DocumentRow {
  id: string;
  title: string;
  reference: string;
  writer_name: string;
  writer_title: string;
  second_party_signature: boolean;
  second_party_name: string;
  second_party_title: string;
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
  const [secondPartySignature, setSecondPartySignature] = useState(false);
  const [secondPartyName, setSecondPartyName] = useState("");
  const [secondPartyTitle, setSecondPartyTitle] = useState("");
  const [documentDate, setDocumentDate] = useState(todayIso());
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const pageBodyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pageFooterRefs = useRef<Array<HTMLElement | null>>([]);
  const pageSignatureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [previewScale, setPreviewScale] = useState(0.8);
  const contentFontSize = content.length > 2200 ? 13 : content.length > 1400 ? 14 : 15;
  const [pageCapacities, setPageCapacities] = useState<PageCapacities>({
    first: 25,
    middle: 29,
    last: 22,
    single: 22,
  });
  const contentPages = paginateContent(content, contentFontSize, pageCapacities);
  const pageCount = contentPages.length;

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
        second_party_signature: document.second_party_signature || false,
        second_party_name: document.second_party_name || "",
        second_party_title: document.second_party_title || "",
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

  useEffect(() => {
    const measureCapacities = () => {
      const getCapacity = (pageIndex: number) => {
        const body = pageBodyRefs.current[pageIndex];
        const footer = pageFooterRefs.current[pageIndex];
        if (!body || !footer) return null;

        const text = body.firstElementChild;
        if (!(text instanceof HTMLElement)) return null;
        const lineHeight = Number.parseFloat(window.getComputedStyle(text).lineHeight);
        const bodyTop = body.getBoundingClientRect().top;
        const footerTop = footer.getBoundingClientRect().top;
        const signature = pageSignatureRefs.current[pageIndex];
        const signatureSpace = signature
          ? signature.getBoundingClientRect().height +
            Number.parseFloat(window.getComputedStyle(signature).marginTop) * previewScale
          : 0;
        const availableHeight = (footerTop - bodyTop - signatureSpace) / previewScale;
        return Math.max(1, Math.floor((availableHeight - lineHeight) / lineHeight));
      };

      const firstCapacity = getCapacity(0);
      const middleCapacity = pageCount > 2
        ? getCapacity(1)
        : firstCapacity === null ? null : firstCapacity + 3;
      const lastCapacity = getCapacity(pageCount - 1);
      if (firstCapacity === null || middleCapacity === null || lastCapacity === null) return;

      const nextCapacities = {
        first: firstCapacity,
        middle: middleCapacity,
        last: lastCapacity,
        single: pageCount === 1 ? lastCapacity : firstCapacity,
      };
      setPageCapacities((current) =>
        current.first === nextCapacities.first &&
        current.middle === nextCapacities.middle &&
        current.last === nextCapacities.last &&
        current.single === nextCapacities.single
          ? current
          : nextCapacities,
      );
    };

    measureCapacities();
    const observer = new ResizeObserver(measureCapacities);
    pageBodyRefs.current.forEach((element) => { if (element) observer.observe(element); });
    pageFooterRefs.current.forEach((element) => { if (element) observer.observe(element); });
    pageSignatureRefs.current.forEach((element) => { if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [pageCount, previewScale, title, reference, documentDate, writerName, writerTitle, secondPartySignature, secondPartyName, secondPartyTitle, contentFontSize]);

  const newDocument = () => {
    const year = new Date().getFullYear();
    setDocumentId(null);
    setTitle("");
    setReference(`PHU/${year}/${String(documents.length + 1).padStart(3, "0")}`);
    setWriterName("");
    setWriterTitle("");
    setSecondPartySignature(false);
    setSecondPartyName("");
    setSecondPartyTitle("");
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
        const payload = { title: title.trim(), reference: reference.trim(), writer_name: writerName.trim(), writer_title: writerTitle.trim(), second_party_signature: secondPartySignature, second_party_name: secondPartyName.trim(), second_party_title: secondPartyTitle.trim(), document_date: documentDate, content, updated_at: new Date().toISOString() };
        let result = await db.from("processed_documents").update(payload).eq("id", documentId).select("id,title,reference,writer_name,writer_title,second_party_signature,second_party_name,second_party_title,document_date,content,updated_at");
        if (result.error && /document_date/i.test(result.error.message || "")) {
          const { document_date: _documentDate, ...legacyPayload } = payload;
          result = await db.from("processed_documents").update(legacyPayload).eq("id", documentId).select("id,title,reference,writer_name,writer_title,second_party_signature,second_party_name,second_party_title,content,updated_at");
        }
        if (result.error) throw result.error;
        saved = result.data;
      } else {
        const payload = { title: title.trim(), reference: reference.trim(), writer_name: writerName.trim(), writer_title: writerTitle.trim(), second_party_signature: secondPartySignature, second_party_name: secondPartyName.trim(), second_party_title: secondPartyTitle.trim(), document_date: documentDate, content, created_by: userData.user?.id };
        let result = await db.from("processed_documents").insert(payload).select("id,title,reference,writer_name,writer_title,second_party_signature,second_party_name,second_party_title,document_date,content,updated_at");
        if (result.error && /document_date/i.test(result.error.message || "")) {
          const { document_date: _documentDate, ...legacyPayload } = payload;
          result = await db.from("processed_documents").insert(legacyPayload).select("id,title,reference,writer_name,writer_title,second_party_signature,second_party_name,second_party_title,content,updated_at");
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

  const downloadPdf = async () => {
    const pages = previewContainerRef.current?.querySelectorAll<HTMLElement>(".a4-preview-page");
    if (!pages?.length) {
      toast({ title: "Unable to download PDF", description: "The document preview is not ready.", variant: "destructive" });
      return;
    }

    try {
      setDownloadingPdf(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      await document.fonts.ready;
      const images = Array.from(previewContainerRef.current?.querySelectorAll("img") || []);
      await Promise.all(images.map((image) => image.decode()));

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (const [index, page] of Array.from(pages).entries()) {
        const canvas = await html2canvas(page, {
          backgroundColor: "#ffffff",
          scale: 2 / previewScale,
          useCORS: true,
          logging: false,
          onclone: (clonedDocument) => {
            clonedDocument.querySelectorAll(".a4-page-number").forEach((label) => label.remove());
            const clonedPage = clonedDocument.querySelector(`[data-page-index="${index}"]`);
            clonedPage?.classList.remove("shadow-xl");
          },
        });
        if (index > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfWidth, pdfHeight);
      }

      const fileName = (title.trim() || "document").replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "");
      pdf.save(`${fileName || "document"}.pdf`);
    } catch (error) {
      toast({
        title: "Unable to download PDF",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const renderPreviewPage = (pageIndex: number, pageContent: string) => {
    const bodyLineCapacity = pageCount === 1
      ? pageCapacities.single
      : pageIndex === 0
        ? pageCapacities.first
        : pageIndex === pageCount - 1
          ? pageCapacities.last
          : pageCapacities.middle;

    return (
    <div
      key={pageIndex}
      data-page-index={pageIndex}
      className="a4-preview-page relative shrink-0 overflow-hidden bg-white shadow-xl"
      style={{ width: 794 * previewScale, height: 1123 * previewScale }}
    >
      <article
        className="relative h-[1123px] overflow-hidden bg-white text-[#2b1a1e]"
        style={{
          width: 794,
          transform: `scale(${previewScale})`,
          transformOrigin: "top left",
        }}
      >
        <img src="/SubMark%20Logo%20Transparent%20Burgandy.png" alt="" className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.12]" />
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

          {pageIndex === 0 && (
            <>
              <div className="a4-preview-reference-date mt-5 flex justify-between rounded-sm border-l-[3px] border-[#b8925a] bg-[#f9f2f4] px-4 py-3 text-[13px] text-[#6f5a5e]">
                <span><b className="text-[#6b1d2b]">Ref:</b> {reference || "PHU/________"}</span>
                <span><b className="text-[#6b1d2b]">Date:</b> {documentDate ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${documentDate}T12:00:00`)) : ""}</span>
              </div>
              <div className="mt-5 text-[16px] font-bold uppercase text-[#4e1420]">RE: {title || "Untitled document"}</div>
            </>
          )}
          <div
            ref={(element) => { pageBodyRefs.current[pageIndex] = element; }}
            className={`${pageIndex === 0 ? "mt-4" : "mt-5"} min-h-0 overflow-hidden text-[15px] font-serif leading-[1.6]`}
            style={{ maxHeight: bodyLineCapacity * contentFontSize * 1.6 }}
          >
            <div className="whitespace-pre-wrap break-words" style={{ fontSize: contentFontSize }}>
              {pageContent || "Your document text will appear here."}
            </div>
          </div>
          {pageIndex === pageCount - 1 && (
            <div
              ref={(element) => { pageSignatureRefs.current[pageIndex] = element; }}
              id="a4-document-preview-signatures"
              className="mt-7 flex flex-wrap justify-between gap-8 text-[14px]"
            >
              <div className="min-w-[230px]">
                <div>Yours sincerely,</div>
                <div className="mt-5 w-[230px] border-t border-[#6f5a5e] pt-1 text-[17px] font-bold text-[#6b1d2b]">{writerName || "Writer name"}</div>
                <div className="mt-1 text-[13px] text-[#6f5a5e]">{writerTitle || "Writer title"}</div>
                <div className="text-[12px] italic text-[#6f5a5e]">Pearl Hijja &amp; Umrah Services</div>
              </div>
              {secondPartySignature && (
                <div className="ml-auto min-w-[230px] text-right">
                  <div>Agreed by,</div>
                  <div className="ml-auto mt-5 w-[230px] border-t border-[#6f5a5e] pt-1 text-[17px] font-bold text-[#6b1d2b]">{secondPartyName || "Second party name"}</div>
                  <div className="mt-1 text-[13px] text-[#6f5a5e]">{secondPartyTitle || "Second party title"}</div>
                </div>
              )}
            </div>
          )}
          <footer
            ref={(element) => { pageFooterRefs.current[pageIndex] = element; }}
            className="absolute bottom-[58px] left-[68px] right-[68px] flex justify-between border-t-2 border-[#6b1d2b] pt-3 text-[11px] text-[#6f5a5e]"
          >
            <span>Liberty Tower, Kampala Road, Opposite King Fahad Plaza</span><span>www.pearlhijjaandumrah.com</span>
          </footer>
        </div>
      </article>
      <span data-html2canvas-ignore className="a4-page-number absolute bottom-1 right-2 text-[10px] text-slate-400">Page {pageIndex + 1} of {pageCount}</span>
    </div>
  );
  };

  return (
    <AdminLayout title="Document Processing" description="Write, preview and print A4 documents">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0 !important; }
          body * { visibility: hidden !important; }
          #a4-document-preview-pages, #a4-document-preview-pages * { visibility: visible !important; }
          #a4-document-preview-pages { position: absolute !important; left: 0 !important; top: 0 !important; display: block !important; width: 794px !important; margin: 0 !important; padding: 0 !important; }
          #a4-document-preview-card { position: static !important; overflow: visible !important; padding: 0 !important; }
          #a4-document-preview-card > :not(#a4-document-preview-viewport) { display: none !important; }
          #a4-document-preview-viewport { position: static !important; display: block !important; height: auto !important; overflow: visible !important; padding: 0 !important; }
          .a4-preview-page { display: block !important; width: 210mm !important; height: 297mm !important; margin: 0 !important; box-shadow: none !important; break-after: page; page-break-after: always; }
          .a4-preview-page:last-child { break-after: auto; page-break-after: auto; }
          .a4-preview-page > article { width: 100% !important; height: 100% !important; transform: none !important; }
          #a4-document-preview-pages, #a4-document-preview-pages * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .a4-preview-reference-date { background-color: #f9f2f4 !important; }
          #a4-document-preview-signatures { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Saved documents</span>
          <Select value={documentId || "new"} onValueChange={(value) => { if (value === "new") { newDocument(); return; } const item = documents.find((document) => document.id === value); if (!item) return; setDocumentId(item.id); setTitle(item.title || ""); setReference(item.reference || ""); setWriterName(item.writer_name || ""); setWriterTitle(item.writer_title || ""); setSecondPartySignature(item.second_party_signature); setSecondPartyName(item.second_party_name); setSecondPartyTitle(item.second_party_title); setDocumentDate(item.document_date || todayIso()); setContent(item.content || ""); }}>
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
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Checkbox id="second-party-signature" checked={secondPartySignature} onCheckedChange={(checked) => setSecondPartySignature(checked === true)} />
                <label htmlFor="second-party-signature" className="cursor-pointer">Include second-party signature</label>
              </div>
              {secondPartySignature && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Second party name</label>
                    <Input value={secondPartyName} onChange={(event) => setSecondPartyName(event.target.value)} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Second party title</label>
                    <Input value={secondPartyTitle} onChange={(event) => setSecondPartyTitle(event.target.value)} placeholder="e.g. Client" />
                  </div>
                </div>
              )}
            </div>
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Type or paste your document text here..." className="min-h-[180px] max-h-[360px] resize-y font-serif text-base leading-7 sm:min-h-[240px] lg:min-h-[280px]" />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button onClick={saveDocument} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>
              <Button type="button" variant="outline" onClick={downloadPdf} disabled={downloadingPdf}>
                {downloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {downloadingPdf ? "Creating PDF..." : "Download PDF"}
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print A4</Button>
            </div>
          </CardContent>
        </Card>

        <Card id="a4-document-preview-card" className="min-w-0 overflow-hidden bg-slate-100 p-3 dark:bg-slate-900 sm:p-4 lg:col-span-2 2xl:col-span-1">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Eye className="h-4 w-4" />A4 preview</div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm dark:bg-slate-800">Fit to screen</span>
          </div>
          <div id="a4-document-preview-viewport" ref={previewContainerRef} className="flex justify-center overflow-auto rounded-lg bg-slate-200/70 p-4 dark:bg-slate-950/40">
            <div id="a4-document-preview-pages" className="flex flex-col items-center gap-4">
              {contentPages.map((pageContent, pageIndex) => renderPreviewPage(pageIndex, pageContent))}
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
