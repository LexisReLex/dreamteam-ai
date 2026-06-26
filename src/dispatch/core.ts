import type OpenAI from "openai";
import { estimateTokens, costFromUsage } from "../cost";
import type {
  Resolution,
  DispatchTask,
  DispatchConfig,
  DispatchOutcome,
  Estimate,
} from "./types";

// Bovengrens-raming: completion = maxTokens (model kan korter, nooit langer).
// Respecteert een BUDGET-tokenplafond uit het contract als dat lager is.
export function estimate(
  res: Resolution,
  task: DispatchTask,
  cfg: DispatchConfig
): { estimate: Estimate; effectiveMaxTokens: number } {
  const estPromptTokens = estimateTokens(task.systemBlock + "\n" + task.prompt);
  const budget = task.contract.budgetTokens;
  // Als het contract een tokenbudget noemt, neem het kleinste plafond.
  const effectiveMaxTokens =
    typeof budget === "number" && budget > 0
      ? Math.max(1, Math.min(cfg.maxTokens, budget - estPromptTokens))
      : cfg.maxTokens;
  const estCostUsd =
    (estPromptTokens / 1_000_000) * res.model.promptPer1M +
    (effectiveMaxTokens / 1_000_000) * res.model.completionPer1M;
  return {
    estimate: { estPromptTokens, estCompletionTokens: effectiveMaxTokens, estCostUsd },
    effectiveMaxTokens,
  };
}

// Oranje licht: cheap onder drempel = auto; premium of boven drempel = vraag go.
export function decideGate(
  res: Resolution,
  est: Estimate,
  cfg: DispatchConfig
): { gate: "auto" | "oranje"; reason: string } {
  if (res.model.tier === "premium") {
    return { gate: "oranje", reason: "premium-model → go vereist (--yes)" };
  }
  if (est.estCostUsd > cfg.oranjeThresholdUsd) {
    return {
      gate: "oranje",
      reason: `geschatte kosten $${est.estCostUsd.toFixed(4)} > drempel $${cfg.oranjeThresholdUsd.toFixed(2)} → go vereist (--yes)`,
    };
  }
  return { gate: "auto", reason: "cheap-model onder drempel → automatisch" };
}

export interface DispatchOptions {
  dryRun: boolean;
  yes: boolean;
}

// Voert één taak uit (of raamt/stopt). Gooit niet bij API-fouten — vangt ze in de outcome.
export async function dispatchOne(
  client: OpenAI,
  res: Resolution,
  task: DispatchTask,
  cfg: DispatchConfig,
  opts: DispatchOptions
): Promise<DispatchOutcome> {
  const timestamp = new Date().toISOString();
  const { estimate: est, effectiveMaxTokens } = estimate(res, task, cfg);
  const { gate } = decideGate(res, est, cfg);

  const base: DispatchOutcome = {
    timestamp,
    taskId: task.id,
    taskPath: task.path,
    seat: res.seat,
    mode: res.mode,
    modelId: res.modelId,
    modelLabel: res.model.label,
    tier: res.model.tier,
    gate,
    estimate: est,
    executed: false,
  };

  // Dry-run: nooit callen.
  if (opts.dryRun) {
    return { ...base, blockedReason: "dry-run (geen call)" };
  }

  // Oranje licht zonder go: stop met de raming.
  if (gate === "oranje" && !opts.yes) {
    return {
      ...base,
      blockedReason:
        res.model.tier === "premium"
          ? "premium zonder --yes"
          : "boven kostendrempel zonder --yes",
    };
  }

  // Echte call.
  const started = Date.now();
  try {
    const resp = await client.chat.completions.create({
      model: res.modelId,
      temperature: cfg.temperature,
      max_tokens: effectiveMaxTokens,
      messages: [
        { role: "system", content: task.systemBlock },
        { role: "user", content: task.prompt },
      ],
    });
    const latencyMs = Date.now() - started;
    const usage = {
      promptTokens: resp.usage?.prompt_tokens ?? 0,
      completionTokens: resp.usage?.completion_tokens ?? 0,
    };
    const msg = resp.choices[0]?.message as
      | { content?: string; reasoning?: string }
      | undefined;
    // Sommige reasoning-modellen leveren lege content met de tekst in reasoning.
    const output = msg?.content?.trim() ? msg.content : msg?.reasoning ?? "";
    return {
      ...base,
      executed: true,
      output,
      latencyMs,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      // ECHTE kosten uit API-usage; costFromUsage leest alleen de prijs-velden.
      costUsd: costFromUsage(usage, { id: res.modelId, ...res.model }),
    };
  } catch (err) {
    return {
      ...base,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
