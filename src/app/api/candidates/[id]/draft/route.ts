import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lets the founder edit a draft's subject/body before sending.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const draft = await prisma.draftEmail.findUnique({ where: { candidateId: id } });
  if (!draft) {
    return NextResponse.json({ error: "No draft found." }, { status: 404 });
  }
  if (draft.status === "sent") {
    return NextResponse.json(
      { error: "This email has already been sent and can no longer be edited." },
      { status: 409 }
    );
  }

  const updated = await prisma.draftEmail.update({
    where: { candidateId: id },
    data: {
      subject: typeof body.subject === "string" ? body.subject : draft.subject,
      body: typeof body.body === "string" ? body.body : draft.body,
    },
  });

  return NextResponse.json({ subject: updated.subject, body: updated.body });
}
