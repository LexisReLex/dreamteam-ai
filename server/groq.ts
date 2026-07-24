// ─── Groq als goedkoop (gratis) LLM-pad ───────────────────────────────────────
//
// Eerste key-gated toepassing van de model-router: eligible werk gaat naar Groq
// (gratis, snel, OpenAI-compatibele API), met Claude als vangnet.
//
// Drie veiligheidsgaranties:
//  1. Keyless-veilig — zonder GROQ_API_KEY kiest chooseProvider altijd "anthropic";
//     het gedrag is dan identiek aan vóór deze wijziging.
//  2. Router stuurt de keuze — alleen agents waarvan het primaire advies "groq" is
//     (support/algemeen) gaan naar Groq; hoge-inzet blijft op het betaalde model.
//  3. Vangnet — groqChat gooit bij elke fout; de aanroeper valt dan terug op Claude.

import { recommendForAgent } from "./modelRouter";

/** Groq-model-id. Overschrijfbaar via env; default is een sterk, actueel model. */
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/** Groq is alleen actief als er een API-key in de omgeving staat. */
export function isGroqEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Kiest de provider voor een agent. Puur en testbaar (geen netwerk):
 *  - geen Groq-key → altijd "anthropic"
 *  - anders: "groq" als het primaire router-advies groq is, anders "anthropic".
 */
export function chooseProvider(
  agent: { role?: string; category?: string },
  groqEnabled: boolean,
): "groq" | "anthropic" {
  if (!groqEnabled) return "anthropic";
  return recommendForAgent(agent).primary.providerId === "groq" ? "groq" : "anthropic";
}

export interface GroqResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Roept Groq's chat-completions aan (OpenAI-compatibel). Gooit bij een ontbrekende
 * key, HTTP-fout, timeout of leeg antwoord — zodat de aanroeper op Claude kan
 * terugvallen. Gebruikt de globale undici-dispatcher (proxy) die ai.ts al opzet.
 */
export async function groqChat(opts: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<GroqResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY ontbreekt");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: opts.maxTokens ?? 1024,
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Groq HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq gaf een leeg antwoord");

    return {
      content,
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
      model: data?.model ?? GROQ_MODEL,
    };
  } finally {
    clearTimeout(timer);
  }
}
