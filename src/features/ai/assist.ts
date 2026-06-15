"use server";

// AI assist for the legacy board UI (card + board). All calls run SERVER-SIDE
// only — the Anthropic key never reaches the client. Every action is wrapped so
// a missing key / API error returns { ok:false } instead of throwing, is
// rate-limited (no-op without Upstash), and validates model JSON with zod before
// returning. Inputs are truncated as a cost guard.

import { z } from "zod";
import { generateText } from "@/lib/ai";

const MAX_DESC = 4000;
const clip = (s: string, n = MAX_DESC) => (s.length > n ? s.slice(0, n) : s);

async function limit(): Promise<void> {
  const { rateLimits, checkRateLimit, getRequestIp } = await import("@/lib/rate-limit");
  await checkRateLimit(rateLimits.ai, `ai:${await getRequestIp()}`);
}

/** Extract the first JSON object/array from a model response. */
function parseJson<T>(raw: string, schema: z.ZodType<T>): T | null {
  const match = raw.match(/[[{][\s\S]*[\]}]/);
  if (!match) return null;
  try {
    return schema.parse(JSON.parse(match[0]));
  } catch {
    return null;
  }
}

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

// ── B1: card assist ──────────────────────────────────────────────────────────

export async function aiImproveDescription(input: { title: string; description: string }):
  Promise<Ok<{ description: string }> | Err> {
  try {
    await limit();
    const text = await generateText(
      "You improve Trello card descriptions. Return ONLY the improved description in concise Markdown — no preamble.",
      `Card title: ${input.title}\n\nCurrent description:\n${clip(input.description) || "(empty)"}`,
      700,
    );
    return { ok: true, description: text.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}

export async function aiSummarizeText(input: { title: string; description: string }):
  Promise<Ok<{ summary: string }> | Err> {
  try {
    await limit();
    const text = await generateText(
      "Summarize the Trello card in 1-2 sentences. Return only the summary.",
      `Title: ${input.title}\n\nDescription:\n${clip(input.description) || "(empty)"}`,
      300,
    );
    return { ok: true, summary: text.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}

export async function aiBreakIntoChecklist(input: { title: string; description: string }):
  Promise<Ok<{ items: string[] }> | Err> {
  try {
    await limit();
    const raw = await generateText(
      'Break the card into a practical checklist. Return ONLY a JSON array of short strings, e.g. ["Do X","Do Y"]. 3-8 items.',
      `Title: ${input.title}\n\nDescription:\n${clip(input.description) || "(none)"}`,
      500,
    );
    const items = parseJson(raw, z.array(z.string().min(1).max(200)).min(1).max(12));
    if (!items) return { ok: false, error: "Could not parse AI response" };
    return { ok: true, items };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}

// ── B2: board generation ─────────────────────────────────────────────────────

const GeneratedBoard = z.object({
  title: z.string().min(1).max(80),
  lists: z.array(z.object({
    title: z.string().min(1).max(60),
    cards: z.array(z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
    })).max(12),
  })).min(1).max(8),
});
export type GeneratedBoard = z.infer<typeof GeneratedBoard>;

export async function aiGenerateBoard(input: { prompt: string }):
  Promise<Ok<{ board: GeneratedBoard }> | Err> {
  try {
    await limit();
    const raw = await generateText(
      "You design Trello boards. Given a goal, return ONLY strict JSON of the form " +
        '{"title":string,"lists":[{"title":string,"cards":[{"title":string,"description"?:string}]}]}. ' +
        "3-6 lists, a few cards each. No commentary.",
      clip(input.prompt, 500),
      1500,
    );
    const board = parseJson(raw, GeneratedBoard);
    if (!board) return { ok: false, error: "Could not parse AI response" };
    return { ok: true, board };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}

// ── B3: board summary ────────────────────────────────────────────────────────

export async function aiSummarizeBoard(input: {
  boardTitle: string;
  lists: Array<{ title: string; cards: Array<{ title: string; completed: boolean; overdue: boolean }> }>;
}): Promise<Ok<{ summary: string }> | Err> {
  try {
    await limit();
    const compact = input.lists
      .map((l) => `${l.title} (${l.cards.length}): ${l.cards.map((c) => `${c.title}${c.completed ? " [done]" : ""}${c.overdue ? " [overdue]" : ""}`).join("; ")}`)
      .join("\n");
    const text = await generateText(
      "You are a project assistant. Give a short natural-language status of this board: progress, what's overdue, likely blockers. 2-4 sentences.",
      `Board: ${input.boardTitle}\n${clip(compact, 6000)}`,
      500,
    );
    return { ok: true, summary: text.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}
