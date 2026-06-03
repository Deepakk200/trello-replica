"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputePositions, initialPosition } from "@/lib/position";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cacheDel, cacheGet, cacheSet, CacheKeys, BOARD_TTL, BOARDS_TTL } from "@/lib/redis";
import { recordAuditLog } from "@/features/enterprise/audit";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

/** Throws unless the board exists and belongs to the user's workspace. */
async function assertBoardAccess(boardId: string, workspaceId: string | null) {
  if (!workspaceId) throw new Error("Not found");
  const board = await db.board.findFirst({
    where: { id: boardId, workspaceId },
    select: { id: true },
  });
  if (!board) throw new Error("Not found");
}

const CreateSchema = z.object({
  title: z.string().min(1).max(100),
  background: z.string().default("#0052CC"),
});

const UpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  background: z.string().optional(),
  starred: z.boolean().optional(),
  closed: z.boolean().optional(),
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

export async function getBoards() {
  const user = await requireAuth();
  if (!user.workspaceId) return [];
  const cacheKey = CacheKeys.boards(user.workspaceId);
  const cached = await cacheGet<Awaited<ReturnType<typeof fetchBoards>>>(cacheKey);
  if (cached) return cached;
  const boards = await fetchBoards(user.workspaceId);
  await cacheSet(cacheKey, boards, BOARDS_TTL);
  return boards;
}

function fetchBoard(boardId: string, workspaceId: string) {
  return db.board.findFirst({
    where: { id: boardId, workspaceId, deletedAt: null },
    include: {
      labels: true,
      lists: {
        where: { deletedAt: null, archived: false },
        orderBy: { position: "asc" },
        include: {
          cards: {
            where: { deletedAt: null, archived: false },
            orderBy: { position: "asc" },
            include: {
              labels: { select: { labelId: true } },
              _count: { select: { comments: true } },
            },
          },
        },
      },
    },
  });
}

export async function getBoard(boardId: string) {
  const user = await requireAuth();
  if (!user.workspaceId) return null;
  const cacheKey = CacheKeys.board(boardId);
  const cached = await cacheGet<Awaited<ReturnType<typeof fetchBoard>>>(cacheKey);
  if (cached) return cached;
  const board = await fetchBoard(boardId, user.workspaceId);
  if (board) await cacheSet(cacheKey, board, BOARD_TTL);
  return board;
}

export async function createBoard(raw: unknown) {
  const user = await requireAuth();
  if (!user.workspaceId) throw new Error("No workspace");
  const ws = await db.workspace.findUnique({ where: { id: user.workspaceId }, select: { planName: true } });
  if (ws) { const { enforceBoardLimit } = await import("@/lib/enforce-plan"); await enforceBoardLimit(user.workspaceId, ws.planName); }
  const data = CreateSchema.parse(raw);
  const { sanitizeText } = await import("@/lib/sanitize");
  data.title = sanitizeText(data.title);
  const last = await db.board.findFirst({
    where: { workspaceId: user.workspaceId, deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const board = await db.board.create({
    data: {
      ...data,
      workspaceId: user.workspaceId,
      createdById: user.id,
      position: last ? last.position + 65536 : initialPosition(),
    },
  });
  revalidatePath("/");
  await cacheDel(CacheKeys.boards(user.workspaceId));
  return { ok: true, board };
}

export async function updateBoard(boardId: string, raw: unknown) {
  const user = await requireAuth();
  await assertBoardAccess(boardId, user.workspaceId);
  const data = UpdateSchema.parse(raw);
  if (data.title) { const { sanitizeText } = await import("@/lib/sanitize"); data.title = sanitizeText(data.title); }
  const board = await db.board.update({ where: { id: boardId }, data });
  revalidatePath("/");
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId), CacheKeys.boards(user.workspaceId ?? ""));
  return { ok: true, board };
}

export async function deleteBoard(boardId: string) {
  const user = await requireAuth();
  await assertBoardAccess(boardId, user.workspaceId);
  const existing = await db.board.findUnique({ where: { id: boardId }, select: { title: true } });
  await db.board.update({ where: { id: boardId }, data: { deletedAt: new Date() } });
  revalidatePath("/");
  await cacheDel(CacheKeys.board(boardId), CacheKeys.boards(user.workspaceId ?? ""));
  await recordAuditLog({ action: "board.deleted", resource: "Board", resourceId: boardId, metadata: { title: existing?.title } });
  return { ok: true };
}

export async function reorderBoards(orderedIds: string[]) {
  const user = await requireAuth();
  if (!user.workspaceId) throw new Error("No workspace");
  const positions = recomputePositions(orderedIds.length);
  await Promise.all(
    orderedIds.map((id, i) =>
      // updateMany scoped to the workspace: silently ignores foreign boards.
      db.board.updateMany({
        where: { id, workspaceId: user.workspaceId },
        data: { position: positions[i] },
      })
    )
  );
  revalidatePath("/");
  return { ok: true };
}

export async function upsertLabel(raw: {
  id?: string; boardId: string; name?: string; color: string;
}) {
  const user = await requireAuth();
  await assertBoardAccess(raw.boardId, user.workspaceId);
  const label = raw.id
    ? await db.label.update({ where: { id: raw.id }, data: { name: raw.name, color: raw.color } })
    : await db.label.create({ data: { boardId: raw.boardId, name: raw.name ?? null, color: raw.color } });
  revalidatePath(`/board/${raw.boardId}`);
  await cacheDel(CacheKeys.board(raw.boardId));
  return { ok: true, label };
}

export async function deleteLabel(labelId: string, boardId: string) {
  const user = await requireAuth();
  await assertBoardAccess(boardId, user.workspaceId);
  await db.label.delete({ where: { id: labelId } });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true };
}
