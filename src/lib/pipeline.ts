import { prisma } from "./prisma";
import { extractTextFromFile } from "./pdf";
import { extractAndStrip } from "./extraction";
import { scoreCriterion } from "./gemini";
import { recomputeShortlistAndDrafts } from "./ranking";
import type { Role } from "./types";

/**
 * Runs the full pipeline for one already-created candidate row:
 * extract -> strip PII -> score against both rubrics -> recompute
 * pool-wide shortlist/briefs/drafts. Synchronous/awaited by the caller —
 * this is an internal tool with low volume, so no queue is needed.
 *
 * Takes the uploaded file's bytes directly (not a disk path): serverless
 * runtimes like Vercel have a read-only filesystem outside /tmp, and
 * nothing here needs the file again after this one pass, so there's no
 * reason to persist it to disk at all — in-memory for the duration of
 * this request is enough both locally and in production.
 */
export async function runPipelineForCandidate(
  candidateId: string,
  fileBuffer: Buffer,
  filename: string
) {
  // 1. Extraction — deterministic, AI-free. Raw file never touches Gemini.
  const rawText = await extractTextFromFile(fileBuffer, filename);
  const { personalDetails, cvContent } = extractAndStrip(rawText);

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      personalDetails: JSON.stringify(personalDetails),
      cvContent,
      status: "extracted",
    },
  });

  // Guard against scanned/image-only PDFs or other near-empty extractions:
  // scoring almost-blank content would silently produce a low, misleading
  // score (everything "not evidenced") instead of surfacing that this file
  // needs a different format or a manual look.
  if (cvContent.trim().length < 50) {
    throw new Error(
      `Extracted only ${cvContent.trim().length} characters of text — this file may be a scanned/image-based PDF rather than text, or otherwise unreadable. Try re-exporting it as a text-based PDF.`
    );
  }

  // 2. Scoring — against BOTH rubrics, independent of applied role.
  const criteria = await prisma.rubricCriterion.findMany({
    orderBy: { order: "asc" },
  });

  for (const role of ["PM", "SPM"] as Role[]) {
    const roleCriteria = criteria.filter((c) => c.role === role);

    // Sequential, not Promise.all: Gemini free-tier quotas are a handful of
    // requests/minute, and this is a low-volume internal tool — no need to
    // burst 8 concurrent calls per candidate.
    const results: Array<{
      criterion: (typeof roleCriteria)[number];
      result: { raw_score: number | null; reasoning: string };
    }> = [];
    for (const criterion of roleCriteria) {
      const result = await scoreCriterion({
        cvContent,
        criterionName: criterion.name,
        criterionDescription: criterion.description,
        anchors: JSON.parse(criterion.anchors),
      });
      results.push({ criterion, result });
    }

    let totalScore = 0;
    let notEvidencedCount = 0;

    for (const { criterion, result } of results) {
      const weightedScore =
        result.raw_score === null ? null : (result.raw_score / 5) * criterion.weight;
      if (weightedScore !== null) totalScore += weightedScore;
      if (result.raw_score === null) notEvidencedCount += 1;

      await prisma.score.create({
        data: {
          candidateId,
          roleScored: role,
          criterionId: criterion.id,
          rawScore: result.raw_score,
          reasoning: result.reasoning,
          weightedScore,
        },
      });
    }

    await prisma.candidateRoleTotal.upsert({
      where: { candidateId_roleScored: { candidateId, roleScored: role } },
      create: {
        candidateId,
        roleScored: role,
        totalScore,
        notEvidencedCount,
        confidence: notEvidencedCount >= 2 ? "low" : "normal",
      },
      update: {
        totalScore,
        notEvidencedCount,
        confidence: notEvidencedCount >= 2 ? "low" : "normal",
      },
    });
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "scored" },
  });

  // 3. Recompute shortlist-based briefs + applied-role-based drafts across
  //    the whole pool (a new candidate can shift who's in the top N).
  await recomputeShortlistAndDrafts();
}
