"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { captureError } from "@/lib/logger";
import { WelcomeEmail } from "@/../emails/welcome";

// Neon serverless auto-suspends; the first connection after idle can fail with
// "Can't reach database server" (P1001). Retry once after a short backoff so a
// cold start never surfaces as a user-facing signup failure.
async function withColdStartRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/reach database server|P1001|ECONNREFUSED|Connection terminated|connection closed/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 600));
      return await fn();
    }
    throw e;
  }
}

const SignUpSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function signUpUser(raw: unknown) {
  const { rateLimits, checkRateLimit, getRequestIp } = await import("@/lib/rate-limit");
  try { await checkRateLimit(rateLimits.auth, await getRequestIp()); }
  catch (e) { if (e instanceof Error && e.message.startsWith("Rate limit")) throw e; }

  const data = SignUpSchema.parse(raw);

  try {
    const existing = await withColdStartRetry(() =>
      db.user.findUnique({ where: { email: data.email } }),
    );
    if (existing) {
      return { ok: false as const, error: "An account with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await db.user.create({
      data: { email: data.email, name: data.name, passwordHash },
    });

    // Personal workspace for the new user.
    const slug =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 48) +
      "-" +
      Math.random().toString(36).slice(2, 6);

    const workspace = await db.workspace.create({
      data: {
        name: `${data.name}'s Workspace`,
        slug,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    // Welcome email is best-effort — never fail an otherwise-successful signup
    // because email delivery threw.
    try {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await sendEmail({
        to: data.email,
        subject: `Welcome to Trello Clone, ${data.name}!`,
        react: WelcomeEmail({
          userName: data.name,
          workspaceName: workspace.name,
          dashboardUrl: `${baseUrl}/boards`,
        }),
      });
    } catch (e) {
      await captureError(e, { where: "signUpUser.sendEmail", email: data.email });
    }

    return { ok: true as const, userId: user.id, workspaceId: workspace.id };
  } catch (e) {
    // Unique-constraint race (two concurrent signups for the same email).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false as const, error: "An account with this email already exists." };
    }
    // Everything else: log the REAL exception server-side (Sentry + logs) and
    // return a generic, non-leaking message to the client. Never swallow silently.
    await captureError(e, { where: "signUpUser", email: data.email });
    return { ok: false as const, error: "We couldn't create your account. Please try again." };
  }
}
