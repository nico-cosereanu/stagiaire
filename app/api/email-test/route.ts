import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";

// Temporary smoke-test endpoint. Hit /api/email-test?to=you@example.com
// to verify Resend wiring end-to-end. DELETE this file after confirming.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const to = url.searchParams.get("to");
  if (!to) {
    return NextResponse.json(
      { ok: false, error: "Pass ?to=email@example.com" },
      { status: 400 },
    );
  }

  await sendEmail({
    to,
    subject: "Stagiaire email pipeline test",
    html: `<p>If you're reading this, Resend is wired correctly via stagiaire.xyz.</p>`,
    text: "If you're reading this, Resend is wired correctly via stagiaire.xyz.",
  });

  return NextResponse.json({ ok: true, sentTo: to });
}
