import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";
import { createBoard } from "@/features/boards/actions";

async function getCallerContext(req: NextRequest): Promise<{ userId: string; workspaceId: string | null } | null> {
  const session = await auth();
  if (session?.user?.id) return { userId: session.user.id, workspaceId: session.user.workspaceId ?? null };
  const apiUser = await authenticateApiKey(req.headers.get("authorization"));
  if (apiUser) return apiUser;
  return null;
}

export async function GET(req: NextRequest) {
  const caller = await getCallerContext(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const boards = await db.board.findMany({
      where: { workspaceId: caller.workspaceId ?? "", deletedAt: null, closed: false },
      orderBy: { position: "asc" },
      select: { id: true, title: true, background: true, starred: true, position: true, createdAt: true },
    });
    return NextResponse.json({ boards });
  } catch {
    return NextResponse.json({ error: "Failed to fetch boards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const caller = await getCallerContext(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Note: createBoard() is session-scoped; API-key write support is a future enhancement.
    const body = await req.json();
    const result = await createBoard(body);
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create board" }, { status: 400 });
  }
}
