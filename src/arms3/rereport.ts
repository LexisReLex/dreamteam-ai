import * as fs from "fs";
import * as path from "path";
import { ROOT } from "../config";
import { loadConfig } from "../config";
import type { ArmRunResult, Bench8Task } from "./types";
import { aggregate, buildScorecard } from "./report";

// Herschrijft out/scorecard.md uit out/scorecard.runs.json — GEEN API-calls.
// Corrigeert orkestratie-velden (cost is dollars, geen orkestratie) en werkt de
// bevindingen bij naar de LIVE waarheid (arm B 403). Idempotent.

const NON_ORCH = new Set(["cost", "cost_details", "is_byok"]);

function loadTasks8(): Bench8Task[] {
  const dir = path.join(ROOT, "tasks8");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

const cfg = loadConfig();
const runs: ArmRunResult[] = JSON.parse(fs.readFileSync(path.join(ROOT, "out", "scorecard.runs.json"), "utf8"));
for (const r of runs) {
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.extra?.orchestrationFields ?? {})) {
    if (!NON_ORCH.has(k)) cleaned[k] = v;
  }
  r.extra.orchestrationFields = cleaned;
}

const tasks = loadTasks8();
const aggs = aggregate(runs, tasks);

const notes: string[] = [
  "LIVE-WEERLEGGING (belangrijkste bevinding): arm B (Sakana Fugu-Ultra) faalde ALLE 18 runs met HTTP 403 van de provider zelf (OpenRouter-metadata: provider_name=\"Sakana AI\", is_byok=false, body=plain '403 Forbidden'). Dus ook via OpenRouter blokkeert Sakana de call — vermoedelijk dezelfde EU-geo-blok als api.sakana.ai direct. De eerdere aanname dat OpenRouter de blok omzeilt is door de live data WEERLEGD. 'Buy-Sakana' is vanaf deze locatie/dit account NIET beschikbaar; er is geen B-kwaliteitsdata.",
  "AANNAME arm A: model per domein in arms.json. research-synth (deepseek) en nl-copy (gpt-5.5) komen uit de vault-routing (models-routing.json v1); de andere 5 domeinen hebben geen seat -> expliciete aanname (correctheid-kritisch=premium, mechanisch=cheap). Vault-routing NIET gewijzigd.",
  "Arm C router: getrainde model_iter_60.npy niet geredistribueerd; gebruikte vector = identity-SVF + ECHTE head (router_head.safetensors). Objectief geverifieerd via repo's verify_37.py: agent 95% / role 100% (baseline 51/49) -> routing matcht de gepubliceerde checkpoint. Getrouw, geen gok. Volledige getrainde Conductor (incl. SVF) = zelf-trainen (GPU + tijd).",
  "Arm C kosten = 0 in de meter: OpenFugu's worker-pool belt intern via OpenRouter (cheap: deepseek+minimax) op DEZELFDE capped key; die calls staan NIET in de serve-respons (die geeft alleen usage.fugu_turns = orkestratie-diepte). Het echte arm-C-bedrag staat in het OpenRouter-dashboard, niet in deze meter.",
  "Orkestratie-tok-kolom: arm C = usage.fugu_turns (TRINITY-beurten, echte orkestratie). Arm A/B hebben geen orkestratie-laag; OpenRouter's usage.cost is bewust uitgesloten (dat zijn dollars, geen tokens).",
  "Jury-variantie (auditeerbaar in scorecard.runs.json): bij enkele afgekapte/lege outputs gaf de jury overall 0 ondanks geslaagde objective-check (bv. arm A security 1 run). 'Voltooid' = jury>=6 EN objective !=fout; daardoor telt zo'n run niet mee. Arm C is wisselvallig op complexe coding/multi-step (Conductor + cheap pool), sterk op gestructureerde/objectieve taken.",
  "Alle runs + jury op de $50-capped FUGU_API_KEY; OPENROUTER_API_KEY (productie) is per code-guard geblokkeerd. Zichtbaar besteed deze run: ~$0.56 (arm A draagt alle zichtbare kosten; B=$0 want geblokkeerd; C-pool verborgen).",
];

const md = buildScorecard(aggs, {
  generatedAt: "2026-06-26 (live run; scorecard re-report uit runs.json)",
  judgeModel: cfg.judgeModel,
  live: true,
  notes,
});

fs.writeFileSync(path.join(ROOT, "out", "scorecard.md"), md, "utf8");
console.log("scorecard.md herschreven uit runs.json (orkestratie geschoond, B-403 live verwerkt).");
