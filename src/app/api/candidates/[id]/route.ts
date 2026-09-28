import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      scores: { include: { criterion: true }, orderBy: { criterion: { order: "asc" } } },
      roleTotals: true,
      briefs: true,
      draftEmails: true,
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const personalDetails = JSON.parse(candidate.personalDetails);

  return NextResponse.json({
    id: candidate.id,
    appliedRole: candidate.appliedRole,
    status: candidate.status,
    createdAt: candidate.createdAt,
    name: personalDetails.name,
    email: personalDetails.email,
    phone: personalDetails.phone,
    totals: candidate.roleTotals,
    scoresByRole: {
      PM: candidate.scores
        .filter((s) => s.roleScored === "PM")
        .map((s) => ({
          criterion: s.criterion.name,
          weight: s.criterion.weight,
          rawScore: s.rawScore,
          reasoning: s.reasoning,
          weightedScore: s.weightedScore,
        })),
      SPM: candidate.scores
        .filter((s) => s.roleScored === "SPM")
        .map((s) => ({
          criterion: s.criterion.name,
          weight: s.criterion.weight,
          rawScore: s.rawScore,
          reasoning: s.reasoning,
          weightedScore: s.weightedScore,
        })),
    },
    briefs: candidate.briefs.map((b) => ({
      roleScored: b.roleScored,
      briefText: b.briefText,
    })),
    draft: candidate.draftEmails[0]
      ? {
          id: candidate.draftEmails[0].id,
          emailType: candidate.draftEmails[0].emailType,
          subject: candidate.draftEmails[0].subject,
          body: candidate.draftEmails[0].body,
          status: candidate.draftEmails[0].status,
          sentAt: candidate.draftEmails[0].sentAt,
        }
      : null,
  });
}
