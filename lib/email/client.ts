import "server-only";

import { Resend } from "resend";

/*
 * Lazy Resend client. Returns null when RESEND_API_KEY isn't set so dev
 * environments without email config still run — sendEmail logs a warning
 * and no-ops instead of throwing.
 */

let cached: Resend | null = null;

export function getResendClient(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}
