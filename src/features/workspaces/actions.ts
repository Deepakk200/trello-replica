"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { z } from "zod";
import { recordAuditLog } from "@/features/enterprise/audit";

// Constructed lazily — Resend's constructor throws when the key is missing, which
// would otherwise break `next build` when this module is imported by the invite page.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

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

export async function getMyWorkspace() {
  const user = await requireAuth();
  return db.workspace.findFirst({
    where: {
      members: { some: { userId: user.id } },
      deletedAt: null,
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
  });
}

export async function updateWorkspace(data: { name?: string; description?: string }) {
  await requireAuth();
  const workspace = await getMyWorkspace();
  if (!workspace) throw new Error("No workspace");
  await db.workspace.update({ where: { id: workspace.id }, data });
  return { ok: true as const };
}

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]).default("MEMBER"),
});

export async function inviteMember(raw: unknown) {
  await requireAuth();
  const data = InviteSchema.parse(raw);
  const workspace = await getMyWorkspace();
  if (!workspace) throw new Error("No workspace");
  { const { enforceMemberLimit } = await import("@/lib/enforce-plan"); await enforceMemberLimit(workspace.id, workspace.planName); }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await db.invitation.create({
    data: {
      workspaceId: workspace.id,
      email: data.email,
      role: data.role,
      expiresAt,
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL ?? ""}/invite/${invitation.token}`;

  await getResend().emails.send({
    from: "Trello Clone <onboarding@resend.dev>",
    to: data.email,
    subject: `You've been invited to ${workspace.name}`,
    html: `
      <p>You have been invited to join <strong>${workspace.name}</strong>.</p>
      <p><a href="${inviteUrl}">Accept invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });

  return { ok: true as const, token: invitation.token };
}

export async function acceptInvitation(token: string) {
  const user = await requireAuth();
  const invitation = await db.invitation.findUnique({ where: { token } });

  if (!invitation) return { ok: false as const, error: "Invalid invitation" };
  if (invitation.expiresAt < new Date()) return { ok: false as const, error: "Invitation expired" };
  if (invitation.acceptedAt) return { ok: false as const, error: "Already accepted" };

  await db.$transaction([
    db.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id },
      },
      create: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
      update: { role: invitation.role },
    }),
    db.invitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return { ok: true as const, workspaceId: invitation.workspaceId };
}

export async function removeMember(memberUserId: string) {
  await requireAdmin();
  const workspace = await getMyWorkspace();
  if (!workspace) throw new Error("No workspace");
  const target = workspace.members.find((m) => m.user.id === memberUserId);
  if (target?.role === "OWNER") throw new Error("Cannot remove workspace owner");
  await db.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: memberUserId } },
  });
  await recordAuditLog({
    action: "member.removed",
    resource: "WorkspaceMember",
    resourceId: memberUserId,
    metadata: { email: target?.user.email },
  });
  return { ok: true as const };
}
