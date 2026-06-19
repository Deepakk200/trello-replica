import { LegacyBoardRoute } from '@/components/board/legacy-board-route';

// Legacy (localStorage) board, addressed by its store id: /b/<boardId>.
// <BoardUrlSync/> (inside AppShell) upgrades this to the canonical
// /b/<boardId>/<slug> once hydrated. Next.js 16: params is a Promise.
export default async function BoardByIdPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  return <LegacyBoardRoute boardId={boardId} />;
}
