// The legacy build targets older JS engines: the packaged app runs in WKWebView,
// whose engine lacks some of the newest features the modern build assumes.
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
// The worker must be inlined (blob-backed), not fetched by URL: in the packaged
// Tauri app the frontend is served over a custom protocol that WKWebView does
// not use for worker-script requests, so a URL-based worker never loads.
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline";

export type { PDFDocumentProxy, PDFPageProxy };

export interface PageTextContent {
  items: { str?: string; [k: string]: unknown }[];
  styles: Record<string, unknown>;
  lang: string | null;
}

/**
 * Accumulate a page's text content by reading the stream manually.
 * pdf.js's own getTextContent() iterates with `for await`, which WKWebView's
 * ReadableStream doesn't support — it throws in the packaged Tauri app.
 */
export async function getPageTextContent(page: PDFPageProxy): Promise<PageTextContent> {
  const reader = page.streamTextContent().getReader();
  const out: PageTextContent = { items: [], styles: {}, lang: null };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out.lang ??= value.lang ?? null;
    Object.assign(out.styles, value.styles);
    out.items.push(...value.items);
  }
  return out;
}

let workerStarted = false;
function ensureWorker() {
  if (!workerStarted) {
    GlobalWorkerOptions.workerPort = new PdfWorker();
    workerStarted = true;
  }
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function loadPdf(dataUrl: string): Promise<PDFDocumentProxy> {
  ensureWorker();
  return getDocument({ data: dataUrlToBytes(dataUrl) }).promise;
}

/**
 * Extract searchable text (capped) for card previews and search.
 * Best-effort: any failure returns what we have instead of blocking import.
 */
export async function extractPdfText(doc: PDFDocumentProxy, maxChars = 20000): Promise<string> {
  let text = "";
  try {
    const maxPages = Math.min(doc.numPages, 25);
    for (let p = 1; p <= maxPages && text.length < maxChars; p++) {
      const page = await doc.getPage(p);
      const tc = await getPageTextContent(page);
      const line = tc.items
        .map((item) => item.str ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) text += line + "\n";
    }
  } catch (err) {
    console.error("PDF text extraction failed (import continues):", err);
  }
  return text.slice(0, maxChars);
}
