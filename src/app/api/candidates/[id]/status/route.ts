import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { REVIEW_STATUSES, REVIEW_STATUS_LABELS } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { reviewStatus } = await req.json();

  if (!REVIEW_STATUSES.includes(reviewStatus)) {
    return NextResponse.json({ error: "Invalid reviewStatus." }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.candidate.update({ where: { id }, data: { reviewStatus } });
  await logActivity(
    id,
    "status_changed",
    `Status changed from "${REVIEW_STATUS_LABELS[candidate.reviewStatus as keyof typeof REVIEW_STATUS_LABELS]}" to "${REVIEW_STATUS_LABELS[reviewStatus as keyof typeof REVIEW_STATUS_LABELS]}".`
  );

  return NextResponse.json({ reviewStatus });
}
