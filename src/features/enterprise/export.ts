"use server";

import { db } from "@/lib/db";
import { requireBoardAccess } from "@/lib/authz";

// Returns a CSV string for a board — downloaded client-side.
export async function exportBoardAsCSV(boardId: string): Promise<string> {
  // Read access is enough to export, but it MUST be a board the caller can see
  // (workspace member, board member, creator, or public) — not any board by id.
  await requireBoardAccess(boardId);

  const board = await db.board.findFirst({
    where: { id: boardId, deletedAt: null },
    include: {
      lists: {
        where: { deletedAt: null, archived: false },
        orderBy: { position: "asc" },
        include: {
          cards: {
            where: { deletedAt: null, archived: false },
            orderBy: { position: "asc" },
            include: {
              labels: { include: { label: true } },
              _count: { select: { comments: true } },
            },
          },
        },
      },
    },
  });

  if (!board) throw new Error("Board not found");

  const rows: string[] = [
    ["Board", "List", "Card Title", "Description", "Due Date", "Completed", "Labels", "Comments"].join(","),
  ];

  for (const list of board.lists) {
    for (const card of list.cards) {
      const row = [
        board.title,
        list.title,
        card.title,
        card.description ?? "",
        card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : "",
        card.completed ? "Yes" : "No",
        card.labels.map((cl) => cl.label.name ?? cl.label.color).join(";"),
        String(card._count.comments),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      rows.push(row.join(","));
    }
  }

  return rows.join("\n");
}
