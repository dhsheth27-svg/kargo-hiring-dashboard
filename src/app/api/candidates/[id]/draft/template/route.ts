import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  draftInviteEmail,
  draftRejectEmail,
  draftRequestInfoEmail,
  draftUpdateEmail,
} from "@/lib/gemini";
import { TEMPLATE_TYPES, type TemplateType } from "@/lib/types";
import type { Role } from "@/lib/types";

const GENERATORS: Record<
  TemplateType,
  (p: { cvContent: string; role: Role }) => Promise<{ subject: string; body: string }>
> = {
  invite: draftInviteEmail,
  reject: draftRejectEmail,
  request_info: draftRequestInfoEmail,
  update: draftUpdateEmail,
};

// Regenerates the draft's subject/body for a different email template
// (interview invite / request more info / application update / rejection),
// picked from the composer. The candidate's real name is still substituted
// in immediately, never left as a placeholder.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { templateType } = await req.json();

  if (!TEMPLATE_TYPES.includes(templateType)) {
    return NextResponse.json({ error: "Invalid templateType." }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  if (!candidate.cvContent) {
    return NextResponse.json({ error: "Candidate has no extracted CV content yet." }, { status: 422 });
  }

  const existing = await prisma.draftEmail.findUnique({ where: { candidateId: id } });
  if (existing?.status === "sent") {
    return NextResponse.json(
      { error: "This email has already been sent and can no longer be edited." },
      { status: 409 }
    );
  }

  const generate = GENERATORS[templateType as TemplateType];
  const result = await generate({
    cvContent: candidate.cvContent,
    role: candidate.appliedRole as Role,
  });

  const personalDetails = JSON.parse(candidate.personalDetails) as { name: string };
  const body = result.body.split("{{NAME}}").join(personalDetails.name);
  const subject = result.subject.split("{{NAME}}").join(personalDetails.name);

  const draft = await prisma.draftEmail.upsert({
    where: { candidateId: id },
    create: {
      candidateId: id,
      emailType: existing?.emailType ?? "invite",
      templateType,
      subject,
      body,
      status: "draft",
    },
    update: { templateType, subject, body, status: "draft" },
  });

  return NextResponse.json({
    templateType: draft.templateType,
    subject: draft.subject,
    body: draft.body,
  });
}
