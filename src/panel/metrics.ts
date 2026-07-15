import * as fs from "fs";

// Observability Niveau 2 — gedeelde metriek-laag. Leest de span-log (out/dispatch/log.jsonl)
// en rekent pass-rate / latency p50-p95 / error-rate / kosten uit, overall en per groep
// (model / seat / merkstem) en over de tijd. Eén bron: paneel (bouwstuk 3) én drift (bouwstuk 4).

// Losse rij-vorm: tolerant voor oude regels die de nieuwe span-velden nog missen.
export interface SpanRow {
  timestamp: string;
  traceId?: string;
  taskId?: string;
  seat?: string | null;
  voice?: string | null;
  mode?: string;
  model?: string;
  tier?: string;
  gate?: string;
  promptVersion?: string;
  executed?: boolean;
  blockedReason?: string | null;
  estCostUsd?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  latencyMs?: number | null;
  costUsd?: number | null;
  inputHash?: string;
  outputHash?: string | null;
  evalScore?: number | null;
  evalPass?: boolean | null;
  evalMotivatie?: string | null;
  error?: string | null;
}

// Lees de JSONL-log tolerant in: kapotte regels worden overgeslagen, niet fataal.
export function readSpans(logPath: string): SpanRow[] {
  if (!fs.existsSync(logPath)) return [];
  const rows: SpanRow[] = [];
  for (const line of fs.readFileSync(logPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t) as SpanRow);
    } catch {
      // Regel onleesbaar (halve schrijf/handmatige edit) — overslaan, log blijft bruikbaar.
    }
  }
  return rows;
}

// Een echte poging tot een call = uitgevoerd óf gefaald (dus geen dry-run/geblokkeerd).
export function isAttempt(r: SpanRow): boolean {
  return r.executed === true || (r.error != null && r.error !== undefined);
}

export function percentile(values: number[], p: number): number | null {
  const v = values.filter((n) => typeof n === "number" && n > 0).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const idx = Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1);
  return v[Math.max(0, idx)];
}

export interface MetricBlock {
  label: string;
  attempts: number;      // echte call-pogingen
  executed: number;      // succesvol uitgevoerd
  errors: number;        // gefaalde calls
  errorRate: number | null;
  evaluated: number;     // spans met een eval-score
  passes: number;        // eval_pass = true
  passRate: number | null;
  avgScore: number | null;
  latencyP50: number | null;
  latencyP95: number | null;
  costUsd: number;       // som echte kosten
}

function block(label: string, rows: SpanRow[]): MetricBlock {
  const attempts = rows.filter(isAttempt);
  const executed = rows.filter((r) => r.executed === true);
  const errors = rows.filter((r) => r.error != null);
  const evaluated = rows.filter((r) => typeof r.evalScore === "number");
  const passes = evaluated.filter((r) => r.evalPass === true);
  const lats = executed.map((r) => r.latencyMs ?? 0);
  const scores = evaluated.map((r) => r.evalScore as number);
  const costUsd = executed.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  return {
    label,
    attempts: attempts.length,
    executed: executed.length,
    errors: errors.length,
    errorRate: attempts.length ? errors.length / attempts.length : null,
    evaluated: evaluated.length,
    passes: passes.length,
    passRate: evaluated.length ? passes.length / evaluated.length : null,
    avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    latencyP50: percentile(lats, 50),
    latencyP95: percentile(lats, 95),
    costUsd,
  };
}

function groupBy(rows: SpanRow[], key: (r: SpanRow) => string): MetricBlock[] {
  const map = new Map<string, SpanRow[]>();
  for (const r of rows) {
    const k = key(r);
    (map.get(k) ?? map.set(k, []).get(k)!).push(r);
  }
  return [...map.entries()]
    .map(([label, rs]) => block(label, rs))
    .sort((a, b) => b.attempts - a.attempts);
}

export interface DayPoint {
  day: string;        // YYYY-MM-DD
  attempts: number;
  passRate: number | null;
  errorRate: number | null;
  costUsd: number;
}

function timeline(rows: SpanRow[]): DayPoint[] {
  const byDay = new Map<string, SpanRow[]>();
  for (const r of rows) {
    const day = (r.timestamp ?? "").slice(0, 10);
    if (!day) continue;
    (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(r);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, rs]) => {
      const b = block(day, rs);
      return { day, attempts: b.attempts, passRate: b.passRate, errorRate: b.errorRate, costUsd: b.costUsd };
    });
}

export interface Metrics {
  logPath: string;
  generatedAt: string;
  totalRows: number;
  range: { from: string; to: string } | null;
  overall: MetricBlock;
  byModel: MetricBlock[];
  bySeat: MetricBlock[];
  byVoice: MetricBlock[];
  timeline: DayPoint[];
  recent: SpanRow[]; // laatste N spans, nieuwste eerst
}

export function computeMetrics(logPath: string, generatedAt: string, recentN = 12): Metrics {
  const rows = readSpans(logPath);
  const stamps = rows.map((r) => r.timestamp).filter(Boolean).sort();
  return {
    logPath,
    generatedAt,
    totalRows: rows.length,
    range: stamps.length ? { from: stamps[0], to: stamps[stamps.length - 1] } : null,
    overall: block("overall", rows),
    byModel: groupBy(rows, (r) => r.model ?? "—"),
    bySeat: groupBy(rows, (r) => r.seat ?? "—"),
    byVoice: groupBy(rows, (r) => r.voice ?? "(geen merkstem)"),
    timeline: timeline(rows),
    recent: rows.slice(-recentN).reverse(),
  };
}
