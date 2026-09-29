import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

// Private, recruiter-only notes. Never sent to Gemini, never included in
// any candidate-facing email — kept visually and structurally separate
// from the drafted messages.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notes = await prisma.note.findMany({
    where: { candidateId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { text } = await req.json();

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Note text is required." }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const note = await prisma.note.create({
    data: { candidateId: id, text: text.trim() },
  });
  await logActivity(id, "note_added", "Private note added.");

  return NextResponse.json({ note }, { status: 201 });
}
