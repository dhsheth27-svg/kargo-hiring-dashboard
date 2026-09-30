import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      candidates: {
        orderBy: { createdAt: "desc" },
        include: { roleTotals: true, briefs: true, draftEmails: true },
      },
    },
  });

  if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });

  const candidates = role.candidates.map((c) => {
    const total = c.roleTotals.find((t) => t.roleScored === role.rubricRole);
    const personalDetails = JSON.parse(c.personalDetails) as { name: string; email: string };
    return {
      id: c.id,
      name: personalDetails.name,
      email: personalDetails.email,
      status: c.status,
      stage: c.stage,
      recruiterRating: c.recruiterRating,
      createdAt: c.createdAt,
      score: total ? Math.round(total.totalScore) : null,
      confidence: total?.confidence ?? null,
      hasBrief: c.briefs.some((b) => b.roleScored === role.rubricRole),
      draft: c.draftEmails[0]
        ? { emailType: c.draftEmails[0].emailType, status: c.draftEmails[0].status }
        : null,
    };
  });

  return NextResponse.json({
    id: role.id,
    title: role.title,
    description: role.description,
    location: role.location,
    seniority: role.seniority,
    requiredSkills: role.requiredSkills,
    preferredSkills: role.preferredSkills,
    rubricRole: role.rubricRole,
    status: role.status,
    hue: role.hue,
    createdAt: role.createdAt,
    candidates,
  });
}
