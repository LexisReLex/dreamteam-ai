import type { ModelSpec, Usage } from "./types";

// Grove schatting: ~4 tekens per token (Engels/NL gemengd). Alleen voor de vooraf-raming;
// de echte kosten komen ná de run uit de API-usage.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function costFromUsage(usage: Usage, model: ModelSpec): number {
  return (
    (usage.promptTokens / 1_000_000) * model.promptPer1M +
    (usage.completionTokens / 1_000_000) * model.completionPer1M
  );
}

export interface EstimateRow {
  combo: string;
  modelLabel: string;
  estPromptTokens: number;
  estCompletionTokens: number;
  estCostUsd: number;
}

// Bovengrens-raming: completion = maxTokens (model kan korter, nooit langer).
export function estimateRun(
  combos: { roleSlug: string; taskId: string; systemPrompt: string; taskPrompt: string }[],
  models: ModelSpec[],
  maxTokens: number
): { rows: EstimateRow[]; totalUsd: number } {
  const rows: EstimateRow[] = [];
  let totalUsd = 0;
  for (const c of combos) {
    const promptTokens = estimateTokens(c.systemPrompt + "\n" + c.taskPrompt);
    for (const m of models) {
      const cost =
        (promptTokens / 1_000_000) * m.promptPer1M +
        (maxTokens / 1_000_000) * m.completionPer1M;
      totalUsd += cost;
      rows.push({
        combo: `${c.roleSlug} × ${c.taskId}`,
        modelLabel: m.label,
        estPromptTokens: promptTokens,
        estCompletionTokens: maxTokens,
        estCostUsd: cost,
      });
    }
  }
  return { rows, totalUsd };
}
