import { Resend } from "resend";

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env.local before sending real email."
    );
  }
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "Kargo Hiring <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  if (error) {
    throw new Error(`Resend failed to send: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Resend did not confirm delivery (no message id returned).");
  }
  return { id: data.id };
}
