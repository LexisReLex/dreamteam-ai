import type { BenchConfig, JudgeScore, RunResult } from "./types";
import type { Combo } from "./runner";
import { costFromUsage } from "./cost";
import { scoreResults } from "./score";

// Deterministische pseudo-waarde 0..1 uit een string — puur om DEMO-cijfers te variëren.
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

// Bouwt VOLLEDIG SYNTHETISCHE resultaten (geen API) om het rapport-format te tonen.
export function buildDemoScored(combos: Combo[], cfg: BenchConfig) {
  const pairs = combos.map((combo) => {
    const key = combo.model.id + "|" + combo.task.id;
    const qBias = hash01(combo.model.id); // sommige modellen "beter"
    const overall = Math.round((4 + qBias * 6) * 10) / 10; // 4.0 - 10.0
    const promptTokens = 300 + Math.floor(hash01(key) * 200);
    const completionTokens = 400 + Math.floor(hash01(key + "c") * 600);
    const usage = { promptTokens, completionTokens };
    const result: RunResult = {
      taskId: combo.task.id,
      role: combo.role.slug,
      modelId: combo.model.id,
      modelLabel: combo.model.label,
      output: "[DEMO — synthetisch antwoord, geen echte modeloutput]",
      latencyMs: 700 + Math.floor(hash01(key + "l") * 6000),
      usage,
      costUsd: costFromUsage(usage, combo.model),
    };
    const judge: JudgeScore = {
      taakvervulling: overall,
      correctheid: overall,
      instructieNaleving: Math.min(10, overall + 0.5),
      bondigheid: Math.max(0, overall - 1),
      overall,
      motivatie: "Synthetische DEMO-score.",
    };
    return { result, judge };
  });
  return scoreResults(pairs, cfg);
}
