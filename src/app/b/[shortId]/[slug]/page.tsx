// Pretty board URL (prompt 03): /b/<shortId>/<slug> → resolves the board by its
// public shortId (falls back to the raw id) and redirects to the canonical view.
// Next.js 16: params is a Promise.
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BoardShortLink({
  params,
}: {
  params: Promise<{ shortId: string; slug: string }>;
}) {
  const { shortId } = await params;
  const board = await db.board.findFirst({
    where: { OR: [{ shortId }, { id: shortId }], deletedAt: null },
    select: { id: true },
  });
  if (!board) notFound();
  redirect(`/board/${board.id}`);
}
