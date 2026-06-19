import { LegacyBoardRoute } from '@/components/board/legacy-board-route';

// Canonical legacy board URL: /b/<boardId>/<slug>. The slug is cosmetic (the id
// drives resolution) and is kept in sync by <BoardUrlSync/>. Next.js 16: params
// is a Promise.
export default async function BoardBySlugPage({
  params,
}: {
  params: Promise<{ boardId: string; slug: string }>;
}) {
  const { boardId } = await params;
  return <LegacyBoardRoute boardId={boardId} />;
}
