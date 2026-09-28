import type { PersonalDetails } from "./types";

/**
 * Deterministic, non-AI extraction of personal details from raw CV text.
 *
 * This is intentionally regex/heuristic-based rather than AI-based: the
 * privacy requirement is that no personal detail (name, email, phone, etc.)
 * is EVER sent to an AI prompt, under any circumstance. Using an AI call to
 * identify the PII would require sending the raw, PII-containing text to
 * that call in the first place — which would itself violate the rule. So
 * this step runs entirely locally, before anything reaches Gemini.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Matches common phone formats: +1 (555) 123-4567, 555-123-4567, 555.123.4567, etc.
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/g;

const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/gi;
const GENERIC_URL_RE = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\/[^\s)]*)?/gi;

function looksLikeName(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 60) return false;
  if (/[@\d]/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  // Every word should look capitalized-ish (allow hyphens, apostrophes, periods for initials)
  return words.every((w) => /^[A-Z][A-Za-z'.-]*$/.test(w));
}

function extractName(lines: string[]): string {
  // Look at the first ~10 non-empty lines for something name-shaped.
  const candidates = lines.slice(0, 10).filter((l) => l.trim().length > 0);
  for (const line of candidates) {
    if (looksLikeName(line)) return line.trim();
  }
  // Fallback: first non-empty line, trimmed, however it looks.
  return (candidates[0] ?? "Unknown Candidate").trim().slice(0, 80);
}

export interface ExtractionResult {
  personalDetails: PersonalDetails;
  cvContent: string;
}

export function extractAndStrip(rawText: string): ExtractionResult {
  const lines = rawText.split(/\r?\n/);

  const emailMatch = rawText.match(EMAIL_RE);
  const email = emailMatch?.[0] ?? "";

  const phoneMatches = rawText.match(PHONE_RE) ?? [];
  // Filter out short numeric noise (years, page numbers) — require at least 7 digits.
  const phone =
    phoneMatches.find((m) => m.replace(/\D/g, "").length >= 7) ?? null;

  const name = extractName(lines);

  let stripped = rawText;
  stripped = stripped.replace(LINKEDIN_RE, "[link removed]");
  if (email) stripped = stripped.split(email).join("[email removed]");
  if (phone) stripped = stripped.split(phone).join("[phone removed]");
  // Remove the identified name line specifically (not a blanket name-word strip,
  // which would mangle references to companies/products elsewhere in the CV).
  stripped = stripped
    .split(/\r?\n/)
    .filter((line) => line.trim() !== name.trim())
    .join("\n");
  // Best-effort strip of any other bare URLs (personal sites, portfolios) that
  // could be identifying, beyond LinkedIn specifically.
  stripped = stripped.replace(GENERIC_URL_RE, (match) =>
    /\.(com|io|dev|me|org|net|co)/i.test(match) && match.length > 6
      ? "[link removed]"
      : match
  );

  return {
    personalDetails: { name, email, phone },
    cvContent: stripped.trim(),
  };
}
