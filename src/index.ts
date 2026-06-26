import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { loadModels, loadConfig, loadRoles, loadTasks, ROOT } from "./config";
import { buildCombos, runCombo } from "./runner";
import { estimateRun } from "./cost";
import { makeClient, mapLimit } from "./openrouter";
import { judge } from "./judge";
import { scoreResults } from "./score";
import { writeReport } from "./report";
import { buildDemoScored } from "./demo";
import type { JudgeScore, RunResult } from "./types";

const NOW = new Date().toISOString().replace("T", " ").slice(0, 16);

async function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const isDemo = args.has("--demo");
  const isRun = args.has("--run");
  const flagValue = (name: string): string | undefined => {
    const eq = argv.find((a) => a.startsWith(`${name}=`));
    if (eq) return eq.split("=").slice(1).join("=");
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const models = loadModels(flagValue("--models") ?? "models.json");
  const cfg = loadConfig();
  const judgeOverride = flagValue("--judge");
  if (judgeOverride) cfg.judgeModel = judgeOverride;
  const roles = loadRoles();
  const tasks = loadTasks();
  const combos = buildCombos(roles, tasks, models);

  console.log(`\nDreamTeam Benchmark`);
  console.log(`  rollen in gebruik : ${[...new Set(tasks.map((t) => t.role))].join(", ")}`);
  console.log(`  taken             : ${tasks.length} (${tasks.filter((t) => t.example).length} voorbeeld)`);
  console.log(`  modellen          : ${models.length}`);
  console.log(`  combinaties       : ${combos.length} (taak × model)\n`);

  // ---- DEMO: synthetisch rapport, geen API ----
  if (isDemo) {
    const scored = buildDemoScored(combos, cfg);
    const { md, html } = writeReport(scored, {
      generatedAt: NOW,
      judgeModel: cfg.judgeModel,
      weights: cfg.weights,
      demo: true,
    });
    console.log(`DEMO-rapport (synthetische data) geschreven:`);
    console.log(`  ${md}`);
    console.log(`  ${html}\n`);
    return;
  }

  // ---- Kostenraming (altijd) ----
  const estCombos = combos.map((c) => ({
    roleSlug: c.role.slug,
    taskId: c.task.id,
    systemPrompt: c.role.systemPrompt,
    taskPrompt: c.task.prompt,
  }));
  const { totalUsd } = estimateRun(estCombos, models, cfg.maxTokens);
  const judgeCalls = combos.length;
  // Jury-prijs: uit de line-up als het jurymodel daarin zit (bv. cheap-judge override), anders uit config.
  const judgeInLineup = models.find((m) => m.id === cfg.judgeModel);
  const jIn = judgeInLineup?.promptPer1M ?? cfg.judgePromptPer1M;
  const jOut = judgeInLineup?.completionPer1M ?? cfg.judgeCompletionPer1M;
  // Grove jury-raming: ~1500 prompt-tokens (rol+taak+antwoord) + ~300 completion per beoordeling.
  const judgeEst = judgeCalls * (1500 / 1_000_000) * jIn + judgeCalls * (300 / 1_000_000) * jOut;
  const grandTotal = totalUsd + judgeEst;

  console.log(`Kostenraming (bovengrens; prijzen uit models.json, geverifieerd tegen OpenRouter 2026-06-20):`);
  console.log(`  ${combos.length} run-calls (completion gemaximeerd op ${cfg.maxTokens} tokens)`);
  console.log(`  runs   ~ $${totalUsd.toFixed(4)}`);
  console.log(`  jury   ~ $${judgeEst.toFixed(4)} (${judgeCalls} calls, jurymodel ${cfg.judgeModel})`);
  console.log(`  TOTAAL ~ $${grandTotal.toFixed(4)}\n`);

  if (!isRun) {
    console.log(`Gestopt vóór echte API-calls (go/no-go).`);
    console.log(`  • Echte run    : zet OPENROUTER_API_KEY in .env en draai \`npm run bench:run\``);
    console.log(`  • Voorbeeld    : \`npm run bench:demo\` (synthetisch rapport, geen kosten)\n`);
    return;
  }

  // ---- Echte run ----
  const client = makeClient();
  console.log(`Run gestart (concurrency ${cfg.concurrency})...`);
  const results = await mapLimit(combos, cfg.concurrency, async (combo) => {
    const r = await runCombo(client, combo, cfg);
    console.log(`  ${r.error ? "✗" : "✓"} ${r.role} × ${r.taskId} × ${r.modelLabel}` + (r.error ? ` (${r.error})` : ` ${r.latencyMs}ms`));
    return r;
  });

  console.log(`\nJury beoordeelt ${results.length} antwoorden...`);
  const judged = await mapLimit(results, cfg.concurrency, async (r): Promise<{ result: RunResult; judge: JudgeScore }> => {
    const combo = combos.find((c) => c.task.id === r.taskId && c.model.id === r.modelId)!;
    try {
      const score = await judge(client, cfg, combo.role, combo.task, r);
      return { result: r, judge: score };
    } catch (err) {
      return {
        result: r,
        judge: { taakvervulling: 0, correctheid: 0, instructieNaleving: 0, bondigheid: 0, overall: 0, motivatie: `Jury faalde: ${err instanceof Error ? err.message : String(err)}` },
      };
    }
  });

  const scored = scoreResults(judged, cfg);
  const { md, html } = writeReport(scored, { generatedAt: NOW, judgeModel: cfg.judgeModel, weights: cfg.weights, demo: false });

  // Ruwe outputs + jury-motivatie wegschrijven zodat elke score auditeerbaar is.
  const rawPath = path.join(ROOT, "out", "runs.json");
  fs.writeFileSync(
    rawPath,
    JSON.stringify(
      scored.map((s) => ({
        role: s.role, taskId: s.taskId, model: s.modelLabel,
        latencyMs: s.latencyMs, costUsd: s.costUsd, error: s.error ?? null,
        judge: s.judge, output: s.output,
      })),
      null,
      2
    ),
    "utf8"
  );

  const failed = results.filter((r) => r.error).length;
  console.log(`\nKlaar. ${results.length - failed}/${results.length} runs geslaagd.`);
  console.log(`  ${md}`);
  console.log(`  ${html}`);
  console.log(`  ${rawPath} (ruwe outputs + jury-motivatie)\n`);
}

main().catch((err) => {
  console.error(`\nFout: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
