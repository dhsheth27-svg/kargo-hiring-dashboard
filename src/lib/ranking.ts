import { prisma } from "./prisma";
import { generateBrief, draftInviteEmail, draftRejectEmail } from "./gemini";
import type { Role } from "./types";

export async function getShortlistSize(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: "shortlist_size" },
  });
  const n = setting ? parseInt(setting.value, 10) : 5;
  return Number.isFinite(n) && n > 0 ? n : 5;
}

/**
 * Recomputes rank-based shortlist membership (briefs) and applied-role-based
 * invite/reject drafts across the WHOLE candidate pool. This must re-run
 * after every new candidate is scored, because a rank-based cutoff (top N)
 * can only be evaluated relative to the current pool — a new strong
 * candidate can bump an existing one out of (or into) the shortlist.
 */
export async function recomputeShortlistAndDrafts() {
  const shortlistSize = await getShortlistSize();

  for (const role of ["PM", "SPM"] as Role[]) {
    await recomputeBriefsForRole(role, shortlistSize);
  }

  const candidates = await prisma.candidate.findMany({
    select: { id: true, appliedRole: true },
  });
  for (const c of candidates) {
    await recomputeDraftForCandidate(c.id, c.appliedRole as Role, shortlistSize);
  }
}

async function recomputeBriefsForRole(role: Role, shortlistSize: number) {
  const totals = await prisma.candidateRoleTotal.findMany({
    where: { roleScored: role },
    orderBy: { totalScore: "desc" },
  });
  const topIds = new Set(totals.slice(0, shortlistSize).map((t) => t.candidateId));

  const existingBriefs = await prisma.brief.findMany({
    where: { roleScored: role },
  });
  const existingIds = new Set(existingBriefs.map((b) => b.candidateId));

  // Remove briefs for candidates who fell out of the top N.
  const toRemove = existingBriefs.filter((b) => !topIds.has(b.candidateId));
  if (toRemove.length > 0) {
    await prisma.brief.deleteMany({
      where: { id: { in: toRemove.map((b) => b.id) } },
    });
  }

  // Generate briefs for candidates newly in the top N.
  for (const candidateId of topIds) {
    if (existingIds.has(candidateId)) continue;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate?.cvContent) continue;

    const scores = await prisma.score.findMany({
      where: { candidateId, roleScored: role },
      include: { criterion: true },
    });
    if (scores.length === 0) continue;

    const result = await generateBrief({
      cvContent: candidate.cvContent,
      role,
      scoredCriteria: scores.map((s) => ({
        name: s.criterion.name,
        rawScore: s.rawScore,
        reasoning: s.reasoning,
      })),
    });

    await prisma.brief.upsert({
      where: { candidateId_roleScored: { candidateId, roleScored: role } },
      create: {
        candidateId,
        roleScored: role,
        briefText: result.brief_text,
      },
      update: { briefText: result.brief_text },
    });

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: "briefed" },
    });
  }
}

async function recomputeDraftForCandidate(
  candidateId: string,
  appliedRole: Role,
  shortlistSize: number
) {
  const totals = await prisma.candidateRoleTotal.findMany({
    where: { roleScored: appliedRole },
    orderBy: { totalScore: "desc" },
  });
  const rank = totals.findIndex((t) => t.candidateId === candidateId);
  if (rank === -1) return; // not yet scored for their applied role

  const desiredType = rank < shortlistSize ? "invite" : "reject";

  const existing = await prisma.draftEmail.findUnique({
    where: { candidateId },
  });

  // Never touch an already-sent email.
  if (existing?.status === "sent") return;
  // Already drafted with the correct type — leave the founder's edits alone.
  if (existing && existing.emailType === desiredType) return;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate?.cvContent) return;

  const result =
    desiredType === "invite"
      ? await draftInviteEmail({ cvContent: candidate.cvContent, role: appliedRole })
      : await draftRejectEmail({ cvContent: candidate.cvContent, role: appliedRole });

  const personalDetails = JSON.parse(candidate.personalDetails) as {
    name: string;
  };
  const body = result.body.split("{{NAME}}").join(personalDetails.name);
  const subject = result.subject.split("{{NAME}}").join(personalDetails.name);

  await prisma.draftEmail.upsert({
    where: { candidateId },
    create: {
      candidateId,
      emailType: desiredType,
      subject,
      body,
      status: "draft",
    },
    update: {
      emailType: desiredType,
      subject,
      body,
      status: "draft",
    },
  });

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "drafted" },
  });
}
