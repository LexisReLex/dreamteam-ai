import * as fs from "fs";
import * as path from "path";
import { computeMetrics, type MetricBlock, type Metrics, type SpanRow } from "./metrics";

// Observability Niveau 2 — paneel (bouwstuk 3). Bouwt een self-contained, statisch
// out/panel/index.html uit de span-log: pass-rate-trend, latency p50/p95, error-rate en
// kosten per model/seat/merkstem. Geen externe scripts/fonts (CSP-veilig, screenshot-klaar).
//
// Bewuste keuze (na inspectie): thin standalone view i.p.v. de HQ Hub uitbreiden. De HQ Hub
// is een aparte Tauri-app (eigen repo, Rust read_dispatch_log-command); die raken we niet.
// Deze view leest exact dezelfde log.jsonl met dezelfde veldnamen — één bron, twee lezers.

const ROOT = path.resolve(__dirname, "..", "..");
const LOG_FILE = path.join(ROOT, "out", "dispatch", "log.jsonl");
const OUT_DIR = path.join(ROOT, "out", "panel");
const OUT_FILE = path.join(OUT_DIR, "index.html");

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function pct(n: number | null): string {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}
function ms(n: number | null): string {
  return n == null ? "—" : `${n} ms`;
}
function usd(n: number): string {
  return `$${n.toFixed(4)}`;
}
function score(n: number | null): string {
  return n == null ? "—" : n.toFixed(1);
}

// Ruwe maandprojectie: echte kosten over de gemeten dagen → ×30. Indicatief, geen belofte.
function monthlyEstimate(m: Metrics): number {
  const days = m.timeline.length || 1;
  return (m.overall.costUsd / days) * 30;
}

function kpi(label: string, value: string, sub = ""): string {
  return `<div class="kpi"><div class="kpi-v">${esc(value)}</div><div class="kpi-l">${esc(label)}</div>${sub ? `<div class="kpi-s">${esc(sub)}</div>` : ""}</div>`;
}

// Horizontale pass-rate-bars per dag (drift zichtbaar: zakt de balk over dagen weg?).
function trendRows(m: Metrics): string {
  if (!m.timeline.length) return `<p class="empty">Nog geen datapunten.</p>`;
  return m.timeline.map((d) => {
    const p = d.passRate;
    const w = p == null ? 0 : Math.round(p * 100);
    const tone = p == null ? "muted" : p >= 0.8 ? "good" : p >= 0.5 ? "warn" : "bad";
    return `<div class="trend-row">
      <div class="trend-day">${esc(d.day)}</div>
      <div class="trend-bar"><div class="trend-fill ${tone}" style="width:${w}%"></div></div>
      <div class="trend-val">${p == null ? "—" : w + "%"} <span class="trend-n">· ${d.attempts} call${d.attempts === 1 ? "" : "s"} · ${usd(d.costUsd)}</span></div>
    </div>`;
  }).join("\n");
}

function metricTable(title: string, blocks: MetricBlock[], hint = ""): string {
  const rows = blocks.filter((b) => b.attempts > 0 || b.label !== "—").map((b) => `<tr>
      <td class="lbl">${esc(b.label)}</td>
      <td>${b.attempts}</td>
      <td>${pct(b.passRate)}${b.evaluated ? `<span class="mini"> (${b.passes}/${b.evaluated})</span>` : ""}</td>
      <td>${score(b.avgScore)}</td>
      <td>${ms(b.latencyP50)}</td>
      <td>${ms(b.latencyP95)}</td>
      <td class="${b.errorRate && b.errorRate > 0 ? "bad-txt" : ""}">${pct(b.errorRate)}</td>
      <td>${usd(b.costUsd)}</td>
    </tr>`).join("\n");
  return `<section class="card">
    <h2>${esc(title)}</h2>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}
    <table><thead><tr>
      <th>${esc(title.split(" ").pop())}</th><th>calls</th><th>pass-rate</th><th>score</th><th>p50</th><th>p95</th><th>errors</th><th>kosten</th>
    </tr></thead><tbody>${rows || `<tr><td colspan="8" class="empty">geen data</td></tr>`}</tbody></table>
  </section>`;
}

function recentRows(rows: SpanRow[]): string {
  if (!rows.length) return `<tr><td colspan="7" class="empty">nog geen spans</td></tr>`;
  return rows.map((r) => {
    const status = r.error ? `<span class="bad-txt">fout</span>` : r.executed ? "ok" : "—";
    const ev = typeof r.evalScore === "number"
      ? `${r.evalScore.toFixed(1)} ${r.evalPass ? "✓" : "✗"}`
      : "—";
    return `<tr>
      <td class="mini">${esc((r.timestamp ?? "").replace("T", " ").slice(0, 19))}</td>
      <td>${esc(r.seat ?? "—")}</td>
      <td>${esc(r.voice ?? "—")}</td>
      <td class="mini">${esc(r.model ?? "—")}</td>
      <td>${status}</td>
      <td>${ev}</td>
      <td>${r.costUsd != null ? usd(r.costUsd) : "—"}</td>
    </tr>`;
  }).join("\n");
}

