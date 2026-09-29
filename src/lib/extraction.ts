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

const FULL_EMAIL_ANCHORED_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Same glued-text artifact as the name issue above can swallow an all-caps
// name fragment into the front of an email match (e.g. a resume with
// "...HARSH REDDYsquad_5@..." yields "REDDYsquad_5@..." from EMAIL_RE,
// since capital letters are valid in an email local-part). Only strips a
// leading ALL-CAPS run (2+ letters, no digits/underscore) — never a mixed-
// case prefix — since a legitimate local part here is consistently
// lowercase; this keeps it from ever touching a normal camelCase address.
function stripGluedCapsPrefix(matched: string): string {
  const capsPrefix = matched.match(/^[A-Z]{2,}/)?.[0];
  if (!capsPrefix) return matched;
  const rest = matched.slice(capsPrefix.length);
  return FULL_EMAIL_ANCHORED_RE.test(rest) ? rest : matched;
}

const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/gi;
const GENERIC_URL_RE = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\/[^\s)]*)?/gi;

// A single-line resume header often crams name, title, and contact info
// together with delimiters instead of newlines, e.g.
// "Priya Krishnan | Product Manager | +91 ... · squad_1@... · Mumbai", or
// with no delimiter at all, e.g. "Kabir Mehta squad_2@pg27.mesaschool.co".
// Splitting on delimiters (after removing the already-known email/phone
// substrings, which otherwise poison the whole-line check) lets each
// remaining segment be checked independently.
const HEADER_DELIMITER_RE = /[|·•]/;

// A job title sitting on its own line/segment right next to the name is
// easily as "name-shaped" as the real name ("Product Manager", "Corporate
// Strategy") — grammatically indistinguishable by capitalization alone. A
// denylist of common title/section words breaks the tie: real personal
// names essentially never contain these words, but resume headers/titles
// constantly do.
const TITLE_OR_SECTION_WORDS =
  /\b(manager|director|engineer|analyst|consultant|specialist|officer|executive|associate|intern|developer|designer|architect|coordinator|president|founder|lead|head|senior|junior|strategy|summary|professional|experience|education|profile|objective|skills|projects|advisory|advisor|operations|product|owner|scientist|administrator|representative|assistant)\b/i;

