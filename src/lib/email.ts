// Server-only email sending helper.
// Wraps Resend with React Email templates.
// NEVER import this file in client components.

import type { ReactElement } from "react";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

// Constructed lazily so a missing RESEND_API_KEY never breaks the build.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "Trello Clone <onboarding@resend.dev>";
// Replace with your verified domain in production:
// const FROM = "Trello Clone <noreply@yourdomain.com>";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    logger.info("Email suppressed in development", { to, subject });
    return;
  }

  try {
    const { error } = await getResend().emails.send({ from: FROM, to, subject, react });
    if (error) {
      logger.error("Resend send failed", { to, subject, error: error.message });
    }
  } catch (err) {
    // Email failures must NEVER crash a server action.
    logger.error("Email send threw", { to, subject, error: (err as Error).message });
  }
}
