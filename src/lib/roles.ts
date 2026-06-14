// Pure role logic (no DB / auth / request deps) — split out of authz.ts so it is
// unit-testable in isolation. authz.ts re-exports these.
import { WorkspaceRole } from "@prisma/client";

const READ_ONLY_ROLES: WorkspaceRole[] = [WorkspaceRole.GUEST, WorkspaceRole.OBSERVER];
const ADMIN_ROLES: WorkspaceRole[] = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

export function roleCanEdit(role: WorkspaceRole | null | undefined): boolean {
  return !!role && !READ_ONLY_ROLES.includes(role);
}

export function roleCanAdmin(role: WorkspaceRole | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function roleRank(r: WorkspaceRole): number {
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
export function pickHigherRole(...roles: (WorkspaceRole | null)[]): WorkspaceRole {
  let best: WorkspaceRole = WorkspaceRole.OBSERVER;
  let bestRank = 0;
  for (const r of roles) {
    if (!r) continue;
    const rank = roleRank(r);
    if (rank > bestRank) { best = r; bestRank = rank; }
  }
  return best;
}
