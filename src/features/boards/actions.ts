"use server";

import { db } from "@/lib/db";
import { recomputePositions, initialPosition } from "@/lib/position";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cacheDel, cacheGet, cacheSet, CacheKeys, BOARD_TTL, BOARDS_TTL } from "@/lib/redis";
import { recordAuditLog } from "@/features/enterprise/audit";
import {
  requireUser,
  requireActiveWorkspace,
  getActiveWorkspaceId,
  requireBoardAccess,
  requireBoardEdit,
  requireBoardAdmin,
} from "@/lib/authz";
import { WorkspaceRole } from "@prisma/client";

const CreateSchema = z.object({
  title: z.string().min(1).max(100),
  background: z.string().default("#0052CC"),
  visibility: z.enum(["private", "workspace", "public"]).default("workspace"),
});

const UpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  background: z.string().optional(),
  starred: z.boolean().optional(),
  closed: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

function fetchBoards(workspaceId: string) {
  return db.board.findMany({
    where: { workspaceId, deletedAt: null, closed: false },
    orderBy: { position: "asc" },
    select: {
      id: true, title: true, background: true,
      starred: true, position: true, createdAt: true,
      _count: { select: { lists: true } },
    },
  });
}

/** Boards of the ACTIVE workspace (cached). */
export async function getBoards() {
  const user = await requireUser();
  const wid = await getActiveWorkspaceId(user.id);
  if (!wid) return [];
  const cacheKey = CacheKeys.boards(wid);
  const cached = await cacheGet<Awaited<ReturnType<typeof fetchBoards>>>(cacheKey);
  if (cached) return cached;
  const boards = await fetchBoards(wid);
  await cacheSet(cacheKey, boards, BOARDS_TTL);
  return boards;
}

/** Every workspace the user belongs to, each with its boards (landing grouping). */
export async function getMyWorkspacesWithBoards() {
  const user = await requireUser();
  const activeId = await getActiveWorkspaceId(user.id);
  const memberships = await db.workspaceMember.findMany({
    where: { userId: user.id, workspace: { deletedAt: null } },
    orderBy: { joinedAt: "asc" },
    select: {
      role: true,
      workspace: {
        select: {
          id: true, name: true,
          boards: {
            where: { deletedAt: null, closed: false },
            orderBy: { position: "asc" },
            select: { id: true, title: true, background: true, starred: true, _count: { select: { lists: true } } },
          },
        },
      },
    },
  });
  return memberships.map((m) => ({
    workspaceId: m.workspace.id,
    workspaceName: m.workspace.name,
    role: m.role,
    isActive: m.workspace.id === activeId,
    boards: m.workspace.boards,
  }));
}

/** Boards shared directly with the user (board member) outside their workspaces. */
export async function getSharedBoards() {
  const user = await requireUser();
  const myWorkspaceIds = (
    await db.workspaceMember.findMany({ where: { userId: user.id }, select: { workspaceId: true } })
  ).map((m) => m.workspaceId);
  const boards = await db.board.findMany({
    where: {
      deletedAt: null, closed: false,
      members: { some: { userId: user.id } },
      OR: [{ workspaceId: null }, { workspaceId: { notIn: myWorkspaceIds } }],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, title: true, background: true, starred: true,
      workspace: { select: { name: true } },
      _count: { select: { lists: true } },
    },
  });
  return boards;
}

function fetchBoard(boardId: string) {
  return db.board.findFirst({
    where: { id: boardId, deletedAt: null },
    include: {
      labels: true,
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      lists: {
        where: { deletedAt: null, archived: false },
        orderBy: { position: "asc" },
        include: {
          cards: {
            where: { deletedAt: null, archived: false },
            orderBy: { position: "asc" },
            include: {
              labels: { select: { labelId: true } },
              assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
              checklists: { select: { items: { select: { checked: true } } } },
              _count: { select: { comments: true, attachments: true } },
            },
          },
        },
      },
    },
  });
}

export async function getBoard(boardId: string) {
  const access = await requireBoardAccess(boardId);
  const cacheKey = CacheKeys.board(boardId);
  let board = await cacheGet<Awaited<ReturnType<typeof fetchBoard>>>(cacheKey);
  if (!board) {
    board = await fetchBoard(boardId);
    if (board) await cacheSet(cacheKey, board, BOARD_TTL);
  }
  if (!board) return null;
  // [DIAG] TEMPORARY: log the exact server-returned structure (lists + card ids)
  // so we can tell whether the duplicate card node comes from the data (e.g. two
  // "QA" lists, or one card under two lists) vs pure client render. Remove after.
  console.log(
    `[DIAG getBoard] board=${board.id} lists=${board.lists.length} ` +
      `cards=${board.lists.reduce((n, l) => n + l.cards.length, 0)} ` +
      JSON.stringify(board.lists.map((l) => ({ listId: l.id, title: l.title, cardIds: l.cards.map((c) => c.id) }))),
  );
  // Attach the caller's effective access so the UI can gate edit affordances.
  return { ...board, _access: { role: access.role, canEdit: access.canEdit, canAdmin: access.canAdmin } };
}

