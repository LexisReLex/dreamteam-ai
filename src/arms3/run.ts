import type OpenAI from "openai";
import type { Arm, ArmsConfig, Bench8Task, ArmRunResult } from "./types";
import { priceFor, modelForArm } from "./types";
import { costFromUsage } from "../cost";

// Standaard + OpenRouter-extra's die GEEN orkestratie zijn (cost = dollars, geen tokens).
// Zo blijft orchestrationFields schoon: alleen echte orkestratie-signalen zoals fugu_turns.
const STANDARD_USAGE = new Set(["prompt_tokens", "completion_tokens", "total_tokens", "cost", "cost_details", "is_byok"]);

function extractOutput(resp: OpenAI.Chat.Completions.ChatCompletion): string {
  const msg = resp.choices[0]?.message as { content?: string; reasoning?: string } | undefined;
  return msg?.content?.trim() ? msg.content : msg?.reasoning ?? "";
}

function extractExtra(usage: unknown) {
  const u = (usage ?? {}) as Record<string, unknown>;
  const details = (k: string, sub: string) => {
    const d = u[k] as Record<string, unknown> | undefined;
    return typeof d?.[sub] === "number" ? (d[sub] as number) : 0;
  };
  const cachedTokens = details("prompt_tokens_details", "cached_tokens") || (typeof u.cached_tokens === "number" ? u.cached_tokens : 0);
  const reasoningTokens = details("completion_tokens_details", "reasoning_tokens");
  const orchestrationFields: Record<string, number> = {};
  for (const [k, v] of Object.entries(u)) {
    if (!STANDARD_USAGE.has(k) && typeof v === "number") orchestrationFields[k] = v;
  }
  return { cachedTokens, reasoningTokens, orchestrationFields };
}

// Voert één run uit (single- of multi-turn). Eén retry bij netwerk/parse-fout.
export async function runArmTask(
  client: OpenAI,
  arm: Arm,
  task: Bench8Task,
  runIndex: number,
  systemPrompt: string,
  cfg: ArmsConfig,
  maxTokens: number,
  temperature: number
): Promise<ArmRunResult> {
  const model = modelForArm(arm, task.domain);
  const base: ArmRunResult = {
    taskId: task.id, domain: task.domain, armKey: arm.key, armLabel: arm.label,
    runIndex, model, output: "", latencyMs: 0, promptTokens: 0, completionTokens: 0,
    extra: { cachedTokens: 0, reasoningTokens: 0, orchestrationFields: {} },
    costUsd: 0, retries: 0, quality: 0, judgeMotivatie: "",
  };
  const userTurns = task.turns ?? [task.prompt ?? ""];
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  let retries = 0;
  let promptTokens = 0, completionTokens = 0, latencyMs = 0, lastOutput = "";
  let cachedTokens = 0, reasoningTokens = 0;
  const orchestrationFields: Record<string, number> = {};

  for (let t = 0; t < userTurns.length; t++) {
    messages.push({ role: "user", content: userTurns[t] });
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      const started = Date.now();
      try {
        const resp = await client.chat.completions.create({ model, temperature, max_tokens: maxTokens, messages });
        latencyMs += Date.now() - started;
        const u = resp.usage;
        promptTokens += u?.prompt_tokens ?? 0;
        completionTokens += u?.completion_tokens ?? 0;
        const ex = extractExtra(u);
        cachedTokens += ex.cachedTokens; reasoningTokens += ex.reasoningTokens;
        for (const [k, v] of Object.entries(ex.orchestrationFields)) orchestrationFields[k] = (orchestrationFields[k] ?? 0) + v;
        lastOutput = extractOutput(resp);
        messages.push({ role: "assistant", content: lastOutput });
        ok = true;
      } catch (err) {
        if (attempt === 0) { retries++; continue; }
        return { ...base, latencyMs, promptTokens, completionTokens, retries,
          extra: { cachedTokens, reasoningTokens, orchestrationFields },
          error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  const usage = { promptTokens, completionTokens };
  const costUsd = costFromUsage(usage, priceFor(cfg, model));
  return { ...base, output: lastOutput, latencyMs, promptTokens, completionTokens, retries,
    extra: { cachedTokens, reasoningTokens, orchestrationFields }, costUsd };
}

export function runObjectiveCheck(task: Bench8Task, output: string): boolean | undefined {
  if (!task.objectiveCheck) return undefined;
  try {
    const re = new RegExp(task.objectiveCheck.pattern, task.objectiveCheck.flags ?? "");
    return re.test(output);
  } catch {
    return undefined;
  }
}
