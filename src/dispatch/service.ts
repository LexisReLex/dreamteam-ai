import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { makeClient } from "../openrouter";
import { loadDispatchConfig } from "./config";
import { loadRouting, resolveSeat, resolveExplicit } from "./routing";
import { parseContract, buildSystemBlock } from "./contract";
import { applyVoice } from "./voice";
import { estimate, decideGate, dispatchOne } from "./core";
import { writeResultFile, appendLog } from "./output";
import { evalOutcome, defaultEvalConfig, type EvalConfig } from "./eval";
import { newTraceId } from "./span";
import type {
  DispatchConfig,
  DispatchTask,
  DispatchOutcome,
  Mode,
  Resolution,
  RoutingTable,
} from "./types";

dotenv.config();

// Eén bron van logica: zowel de CLI (cli.ts) als de MCP-server (mcp/server.ts)
// roepen deze functies aan. De dispatch-core wordt niet gedupliceerd.

export interface ConfigOverrides {
  routingPath?: string;
  maxTokens?: number;
  threshold?: number;
  concurrency?: number;
}

export function buildConfig(o: ConfigOverrides = {}): DispatchConfig {
  const cfg = loadDispatchConfig();
  if (o.routingPath) cfg.routingPath = o.routingPath;
  if (o.maxTokens) cfg.maxTokens = o.maxTokens;
  if (o.threshold != null) cfg.oranjeThresholdUsd = o.threshold;
  if (o.concurrency) cfg.concurrency = o.concurrency;
  return cfg;
}

// Laad één taak: bestandspad (.json benchmark-formaat of .md/.txt vrije tekst) of inline string.
export function loadTask(input: string): DispatchTask {
  const isFile = fs.existsSync(input) && fs.statSync(input).isFile();
  if (isFile) {
    const text = fs.readFileSync(input, "utf8");
    const id = path.basename(input).replace(/\.(md|json|txt)$/i, "");
    if (input.toLowerCase().endsWith(".json")) {
      // Benchmark-taakformaat: { id, prompt, ... }. Rubric NIET meesturen (anti-gaming).
      const obj = JSON.parse(text) as { id?: string; prompt?: string };
      if (!obj.prompt) throw new Error(`Taakbestand ${input} mist veld "prompt".`);
      const { contract } = parseContract(obj.prompt);
      return {
        id: obj.id ?? id,
        path: input,
        prompt: obj.prompt,
        contract,
        systemBlock: buildSystemBlock(contract),
      };
    }
    const { contract, prompt } = parseContract(text);
    return { id, path: input, prompt, contract, systemBlock: buildSystemBlock(contract) };
  }
  // Inline string
  const { contract, prompt } = parseContract(input);
  return { id: "inline", prompt, contract, systemBlock: buildSystemBlock(contract) };
}

export interface ResolveParams {
  seat?: string;
  model?: string;
  mode?: Mode;
}

export function resolveModel(table: RoutingTable, p: ResolveParams): Resolution {
  if (p.model) {
    const res = resolveExplicit(table, p.model);
    if (p.seat) res.seat = p.seat; // label behouden voor log/bestandsnaam
    return res;
  }
  if (!p.seat) {
    throw new Error("Geef een seat (copywriter|klantenservice|research) of een expliciet model.");
  }
  return resolveSeat(table, p.seat, p.mode ?? "default");
}

export interface DispatchIOResult {
  outcome: DispatchOutcome;
  resultFile?: string;
  logFile: string;
}