export async function createBoard(raw: unknown) {
  const user = await requireUser();
  const wid = await requireActiveWorkspace(user.id);
  const ws = await db.workspace.findUnique({ where: { id: wid }, select: { planName: true } });
  if (ws) { const { enforceBoardLimit } = await import("@/lib/enforce-plan"); await enforceBoardLimit(wid, ws.planName); }
  const data = CreateSchema.parse(raw);
  const { sanitizeText } = await import("@/lib/sanitize");
  data.title = sanitizeText(data.title);
  const last = await db.board.findFirst({
    where: { workspaceId: wid, deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const { slugify, shortId } = await import("@/lib/slug");
  const board = await db.board.create({
    data: {
      ...data,
      workspaceId: wid,
      createdById: user.id,
      position: last ? last.position + 65536 : initialPosition(),
      shortId: shortId(),
      slug: slugify(data.title),
    },
  });
  // Seed Trello's default lists so a new board opens ready to use (A3).
  await db.list.createMany({
    data: ["To Do", "Doing", "Done"].map((title, i) => ({
      boardId: board.id,
      title,
      position: (i + 1) * 65536,
    })),
  });
  revalidatePath("/boards");
  await cacheDel(CacheKeys.boards(wid));
  return { ok: true, board };
}

export async function updateBoard(boardId: string, raw: unknown) {
  const access = await requireBoardEdit(boardId);
  const data = UpdateSchema.parse(raw);
  if (data.title) { const { sanitizeText } = await import("@/lib/sanitize"); data.title = sanitizeText(data.title); }
  const board = await db.board.update({ where: { id: boardId }, data });
  revalidatePath("/boards");
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId), CacheKeys.boards(access.workspaceId ?? ""));
  return { ok: true, board };
}

export async function deleteBoard(boardId: string) {
  const access = await requireBoardAdmin(boardId);
  const existing = await db.board.findUnique({ where: { id: boardId }, select: { title: true } });
  await db.board.update({ where: { id: boardId }, data: { deletedAt: new Date() } });
  revalidatePath("/boards");
  await cacheDel(CacheKeys.board(boardId), CacheKeys.boards(access.workspaceId ?? ""));
  await recordAuditLog({ action: "board.deleted", resource: "Board", resourceId: boardId, metadata: { title: existing?.title } });
  return { ok: true };
}

export async function reorderBoards(orderedIds: string[]) {
  const user = await requireUser();
  const wid = await requireActiveWorkspace(user.id);
  const positions = recomputePositions(orderedIds.length);
  await Promise.all(
    orderedIds.map((id, i) =>
      // updateMany scoped to the workspace: silently ignores foreign boards.
      db.board.updateMany({ where: { id, workspaceId: wid }, data: { position: positions[i] } })
    )
  );
  revalidatePath("/boards");
  await cacheDel(CacheKeys.boards(wid));
  return { ok: true };
}

export async function upsertLabel(raw: { id?: string; boardId: string; name?: string; color: string }) {
  await requireBoardEdit(raw.boardId);
  const label = raw.id
    ? await db.label.update({ where: { id: raw.id }, data: { name: raw.name, color: raw.color } })
    : await db.label.create({ data: { boardId: raw.boardId, name: raw.name ?? null, color: raw.color } });
  revalidatePath(`/board/${raw.boardId}`);
  await cacheDel(CacheKeys.board(raw.boardId));
  return { ok: true, label };
}

export async function deleteLabel(labelId: string, boardId: string) {
  await requireBoardEdit(boardId);
  await db.label.delete({ where: { id: labelId } });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true };
}

// ─── Phase 3: visibility + per-board sharing ─────────────────────────────────

export async function setBoardVisibility(boardId: string, visibility: "private" | "workspace" | "public") {
  await requireBoardAdmin(boardId);
  z.enum(["private", "workspace", "public"]).parse(visibility);
  await db.board.update({ where: { id: boardId }, data: { visibility } });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true as const };
}

export async function listBoardMembers(boardId: string) {
  await requireBoardAccess(boardId);
  return db.boardMember.findMany({
    where: { boardId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
}

/** Share a board with an existing user (by email) at a given role. */
export async function addBoardMember(boardId: string, email: string, rawRole?: string) {
  await requireBoardAdmin(boardId);
  const parsed = z.object({
    email: z.string().email(),
    role: z.enum(["ADMIN", "MEMBER", "OBSERVER", "GUEST"]).default("MEMBER"),
  }).parse({ email, role: rawRole ?? "MEMBER" });

  const target = await db.user.findFirst({ where: { email: parsed.email, deletedAt: null }, select: { id: true } });
  if (!target) return { ok: false as const, error: "No user with that email. Invite them to the workspace first." };

  await db.boardMember.upsert({
    where: { boardId_userId: { boardId, userId: target.id } },
    create: { boardId, userId: target.id, role: parsed.role as WorkspaceRole },
    update: { role: parsed.role as WorkspaceRole },
  });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true as const };
}

export async function removeBoardMember(boardId: string, userId: string) {
  await requireBoardAdmin(boardId);
  await db.boardMember.deleteMany({ where: { boardId, userId } });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true as const };
}
