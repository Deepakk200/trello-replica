"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const member = await db.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      workspaceId: session.user.workspaceId ?? "",
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!member) throw new Error("Admin access required");
  return session.user;
}

// Internal helper — best-effort, never throws.
export async function recordAuditLog(input: {
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.workspaceId) return;
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? null;
    const agent = hdrs.get("user-agent") ?? null;
    await db.auditLog.create({
      data: {
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: (input.metadata ?? {}) as object,
        ipAddress: ip,
        userAgent: agent,
      },
    });
  } catch {
    // Best-effort — never break a mutation.
  }
}

export async function getAuditLogs(page = 0, pageSize = 50) {
  const user = await requireAdmin();
  return db.auditLog.findMany({
    where: { workspaceId: user.workspaceId ?? "" },
    orderBy: { createdAt: "desc" },
    skip: page * pageSize,
    take: pageSize,
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
}
