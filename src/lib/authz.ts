// ─── Centralized authorization (Phase 3 — workspaces, members, RBAC) ─────────
//
// HARD RULE: every server action that touches a board/card/workspace authorizes
// through this module. It replaces the Phase-2 owner-only checks
// (`assertBoardAccess(boardId, session.workspaceId)`) with role-aware access that
// understands workspace membership, per-board sharing, and board visibility.
//
// Role semantics:
//   OWNER / ADMIN  → manage members + settings (canAdmin) and edit (canEdit)
//   MEMBER         → edit boards/cards (canEdit)
//   GUEST / OBSERVER → read-only (canEdit = false)
//
// Active workspace: a user can belong to many workspaces. The "active" one is
// stored in the `tc_active_workspace` cookie (set by `switchWorkspace`), falling
// back to their oldest membership. Server-render reads it; switching writes it.

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceRole } from "@prisma/client";

export const ACTIVE_WORKSPACE_COOKIE = "tc_active_workspace";

const READ_ONLY_ROLES: WorkspaceRole[] = [WorkspaceRole.GUEST, WorkspaceRole.OBSERVER];
const ADMIN_ROLES: WorkspaceRole[] = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

export function roleCanEdit(role: WorkspaceRole | null | undefined): boolean {
  return !!role && !READ_ONLY_ROLES.includes(role);
}
export function roleCanAdmin(role: WorkspaceRole | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

function roleRank(r: WorkspaceRole): number {
  switch (r) {
    case WorkspaceRole.OWNER: return 4;
    case WorkspaceRole.ADMIN: return 3;
    case WorkspaceRole.MEMBER: return 2;
    case WorkspaceRole.GUEST:
    case WorkspaceRole.OBSERVER: return 1;
    default: return 0;
  }
}
/** Pick the strongest of several (possibly null) roles. Defaults to OBSERVER. */
function pickHigherRole(...roles: (WorkspaceRole | null)[]): WorkspaceRole {
  let best: WorkspaceRole = WorkspaceRole.OBSERVER;
  let bestRank = 0;
  for (const r of roles) {
    if (!r) continue;
    const rank = roleRank(r);
    if (rank > bestRank) { best = r; bestRank = rank; }
  }
  return best;
}

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new Error("Unauthorized");
  return u;
}

// ─── Active workspace ────────────────────────────────────────────────────────

/**
 * Resolve the current user's ACTIVE workspace:
 *   1. the `tc_active_workspace` cookie, if the user is still a member of it
 *   2. otherwise their oldest membership
 * Returns null when the user belongs to no workspace.
 */
export async function getActiveWorkspaceId(userId: string): Promise<string | null> {
  const store = await cookies();
  const fromCookie = store.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (fromCookie) {
    const m = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: fromCookie, userId } },
      select: { workspace: { select: { deletedAt: true } } },
    });
    if (m && !m.workspace.deletedAt) return fromCookie;
  }
  const first = await db.workspaceMember.findFirst({
    where: { userId, workspace: { deletedAt: null } },
    orderBy: { joinedAt: "asc" },
    select: { workspaceId: true },
  });
  return first?.workspaceId ?? null;
}

export async function requireActiveWorkspace(userId: string): Promise<string> {
  const id = await getActiveWorkspaceId(userId);
  if (!id) throw new Error("No workspace");
  return id;
}

// ─── Workspace membership ────────────────────────────────────────────────────

export async function getMembership(userId: string, workspaceId: string) {
  return db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
}

export type WorkspaceCtx = { userId: string; workspaceId: string; role: WorkspaceRole };

export async function requireWorkspaceMember(workspaceId: string): Promise<WorkspaceCtx> {
  const user = await requireUser();
  const m = await getMembership(user.id, workspaceId);
  if (!m) throw new Error("Not authorized");
  return { userId: user.id, workspaceId, role: m.role };
}

