import * as fs from "fs";
import * as path from "path";
import type { DispatchConfig } from "./types";
import { DEFAULT_ROUTING_PATH } from "./routing";

const ROOT = path.resolve(__dirname, "..", "..");

interface RawDispatchConfig {
  routingPath?: string;
  maxTokens?: number;
  temperature?: number;
  concurrency?: number;
  oranjeThresholdUsd?: number;
}

// Laadt dispatch.config.json (optioneel) en past env-overrides toe.
// CLI-flags worden ná dit punt overheen gelegd in cli.ts.
export function loadDispatchConfig(): DispatchConfig {
  const file = path.join(ROOT, "dispatch.config.json");
  let raw: RawDispatchConfig = {};
  if (fs.existsSync(file)) {
    raw = JSON.parse(fs.readFileSync(file, "utf8")) as RawDispatchConfig;
  }

  const routingPath =
    process.env.MODEL_ROUTING_PATH ||
    (raw.routingPath && raw.routingPath.trim()) ||
    DEFAULT_ROUTING_PATH;

  return {
    routingPath,
    maxTokens: raw.maxTokens ?? 1200,
    temperature: raw.temperature ?? 0.2,
    concurrency: raw.concurrency ?? 4,
    oranjeThresholdUsd: raw.oranjeThresholdUsd ?? 0.25,
  };
}

export { ROOT };
