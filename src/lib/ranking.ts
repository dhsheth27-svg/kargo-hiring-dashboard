import { prisma } from "./prisma";
import {
  generateBrief,
  draftInviteEmail,
  draftRejectEmail,
} from "./gemini";
import { logActivity } from "./activity";
import type { Role } from "./types";

export async function getShortlistSize(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: "shortlist_size" },
  });
  const n = setting ? parseInt(setting.value, 10) : 5;
  return Number.isFinite(n) && n > 0 ? n : 5;
}

/**
 * Recomputes rank-based shortlist membership (briefs) and invite/reject
 * drafts for every applicant to ONE role posting. Ranking is scoped per
 * Role (job posting), not globally by rubric — two different postings that
 * both happen to use the PM rubric each get their own top-N, since a
 * recruiter shortlists candidates for THIS job, not across every PM
 * posting ever created. Must re-run after every new candidate in this
 * role is scored, because a rank-based cutoff can only be evaluated
 * relative to the current pool for that role.
 */
export async function recomputeShortlistAndDraftsForRole(roleId: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  const shortlistSize = await getShortlistSize();
  const rubricRole = role.rubricRole as Role;

  const totals = await prisma.candidateRoleTotal.findMany({
    where: {
      roleScored: rubricRole,
      candidate: { roleId },
    },
    orderBy: { totalScore: "desc" },
  });
  const topIds = new Set(totals.slice(0, shortlistSize).map((t) => t.candidateId));

  await recomputeBriefs(rubricRole, roleId, topIds);

  for (let i = 0; i < totals.length; i++) {
    const desiredType = i < shortlistSize ? "invite" : "reject";
    await recomputeDraftForCandidate(totals[i].candidateId, rubricRole, desiredType);
  }
}

async function recomputeBriefs(
  rubricRole: Role,
  roleId: string,
  topIds: Set<string>
) {
  const existingBriefs = await prisma.brief.findMany({
    where: { roleScored: rubricRole, candidate: { roleId } },
  });
  const existingIds = new Set(existingBriefs.map((b) => b.candidateId));

  const toRemove = existingBriefs.filter((b) => !topIds.has(b.candidateId));
  if (toRemove.length > 0) {
    await prisma.brief.deleteMany({
      where: { id: { in: toRemove.map((b) => b.id) } },
    });
  }

  for (const candidateId of topIds) {
    if (existingIds.has(candidateId)) continue;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate?.cvContent) continue;

    const scores = await prisma.score.findMany({
      where: { candidateId, roleScored: rubricRole },
      include: { criterion: true },
    });
    if (scores.length === 0) continue;

    const result = await generateBrief({
      cvContent: candidate.cvContent,
      role: rubricRole,
      scoredCriteria: scores.map((s) => ({
        name: s.criterion.name,
        rawScore: s.rawScore,
        reasoning: s.reasoning,
      })),
    });

    await prisma.brief.upsert({
      where: { candidateId_roleScored: { candidateId, roleScored: rubricRole } },
      create: { candidateId, roleScored: rubricRole, briefText: result.brief_text },
      update: { briefText: result.brief_text },
    });

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: "briefed" },
    });
    await logActivity(candidateId, "scored", "Entered the shortlist — interview brief generated.");
  }
}

async function recomputeDraftForCandidate(
  candidateId: string,
  rubricRole: Role,
  desiredType: "invite" | "reject"
) {
  const existing = await prisma.draftEmail.findUnique({ where: { candidateId } });

  // Never touch an already-sent email.
  if (existing?.status === "sent") return;
  // Already drafted with the correct type — leave the founder's edits alone.
  if (existing && existing.emailType === desiredType) return;

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate?.cvContent) return;

  const result =
    desiredType === "invite"
      ? await draftInviteEmail({ cvContent: candidate.cvContent, role: rubricRole })
      : await draftRejectEmail({ cvContent: candidate.cvContent, role: rubricRole });

  const personalDetails = JSON.parse(candidate.personalDetails) as { name: string };
  const body = result.body.split("{{NAME}}").join(personalDetails.name);
  const subject = result.subject.split("{{NAME}}").join(personalDetails.name);

  await prisma.draftEmail.upsert({
    where: { candidateId },
    create: {
      candidateId,
      emailType: desiredType,
      templateType: desiredType,
      subject,
      body,
      status: "draft",
    },
    update: { emailType: desiredType, templateType: desiredType, subject, body, status: "draft" },
  });

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "drafted" },
  });
}
