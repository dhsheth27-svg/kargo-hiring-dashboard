export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse-fork")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }
  // Plain text / markdown fallback (.txt, .md)
  return buffer.toString("utf-8");
}
