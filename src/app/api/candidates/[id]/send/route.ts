import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { logActivity } from "@/lib/activity";

// The ONLY place an email actually goes out — requires an explicit click
// from the founder on this specific candidate. Never called automatically.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { draftEmails: true },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  const draft = candidate.draftEmails[0];
  if (!draft) {
    return NextResponse.json({ error: "No draft to send." }, { status: 404 });
  }
  if (draft.status === "sent") {
    return NextResponse.json({ error: "Already sent." }, { status: 409 });
  }

  const personalDetails = JSON.parse(candidate.personalDetails) as { email: string };
  if (!personalDetails.email) {
    return NextResponse.json(
      { error: "Candidate has no stored email address." },
      { status: 422 }
    );
  }

  let resendResult: { id: string };
  try {
    resendResult = await sendEmail({
      to: personalDetails.email,
      subject: draft.subject,
      body: draft.body,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Send failed.";
    await prisma.draftEmail.update({
      where: { candidateId: id },
      data: { status: "failed", failedReason: reason },
    });
    await logActivity(id, "email_failed", `Send failed: ${reason}`);
    return NextResponse.json({ error: reason }, { status: 502 });
  }

  // Only mark as sent AFTER Resend confirms delivery — never optimistically.
  const sentAt = new Date();
  await prisma.draftEmail.update({
    where: { candidateId: id },
    data: { status: "sent", sentAt, failedReason: null },
  });
  await prisma.candidate.update({
    where: { id },
    data: { status: "sent" },
  });
  await logActivity(id, "email_sent", `${draft.templateType.replace("_", " ")} email sent to ${personalDetails.email}.`);

  return NextResponse.json({ sent: true, resendId: resendResult.id, sentAt });
}