function looksLikeName(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (trimmed.length > 60) return false;
  if (/[@\d]/.test(trimmed)) return false;
  if (TITLE_OR_SECTION_WORDS.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  // Every word should look capitalized-ish (allow hyphens, apostrophes, periods for initials)
  return words.every((w) => /^[A-Z][A-Za-z'.-]*$/.test(w));
}

function cleanLine(line: string, email: string, phone: string | null): string {
  let cleaned = line.trim();
  if (email) cleaned = cleaned.split(email).join(" ").trim();
  if (phone) cleaned = cleaned.split(phone).join(" ").trim();
  return cleaned;
}

function segmentsOf(cleaned: string): string[] {
  if (!HEADER_DELIMITER_RE.test(cleaned)) return [];
  return cleaned
    .split(HEADER_DELIMITER_RE)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Some resume templates render the name twice back-to-back with no
// separator — once all-caps, once properly cased (or vice versa) — e.g.
// "ROHAN MEHTARohan Mehta". Detected generically (find a split point where
// both halves are the same words, case-insensitively) rather than assuming
// a specific order, and collapsed to whichever half has lowercase letters.
function dedupeDoubledName(candidate: string): string {
  const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  for (let i = 1; i < candidate.length; i++) {
    const left = candidate.slice(0, i).trim();
    const right = candidate.slice(i).trim();
    if (!left || !right) continue;
    if (normalize(left) === normalize(right)) {
      const hasLower = (s: string) => /[a-z]/.test(s);
      if (hasLower(right) && !hasLower(left)) return right;
      if (hasLower(left) && !hasLower(right)) return left;
      return left;
    }
  }
  return candidate;
}

// The doubled-name artifact above isn't always cleanly its own line — it
// can be glued directly onto the end of an unrelated, much longer sentence
// with no separator ("...and fundraising.NIKHIL SHARMANikhil Sharma"),
// which defeats a whole-line length/word-count check entirely. But the
// signature itself (an all-caps multi-word run immediately followed by a
// case-insensitively-identical properly-cased run, in either order) is
// distinctive enough to search for directly across the full raw text,
// independent of line boundaries or surrounding content.
// [ \t]+ rather than \s+ between words: this must stay within one physical
// line, or a greedy multi-line match (e.g. bridging "Mailchimp\nMeera
// Krishnan" across a line break) can hijack the match and prevent the
// real, same-line doubled pair from ever being tried.
const DOUBLED_NAME_CAPS_FIRST_RE =
  /([A-Z]{2,}(?:[ \t]+[A-Z]{2,}){1,3})([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3})/g;
const DOUBLED_NAME_PROPER_FIRST_RE =
  /([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3})([A-Z]{2,}(?:[ \t]+[A-Z]{2,}){1,3})/g;

function findDoubledNameInFullText(rawText: string): string | null {
  const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  for (const re of [DOUBLED_NAME_CAPS_FIRST_RE, DOUBLED_NAME_PROPER_FIRST_RE]) {
    for (const m of rawText.matchAll(re)) {
      const [, first, second] = m;
      if (normalize(first) === normalize(second)) {
        // Whichever half has lowercase letters is the properly-cased one.
        return /[a-z]/.test(second) ? second.trim() : first.trim();
      }
    }
  }
  return null;
}

/**
 * Finds the candidate's name. PDF text extraction order doesn't reliably
 * follow visual top-to-bottom reading order — a resume's header (name,
 * email, phone) can land anywhere in the extracted text, including the very
 * end, depending on how the PDF's content stream / layout was generated.
 * So rather than assuming "the name is near the top," this searches near
 * wherever the email actually landed (name and email are almost always
 * adjacent in a resume header, regardless of where that header ends up in
 * the extracted text), by increasing distance in either direction.
 *
 * Within that search, whole lines (after stripping the known email/phone)
 * are checked BEFORE that line's delimiter-split segments, at every
 * distance, and only once no whole-line match exists anywhere nearby do
 * segments get tried — segments are much noisier (a location or a stray
 * fragment like "Delhi NCR" can look exactly as name-shaped as a real
 * name), so a farther whole-line match should win over a closer segment.
 */
function extractName(
  rawText: string,
  lines: string[],
  email: string,
  phone: string | null
): string {
  const doubled = findDoubledNameInFullText(rawText);
  if (doubled) return doubled;

  const nonEmpty = lines.map((l) => l.trim()).filter((l) => l.length > 0);

  const distancesFrom = (centerIndex: number) => {
    const order: number[] = [];
    const maxDistance = Math.max(
      centerIndex,
      nonEmpty.length - 1 - centerIndex
    );
    for (let d = 0; d <= Math.min(maxDistance, 4); d++) {
      if (centerIndex - d >= 0) order.push(centerIndex - d);
      if (d > 0 && centerIndex + d < nonEmpty.length) order.push(centerIndex + d);
    }
    return order;
  };

  if (email) {
    const emailLineIndex = nonEmpty.findIndex((l) => l.includes(email));
    if (emailLineIndex !== -1) {
      const nearbyIndices = distancesFrom(emailLineIndex);

      // Pass 1: whole lines only, by increasing distance.
      for (const i of nearbyIndices) {
        const cleaned = cleanLine(nonEmpty[i], email, phone);
        if (looksLikeName(cleaned)) return dedupeDoubledName(cleaned);
      }
      // Pass 2: delimiter-split segments, by increasing distance.
      for (const i of nearbyIndices) {
        const cleaned = cleanLine(nonEmpty[i], email, phone);
        for (const segment of segmentsOf(cleaned)) {
          if (looksLikeName(segment)) return dedupeDoubledName(segment);
        }
      }
    }
  }

  // Fallback (no email found nearby, or nothing matched near it): scan the
  // whole document — whole lines first, then segments — for anything
  // name-shaped, preferring earlier matches.
  for (const line of nonEmpty) {
    const cleaned = cleanLine(line, email, phone);
    if (looksLikeName(cleaned)) return dedupeDoubledName(cleaned);
  }
  for (const line of nonEmpty) {
    const cleaned = cleanLine(line, email, phone);
    for (const segment of segmentsOf(cleaned)) {
      if (looksLikeName(segment)) return dedupeDoubledName(segment);
    }
  }

  return "Unknown Candidate";
}

export interface ExtractionResult {
  personalDetails: PersonalDetails;
  cvContent: string;
}

export function extractAndStrip(rawText: string): ExtractionResult {
  const lines = rawText.split(/\r?\n/);

  const emailMatch = rawText.match(EMAIL_RE);
  const email = emailMatch?.[0] ? stripGluedCapsPrefix(emailMatch[0]) : "";

  const phoneMatches = rawText.match(PHONE_RE) ?? [];
  // Filter out short numeric noise (years, page numbers) — require at least 7 digits.
  const phone =
    phoneMatches.find((m) => m.replace(/\D/g, "").length >= 7) ?? null;

  const name = extractName(rawText, lines, email, phone);

  let stripped = rawText;
  stripped = stripped.replace(LINKEDIN_RE, "[link removed]");
  if (email) stripped = stripped.split(email).join("[email removed]");
  if (phone) stripped = stripped.split(phone).join("[phone removed]");
  // Remove the identified name wherever the exact multi-word string appears
  // (substring replace, like email/phone above — not a blanket single-word
  // strip, which would mangle unrelated references elsewhere in the CV).
  // A name is always 2+ words together, so this is very unlikely to
  // collide with other content, and it also catches the name recurring
  // elsewhere (e.g. a footer) that a single "header line" removal would miss.
  if (name && name !== "Unknown Candidate") {
    stripped = stripped.split(name).join("[name removed]");
  }
  // Best-effort strip of any other bare URLs (personal sites, portfolios) that
  // could be identifying, beyond LinkedIn specifically.
  stripped = stripped.replace(GENERIC_URL_RE, (match) =>
    /\.(com|io|dev|me|org|net|co)/i.test(match) && match.length > 6
      ? "[link removed]"
      : match
  );

  return {
    // Title-cased for display only, after using the raw matched form above
    // to strip occurrences from cvContent (which contains the raw casing).
    personalDetails: { name: titleCaseName(name), email, phone },
    cvContent: stripped.trim(),
  };
}

function titleCaseName(name: string): string {
  if (name === "Unknown Candidate") return name;
  if (/[a-z]/.test(name)) return name; // already has lowercase — leave as-is
  return name
    .split(/\s+/)
    .map((w) => (w.length > 1 ? w[0] + w.slice(1).toLowerCase() : w))
    .join(" ");
}