export function renderHtml(m: Metrics): string {
  const o = m.overall;
  const rangeTxt = m.range
    ? `${m.range.from.slice(0, 10)} → ${m.range.to.slice(0, 10)}`
    : "—";
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Instrumentenpaneel — dispatcher-observability</title>
<style>
  :root{
    --bg:#f6f5f2; --card:#fffdfa; --ink:#26241f; --muted:#8a857c; --line:#e7e3db;
    --good:#4f9d69; --warn:#c99a3a; --bad:#c0563f; --accent:#3f6f8f;
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#1b1a17; --card:#232220; --ink:#eae7df; --muted:#9c968b; --line:#33312c;
      --good:#6bbd85; --warn:#d8b45f; --bad:#e07a63; --accent:#7fb0cf; }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    padding:32px clamp(16px,4vw,56px);}
  header{margin-bottom:24px}
  h1{font-size:22px;font-weight:600;margin:0 0 4px}
  .sub{color:var(--muted);font-size:13px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin:20px 0 8px}
  .kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .kpi-v{font-size:24px;font-weight:600;letter-spacing:-.5px}
  .kpi-l{color:var(--muted);font-size:12px;margin-top:2px}
  .kpi-s{color:var(--muted);font-size:11px;margin-top:4px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:16px 0}
  h2{font-size:15px;font-weight:600;margin:0 0 12px}
  .hint{color:var(--muted);font-size:12px;margin:-6px 0 12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;color:var(--muted);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid var(--line)}
  td{padding:7px 8px;border-bottom:1px solid var(--line)}
  tr:last-child td{border-bottom:none}
  .lbl{font-weight:500}
  .mini{color:var(--muted);font-size:11px}
  .bad-txt{color:var(--bad)}
  .empty{color:var(--muted);text-align:center;padding:12px}
  .trend-row{display:flex;align-items:center;gap:12px;margin:6px 0}
  .trend-day{width:92px;color:var(--muted);font-size:12px;flex:none}
  .trend-bar{flex:1;height:14px;background:var(--line);border-radius:7px;overflow:hidden}
  .trend-fill{height:100%;border-radius:7px}
  .trend-fill.good{background:var(--good)} .trend-fill.warn{background:var(--warn)}
  .trend-fill.bad{background:var(--bad)} .trend-fill.muted{background:var(--muted)}
  .trend-val{width:150px;text-align:right;font-size:12px;flex:none}
  .trend-n{color:var(--muted)}
  footer{color:var(--muted);font-size:11px;margin-top:24px}
</style></head>
<body>
<header>
  <h1>🛠️ Instrumentenpaneel — dispatcher-observability <span class="sub">(Niveau 2)</span></h1>
  <div class="sub">bron: <code>${esc(path.relative(ROOT, m.logPath))}</code> · periode ${esc(rangeTxt)} · gegenereerd ${esc(m.generatedAt.replace("T", " ").slice(0, 19))}</div>
</header>

<div class="kpis">
  ${kpi("spans totaal", String(m.totalRows))}
  ${kpi("uitgevoerd", String(o.executed), `${o.attempts} call-pogingen`)}
  ${kpi("pass-rate", pct(o.passRate), o.evaluated ? `${o.passes}/${o.evaluated} geëvalueerd` : "geen eval")}
  ${kpi("gem. score", score(o.avgScore), "0–10")}
  ${kpi("error-rate", pct(o.errorRate))}
  ${kpi("latency p50 / p95", `${o.latencyP50 ?? "—"} / ${o.latencyP95 ?? "—"} ms`)}
  ${kpi("kosten totaal", usd(o.costUsd), `~${usd(monthlyEstimate(m))}/mnd indicatief`)}
</div>

<section class="card">
  <h2>Pass-rate-trend per dag</h2>
  <p class="hint">Drift = een balk die over dagen wegzakt zonder codewijziging.</p>
  ${trendRows(m)}
</section>

${metricTable("Per model", m.byModel)}
${metricTable("Per seat", m.bySeat)}
${metricTable("Per merkstem", m.byVoice, "187N-merkstem-laag: kosten + kwaliteit per stem, uit het voice-span-veld.")}

<section class="card">
  <h2>Recente spans</h2>
  <table><thead><tr>
    <th>tijd</th><th>seat</th><th>merkstem</th><th>model</th><th>status</th><th>eval</th><th>kosten</th>
  </tr></thead><tbody>${recentRows(m.recent)}</tbody></table>
</section>

<footer>Thin standalone view · HQ Hub (aparte Tauri-app) blijft ongewijzigd · Niveau 3 (Telegram-alert, Supabase, echte n8n-hook) = Lex' go.</footer>
</body></html>`;
}

export function buildPanel(generatedAt: string): string {
  const m = computeMetrics(LOG_FILE, generatedAt);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, renderHtml(m), "utf8");
  return OUT_FILE;
}

// Direct uitvoerbaar: npm run panel
if (require.main === module) {
  const file = buildPanel(new Date().toISOString());
  const m = computeMetrics(LOG_FILE, new Date().toISOString());
  console.log(`✓ Paneel gebouwd: ${file}`);
  console.log(`  ${m.totalRows} spans · pass-rate ${pct(m.overall.passRate)} · error-rate ${pct(m.overall.errorRate)} · kosten ${usd(m.overall.costUsd)}`);
}
