import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, ROOT } from "../config";
import { makeClientFor } from "../openrouter";
import { estimateTokens } from "../cost";
import { judge } from "../judge";
import type { Role, Task } from "../types";
import type { Arm, ArmsConfig, Bench8Task, ArmRunResult } from "./types";
import { priceFor, modelForArm } from "./types";
import { runArmTask, runObjectiveCheck } from "./run";
import { aggregate, buildScorecard } from "./report";

const COST_CAP_USD = 50; // harde grens uit de opdracht
const NOW = new Date().toISOString().replace("T", " ").slice(0, 16);

function loadArms(): ArmsConfig {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "arms.json"), "utf8"));
  if (!raw.arms || !raw.prices) throw new Error("arms.json mist 'arms' en/of 'prices'.");
  return raw as ArmsConfig;
}

function loadRolesMerged(): Map<string, Role> {
  const roles = new Map<string, Role>();
  for (const dir of ["roles", "roles8"]) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const file of fs.readdirSync(full)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(/\.md$/, "");
      roles.set(slug, { slug, systemPrompt: fs.readFileSync(path.join(full, file), "utf8").trim() });
    }
  }
  return roles;
}

function loadTasks8(): Bench8Task[] {
  const dir = path.join(ROOT, "tasks8");
  const tasks: Bench8Task[] = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith(".json")) continue;
    tasks.push(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
  }
  if (!tasks.length) throw new Error("Geen taken in tasks8/.");
  return tasks;
}

function resolveKey(arm: Arm): string | undefined {
  return process.env[arm.apiKeyEnv] ?? (arm.fallbackKeyEnv ? process.env[arm.fallbackKeyEnv] : undefined);
}

function taskPromptForJudge(task: Bench8Task): string {
  if (task.turns) return task.turns.map((t, i) => `(beurt ${i + 1}) ${t}`).join("\n\n");
  return task.prompt ?? "";
}

