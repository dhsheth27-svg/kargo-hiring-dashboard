import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROLES, REVIEW_STATUSES } from "@/lib/types";

export async function GET() {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "desc" },
    include: { candidates: { select: { reviewStatus: true } } },
  });

  const shaped = roles.map((r) => {
    const counts: Record<string, number> = Object.fromEntries(
      REVIEW_STATUSES.map((s) => [s, 0])
    );
    for (const c of r.candidates) counts[c.reviewStatus] = (counts[c.reviewStatus] ?? 0) + 1;
    return {
      id: r.id,
      title: r.title,
      location: r.location,
      seniority: r.seniority,
      rubricRole: r.rubricRole,
      status: r.status,
      createdAt: r.createdAt,
      totalCandidates: r.candidates.length,
      counts,
    };
  });

  return NextResponse.json({ roles: shaped });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, location, seniority, requiredSkills, preferredSkills, rubricRole } =
    body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }
  if (!rubricRole || !ROLES.includes(rubricRole)) {
    return NextResponse.json(
      { error: "rubricRole must be PM or SPM." },
      { status: 400 }
    );
  }

  const role = await prisma.role.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      location: location?.trim() || null,
      seniority: seniority?.trim() || null,
      requiredSkills: requiredSkills?.trim() || "",
      preferredSkills: preferredSkills?.trim() || null,
      rubricRole,
      status: "active",
    },
  });

  return NextResponse.json({ id: role.id }, { status: 201 });
}