export async function requireWorkspaceAdmin(workspaceId: string): Promise<WorkspaceCtx> {
  const ctx = await requireWorkspaceMember(workspaceId);
  if (!roleCanAdmin(ctx.role)) throw new Error("Not authorized");
  return ctx;
}

// ─── Board access ────────────────────────────────────────────────────────────

export type BoardAccess = {
  userId: string;
  boardId: string;
  workspaceId: string | null;
  /** Effective role on this board (strongest of workspace + board-member + creator). */
  role: WorkspaceRole;
  canEdit: boolean;
  canAdmin: boolean;
};

/**
 * Effective access of the current user to a board, or null if none.
 * Access is granted when the user is a workspace member, a board member, the
 * board creator, or the board is public (public ⇒ read-only for non-members).
 */
export async function getBoardAccess(boardId: string): Promise<BoardAccess | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const board = await db.board.findFirst({
    where: { id: boardId, deletedAt: null },
    select: {
      id: true,
      workspaceId: true,
      visibility: true,
      createdById: true,
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });
  if (!board) return null;

  let wsRole: WorkspaceRole | null = null;
  if (board.workspaceId) {
    const m = await getMembership(user.id, board.workspaceId);
    wsRole = m?.role ?? null;
  }
  const boardRole = board.members[0]?.role ?? null;
  const isCreator = board.createdById === user.id;

  if (!wsRole && !boardRole && !isCreator) {
    // Non-member: only public boards are visible, and then read-only.
    if (board.visibility === "public") {
      return {
        userId: user.id, boardId, workspaceId: board.workspaceId,
        role: WorkspaceRole.OBSERVER, canEdit: false, canAdmin: false,
      };
    }
    return null;
  }

  const role = pickHigherRole(wsRole, boardRole, isCreator ? WorkspaceRole.ADMIN : null);
  return {
    userId: user.id,
    boardId,
    workspaceId: board.workspaceId,
    role,
    canEdit: roleCanEdit(role),
    canAdmin: roleCanAdmin(role),
  };
}

/** Boolean form used by the Liveblocks room auth (Phase 4). */
export async function canAccessBoard(boardId: string): Promise<boolean> {
  return (await getBoardAccess(boardId)) !== null;
}

export async function requireBoardAccess(boardId: string): Promise<BoardAccess> {
  const a = await getBoardAccess(boardId);
  if (!a) throw new Error("Not authorized");
  return a;
}

export async function requireBoardEdit(boardId: string): Promise<BoardAccess> {
  const a = await requireBoardAccess(boardId);
  if (!a.canEdit) throw new Error("Not authorized");
  return a;
}

/** Board-level admin: settings, sharing, visibility, deletion. */
export async function requireBoardAdmin(boardId: string): Promise<BoardAccess> {
  const a = await requireBoardAccess(boardId);
  if (!a.canAdmin) throw new Error("Not authorized");
  return a;
}

// ─── List / card convenience gates (resolve to the owning board) ─────────────

async function boardIdForList(listId: string): Promise<string> {
  const r = await db.list.findUnique({ where: { id: listId }, select: { boardId: true } });
  if (!r) throw new Error("Not found");
  return r.boardId;
}
async function boardIdForCard(cardId: string): Promise<string> {
  const r = await db.card.findUnique({
    where: { id: cardId },
    select: { list: { select: { boardId: true } } },
  });
  if (!r) throw new Error("Not found");
  return r.list.boardId;
}

export async function requireListEdit(listId: string): Promise<{ access: BoardAccess; boardId: string }> {
  const boardId = await boardIdForList(listId);
  return { access: await requireBoardEdit(boardId), boardId };
}
export async function requireCardEdit(cardId: string): Promise<{ access: BoardAccess; boardId: string }> {
  const boardId = await boardIdForCard(cardId);
  return { access: await requireBoardEdit(boardId), boardId };
}
export async function requireCardAccess(cardId: string): Promise<{ access: BoardAccess; boardId: string }> {
  const boardId = await boardIdForCard(cardId);
  return { access: await requireBoardAccess(boardId), boardId };
}
