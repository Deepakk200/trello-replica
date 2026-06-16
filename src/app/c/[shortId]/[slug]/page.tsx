// Pretty card URL (prompt 03): /c/<shortId>/<slug> → resolves the card by its
// public shortId (falls back to the raw id) and opens it on its board via the
// ?card deep-link that DbBoardView already handles. Next.js 16: params is a Promise.
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CardShortLink({
  params,
}: {
  params: Promise<{ shortId: string; slug: string }>;
}) {
  const { shortId } = await params;
  const card = await db.card.findFirst({
    where: { OR: [{ shortId }, { id: shortId }], deletedAt: null },
    select: { id: true, list: { select: { boardId: true } } },
  });
  if (!card) notFound();
  redirect(`/board/${card.list.boardId}?card=${card.id}`);
}
