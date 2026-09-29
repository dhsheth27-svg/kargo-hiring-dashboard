export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    // unpdf wraps a current, actively-maintained pdfjs-dist build and is
    // built for serverless runtimes (no worker/filesystem assumptions).
    // It was swapped in for pdf-parse-fork, whose bundled pdf.js (v1.10.100,
    // circa 2017) threw "bad XRef entry" and failed outright on otherwise
    // valid PDFs (e.g. some ReportLab-generated resumes).
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  // Plain text / markdown fallback (.txt, .md)
  return buffer.toString("utf-8");
}
