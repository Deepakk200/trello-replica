// Individual board page — Server Component. Fetches the board from the DB and
// renders the interactive, real-time board inside a Liveblocks room.
// Next.js 16: params is a Promise and MUST be awaited.

import { notFound } from "next/navigation";
import { getBoard } from "@/features/boards/actions";
import { BoardRoom } from "@/components/db-board/board-room";
import { DbBoardView } from "@/components/db-board/db-board-view";
import { DbTopBar, DbBottomNav } from "@/components/db-board/board-chrome";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ boardId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { boardId } = await params;
  const board = await getBoard(boardId);
  if (!board) return { title: "Board not found" };
  const cardCount = board.lists.reduce((sum, l) => sum + l.cards.length, 0);
  return {
    title: board.title,
    description: `${board.lists.length} lists · ${cardCount} cards`,
    openGraph: { title: board.title, type: "website" },
  };
}

export default async function BoardPage({ params }: Props) {
  const { boardId } = await params;
  const board = await getBoard(boardId);
  if (!board) notFound();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DbTopBar />
      <div className="flex-1 min-h-0">
        <BoardRoom boardId={boardId}>
          <DbBoardView board={board} />
        </BoardRoom>
      </div>
      <DbBottomNav />
    </div>
  );
}
