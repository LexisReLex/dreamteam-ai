import type { BenchConfig, RunResult, JudgeScore, ScoredResult } from "./types";

// Overall zelf berekenen uit de sub-scores i.p.v. vertrouwen op het jury-veld.
// De jury collapsed 'overall' soms naar 0 bij een afgekapt einde, óók als alle assen hoog zijn.
// Taakvervulling + correctheid wegen het zwaarst (zoals de rubric bedoelt).
export function deriveOverall(s: { taakvervulling: number; correctheid: number; instructieNaleving: number; bondigheid: number }): number {
  const w = 0.35 * s.taakvervulling + 0.35 * s.correctheid + 0.15 * s.instructieNaleving + 0.15 * s.bondigheid;
  return Math.round(w * 10) / 10;
}

// Normaliseer kosten en latency over de geslaagde runs: goedkoper/sneller = hogere deelscore (0-1).
export function scoreResults(
  pairs: { result: RunResult; judge: JudgeScore }[],
  cfg: BenchConfig
): ScoredResult[] {
  const ok = pairs.filter((p) => !p.result.error && p.result.output);
  const positiveCosts = ok.map((p) => p.result.costUsd).filter((c) => c > 0);
  const positiveLats = ok.map((p) => p.result.latencyMs).filter((l) => l > 0);
  const minCost = positiveCosts.length ? Math.min(...positiveCosts) : 0;
  const minLat = positiveLats.length ? Math.min(...positiveLats) : 0;

  return pairs.map(({ result, judge }) => {
    const failed = Boolean(result.error) || !result.output;
    const qualityScore = failed ? 0 : judge.overall / 10;
    const costScore = failed ? 0 : result.costUsd > 0 ? minCost / result.costUsd : 1;
    const latencyScore = failed ? 0 : result.latencyMs > 0 ? minLat / result.latencyMs : 1;
    const total =
      cfg.weights.quality * qualityScore +
      cfg.weights.cost * costScore +
      cfg.weights.latency * latencyScore;
    return { ...result, judge, qualityScore, costScore, latencyScore, total };
  });
}
