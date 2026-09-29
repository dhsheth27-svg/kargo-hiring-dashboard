// PDF text extraction can surface stray control characters (most commonly
// NUL, \x00) from malformed embedded fonts/streams — invisible in normal
// use, but Postgres's UTF8 column type rejects them outright (error 22021),
// which would otherwise crash the whole pipeline on an otherwise-fine file.
// Strips all C0 control characters except the ones we actually want to
// keep for line structure (\n, \r, \t).
function stripControlCharacters(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
}

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
    return stripControlCharacters(text);
  }
  // Plain text / markdown fallback (.txt, .md)
  return stripControlCharacters(buffer.toString("utf-8"));
}
