import * as fs from "fs";
import * as path from "path";
import type { DispatchOutcome } from "./types";
import { ROOT } from "./config";

const OUT_DIR = path.join(ROOT, "out", "dispatch");
const LOG_FILE = path.join(OUT_DIR, "log.jsonl");

function ensureDir(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Bestandsveilige timestamp: 2026-06-20T14:03:55.123Z → 2026-06-20T14-03-55-123Z
function stamp(ts: string): string {
  return ts.replace(/[:.]/g, "-");
}

// Schrijf het resultaat in het gevraagde TERUGGAVE-format naar out/dispatch/<ts>-<seat>.md.
// Alleen bij een echt uitgevoerde call (dry-run/geblokkeerd levert geen resultaatbestand).
export function writeResultFile(o: DispatchOutcome): string | undefined {
  if (!o.executed || o.error) return undefined;
  ensureDir();
  const seat = o.seat ?? "model";
  const file = path.join(OUT_DIR, `${stamp(o.timestamp)}-${seat}.md`);
  const header = [
    `# Dispatch-resultaat — ${seat} / ${o.modelLabel}`,
    "",
    `- **Taak:** ${o.taskId}${o.taskPath ? ` (\`${o.taskPath}\`)` : ""}`,
    `- **Model:** \`${o.modelId}\` (${o.tier})`,
    `- **Mode:** ${o.mode} · **Gate:** ${o.gate}`,
    `- **Tokens:** ${o.promptTokens} in / ${o.completionTokens} out · **Latency:** ${o.latencyMs} ms`,
    `- **Echte kosten:** $${(o.costUsd ?? 0).toFixed(6)}`,
    `- **Tijd:** ${o.timestamp}`,
    "",
    "---",
    "",
  ].join("\n");
  fs.writeFileSync(file, header + (o.output ?? "") + "\n", "utf8");
  return file;
}

// Eén regel per dispatch naar de doorlopende kostenverantwoording (fase 3 leest dit uit).
export function appendLog(o: DispatchOutcome): string {
  ensureDir();
  const row = {
    timestamp: o.timestamp,
    taskId: o.taskId,
    taskPath: o.taskPath ?? null,
    seat: o.seat ?? null,
    mode: o.mode,
    model: o.modelId,
    tier: o.tier,
    gate: o.gate,
    executed: o.executed,
    blockedReason: o.blockedReason ?? null,
    estCostUsd: Number(o.estimate.estCostUsd.toFixed(6)),
    promptTokens: o.promptTokens ?? null,
    completionTokens: o.completionTokens ?? null,
    latencyMs: o.latencyMs ?? null,
    costUsd: o.costUsd != null ? Number(o.costUsd.toFixed(6)) : null,
    error: o.error ?? null,
  };
  fs.appendFileSync(LOG_FILE, JSON.stringify(row) + "\n", "utf8");
  return LOG_FILE;
}

export { OUT_DIR, LOG_FILE };
