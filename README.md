# Kargo Hiring Dashboard

Internal tool for Arjun to upload CVs, get them scored against the Kargo
hiring rubric (`rubric.txt`), and review/send interview invites or
rejections — never automatically, always with an explicit click.

## Stack

| Concern | This build |
|---|---|
| App | Next.js 16 (App Router) + TypeScript + Tailwind |
| AI | Gemini (`@google/genai`), structured JSON output |
| Database | SQLite via Prisma 7, driver adapter `@prisma/adapter-better-sqlite3` |
| Email | Resend |
| PDF parsing | `pdf-parse-fork` |

**Database note:** SQLite was used here for zero-setup local development —
free, persistent, queryable with `npm run db:studio`. To move to
Supabase/Neon Postgres for production:
1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `"postgresql"`.
2. Install `@prisma/adapter-pg` and swap the adapter in `src/lib/prisma.ts`
   (and `prisma/seed.ts`) from `PrismaBetterSqlite3` to `PrismaPg`.
3. Set `DATABASE_URL` in `.env.local` to the Postgres connection string.
No model/schema changes needed — the structure is designed to be
provider-agnostic.

## Setup

```bash
npm install
npm run db:migrate   # applies prisma/migrations, creates dev.db
npm run db:seed       # seeds rubric_criteria from rubric.txt (verifies weights sum to 100)
npm run dev
```

Then fill in `.env.local` (copied from `.env.example`):
- `GEMINI_API_KEY` — required for the pipeline to run at all.
- `RESEND_API_KEY` — left blank intentionally; add it when ready to send
  real email. Until then, `/api/candidates/[id]/send` will fail loudly
  rather than silently no-op.
- `RESEND_FROM_EMAIL` — do not point this at a production domain until
  Arjun provides one.

## Rubric anchors — important caveat

`rubric.txt` gives criterion names, descriptions, and weights, but
explicitly defers 1–5 scoring anchors to "the full analysis doc," which
wasn't provided. The anchors in `prisma/seed.ts` are **derived** by Claude
to be consistent with each criterion's "what a strong candidate looks
like" description, and every row is seeded with `derived: true` so this is
visible in the data, not hidden. If a more authoritative anchor set shows
up, edit `CRITERIA` in `prisma/seed.ts` and re-run `npm run db:seed`
(it deletes and re-seeds `rubric_criteria`, `scores`, and
`candidate_role_totals` — re-upload candidates afterward, or write a
one-off script to re-run just the scoring step against existing
`cv_content`).

## Privacy design

Extraction (`src/lib/extraction.ts`) is **deterministic regex/heuristics,
not AI** — this is intentional, not a shortcut. The absolute rule is that
no personal detail (name, email, phone) is ever sent to an AI prompt. Using
an AI call to *identify* the PII would require sending the raw,
PII-containing CV text to that call in the first place, which would
violate the rule before it even started. So PII stripping happens entirely
locally, before `cv_content` (what actually reaches Gemini) is computed.
The heuristics: regex for email/phone/LinkedIn URLs, and a "does this line
look like a 2–4 word capitalized name" heuristic for the candidate's name,
applied to the first ~10 lines of the CV. It's not perfect — review
`personal_details` after upload if a CV has an unusual header layout.

## Pipeline

`src/lib/pipeline.ts` runs synchronously per upload (this is a low-volume
internal tool — no queue):
1. **Extract** — PDF/text → PII-stripped `cv_content` (see above).
2. **Score** — every criterion, against *both* PM and SPM rubrics,
   sequentially (not parallel — see rate limits note below), each call
   seeing only one candidate's content.
3. **Recompute shortlist & drafts** (`src/lib/ranking.ts`) — runs across
   the *whole* candidate pool after every upload, because a rank-based
   top-N cutoff can only be evaluated relative to the current pool. A new
   strong candidate can bump an existing one in or out of the shortlist.
   Briefs are generated/removed to match the current top N (env
   `SHORTLIST_SIZE`, default 5) per role. Draft emails are decided by each
   candidate's rank under **their own applied role's** rubric only (a
   candidate who also scores well under the other rubric doesn't get a
   second draft — see rubric.txt / the build spec on this point). An
   already-sent draft is never touched; a draft the founder edited but
   whose required type (invite/reject) hasn't changed is also left alone.

## Rate limits

Gemini free-tier keys are commonly capped around 5 requests/minute. One
candidate needs 8 scoring calls plus (if shortlisted) a brief and a draft —
comfortably more than that in under a minute. `src/lib/gemini.ts` retries
transient 429/503 errors respecting the API's own `retryDelay`, up to 8
attempts per call. On a paid-tier key this retry budget is essentially
never exercised; on a free-tier key, expect a single upload to take longer
than instant while it waits out quota windows — this is a Gemini account
limit, not a bug in the pipeline.

## Pages

- `/upload` — pick a role, upload one CV or a batch, watch each one run
  through the pipeline.
- `/dashboard` — all candidates, filterable by applied role, sorted by
  score under their applied role's rubric, with confidence/shortlist/draft
  status badges.
- `/candidates/[id]` — full score breakdown under both rubrics, the
  interview brief (if shortlisted), and the draft email — editable, with
  the **Confirm & send** button that's the only thing in this whole app
  that actually sends anything.

## What's simplified / deferred vs. the full spec

- No auth — single-user internal tool, matches "for a founder... reviews
  CVs alone." Add auth before giving anyone else access.
- Batch upload runs one file at a time in the browser (sequential fetches)
  rather than a server-side job queue — fine at this volume, revisit if
  batches grow past a few dozen.
- Job description files (PM.pdf/SPM.pdf) referenced in the original build
  prompt weren't actually attached to this build — the scoring engine
  doesn't need them (it only reads `rubric_criteria`), so this doesn't
  block anything, but they weren't used to sanity-check phrasing either.
