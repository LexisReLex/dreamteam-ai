// Types voor de dispatch-laag (fase 2). Leunt op de prijs-/usage-vorm van de benchmark-harnas.

export type Tier = "cheap" | "premium";

// Eén model-regel zoals in models-routing.json onder "models".
export interface RoutingModel {
  label: string;
  promptPer1M: number;
  completionPer1M: number;
  tier: Tier;
}

// Eén stoel zoals in models-routing.json onder "seats".
export interface RoutingSeat {
  strategy?: string;
  default: string;
  default_alt?: string;
  draft?: string;
  fallback?: string;
  gate?: Record<string, string>;
  reden?: string;
}

// De relevante velden uit models-routing.json (de leidende bron, één adres).
export interface RoutingTable {
  version: number;
  models: Record<string, RoutingModel>;
  seats: Record<string, RoutingSeat>;
  excluded?: Record<string, string>;
  path: string; // waar we 'm vandaan lazen — voor transparantie in output/log
}

export type Mode = "default" | "draft" | "quality";

// Het resultaat van de modelkeuze: welk model, waarom, welk licht.
export interface Resolution {
  modelId: string;
  model: RoutingModel;
  seat?: string;
  mode: Mode;
  source: "seat" | "explicit"; // seat+mode-keuze of expliciete --model
  reason: string;
}

// Het delegatie-contract (Hamer 1), gevouwen vóór de taak.
export interface Contract {
  doel?: string;
  grenzen?: string;
  teruggave?: string;
  budgetTokens?: number; // uit BUDGET, indien een tokenwaarde te lezen is
  raw?: string;          // de oorspronkelijke contract-tekst, indien aanwezig
}

// Wat één taak-input voorstelt vóór dispatch.
export interface DispatchTask {
  id: string;          // taak-id (uit bestandsnaam of meegegeven label)
  path?: string;       // bronpad indien uit bestand
  prompt: string;      // de feitelijke taaktekst (zonder contract-systeemblok)
  contract: Contract;
  systemBlock: string; // contract gevouwen als systeem-/instructieblok
}

// Kostenraming vóór de call (bovengrens: completion = maxTokens).
export interface Estimate {
  estPromptTokens: number;
  estCompletionTokens: number;
  estCostUsd: number;
}

// Eén dispatch-uitkomst (echt uitgevoerd of dry-run).
export interface DispatchOutcome {
  timestamp: string;
  taskId: string;
  taskPath?: string;
  seat?: string;
  mode: Mode;
  modelId: string;
  modelLabel: string;
  tier: Tier;
  gate: "auto" | "oranje";
  estimate: Estimate;
  executed: boolean;       // false bij dry-run of gestopt oranje licht
  blockedReason?: string;  // bv. "premium zonder --yes"
  output?: string;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;        // ECHTE kosten uit API-usage
  error?: string;
}

export interface DispatchConfig {
  routingPath: string;
  maxTokens: number;
  temperature: number;
  concurrency: number;
  oranjeThresholdUsd: number;
}
