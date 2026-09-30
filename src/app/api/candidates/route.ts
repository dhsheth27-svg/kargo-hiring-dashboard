import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPipelineForCandidate } from "@/lib/pipeline";

export async function GET(req: NextRequest) {
  const roleId = req.nextUrl.searchParams.get("roleId");

  const candidates = await prisma.candidate.findMany({
    where: roleId ? { roleId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { roleTotals: true, briefs: true, draftEmails: true, role: true },
  });

  const shaped = candidates.map((c) => {
    const total = c.roleTotals.find((t) => t.roleScored === c.role.rubricRole);
    const personalDetails = JSON.parse(c.personalDetails) as { name: string; email: string };
    return {
      id: c.id,
      appliedRole: c.appliedRole,
      roleId: c.roleId,
      roleTitle: c.role.title,
      roleHue: c.role.hue,
      status: c.status,
      stage: c.stage,
      createdAt: c.createdAt,
      name: personalDetails.name,
      email: personalDetails.email,
      score: total ? Math.round(total.totalScore) : null,
      hasBrief: c.briefs.length > 0,
      draft: c.draftEmails[0]
        ? { emailType: c.draftEmails[0].emailType, status: c.draftEmails[0].status }
        : null,
    };
  });

  return NextResponse.json({ candidates: shaped });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const roleId = formData.get("roleId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!roleId) {
    return NextResponse.json({ error: "roleId is required." }, { status: 400 });
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const candidate = await prisma.candidate.create({
    data: {
      roleId,
      appliedRole: role.rubricRole,
      personalDetails: JSON.stringify({ name: "", email: "", phone: null }),
      rawFileRef: file.name,
      status: "uploaded",
    },
  });

  try {
    await runPipelineForCandidate(candidate.id, buffer, file.name);
  } catch (err) {
    console.error(`Pipeline failed for candidate ${candidate.id}:`, err);
    return NextResponse.json(
      {
        id: candidate.id,
        error:
          err instanceof Error
            ? err.message
            : "Pipeline failed for an unknown reason.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ id: candidate.id }, { status: 201 });
}
