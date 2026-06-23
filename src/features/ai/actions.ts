"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireBoardAccess } from "@/lib/authz";
import { generateText, getAI, AI_MODEL } from "@/lib/ai";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

// ─── 1. Card description assistant ───────────────────────────────────────────
export async function generateCardDescription(raw: unknown) {
  try {
    await requireAuth();
    const { cardTitle, boardTitle, listTitle } = z.object({
      cardTitle: z.string().min(1).max(200),
      boardTitle: z.string().max(100).optional(),
      listTitle: z.string().max(100).optional(),
    }).parse(raw);

    const text = await generateText(
      `You are a professional project manager assistant. Write clear, concise task descriptions.
Keep responses under 150 words. Use markdown formatting.
Respond ONLY with the description text — no preamble, no "Here is..." opener.`,
      `Write a task description for a card titled "${cardTitle}"${listTitle ? ` in the "${listTitle}" list` : ""}${boardTitle ? ` on the "${boardTitle}" board` : ""}.
Include: what needs to be done, acceptance criteria, and any relevant considerations.`
    );
    return { ok: true as const, description: text };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// ─── 2. Board summary ────────────────────────────────────────────────────────
export async function generateBoardSummary(boardId: string) {
  try {
    await requireAuth();
    await requireBoardAccess(boardId);
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          where: { deletedAt: null, archived: false },
          orderBy: { position: "asc" },
          include: {
            cards: {
              where: { deletedAt: null, archived: false },
              orderBy: { position: "asc" },
              select: { title: true, completed: true, dueDate: true, description: true },
            },
          },
        },
      },
    });
    if (!board) throw new Error("Board not found");

    const boardText = board.lists.map((list) => {
      const cards = list.cards
        .map((c) => `  - ${c.title}${c.completed ? " ✓" : ""}${c.dueDate ? ` (due ${new Date(c.dueDate).toLocaleDateString()})` : ""}`)
        .join("\n");
      return `${list.title} (${list.cards.length} cards):\n${cards || "  (empty)"}`;
    }).join("\n\n");

    const text = await generateText(
      `You are a project management assistant. Summarise board status concisely.
Use 3–5 sentences. Highlight: overall progress, any overdue items, blockers, and next priorities.
Respond with plain text only — no headers, no bullet points.`,
      `Summarise the current state of this project board:\n\n${boardText}`,
      512
    );
    return { ok: true as const, summary: text };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// ─── 3. Task generation ──────────────────────────────────────────────────────
export async function generateTasksFromDescription(raw: unknown) {
  try {
    await requireAuth();
    const { projectDescription, listTitle } = z.object({
      projectDescription: z.string().min(10).max(1000),
      listTitle: z.string().max(100).optional(),
    }).parse(raw);

    const text = await generateText(
      `You are a project manager. Generate a task breakdown from a project description.
Respond ONLY with a JSON array. No markdown, no explanation, no code fences.
Each item: { "title": string (max 80 chars), "description": string (max 200 chars) }
Generate 5 to 10 tasks. Make them specific and actionable.`,
      `Project: ${projectDescription}${listTitle ? `\nTarget list: ${listTitle}` : ""}`,
      1500
    );

    try {
      const tasks = JSON.parse(text) as Array<{ title: string; description: string }>;
      return { ok: true as const, tasks };
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const tasks = JSON.parse(match[0]) as Array<{ title: string; description: string }>;
        return { ok: true as const, tasks };
      }
      return { ok: false as const, tasks: [], error: "Failed to parse AI response" };
    }
  } catch (e) {
    return { ok: false as const, tasks: [], error: (e as Error).message };
  }
}

// ─── 4. Standup report ───────────────────────────────────────────────────────
export async function generateStandupReport(boardId: string) {
  try {
    const user = await requireAuth();
    const activities = await db.activity.findMany({
      where: { boardId, userId: user.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { card: { select: { title: true } } },
    });
    if (activities.length === 0) return { ok: true as const, report: "No activity in the last 7 days." };

    const activityText = activities
      .map((a) => `${new Date(a.createdAt).toLocaleDateString()} — ${a.type}${a.card ? ` on "${a.card.title}"` : ""}`)
      .join("\n");

    const text = await generateText(
      `You are a project assistant helping write daily standup updates.
Write in first person, present tense. Be concise (3–6 bullet points). Format: markdown bullet list.`,
      `Generate a standup report for work done in the last 7 days:\n\n${activityText}`,
      512
    );
    return { ok: true as const, report: text };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// ─── 5. Board chat assistant ─────────────────────────────────────────────────
export async function askBoardAssistant(raw: unknown) {
  try {
    await requireAuth();
    const { boardId, question, conversationHistory } = z.object({
      boardId: z.string().uuid(),
      question: z.string().min(1).max(500),
      conversationHistory: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).max(10).optional().default([]),
    }).parse(raw);
    await requireBoardAccess(boardId);

    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          where: { deletedAt: null, archived: false },
          orderBy: { position: "asc" },
          include: {
            cards: {
              where: { deletedAt: null, archived: false },
              select: { title: true, completed: true, dueDate: true, description: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });
    if (!board) throw new Error("Board not found");

    const boardContext = board.lists.map((list) => {
      const cards = list.cards
        .map((c) => `  - ${c.title}${c.completed ? " [done]" : ""}${c.dueDate ? ` [due: ${new Date(c.dueDate).toLocaleDateString()}]` : ""}${c.description ? ` — ${c.description.slice(0, 80)}` : ""}`)
        .join("\n");
      return `${list.title}:\n${cards || "  (empty)"}`;
    }).join("\n\n");

    const systemPrompt = `You are an assistant for the project board "${board.title}".
Answer questions about the board's current state concisely and helpfully.
Here is the current board state:\n\n${boardContext}

Rules:
- Only answer questions about this board or project management in general
- If asked about something not on the board, say so clearly
- Keep responses under 200 words
- Use markdown formatting where helpful`;

    const msg = await getAI().messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [...conversationHistory, { role: "user" as const, content: question }],
    });

    const reply = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    return { ok: true as const, reply };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
