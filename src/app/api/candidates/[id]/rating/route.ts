import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { recruiterRating } = await req.json();

  if (
    recruiterRating !== null &&
    (typeof recruiterRating !== "number" || recruiterRating < 1 || recruiterRating > 5)
  ) {
    return NextResponse.json(
      { error: "recruiterRating must be 1-5 or null." },
      { status: 400 }
    );
  }

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.candidate.update({ where: { id }, data: { recruiterRating } });
  await logActivity(
    id,
    "rating_changed",
    recruiterRating ? `Rated ${recruiterRating}/5.` : "Rating cleared."
  );

  return NextResponse.json({ recruiterRating });
}
