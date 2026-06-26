import type { ArmRunResult, Bench8Task } from "./types";

const QUALITY_OK = 6; // drempel 'voltooide taak': jury-overall >= 6/10

export interface Agg {
  taskId: string;
  domain: string;
  title: string;
  armKey: string;
  armLabel: string;
  n: number;
  nOk: number;
  nCompleted: number;
  meanQuality: number;
  objPassRate: number | null;
  meanCostUsd: number;
  costPerCompleted: number | null;
  meanLatencyMs: number;
  orchTokensTotal: number;
  retriesTotal: number;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function aggregate(results: ArmRunResult[], tasks: Bench8Task[]): Agg[] {
  const titleById = new Map(tasks.map((t) => [t.id, t.title]));
  const groups = new Map<string, ArmRunResult[]>();
  for (const r of results) {
    const key = `${r.taskId}::${r.armKey}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  const aggs: Agg[] = [];
  for (const [, rs] of groups) {
    const ok = rs.filter((r) => !r.error && r.output);
    const completed = ok.filter((r) => r.quality >= QUALITY_OK && r.objectivePass !== false);
    const withObj = rs.filter((r) => typeof r.objectivePass === "boolean");
    const totalCost = rs.reduce((a, r) => a + r.costUsd, 0);
    const orch = rs.reduce((a, r) => a + Object.values(r.extra.orchestrationFields).reduce((x, y) => x + y, 0), 0);
    aggs.push({
      taskId: rs[0].taskId,
      domain: rs[0].domain,
      title: titleById.get(rs[0].taskId) ?? rs[0].taskId,
      armKey: rs[0].armKey,
      armLabel: rs[0].armLabel,
      n: rs.length,
      nOk: ok.length,
      nCompleted: completed.length,
      meanQuality: Math.round(mean(ok.map((r) => r.quality)) * 10) / 10,
      objPassRate: withObj.length ? withObj.filter((r) => r.objectivePass).length / withObj.length : null,
      meanCostUsd: mean(ok.map((r) => r.costUsd)),
      costPerCompleted: completed.length ? totalCost / completed.length : null,
      meanLatencyMs: Math.round(mean(ok.map((r) => r.latencyMs))),
      orchTokensTotal: orch,
      retriesTotal: rs.reduce((a, r) => a + r.retries, 0),
    });
  }
  return aggs;
}

function fmtUsd(n: number | null): string {
  if (n === null) return "—";
  return "$" + n.toFixed(4);
}
function fmtPct(n: number | null): string {
  return n === null ? "—" : Math.round(n * 100) + "%";
}

const ARM_ORDER = ["A", "B", "C"];

export function buildScorecard(
  aggs: Agg[],
  meta: { generatedAt: string; judgeModel: string; live: boolean; notes: string[] }
): string {
  const tasks = [...new Set(aggs.map((a) => a.taskId))];
  const lines: string[] = [];
  lines.push(`# DreamTeam Fugu-benchmark — Scorecard (3 armen)`);
  lines.push("");
  lines.push(`- Gegenereerd: ${meta.generatedAt}`);
  lines.push(`- Modus: ${meta.live ? "LIVE (echte API-calls)" : "DROOG (nog geen live data — alleen plan/raming)"}`);
  lines.push(`- Rechter (jury): \`${meta.judgeModel}\` via OpenRouter`);
  lines.push(`- Armen: A=Eigen stack (dispatch) · B=Sakana Fugu-Ultra (huur) · C=OpenFugu (zelf, lokaal)`);
  lines.push("");

  if (!meta.live) {
    lines.push(`> **Nog geen live cijfers.** Onder staat het run-plan + kostenraming. Geen verzonnen scores.`);
    lines.push("");
  }

  // Per-taak tabel
  lines.push(`## Per taak — kwaliteit, kosten-per-voltooide-taak, winnaar`);
  lines.push("");
  lines.push(`| Taak | Domein | Arm | Kwaliteit (0-10) | Obj-check | Kosten/voltooid | Voltooid | Latency | Orkestratie-tok | Retries |`);
  lines.push(`|---|---|---|---|---|---|---|---|---|---|`);
  for (const tid of tasks) {
    const rows = aggs.filter((a) => a.taskId === tid).sort((x, y) => ARM_ORDER.indexOf(x.armKey) - ARM_ORDER.indexOf(y.armKey));
    const winner = [...rows].filter((r) => r.nOk > 0).sort((x, y) => y.meanQuality - x.meanQuality || (x.costPerCompleted ?? Infinity) - (y.costPerCompleted ?? Infinity))[0];
    for (const r of rows) {
      const star = winner && r.armKey === winner.armKey ? " ⭐" : "";
      lines.push(`| ${r.title} | ${r.domain} | ${r.armKey}${star} | ${r.nOk ? r.meanQuality : "—"} | ${fmtPct(r.objPassRate)} | ${fmtUsd(r.costPerCompleted)} | ${r.nCompleted}/${r.n} | ${r.meanLatencyMs || "—"}ms | ${r.orchTokensTotal || 0} | ${r.retriesTotal} |`);
    }
  }
  lines.push("");

  // Per-arm samenvatting
  lines.push(`## Per arm — totaal`);
  lines.push("");
  lines.push(`| Arm | Gem. kwaliteit | Voltooid | Totale kosten | Gem. kosten/voltooid |`);
  lines.push(`|---|---|---|---|---|`);
  for (const k of ARM_ORDER) {
    const rows = aggs.filter((a) => a.armKey === k);
    if (!rows.length) continue;
    const okRows = rows.filter((r) => r.nOk > 0);
    const totalCost = rows.reduce((a, r) => a + r.meanCostUsd * r.nOk, 0);
    const completed = rows.reduce((a, r) => a + r.nCompleted, 0);
    const totalRuns = rows.reduce((a, r) => a + r.n, 0);
    const q = okRows.length ? Math.round((okRows.reduce((a, r) => a + r.meanQuality, 0) / okRows.length) * 10) / 10 : 0;
    lines.push(`| ${k} (${rows[0].armLabel}) | ${q || "—"} | ${completed}/${totalRuns} | ${fmtUsd(totalCost)} | ${completed ? fmtUsd(totalCost / completed) : "—"} |`);
  }
  lines.push("");

  // Steady-state projectie (Lexxy dagelijks)
  lines.push(`## Steady-state — dagelijkse Lexxy-niche (research-synth, 365×/jaar)`);
  lines.push("");
  const rs = aggs.filter((a) => a.domain === "research-synth");
  if (rs.some((r) => r.nOk > 0)) {
    lines.push(`| Arm | Kosten/voltooid | × 365 dagen |`);
    lines.push(`|---|---|---|`);
    for (const k of ARM_ORDER) {
      const r = rs.find((x) => x.armKey === k);
      if (!r) continue;
      const per = r.costPerCompleted;
      lines.push(`| ${k} | ${fmtUsd(per)} | ${per === null ? "—" : "$" + (per * 365).toFixed(2)} |`);
    }
  } else {
    lines.push(`_Vul na de live run; nu geen data._`);
  }
  lines.push("");

  // Conclusie
  lines.push(`## Conclusie: build / buy-Sakana / own-OpenFugu / hybride`);
  lines.push("");
  if (meta.live) {
    lines.push(_concludeText(aggs));
  } else {
    lines.push(`_Volgt na de live run. De aanbeveling wordt afgeleid uit kwaliteit × kosten-per-voltooide-taak per arm, niet gegokt._`);
  }
  lines.push("");

  if (meta.notes.length) {
    lines.push(`## Bevindingen & aannames (expliciet)`);
    lines.push("");
    for (const n of meta.notes) lines.push(`- ${n}`);
    lines.push("");
  }
  return lines.join("\n");
}

function _concludeText(aggs: Agg[]): string {
  const byArm = (k: string) => aggs.filter((a) => a.armKey === k && a.nOk > 0);
  const armQ = (k: string) => {
    const r = byArm(k);
    return r.length ? r.reduce((a, x) => a + x.meanQuality, 0) / r.length : 0;
  };
  const armCostPer = (k: string) => {
    const r = aggs.filter((a) => a.armKey === k && a.costPerCompleted !== null);
    return r.length ? r.reduce((a, x) => a + (x.costPerCompleted ?? 0), 0) / r.length : Infinity;
  };
  const qA = armQ("A"), qB = armQ("B"), qC = armQ("C");
  const cA = armCostPer("A"), cB = armCostPer("B"), cC = armCostPer("C");
  const best = [["A", qA, cA], ["B", qB, cB], ["C", qC, cC]] as [string, number, number][];
  best.sort((x, y) => y[1] - x[1] || x[2] - y[2]);
  const topQ = best[0];
  const cheapest = [...best].sort((x, y) => x[2] - y[2])[0];
  return [
    `Op deze 8 taken: hoogste gemiddelde kwaliteit = arm **${topQ[0]}** (${topQ[1].toFixed(1)}/10).`,
    `Laagste kosten-per-voltooide-taak = arm **${cheapest[0]}** (${isFinite(cheapest[2]) ? "$" + cheapest[2].toFixed(4) : "—"}).`,
    topQ[0] === cheapest[0]
      ? `Eén arm wint zowel kwaliteit als kosten → kies arm ${topQ[0]}.`
      : `Kwaliteit en kosten wijzen verschillende armen aan → **hybride**: arm ${cheapest[0]} voor goedkope/dagelijkse niches, arm ${topQ[0]} waar kwaliteit telt. Zie steady-state-tabel voor het jaarverschil.`,
  ].join(" ");
}
