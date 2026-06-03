import { Liveblocks } from "@liveblocks/node";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Consistent color per user (hash of userId → one of 8 colors).
const CURSOR_COLORS = [
  "#E2483D", "#61BD4F", "#FF9F1A", "#0079BF",
  "#B03642", "#838C91", "#89609E", "#00AECC",
];
function userColor(userId: string): string {
  let hash = 0;
  for (const c of userId) hash = (hash << 5) - hash + c.charCodeAt(0);
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export async function POST(req: Request) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return NextResponse.json({ error: "Liveblocks not configured" }, { status: 501 });
  }
  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { room } = await req.json();

  // Only allow rooms (boards) inside the user's workspace.
  const board = await db.board.findFirst({
    where: { id: room, workspaceId: session.user.workspaceId ?? undefined, deletedAt: null },
    select: { id: true },
  });
  if (!board) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const liveblocksSession = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.name ?? user.id,
      avatarUrl: user.avatarUrl,
      color: userColor(user.id),
    },
  });
  liveblocksSession.allow(room, liveblocksSession.FULL_ACCESS);

  const { status, body } = await liveblocksSession.authorize();
  return new Response(body, { status });
}
