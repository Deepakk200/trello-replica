// Individual board page — Server Component. Fetches the board from the DB and
// renders the interactive, real-time board inside a Liveblocks room.
// Next.js 16: params is a Promise and MUST be awaited.

import { notFound } from "next/navigation";
import { getBoard } from "@/features/boards/actions";
import { BoardRoom } from "@/components/db-board/board-room";
import { DbBoardView } from "@/components/db-board/db-board-view";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ boardId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { boardId } = await params;
  const board = await getBoard(boardId);
  return { title: board ? `${board.title} — Trello Clone` : "Board not found" };
}

export default async function BoardPage({ params }: Props) {
  const { boardId } = await params;
  const board = await getBoard(boardId);
  if (!board) notFound();

  return (
    <BoardRoom boardId={boardId}>
      <DbBoardView board={board} />
    </BoardRoom>
  );
}
