"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { InvitationEmail } from "@/../emails/invitation";
import { recordAuditLog } from "@/features/enterprise/audit";
import {
  requireUser,
  requireActiveWorkspace,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  getActiveWorkspaceId,
  ACTIVE_WORKSPACE_COOKIE,
} from "@/lib/authz";
import { WorkspaceRole } from "@prisma/client";

const memberInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: "asc" },
  },
} as const;

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "workspace";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

async function setActiveWorkspaceCookie(workspaceId: string) {
  const store = await cookies();
  store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// ─── Read ────────────────────────────────────────────────────────────────────

/** The current user's ACTIVE workspace (cookie-resolved), with members. */
export async function getMyWorkspace() {
  const user = await requireUser();
  const wid = await getActiveWorkspaceId(user.id);
  if (!wid) return null;
  return db.workspace.findFirst({
    where: { id: wid, deletedAt: null },
    include: memberInclude,
  });
}

/** Every workspace the user belongs to, with their role + board count. */
export async function listMyWorkspaces() {
  const user = await requireUser();
  const activeId = await getActiveWorkspaceId(user.id);
  const memberships = await db.workspaceMember.findMany({
    where: { userId: user.id, workspace: { deletedAt: null } },
    orderBy: { joinedAt: "asc" },
    select: {
      role: true,
      workspace: {
        select: {
          id: true, name: true, slug: true, planName: true,
          _count: { select: { members: true, boards: { where: { deletedAt: null, closed: false } } } },
        },
      },
    },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    planName: m.workspace.planName,
    role: m.role,
    memberCount: m.workspace._count.members,
    boardCount: m.workspace._count.boards,
    isActive: m.workspace.id === activeId,
  }));
}

/** Members of the active (or a specified, membership-checked) workspace. */
export async function listWorkspaceMembers(workspaceId?: string) {
  const user = await requireUser();
  const wid = workspaceId ?? (await requireActiveWorkspace(user.id));
  await requireWorkspaceMember(wid);
  return db.workspaceMember.findMany({
    where: { workspaceId: wid },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
}

// ─── Workspace CRUD ──────────────────────────────────────────────────────────

export async function createWorkspace(rawName: string) {
  const user = await requireUser();
  const name = z.string().min(1).max(60).parse(rawName.trim());
  const workspace = await db.workspace.create({
    data: {
      name,
      slug: slugify(name),
      members: { create: { userId: user.id, role: WorkspaceRole.OWNER } },
    },
  });
  await setActiveWorkspaceCookie(workspace.id);
  revalidatePath("/boards");
  return { ok: true as const, workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug } };
}

export async function renameWorkspace(workspaceId: string, rawName: string) {
  await requireWorkspaceAdmin(workspaceId);
  const name = z.string().min(1).max(60).parse(rawName.trim());
  await db.workspace.update({ where: { id: workspaceId }, data: { name } });
  revalidatePath("/boards");
  revalidatePath("/settings");
  return { ok: true as const };
}

/** Soft-delete a workspace (OWNER only). Cannot delete your last workspace. */
export async function deleteWorkspace(workspaceId: string) {
  const ctx = await requireWorkspaceMember(workspaceId);
  if (ctx.role !== WorkspaceRole.OWNER) throw new Error("Only the owner can delete a workspace");
  const count = await db.workspaceMember.count({ where: { userId: ctx.userId, workspace: { deletedAt: null } } });
  if (count <= 1) throw new Error("Cannot delete your only workspace");
  await db.workspace.update({ where: { id: workspaceId }, data: { deletedAt: new Date() } });
  // Drop the cookie so the next request resolves a fresh active workspace.
  const store = await cookies();
  if (store.get(ACTIVE_WORKSPACE_COOKIE)?.value === workspaceId) {
    store.delete(ACTIVE_WORKSPACE_COOKIE);
  }
  revalidatePath("/boards");
  return { ok: true as const };
}

/** Update the ACTIVE workspace's name/description (admin). */
export async function updateWorkspace(data: { name?: string; description?: string }) {
  const user = await requireUser();
  const wid = await requireActiveWorkspace(user.id);
  await requireWorkspaceAdmin(wid);
  await db.workspace.update({ where: { id: wid }, data });
  revalidatePath("/settings");
  revalidatePath("/boards");
  return { ok: true as const };
}

export async function switchWorkspace(workspaceId: string) {
  await requireWorkspaceMember(workspaceId); // validates membership
  await setActiveWorkspaceCookie(workspaceId);
  revalidatePath("/boards");
  revalidatePath("/settings");
  return { ok: true as const };
}

// ─── Membership ──────────────────────────────────────────────────────────────

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "OBSERVER", "GUEST"]).default("MEMBER"),
});

