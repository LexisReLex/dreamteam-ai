import * as fs from "fs";
import * as path from "path";
import type { BenchConfig, ScoredResult } from "./types";
import { ROOT } from "./config";

function fmtUsd(n: number): string {
  return "$" + n.toFixed(5);
}

function byRole(results: ScoredResult[]): Map<string, ScoredResult[]> {
  const map = new Map<string, ScoredResult[]>();
  for (const r of results) {
    const arr = map.get(r.role) ?? [];
    arr.push(r);
    map.set(r.role, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => b.total - a.total);
  return map;
}

// Gemiddeld totaal per model over alle rollen → overall-ranglijst.
function overallRanking(results: ScoredResult[]): { label: string; avg: number }[] {
  const sums = new Map<string, { label: string; sum: number; n: number }>();
  for (const r of results) {
    const cur = sums.get(r.modelId) ?? { label: r.modelLabel, sum: 0, n: 0 };
    cur.sum += r.total;
    cur.n += 1;
    sums.set(r.modelId, cur);
  }
  return [...sums.values()]
    .map((s) => ({ label: s.label, avg: s.sum / s.n }))
    .sort((a, b) => b.avg - a.avg);
}

export interface ReportMeta {
  generatedAt: string;
  judgeModel: string;
  weights: BenchConfig["weights"];
  demo: boolean;
}

export function buildMarkdown(results: ScoredResult[], meta: ReportMeta): string {
  const lines: string[] = [];
  lines.push(`# DreamTeam Benchmark — rapport`);
  lines.push("");
  if (meta.demo) {
    lines.push(
      `> ⚠️ **DEMO / synthetische data.** Dit rapport is gegenereerd zonder echte API-calls, met verzonnen scores om het format te tonen. Niet gebruiken voor model-keuze.`
    );
    lines.push("");
  }
  lines.push(`- Gegenereerd: ${meta.generatedAt}`);
  lines.push(`- Jury-model: \`${meta.judgeModel}\``);
  lines.push(
    `- Weging: kwaliteit ${meta.weights.quality} · kosten ${meta.weights.cost} · latency ${meta.weights.latency}`
  );
  lines.push("");

  const grouped = byRole(results);
  for (const [role, rows] of grouped) {
    lines.push(`## Rol: ${role}`);
    lines.push("");
    lines.push("| Model | Kwaliteit (0-10) | Kosten | Latency (ms) | Totaal (0-1) |");
    lines.push("|---|---:|---:|---:|---:|");
    for (const r of rows) {
      const q = r.error ? "—" : r.judge.overall.toFixed(1);
      const c = r.error ? "—" : fmtUsd(r.costUsd);
      const l = r.error ? "—" : String(r.latencyMs);
      const flag = r.error ? " ❌" : "";
      lines.push(
        `| ${r.modelLabel}${flag} | ${q} | ${c} | ${l} | ${r.total.toFixed(3)} |`
      );
    }
    const winner = rows.find((r) => !r.error);
    if (winner) lines.push("");
    if (winner) lines.push(`**Winnaar ${role}:** ${winner.modelLabel} (totaal ${winner.total.toFixed(3)})`);
    lines.push("");
  }

  lines.push(`## Overall-ranglijst (gemiddeld totaal over alle rollen)`);
  lines.push("");
  lines.push("| # | Model | Gemiddeld totaal |");
  lines.push("|---:|---|---:|");
  overallRanking(results).forEach((m, i) => {
    lines.push(`| ${i + 1} | ${m.label} | ${m.avg.toFixed(3)} |`);
  });
  lines.push("");

  return lines.join("\n");
}

export function buildHtml(markdownTables: ScoredResult[], meta: ReportMeta): string {
  const grouped = byRole(markdownTables);
  const demoBanner = meta.demo
    ? `<div class="warn">⚠️ DEMO / synthetische data — gegenereerd zonder echte API-calls. Niet voor model-keuze.</div>`
    : "";

  const roleSections = [...grouped.entries()]
    .map(([role, rows]) => {
      const trs = rows
        .map((r) => {
          const q = r.error ? "—" : r.judge.overall.toFixed(1);
          const c = r.error ? "—" : fmtUsd(r.costUsd);
          const l = r.error ? "—" : String(r.latencyMs);
          const cls = r === rows[0] && !r.error ? ' class="win"' : "";
          const label = escapeHtml(r.modelLabel) + (r.error ? " ❌" : "");
          return `<tr${cls}><td>${label}</td><td>${q}</td><td>${c}</td><td>${l}</td><td>${r.total.toFixed(
            3
          )}</td></tr>`;
        })
        .join("");
      return `<section><h2>Rol: ${escapeHtml(role)}</h2>
<table><thead><tr><th>Model</th><th>Kwaliteit</th><th>Kosten</th><th>Latency (ms)</th><th>Totaal</th></tr></thead>
<tbody>${trs}</tbody></table></section>`;
    })
    .join("\n");

  const ranking = overallRanking(markdownTables)
    .map((m, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(m.label)}</td><td>${m.avg.toFixed(3)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DreamTeam Benchmark — rapport</title>
<style>
  :root { --bg:#0f1116; --card:#181b22; --line:#2a2f3a; --text:#e6e8ec; --muted:#9aa3b2; --win:#1f3a2e; --accent:#5ad19a; }
  body { background:var(--bg); color:var(--text); font:15px/1.5 system-ui,sans-serif; margin:0; padding:2rem; }
  h1 { margin:0 0 .25rem; } .meta { color:var(--muted); margin-bottom:1.5rem; }
  .warn { background:#3a2a14; border:1px solid #6b4d1f; padding:.75rem 1rem; border-radius:8px; margin-bottom:1.5rem; }
  section { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:1rem 1.25rem; margin-bottom:1.25rem; }
  table { width:100%; border-collapse:collapse; }
  th,td { text-align:right; padding:.45rem .6rem; border-bottom:1px solid var(--line); }
  th:first-child,td:first-child { text-align:left; }
  tr.win td { background:var(--win); }
  tr.win td:first-child::after { content:" 🏆"; }
  caption { text-align:left; color:var(--muted); }
</style></head>
<body>
<h1>DreamTeam Benchmark</h1>
<div class="meta">Gegenereerd ${escapeHtml(meta.generatedAt)} · jury <code>${escapeHtml(
    meta.judgeModel
  )}</code> · weging kwaliteit ${meta.weights.quality} / kosten ${meta.weights.cost} / latency ${meta.weights.latency}</div>
${demoBanner}
${roleSections}
<section><h2>Overall-ranglijst</h2>
<table><thead><tr><th>#</th><th>Model</th><th>Gemiddeld totaal</th></tr></thead><tbody>${ranking}</tbody></table></section>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export function writeReport(results: ScoredResult[], meta: ReportMeta): { md: string; html: string } {
  const outDir = path.join(ROOT, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const md = path.join(outDir, meta.demo ? "report.demo.md" : "report.md");
  const html = path.join(outDir, meta.demo ? "report.demo.html" : "report.html");
  fs.writeFileSync(md, buildMarkdown(results, meta), "utf8");
  fs.writeFileSync(html, buildHtml(results, meta), "utf8");
  return { md, html };
}
