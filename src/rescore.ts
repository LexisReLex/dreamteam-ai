// Herbouwt het rapport uit een bestaande out/runs.json — herberekent overall uit de sub-scores.
// Geen API-calls, geen kosten. Gebruik na een code-fix in de scoring/jury-weging.
import * as fs from "fs";
import * as path from "path";
import { loadConfig, ROOT } from "./config";
import { scoreResults, deriveOverall } from "./score";
import { writeReport } from "./report";
import type { RunResult, JudgeScore } from "./types";

const NOW = new Date().toISOString().replace("T", " ").slice(0, 16);

const cfg = loadConfig();
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "out", "runs.json"), "utf8")) as Array<{
  role: string; taskId: string; model: string; latencyMs: number; costUsd: number;
  error: string | null; judge: JudgeScore; output: string;
}>;

const pairs = raw.map((r) => {
  const judge: JudgeScore = { ...r.judge, overall: r.error ? 0 : deriveOverall(r.judge) };
  const result: RunResult = {
    taskId: r.taskId, role: r.role, modelId: r.model, modelLabel: r.model,
    output: r.output, latencyMs: r.latencyMs,
    usage: { promptTokens: 0, completionTokens: 0 }, costUsd: r.costUsd,
    error: r.error ?? undefined,
  };
  return { result, judge };
});

const scored = scoreResults(pairs, cfg);

// Schrijf de herberekende overall terug in runs.json zodat het audit-log met het rapport overeenkomt.
const updated = raw.map((r) => ({ ...r, judge: { ...r.judge, overall: r.error ? 0 : deriveOverall(r.judge) } }));
fs.writeFileSync(path.join(ROOT, "out", "runs.json"), JSON.stringify(updated, null, 2), "utf8");

const { md, html } = writeReport(scored, { generatedAt: `${NOW} (herberekend)`, judgeModel: cfg.judgeModel, weights: cfg.weights, demo: false });
console.log(`Rapport herberekend uit out/runs.json (geen API-kosten):`);
console.log(`  ${md}`);
console.log(`  ${html}`);
