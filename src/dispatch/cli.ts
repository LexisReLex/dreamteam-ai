import * as fs from "fs";
import * as path from "path";
import { makeClient, mapLimit } from "../openrouter";
import { loadRouting } from "./routing";
import {
  buildConfig,
  loadTask,
  resolveModel,
  dispatchTaskWithIO,
} from "./service";
import { applyVoice } from "./voice";
import { defaultEvalConfig } from "./eval";
import { newTraceId } from "./span";
import type { DispatchTask, Estimate, Mode, Resolution } from "./types";

interface Args {
  seat?: string;
  mode: Mode;
  model?: string;
  task?: string;
  voice?: string;
  parallel: string[];
  dryRun: boolean;
  yes: boolean;
  routing?: string;
  maxTokens?: number;
  threshold?: number;
  concurrency?: number;
  evalSample?: number;
  noEval: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { mode: "default", parallel: [], dryRun: false, yes: false, noEval: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const next = () => argv[++i];
    switch (t) {
      case "--seat": a.seat = next(); break;
      case "--mode": a.mode = next() as Mode; break;
      case "--draft": a.mode = "draft"; break;
      case "--quality":
      case "--fallback": a.mode = "quality"; break;
      case "--model": a.model = next(); break;
      case "--task": a.task = next(); break;
      case "--voice": a.voice = next(); break;
      case "--parallel":
        // verzamel alle volgende non-flag tokens (shell-expanded glob), of één glob-patroon
        while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) a.parallel.push(argv[++i]);
        break;
      case "--dry-run": a.dryRun = true; break;
      case "--yes": a.yes = true; break;
      case "--routing": a.routing = next(); break;
      case "--max-tokens": a.maxTokens = Number(next()); break;
      case "--threshold": a.threshold = Number(next()); break;
      case "--concurrency": a.concurrency = Number(next()); break;
      case "--eval-sample": a.evalSample = Number(next()); break;
      case "--no-eval": a.noEval = true; break;
      case "--help": case "-h": a.help = true; break;
      default:
        if (t.startsWith("--")) throw new Error(`Onbekende flag: ${t}`);
    }
  }
  return a;
}

// Eenvoudige glob voor "dir/*.ext" — vangt het geval dat de shell niet expandde.
function expandGlob(pattern: string): string[] {
  if (!pattern.includes("*")) return [pattern];
  const dir = path.dirname(pattern);
  const base = path.basename(pattern);
  const rx = new RegExp("^" + base.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => rx.test(f)).map((f) => path.join(dir, f)).sort();
}

function eur(usd: number): string {
  // Indicatief: ruwe omrekening voor Lex (USD→EUR ~0,92). Bron-bedrag blijft USD.
  return (usd * 0.92).toFixed(4);
}

function printEstimate(res: Resolution, t: DispatchTask, est: Estimate, gate: string): void {
  console.log(`  taak      : ${t.id}${t.path ? ` (${t.path})` : ""}`);
  console.log(`  model     : ${res.model.label} [${res.modelId}] · tier ${res.model.tier}`);
  console.log(`  reden     : ${res.reason}`);
  console.log(`  raming    : ~${est.estPromptTokens} in + ~${est.estCompletionTokens} out tokens`);
  console.log(`  kosten    : ~$${est.estCostUsd.toFixed(6)} (~€${eur(est.estCostUsd)}) — bron: prijs uit routing-JSON`);
  console.log(`  gate      : ${gate}`);
}

