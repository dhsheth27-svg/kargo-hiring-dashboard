import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { ALL_STAGES, STAGE_LABELS, type AnyStage } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { stage } = await req.json();

  if (!ALL_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.candidate.update({ where: { id }, data: { stage } });
  await logActivity(
    id,
    "status_changed",
    `Moved from "${STAGE_LABELS[candidate.stage as AnyStage]}" to "${STAGE_LABELS[stage as AnyStage]}".`
  );

  return NextResponse.json({ stage });
}
