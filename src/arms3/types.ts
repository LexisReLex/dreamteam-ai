import type { ModelSpec } from "../types";

// 3-armen-benchmark: aparte, additieve laag boven de bestaande harness.
// De bestaande judge/score/cost/report blijven de rechter.

export interface Arm {
  key: "A" | "B" | "C";
  label: string;
  baseURL: string;
  apiKeyEnv: string;
  fallbackKeyEnv?: string;
  model?: string;                       // B en C: vast model
  modelByDomain?: Record<string, string>; // A: model per taak-domein
}

export interface ObjectiveCheck {
  type: "regex";
  pattern: string;
  flags?: string;
  note: string;
}

export interface Bench8Task {
  id: string;
  domain: string;
  role: string;
  title: string;
  runs: number;
  prompt?: string;        // single-turn
  turns?: string[];       // multi-turn (taak 8): beurt 2 corrigeert beurt 1
  rubric: string;
  objectiveCheck?: ObjectiveCheck;
}

export interface ArmsConfig {
  arms: Arm[];
  prices: Record<string, { promptPer1M: number; completionPer1M: number }>;
}

export interface ExtraUsage {
  cachedTokens: number;
  reasoningTokens: number;
  // Niet-standaard numerieke usage-velden uit de respons (bv. Fugu-orkestratie). Leeg = niet geexposeerd.
  orchestrationFields: Record<string, number>;
}

export interface ArmRunResult {
  taskId: string;
  domain: string;
  armKey: string;
  armLabel: string;
  runIndex: number;
  model: string;
  output: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  extra: ExtraUsage;
  costUsd: number;        // o.b.v. arms.json-prijs (arm C = 0, echte kosten verborgen — zie bevinding)
  retries: number;
  error?: string;
  objectivePass?: boolean; // alleen bij taken met objectiveCheck
  quality: number;        // jury overall 0-10 (0 bij fout)
  judgeMotivatie: string;
}

export function priceFor(cfg: ArmsConfig, model: string): ModelSpec {
  const p = cfg.prices[model];
  if (!p) {
    throw new Error(
      `Geen prijs voor model "${model}" in arms.json -> niet ramen/rekenen. Voeg de prijs toe (live geverifieerd), niets gokken.`
    );
  }
  return { id: model, label: model, promptPer1M: p.promptPer1M, completionPer1M: p.completionPer1M };
}

export function modelForArm(arm: Arm, domain: string): string {
  if (arm.modelByDomain) {
    const m = arm.modelByDomain[domain];
    if (!m) throw new Error(`Arm ${arm.key} mist een model voor domein "${domain}" in arms.json.`);
    return m;
  }
  if (arm.model) return arm.model;
  throw new Error(`Arm ${arm.key} heeft model noch modelByDomain.`);
}
