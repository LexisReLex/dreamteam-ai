import * as fs from "fs";
import type { RoutingTable, RoutingModel, Resolution, Mode } from "./types";

// Eén adres: de routing-regels worden NIET gedupliceerd. We lezen ze live uit
// models-routing.json (default = de vault-locatie, pad configureerbaar via env/flag).
export const DEFAULT_ROUTING_PATH =
  "/Users/lex/Library/Mobile Documents/com~apple~CloudDocs/LXY-Vault/00-System/skills/model-router/models-routing.json";

export function loadRouting(routingPath: string): RoutingTable {
  if (!fs.existsSync(routingPath)) {
    throw new Error(
      `models-routing.json niet gevonden op:\n  ${routingPath}\n` +
        `Geef het juiste pad mee met --routing <pad> of env MODEL_ROUTING_PATH. ` +
        `Geen routing verzonnen.`
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(routingPath, "utf8"));
  } catch (err) {
    throw new Error(
      `models-routing.json is geen geldige JSON (${routingPath}): ` +
        (err instanceof Error ? err.message : String(err))
    );
  }
  const obj = raw as Partial<RoutingTable>;
  if (!obj || typeof obj !== "object" || !obj.models || !obj.seats) {
    throw new Error(
      `models-routing.json mist verplichte velden "models" en/of "seats" (${routingPath}).`
    );
  }
  // Prijsvalidatie: niets gokken — elk model moet een echte prijs + tier hebben.
  for (const [slug, m] of Object.entries(obj.models)) {
    if (
      typeof m.promptPer1M !== "number" ||
      typeof m.completionPer1M !== "number" ||
      (m.tier !== "cheap" && m.tier !== "premium")
    ) {
      throw new Error(
        `Model "${slug}" in routing-JSON mist geldige prijs (promptPer1M/completionPer1M) of tier (cheap/premium).`
      );
    }
  }
  return {
    version: obj.version ?? 0,
    models: obj.models,
    seats: obj.seats,
    excluded: obj.excluded,
    path: routingPath,
  };
}

function lookupModel(table: RoutingTable, modelId: string): RoutingModel {
  const m = table.models[modelId];
  if (!m) {
    if (table.excluded && table.excluded[modelId]) {
      throw new Error(
        `Model "${modelId}" staat op de uitsluitlijst: ${table.excluded[modelId]}`
      );
    }
    throw new Error(
      `Model "${modelId}" niet bekend in routing-JSON — geen prijs beschikbaar, dus niet routeren. ` +
        `Bekende modellen: ${Object.keys(table.models).join(", ")}`
    );
  }
  return m;
}

// Expliciet model (--model) omzeilt de seat-keuze, maar moet wel een prijs hebben.
export function resolveExplicit(table: RoutingTable, modelId: string): Resolution {
  const model = lookupModel(table, modelId);
  return {
    modelId,
    model,
    mode: "default",
    source: "explicit",
    reason: `Expliciet model gekozen (--model ${modelId}); seat-keuze overgeslagen.`,
  };
}

// Kies model uit seat + mode volgens models-routing.json.
//  - copywriter/klantenservice: default (premium) tenzij mode=draft → draft (cheap).
//  - research: default (cheap) tenzij mode=quality → fallback (premium).
export function resolveSeat(table: RoutingTable, seatName: string, mode: Mode): Resolution {
  const seat = table.seats[seatName];
  if (!seat) {
    throw new Error(
      `Onbekende seat "${seatName}". Bekende seats: ${Object.keys(table.seats).join(", ")}. ` +
        `Geen routing verzonnen.`
    );
  }

  let modelId: string | undefined;
  let reason: string;

  if (mode === "draft") {
    modelId = seat.draft;
    reason = `Seat ${seatName}, mode draft → draft-model (${modelId}).`;
    if (!modelId) {
      throw new Error(`Seat "${seatName}" heeft geen "draft"-model in de routing-JSON.`);
    }
  } else if (mode === "quality") {
    // quality = bewust naar de kwaliteit-fallback (bv. research → GPT-5.5)
    modelId = seat.fallback ?? seat.default_alt;
    reason = `Seat ${seatName}, mode quality → fallback-model (${modelId}).`;
    if (!modelId) {
      throw new Error(
        `Seat "${seatName}" heeft geen "fallback" (of "default_alt") voor mode quality.`
      );
    }
  } else {
    modelId = seat.default;
    reason = `Seat ${seatName}, mode default → default-model (${modelId}).`;
    if (!modelId) {
      throw new Error(`Seat "${seatName}" heeft geen "default"-model in de routing-JSON.`);
    }
  }

  const model = lookupModel(table, modelId);
  return { modelId, model, seat: seatName, mode, source: "seat", reason };
}
