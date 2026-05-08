import "server-only";

import { getResendClient } from "./client";

export { getAppOrigin } from "../site-url";

/*
 * Thin sendEmail wrapper. Two guarantees:
 *   1. Never throws — email failure must not surface as a server-action
 *      error. The notification row is the in-app source of truth; email
 *      is a best-effort secondary channel.
 *   2. Silently no-ops when RESEND_API_KEY isn't set. Logs once per call
 *      so dev still gets a paper trail of what would have gone out.
 */

const FROM = process.env.EMAIL_FROM ?? "Stagiaire <onboarding@resend.dev>";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY missing — would have sent "${payload.subject}" to ${payload.to}`,
    );
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (error) {
      console.error(`[email] resend rejected for ${payload.to}:`, error);
    }
  } catch (err) {
    console.error(`[email] send threw for ${payload.to}:`, err);
  }
}

