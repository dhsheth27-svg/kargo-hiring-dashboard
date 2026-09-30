import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { candidate: { include: { role: true } } },
  });

  return NextResponse.json({
    activities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      createdAt: a.createdAt,
      candidateId: a.candidateId,
      candidateName: JSON.parse(a.candidate.personalDetails).name,
      roleId: a.candidate.roleId,
      roleTitle: a.candidate.role.title,
      roleHue: a.candidate.role.hue,
    })),
  });
}
