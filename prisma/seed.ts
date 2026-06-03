import { config } from "dotenv";
config({ path: ".env.local" }); // load DATABASE_URL when run via plain tsx

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();

async function main() {
  console.log("Seeding…");

  // Wipe in FK-safe order (boards must go before workspace/user since those
  // relations are optional → SetNull rather than cascade).
  await db.board.deleteMany({});
  await db.workspace.deleteMany({});
  await db.user.deleteMany({});

  // Demo user + personal workspace.
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await db.user.create({
    data: { email: "demo@example.com", name: "Demo User", passwordHash },
  });
  const workspace = await db.workspace.create({
    data: {
      name: "Demo User's Workspace",
      slug: "demo-workspace",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const scope = { workspaceId: workspace.id, createdById: user.id };

  const board = await db.board.create({
    data: {
      ...scope,
      title: "Product Roadmap",
      background: "linear-gradient(135deg,#0052CC,#0747A6)",
      position: 65536,
      labels: {
        create: [
          { name: "Bug", color: "#E2483D" },
          { name: "Feature", color: "#61BD4F" },
          { name: "Design", color: "#FF9F1A" },
        ],
      },
    },
    include: { labels: true },
  });

  const todo = await db.list.create({ data: { boardId: board.id, title: "To Do", position: 65536 } });
  const inprog = await db.list.create({ data: { boardId: board.id, title: "In Progress", position: 131072 } });
  const done = await db.list.create({ data: { boardId: board.id, title: "Done", position: 196608 } });

  const card1 = await db.card.create({
    data: { listId: todo.id, title: "Design new onboarding flow",
            description: "Create wireframes for the new onboarding.", position: 65536 },
  });
  await db.cardLabel.create({ data: { cardId: card1.id, labelId: board.labels[2].id } });

  await db.card.create({
    data: { listId: todo.id, title: "Fix login redirect bug",
            position: 131072, dueDate: new Date(Date.now() + 2 * 864e5) },
  });

  const card3 = await db.card.create({
    data: { listId: inprog.id, title: "Implement search",
            description: "Full-text search across boards and cards.", position: 65536 },
  });
  await db.cardLabel.create({ data: { cardId: card3.id, labelId: board.labels[1].id } });
  await db.comment.create({
    data: { cardId: card3.id, userId: user.id, author: user.name ?? "Demo User",
            content: "Started on the tsvector index." },
  });

  await db.card.create({
    data: { listId: done.id, title: "Set up CI/CD pipeline", position: 65536, completed: true },
  });

  await db.board.create({
    data: { ...scope, title: "Design System",
            background: "linear-gradient(135deg,#6554C0,#403294)",
            position: 131072, starred: true },
  });

  console.log("Done. Demo login: demo@example.com / password123");
}

main().catch(console.error).finally(() => db.$disconnect());
