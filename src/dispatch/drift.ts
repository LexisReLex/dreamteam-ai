import * as fs from "fs";
import * as path from "path";
import { computeMetrics, percentile, type Metrics } from "../panel/metrics";
import { ROOT } from "./config";

// Observability Niveau 2 — lokale drift-/drempel-check (bouwstuk 4).
// Schrijft een WARN naar console + out/dispatch/drift.log als: pass-rate onder drempel,
// kosten-piek, error-rate omhoog, of pass-rate die over dagen wegzakt (drift).
// ALLEEN lokaal — de echte Telegram-ping is Niveau 3 (niet hier bedraden).

const LOG_FILE = path.join(ROOT, "out", "dispatch", "log.jsonl");
const DRIFT_LOG = path.join(ROOT, "out", "dispatch", "drift.log");

export interface DriftThresholds {
  minPassRate: number;   // pass-rate onder deze waarde = WARN
  maxErrorRate: number;  // error-rate boven deze waarde = WARN
  costSpikeUsd: number;  // absolute kosten-piek op één dag = WARN
  spikeFactor: number;   // dagkosten > factor × mediaan eerdere dagen = WARN
  driftDrop: number;     // pass-rate-daling laatste dag vs eerder venster = WARN
}

export const DEFAULT_THRESHOLDS: DriftThresholds = {
  minPassRate: 0.7,
  maxErrorRate: 0.2,
  costSpikeUsd: 0.5,
  spikeFactor: 3,
  driftDrop: 0.15,
};

export interface DriftWarning {
  kind: "pass-rate" | "error-rate" | "cost-spike" | "drift";
  message: string;
}

// Puur: rekent de waarschuwingen uit de metrics + drempels. Geen I/O, dus test-baar.
export function evaluateDrift(m: Metrics, t: DriftThresholds): DriftWarning[] {
  const warns: DriftWarning[] = [];
  const o = m.overall;

  if (o.passRate != null && o.evaluated > 0 && o.passRate < t.minPassRate) {
    warns.push({ kind: "pass-rate", message:
      `pass-rate ${Math.round(o.passRate * 100)}% < drempel ${Math.round(t.minPassRate * 100)}% (${o.passes}/${o.evaluated} geslaagd)` });
  }

  if (o.errorRate != null && o.attempts > 0 && o.errorRate > t.maxErrorRate) {
    warns.push({ kind: "error-rate", message:
      `error-rate ${Math.round(o.errorRate * 100)}% > drempel ${Math.round(t.maxErrorRate * 100)}% (${o.errors}/${o.attempts} calls faalden)` });
  }

  // Kosten-piek: laatste dag absoluut hoog, óf ver boven de mediaan van eerdere dagen.
  const days = m.timeline;
  if (days.length) {
    const last = days[days.length - 1];
    const priorCosts = days.slice(0, -1).map((d) => d.costUsd);
    const median = percentile(priorCosts, 50);
    if (last.costUsd > t.costSpikeUsd) {
      warns.push({ kind: "cost-spike", message:
        `kosten-piek op ${last.day}: ${last.costUsd.toFixed(4)} USD > absolute drempel ${t.costSpikeUsd} USD` });
    } else if (median != null && median > 0 && last.costUsd > median * t.spikeFactor) {
      warns.push({ kind: "cost-spike", message:
        `kosten-piek op ${last.day}: ${last.costUsd.toFixed(4)} USD > ${t.spikeFactor}× mediaan (${median.toFixed(4)} USD)` });
    }
  }

  // Drift: pass-rate van de laatste dag zakt weg t.o.v. het gemiddelde van eerdere dagen.
  const rated = days.filter((d) => d.passRate != null) as (typeof days[number] & { passRate: number })[];
  if (rated.length >= 2) {
    const last = rated[rated.length - 1];
    const prior = rated.slice(0, -1);
    const priorAvg = prior.reduce((s, d) => s + d.passRate, 0) / prior.length;
    if (priorAvg - last.passRate >= t.driftDrop) {
      warns.push({ kind: "drift", message:
        `pass-rate zakt weg: ${last.day} = ${Math.round(last.passRate * 100)}% vs eerder gemiddeld ${Math.round(priorAvg * 100)}% (drift ≥ ${Math.round(t.driftDrop * 100)}%)` });
    }
  }

  return warns;
}

function appendDriftLog(warns: DriftWarning[], at: string): void {
  fs.mkdirSync(path.dirname(DRIFT_LOG), { recursive: true });
  const lines = warns.map((w) => `${at} [WARN:${w.kind}] ${w.message}`).join("\n") + "\n";
  fs.appendFileSync(DRIFT_LOG, lines, "utf8");
}

function parseThresholds(argv: string[]): DriftThresholds {
  const t = { ...DEFAULT_THRESHOLDS };
  for (let i = 0; i < argv.length; i++) {
    const next = () => Number(argv[++i]);
    switch (argv[i]) {
      case "--min-pass": t.minPassRate = next(); break;
      case "--max-error": t.maxErrorRate = next(); break;
      case "--cost-spike": t.costSpikeUsd = next(); break;
    }
  }
  return t;
}

// Direct uitvoerbaar: npm run drift
if (require.main === module) {
  const at = new Date().toISOString();
  const thresholds = parseThresholds(process.argv.slice(2));
  const m = computeMetrics(LOG_FILE, at);
  const warns = evaluateDrift(m, thresholds);

  console.log(`Drift-check @ ${at} — ${m.totalRows} spans, ${m.overall.evaluated} geëvalueerd.`);
  if (!warns.length) {
    console.log("✓ Geen drift/drempel-overschrijding. Alles binnen de marges.");
  } else {
    for (const w of warns) console.log(`⚠ WARN [${w.kind}] ${w.message}`);
    appendDriftLog(warns, at);
    console.log(`\n${warns.length} waarschuwing(en) → ${path.relative(ROOT, DRIFT_LOG)}`);
    console.log("Niveau 3 (Telegram-ping) is bewust NIET bedraad — dat is Lex' go.");
  }
}