const HELP = `
Model-router dispatch (fase 2) — draait een taak via het juiste OpenRouter-model.

Gebruik:
  npm run dispatch -- --seat research --task ./taak.md
  npm run dispatch -- --seat copywriter --mode draft --task "schrijf 3 ad-haakjes"
  npm run dispatch -- --model deepseek/deepseek-v4-flash --task ./taak.md
  npm run dispatch -- --dry-run --seat copywriter --task ./taak.md
  npm run dispatch -- --parallel ./examples-dispatch/voorbeeld-research-*.md

Flags:
  --seat <naam>        copywriter | klantenservice | research
  --mode <m>           default | draft | quality   (of: --draft, --quality/--fallback)
  --model <slug>       expliciet model; omzeilt seat-keuze (moet in routing-JSON staan)
  --task <pad|tekst>   taakbestand (.md/.json/.txt) of inline tekst
  --voice <niche>      merkstem-laag: lexxy | degroot | klanttijd | persoonlijk (optioneel)
  --parallel <paden>   meerdere taken tegelijk (glob of lijst paden)
  --dry-run            kies model + toon kostenraming, CALL NIET
  --yes                bevestig premium/dure run (oranje licht passeren)
  --routing <pad>      pad naar models-routing.json (default = vault-locatie)
  --max-tokens <n>     completion-plafond (default uit dispatch.config.json)
  --threshold <usd>    oranje-licht-drempel per call (default uit config)
  --concurrency <n>    parallel-limiet
  --eval-sample <n>    online-eval op ~1-op-n calls (default 1 = elke call; cheap DeepSeek-judge)
  --no-eval            zet de online-eval-hook uit voor deze run
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return; }

  const cfg = buildConfig({
    routingPath: args.routing,
    maxTokens: args.maxTokens,
    threshold: args.threshold,
    concurrency: args.concurrency,
  });

  const table = loadRouting(cfg.routingPath);
  console.log(`Routing-bron: ${table.path} (v${table.version})\n`);

  // Verzamel taken
  const taskInputs: string[] = [];
  if (args.parallel.length) {
    for (const p of args.parallel) taskInputs.push(...expandGlob(p));
    if (taskInputs.length === 0) throw new Error(`--parallel matchte geen bestanden: ${args.parallel.join(" ")}`);
  } else if (args.task) {
    taskInputs.push(args.task);
  } else {
    throw new Error("Geef --task <pad|tekst> of --parallel <paden>. Zie --help.");
  }

  const tasks = taskInputs.map((t) => applyVoice(loadTask(t), args.voice));
  const res = resolveModel(table, { seat: args.seat, model: args.model, mode: args.mode });

  // Eén trace-id voor de hele job: zo knopen alle (parallelle) stappen aan elkaar in de span-log.
  const traceId = newTraceId();
  const evalCfg = defaultEvalConfig({ enabled: !args.noEval, sampleN: args.evalSample });

  console.log(`${args.dryRun ? "DRY-RUN" : "DISPATCH"} — ${tasks.length} taak/taken via ${res.model.label}`);
  console.log(`trace: ${traceId}${args.dryRun ? "" : ` · online-eval: ${evalCfg.enabled ? `aan (1-op-${evalCfg.sampleN}, judge ${evalCfg.model})` : "uit"}`}\n`);

  const client = args.dryRun ? null : makeClient();

  const outcomes = await mapLimit(tasks, cfg.concurrency, async (task) => {
    const { outcome, resultFile, logFile } = await dispatchTaskWithIO(
      client,
      res,
      task,
      cfg,
      { dryRun: args.dryRun, yes: args.yes, traceId, evalCfg }
    );

    // Console-feedback
    console.log(`▸ ${task.id}`);
    printEstimate(res, task, outcome.estimate, outcome.gate);
    if (outcome.error) {
      console.log(`  ✗ FOUT: ${outcome.error}`);
    } else if (!outcome.executed) {
      console.log(`  ⏸ niet uitgevoerd: ${outcome.blockedReason}`);
      if (outcome.gate === "oranje" && !args.dryRun && !args.yes) {
        console.log(`    → herhaal met --yes om te bevestigen.`);
      }
    } else {
      console.log(`  ✓ klaar: ${outcome.promptTokens} in / ${outcome.completionTokens} out · ${outcome.latencyMs} ms · ECHTE kosten $${(outcome.costUsd ?? 0).toFixed(6)}`);
      if (outcome.voice) console.log(`    merkstem : ${outcome.voice} · prompt ${outcome.promptVersion}`);
      if (outcome.eval) {
        console.log(`    eval     : ${outcome.eval.score.toFixed(1)}/10 · ${outcome.eval.pass ? "PASS ✓" : "FAIL ✗"}${outcome.eval.motivatie ? ` — ${outcome.eval.motivatie}` : ""}`);
      }
      if (resultFile) console.log(`    resultaat → ${resultFile}`);
    }
    console.log(`    logregel → ${logFile}\n`);
    return outcome;
  });

  const executed = outcomes.filter((o) => o.executed).length;
  const totalReal = outcomes.reduce((s, o) => s + (o.costUsd ?? 0), 0);
  const totalEst = outcomes.reduce((s, o) => s + o.estimate.estCostUsd, 0);
  console.log("─".repeat(60));
  console.log(`Klaar. Uitgevoerd: ${executed}/${outcomes.length}.`);
  if (executed) console.log(`Totale ECHTE kosten: $${totalReal.toFixed(6)} (~€${eur(totalReal)}).`);
  console.log(`Totale raming (incl. niet-uitgevoerd): $${totalEst.toFixed(6)} (~€${eur(totalEst)}).`);
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
