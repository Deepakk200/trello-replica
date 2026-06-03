// Server-side plan limit enforcement. Throws a typed PlanLimitError the UI can catch.
import { db } from "@/lib/db";
import { getPlanLimit } from "@/lib/plans";
import type { Plan } from "@prisma/client";

export class PlanLimitError extends Error {
  constructor(message: string, public resource: "boards" | "members", public plan: Plan) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export async function enforceBoardLimit(workspaceId: string, plan: Plan) {
  const limit = getPlanLimit(plan, "boards");
  if (limit === -1) return;
  const count = await db.board.count({ where: { workspaceId, deletedAt: null, closed: false } });
  if (count >= limit) {
    throw new PlanLimitError(`Your ${plan} plan allows ${limit} board${limit === 1 ? "" : "s"}. Upgrade to create more.`, "boards", plan);
  }
}

export async function enforceMemberLimit(workspaceId: string, plan: Plan) {
  const limit = getPlanLimit(plan, "members");
  if (limit === -1) return;
  const count = await db.workspaceMember.count({ where: { workspaceId } });
  if (count >= limit) {
    throw new PlanLimitError(`Your ${plan} plan allows ${limit} member${limit === 1 ? "" : "s"}. Upgrade to add more.`, "members", plan);
  }
}
