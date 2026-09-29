import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPipelineForCandidate } from "@/lib/pipeline";
import { ROLES } from "@/lib/types";

export async function GET(req: NextRequest) {
  const appliedRole = req.nextUrl.searchParams.get("appliedRole");

  const candidates = await prisma.candidate.findMany({
    where: appliedRole ? { appliedRole } : undefined,
    orderBy: { createdAt: "desc" },
    include: { roleTotals: true, briefs: true, draftEmails: true },
  });

  const shaped = candidates.map((c) => ({
    id: c.id,
    appliedRole: c.appliedRole,
    status: c.status,
    createdAt: c.createdAt,
    name: JSON.parse(c.personalDetails).name,
    totals: c.roleTotals,
    hasBrief: c.briefs.length > 0,
    draft: c.draftEmails[0]
      ? { emailType: c.draftEmails[0].emailType, status: c.draftEmails[0].status }
      : null,
  }));

  return NextResponse.json({ candidates: shaped });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const appliedRole = formData.get("appliedRole") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!appliedRole || !ROLES.includes(appliedRole as (typeof ROLES)[number])) {
    return NextResponse.json(
      { error: "appliedRole must be PM or SPM." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const candidate = await prisma.candidate.create({
    data: {
      appliedRole,
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