async function pingArmC(baseURL: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 4000);
    await fetch(`${baseURL}/models`, { signal: ctrl.signal }).catch(() => fetch(baseURL, { signal: ctrl.signal }));
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const isRun = argv.includes("--run");
  const cfg = loadConfig();
  const maxTokens = cfg.maxTokens;
  const arms = loadArms();
  const roles = loadRolesMerged();
  const tasks = loadTasks8();
  const notes: string[] = [];

  // Aannames uit arms.json doorgeven aan de scorecard.
  const armsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, "arms.json"), "utf8"));
  if (armsRaw._assumptions_armA) notes.push(`AANNAME arm A: ${armsRaw._assumptions_armA}`);
  notes.push("Sakana-direct (api.sakana.ai) is EU-geblokkeerd (403); arm B draait sakana/fugu-ultra via OpenRouter (live geverifieerd 2026-06-26: $5/$30 per 1M).");
  notes.push("Arm C kosten = 0 in arms.json omdat OpenFugu's worker-pool intern via OpenRouter belt; de echte C-kosten (som van pool-calls) zijn NIET zichtbaar in de enkele serve-respons. Orkestratie wordt wel gemeten: serve.py geeft usage.fugu_turns (aantal TRINITY-beurten) terug — gevangen als orkestratie-veld. Geen token-counts -> kosten/tokens van arm C niet exposeerbaar.");
  notes.push("Arm C router: de getrainde vector model_iter_60.npy (19456 floats = SVF 9216 + head 10240) wordt NIET geredistribueerd (privé TRINITY-submission). De HF-dataset levert wel de echte getrainde head (router_head.safetensors [10,1024]). Gebruikte vector = identity-SVF (zeros 9216, gedocumenteerd '0 offset = identity') + ECHTE head. Objectief geverifieerd met de eigen verify_37.py op de 37-case fixture: agent 95% / role 100% (baseline 51%/49%) -> routing matcht de gepubliceerde checkpoint; SVF niet-materieel op deze fixture. Arm C is dus getrouw draaibaar, geen gok. Volledige getrainde Conductor (incl. SVF) zou zelf-trainen vergen (GPU + tijd, train_trinity.py).");

  // Validatie: rol + prijs bestaan vooraf (niets gokken).
  for (const t of tasks) {
    if (!roles.has(t.role)) throw new Error(`Taak ${t.id} verwijst naar onbekende rol "${t.role}" (roles/ of roles8/).`);
    for (const arm of arms.arms) priceFor(arms, modelForArm(arm, t.domain));
  }

  const totalRuns = tasks.reduce((a, t) => a + t.runs, 0) * arms.arms.length;
  console.log(`\nFugu-benchmark — 3 armen`);
  console.log(`  taken   : ${tasks.length}  (runs: ${tasks.map((t) => `${t.id.split("-")[0]}×${t.runs}`).join(", ")})`);
  console.log(`  armen   : ${arms.arms.map((a) => a.key).join(", ")}`);
  console.log(`  runs    : ${totalRuns} (taak × arm × runs) + ${totalRuns} jury-calls`);
  console.log(`  maxTokens/call: ${maxTokens}, jury: ${cfg.judgeModel}\n`);

  // ---- Kostenraming (altijd, vóór elke betaalde call) ----
  let estRuns = 0, estJudge = 0;
  for (const t of tasks) {
    const role = roles.get(t.role)!;
    const turns = t.turns ?? [t.prompt ?? ""];
    const promptTok = estimateTokens(role.systemPrompt + "\n" + turns.join("\n"));
    const completionTok = maxTokens * turns.length;
    for (const arm of arms.arms) {
      const p = priceFor(arms, modelForArm(arm, t.domain));
      const per = (promptTok / 1e6) * p.promptPer1M + (completionTok / 1e6) * p.completionPer1M;
      estRuns += per * t.runs;
      // jury: ~promptTok + antwoord (maxTokens) als input, ~300 completion
      const jIn = (promptTok + maxTokens) / 1e6 * cfg.judgePromptPer1M;
      const jOut = 300 / 1e6 * cfg.judgeCompletionPer1M;
      estJudge += (jIn + jOut) * t.runs;
    }
  }
  const grand = estRuns + estJudge;
  console.log(`Kostenraming (bovengrens; prijzen live geverifieerd 2026-06-26):`);
  console.log(`  runs (3 armen) ~ $${estRuns.toFixed(4)}`);
  console.log(`  jury           ~ $${estJudge.toFixed(4)}`);
  console.log(`  TOTAAL         ~ $${grand.toFixed(4)}   (plafond $${COST_CAP_USD})`);
  if (grand > COST_CAP_USD) console.log(`  ⚠ Raming boven het plafond — pas runs/maxTokens aan vóór een live run.`);
  console.log("");

  if (!isRun) {
    // Droog: schrijf scorecard-skelet (plan, geen verzonnen scores) en stop vóór betaald.
    const aggsEmpty = aggregate([], tasks);
    const md = buildScorecard(aggsEmpty, { generatedAt: NOW, judgeModel: cfg.judgeModel, live: false, notes });
    writeOut(md, []);
    console.log(`Gestopt vóór echte API-calls (go/no-go).`);
    console.log(`  • Live run: zet keys in .env en draai \`npm run bench:arms -- --run\``);
    console.log(`  • Scorecard-skelet: out/scorecard.md\n`);
    return;
  }

  // ---- Live run ----
  // VEILIGHEID: alles draait op de $50-capped FUGU_API_KEY. De ongelimiteerde
  // OPENROUTER_API_KEY (productie) mag NOOIT gebruikt worden — fail-closed.
  for (const arm of arms.arms) {
    for (const env of [arm.apiKeyEnv, arm.fallbackKeyEnv].filter(Boolean)) {
      if (env === "OPENROUTER_API_KEY") {
        throw new Error(`Arm ${arm.key} verwijst naar OPENROUTER_API_KEY (ongelimiteerde productiekey). Geblokkeerd — gebruik FUGU_API_KEY.`);
      }
    }
  }
  const judgeKey = requireEnv("FUGU_API_KEY");
  console.log(`Jury + armen draaien op FUGU_API_KEY ($50-capped). OPENROUTER_API_KEY wordt NIET gebruikt.\n`);
  const judgeClient = makeClientFor({ baseURL: "https://openrouter.ai/api/v1", apiKey: judgeKey });
  const available: Arm[] = [];
  for (const arm of arms.arms) {
    const key = resolveKey(arm);
    if (!key) { notes.push(`Arm ${arm.key} OVERGESLAGEN: geen key (${arm.apiKeyEnv}${arm.fallbackKeyEnv ? "/" + arm.fallbackKeyEnv : ""}).`); continue; }
    if (arm.key === "C") {
      const up = await pingArmC(arm.baseURL);
      if (!up) { notes.push(`Arm C OVERGESLAGEN: OpenFugu-server op ${arm.baseURL} reageert niet. Start serve.py (pool-modus) eerst.`); continue; }
    }
    available.push(arm);
  }
  console.log(`Beschikbare armen: ${available.map((a) => a.key).join(", ") || "GEEN"}\n`);

  const results: ArmRunResult[] = [];
  let spent = 0;
  outer: for (const t of tasks) {
    const role = roles.get(t.role)!;
    for (const arm of available) {
      const key = resolveKey(arm)!;
      const client = makeClientFor({ baseURL: arm.baseURL, apiKey: key });
      for (let i = 0; i < t.runs; i++) {
        if (spent >= COST_CAP_USD) {
          notes.push(`⛔ $${COST_CAP_USD}-plafond bereikt na $${spent.toFixed(4)} — gestopt. Resterende runs niet uitgevoerd.`);
          console.log(`⛔ Plafond bereikt ($${spent.toFixed(4)}). Stop.`);
          break outer;
        }
        const r = await runArmTask(client, arm, t, i, role.systemPrompt, arms, maxTokens, cfg.temperature);
        r.objectivePass = runObjectiveCheck(t, r.output);
        // jury
        if (!r.error && r.output) {
          const judgeTask: Task = { example: false, id: t.id, role: t.role, title: t.title, prompt: taskPromptForJudge(t), rubric: t.rubric };
          try {
            const js = await judge(judgeClient, cfg, role, judgeTask, { ...r, role: t.role, modelId: r.model, modelLabel: r.model, usage: { promptTokens: r.promptTokens, completionTokens: r.completionTokens } } as any);
            r.quality = js.overall; r.judgeMotivatie = js.motivatie;
          } catch (e) {
            r.judgeMotivatie = `jury faalde: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
        spent += r.costUsd; // arm-run kosten (arm C = 0; echte kosten verborgen)
        results.push(r);
        const oc = r.objectivePass === undefined ? "" : r.objectivePass ? " obj✓" : " obj✗";
        console.log(`  ${r.error ? "✗" : "✓"} ${arm.key} ${t.id} run${i + 1} q=${r.quality}${oc} ${r.latencyMs}ms $${r.costUsd.toFixed(4)} (cum $${spent.toFixed(4)})`);
      }
    }
  }

  const aggs = aggregate(results, tasks);
  const md = buildScorecard(aggs, { generatedAt: NOW, judgeModel: cfg.judgeModel, live: true, notes });
  writeOut(md, results);
  console.log(`\nKlaar. ${results.filter((r) => !r.error).length}/${results.length} runs geslaagd. Besteed ~$${spent.toFixed(4)}.`);
  console.log(`  out/scorecard.md (+ .runs.json)\n`);
}

function writeOut(md: string, results: ArmRunResult[]) {
  const outDir = path.join(ROOT, "out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "scorecard.md"), md, "utf8");
  fs.writeFileSync(path.join(outDir, "scorecard.runs.json"), JSON.stringify(results, null, 2), "utf8");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} ontbreekt in .env (nodig voor de jury via OpenRouter).`);
  return v;
}

main().catch((err) => {
  console.error(`\nFout: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