export async function inviteMember(raw: unknown) {
  const user = await requireUser();
  const wid = await requireActiveWorkspace(user.id);
  await requireWorkspaceAdmin(wid);
  const data = InviteSchema.parse(raw);
  const workspace = await db.workspace.findUnique({ where: { id: wid }, select: { id: true, name: true, planName: true } });
  if (!workspace) throw new Error("No workspace");
  { const { enforceMemberLimit } = await import("@/lib/enforce-plan"); await enforceMemberLimit(workspace.id, workspace.planName); }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const invitation = await db.invitation.create({
    data: { workspaceId: workspace.id, email: data.email, role: data.role, expiresAt },
  });

  await sendEmail({
    to: data.email,
    subject: `You've been invited to ${workspace.name}`,
    react: InvitationEmail({
      inviterName: user.name ?? "A teammate",
      workspaceName: workspace.name,
      role: data.role,
      inviteUrl: `${process.env.NEXTAUTH_URL ?? ""}/invite/${invitation.token}`,
      expiresAt: expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    }),
  });
  await recordAuditLog({ action: "member.invited", resource: "Invitation", resourceId: invitation.id, metadata: { email: data.email, role: data.role } });
  return { ok: true as const, token: invitation.token };
}

export async function acceptInvitation(token: string) {
  const user = await requireUser();
  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation) return { ok: false as const, error: "Invalid invitation" };
  if (invitation.expiresAt < new Date()) return { ok: false as const, error: "Invitation expired" };
  if (invitation.acceptedAt) return { ok: false as const, error: "Already accepted" };

  await db.$transaction([
    db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
      create: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
      update: { role: invitation.role },
    }),
    db.invitation.update({ where: { token }, data: { acceptedAt: new Date() } }),
  ]);
  await setActiveWorkspaceCookie(invitation.workspaceId);
  return { ok: true as const, workspaceId: invitation.workspaceId };
}

export async function removeMember(memberUserId: string) {
  const user = await requireUser();
  const wid = await requireActiveWorkspace(user.id);
  await requireWorkspaceAdmin(wid);
  const target = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: wid, userId: memberUserId } },
    include: { user: { select: { email: true } } },
  });
  if (!target) throw new Error("Member not found");
  if (target.role === WorkspaceRole.OWNER) throw new Error("Cannot remove workspace owner");
  await db.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId: wid, userId: memberUserId } },
  });
  await recordAuditLog({ action: "member.removed", resource: "WorkspaceMember", resourceId: memberUserId, metadata: { email: target.user.email } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function changeRole(memberUserId: string, rawRole: string) {
  const user = await requireUser();
  const wid = await requireActiveWorkspace(user.id);
  await requireWorkspaceAdmin(wid);
  const role = z.enum(["ADMIN", "MEMBER", "OBSERVER", "GUEST"]).parse(rawRole);
  const target = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: wid, userId: memberUserId } },
    select: { role: true },
  });
  if (!target) throw new Error("Member not found");
  if (target.role === WorkspaceRole.OWNER) throw new Error("Cannot change the owner's role");
  await db.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: wid, userId: memberUserId } },
    data: { role },
  });
  await recordAuditLog({ action: "member.role_changed", resource: "WorkspaceMember", resourceId: memberUserId, metadata: { role } });
  revalidatePath("/settings");
  return { ok: true as const };
}
