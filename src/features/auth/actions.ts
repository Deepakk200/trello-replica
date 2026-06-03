"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

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

  const existing = await db.user.findUnique({ where: { email: data.email } });
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

  return { ok: true as const, userId: user.id, workspaceId: workspace.id };
}