// Voert één taak uit (of raamt/stopt) en schrijft resultaat + logregel. Gedeeld door CLI en MCP.
// De online-eval-hook draait NÁ de call en VÓÓR appendLog, zodat eval_score/eval_pass op
// dezelfde span-regel belanden. Cheap judge = auto; geen extra oranje licht.
export async function dispatchTaskWithIO(
  client: ReturnType<typeof makeClient> | null,
  res: Resolution,
  task: DispatchTask,
  cfg: DispatchConfig,
  opts: { dryRun: boolean; yes: boolean; traceId?: string; evalCfg?: EvalConfig }
): Promise<DispatchIOResult> {
  const outcome = await dispatchOne(
    client as ReturnType<typeof makeClient>,
    res,
    task,
    cfg,
    { dryRun: opts.dryRun, yes: opts.yes, traceId: opts.traceId }
  );
  // Online-eval: alleen bij een echte call met output en een levende client.
  const evalCfg = opts.evalCfg ?? defaultEvalConfig();
  const span =
    client && evalCfg.enabled && outcome.executed && outcome.output && !outcome.error
      ? await evalOutcome(client, outcome, task, evalCfg)
      : null;
  const enriched = span ? { ...outcome, eval: span } : outcome;
  const resultFile = writeResultFile(enriched);
  const logFile = appendLog(enriched);
  return { outcome: enriched, resultFile, logFile };
}

export interface RunOneParams extends ResolveParams, ConfigOverrides {
  task: string;
  voice?: string;
  confirmPremium?: boolean;
  dryRun?: boolean;
  traceId?: string;
  evalCfg?: EvalConfig;
}

// Volledige enkelvoudige dispatch — gebruikt door de MCP-tools dispatch_run en dispatch_estimate.
export async function runOne(p: RunOneParams): Promise<DispatchIOResult> {
  const cfg = buildConfig(p);
  const table = loadRouting(cfg.routingPath);
  const res = resolveModel(table, p);
  const task = applyVoice(loadTask(p.task), p.voice);
  const dryRun = p.dryRun === true;
  const client = dryRun ? null : makeClient();
  return dispatchTaskWithIO(client, res, task, cfg, {
    dryRun,
    yes: p.confirmPremium === true,
    traceId: p.traceId ?? newTraceId(),
    evalCfg: p.evalCfg ?? defaultEvalConfig(),
  });
}

export interface SeatInfo {
  seat: string;
  strategy?: string;
  modes: Array<{
    mode: Mode;
    modelId: string;
    modelLabel: string;
    tier: string;
    gate: "auto" | "oranje";
    estThresholdUsd: number;
  }>;
}

// Geeft de huidige seats + gekozen modellen + gates terug, live uit de routing-JSON.
export function listSeats(overrides: ConfigOverrides = {}): {
  routingPath: string;
  version: number;
  thresholdUsd: number;
  seats: SeatInfo[];
} {
  const cfg = buildConfig(overrides);
  const table = loadRouting(cfg.routingPath);
  const seats: SeatInfo[] = [];

  for (const [seatName, seatDef] of Object.entries(table.seats)) {
    const modes: Mode[] = ["default", "draft", "quality"];
    const rows: SeatInfo["modes"] = [];
    for (const mode of modes) {
      let res: Resolution;
      try {
        res = resolveSeat(table, seatName, mode);
      } catch {
        continue; // deze stoel kent deze mode niet (bv. geen draft) → overslaan
      }
      // Gate-bepaling zonder taak: gebruik tier + drempel (de echte kosten kennen we pas met een taak).
      const gate = decideGate(
        res,
        { estPromptTokens: 0, estCompletionTokens: 0, estCostUsd: 0 },
        cfg
      ).gate;
      rows.push({
        mode,
        modelId: res.modelId,
        modelLabel: res.model.label,
        tier: res.model.tier,
        gate,
        estThresholdUsd: cfg.oranjeThresholdUsd,
      });
    }
    seats.push({ seat: seatName, strategy: seatDef.strategy, modes: rows });
  }

  return {
    routingPath: table.path,
    version: table.version,
    thresholdUsd: cfg.oranjeThresholdUsd,
    seats,
  };
}

// Raming zonder call — handig voor MCP dispatch_estimate's tekstweergave.
export function estimateText(p: RunOneParams): {
  res: Resolution;
  task: DispatchTask;
  estimate: ReturnType<typeof estimate>["estimate"];
  gate: "auto" | "oranje";
} {
  const cfg = buildConfig(p);
  const table = loadRouting(cfg.routingPath);
  const res = resolveModel(table, p);
  const task = applyVoice(loadTask(p.task), p.voice);
  const { estimate: est } = estimate(res, task, cfg);
  const gate = decideGate(res, est, cfg).gate;
  return { res, task, estimate: est, gate };
}
