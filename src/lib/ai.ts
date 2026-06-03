import Anthropic from "@anthropic-ai/sdk";

// Lazy/guarded — constructing Anthropic without a key throws, which would break
// the build/import. getAI() only constructs when the key is present.
const globalForAI = globalThis as unknown as { ai: Anthropic | undefined };

export const AI_MODEL = "claude-sonnet-4-20250514";

export function getAI(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  globalForAI.ai ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return globalForAI.ai;
}

// Returns the full text of a single-turn completion.
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024
): Promise<string> {
  const msg = await getAI().messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
