// ─── Headroom — de context-compressielaag ──────────────────────────────────────
// Onderzoek → analyse → implementatie van headroomlabs-ai/headroom, toegepast op
// DreamTeam. Headroom comprimeert alles wat een agent LEEST voordat het de LLM
// bereikt (tool-output, logs, geheugen, historie) — content-bewust, lokaal en
// omkeerbaar — met hetzelfde antwoord voor een fractie van de tokens.
//
// In DreamTeam betalen twee paden tokens: de chat (gespreks-historie) en de loops
// (de STATE-ruggengraat die elke run als geheugen wordt meegestuurd). Deze module
// levert de kern-primitieven van Headroom in het klein: een ContentRouter die het
// type herkent, content-bewuste compressors (JSON / tekst), een geheugen-compressor
// voor de loop-STATE, en een bespaar-teller die op het bestaande token-budget
// aansluit (governance). Geen semantiek gaat verloren: alleen ceremonie (whitespace,
// dubbele lege regels, JSON-opmaak) wordt weggehaald, en afgekapte historie wordt
// expliciet gemarkeerd (in de geest van Headrooms omkeerbare CCR).

// ~4 tekens per token — dezelfde vuistregel die de chat-route en de loop-engine
// al gebruiken, hier gedeeld zodat besparingen consistent worden gemeten.
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export type ContentType = "json" | "text";

// ── ContentRouter ──────────────────────────────────────────────────────────────
// Herkent het inhoudstype zodat de juiste compressor gekozen wordt. Bewust simpel:
// probeer als JSON te parsen, val anders terug op tekst.
export function detectContentType(input: string): ContentType {
  const trimmed = input.trim();
  if (!trimmed) return "text";
  const looksStructured =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (!looksStructured) return "text";
  try {
    JSON.parse(trimmed);
    return "json";
  } catch {
    return "text";
  }
}

// ── SmartCrusher-lite (JSON) ────────────────────────────────────────────────────
// Parse en her-serialiseer zonder opmaak-whitespace. Betekenis blijft identiek;
// alleen inspringing en spaties verdwijnen. Bij ongeldige JSON: ongewijzigd terug.
export function compressJson(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input));
  } catch {
    return input;
  }
}

// ── Tekst-compressor ─────────────────────────────────────────────────────────────
// Haalt ceremonie weg zonder inhoud te raken: trailing spaces, tabs → spatie,
// reeksen spaties → één, en drie-of-meer lege regels → maximaal één lege regel.
export function compressText(input: string): string {
  return input
    .replace(/[ \t]+\n/g, "\n") // trailing whitespace per regel
    .replace(/\t/g, " ") // tabs → spatie
    .replace(/ {2,}/g, " ") // meerdere spaties → één
    .replace(/\n{3,}/g, "\n\n") // ≥3 newlines → dubbele newline
    .trim();
}

// ── ContentRouter → compressor ──────────────────────────────────────────────────
export interface CompressionResult {
  text: string;
  type: ContentType;
  tokensBefore: number;
  tokensAfter: number;
  saved: number;
}

// Comprimeert één stuk content via het juiste pad en meet de besparing. Registreert
// de besparing in de globale teller tenzij `record: false` (handig voor pure tests).
export function compress(input: string, opts: { record?: boolean } = {}): CompressionResult {
  const type = detectContentType(input);
  const text = type === "json" ? compressJson(input) : compressText(input);
  const tokensBefore = estimateTokens(input);
  const tokensAfter = estimateTokens(text);
  const saved = Math.max(0, tokensBefore - tokensAfter);
  if (opts.record !== false) recordSavings(tokensBefore, tokensAfter);
  return { text, type, tokensBefore, tokensAfter, saved };
}

// ── Geheugen-compressor voor de loop-STATE ──────────────────────────────────────
// De STATE-ruggengraat is markdown met run-entries (nieuwste bovenaan, gescheiden
// door "## "-koppen). De oude aanpak kapte simpelweg op tekens af — dat verliest
// signaal willekeurig midden in een entry. Headroom-stijl: comprimeer eerst de
// ceremonie, en als het dan nog te lang is, laat de OUDSTE hele entries vallen en
// markeer expliciet hoeveel er is afgekapt (omkeerbaarheids-signaal, à la CCR).
export interface StateCompressionResult {
  text: string;
  tokensBefore: number;
  tokensAfter: number;
  saved: number;
  droppedEntries: number;
}

export function compressState(state: string, maxChars: number, opts: { record?: boolean } = {}): StateCompressionResult {
  const original = state ?? "";
  const tokensBefore = estimateTokens(original);

  // Stap 1 — ceremonie weghalen (verliest geen signaal).
  let text = compressText(original);

  // Stap 2 — indien nog te lang: splits op run-entries en houd de nieuwste die
  // binnen het budget passen. Entries staan nieuwste-eerst, dus we vullen van voren.
  let droppedEntries = 0;
  if (text.length > maxChars) {
    const parts = splitStateEntries(text);
    if (parts.length > 1) {
      const kept: string[] = [];
      let used = 0;
      for (const part of parts) {
        if (used + part.length > maxChars && kept.length > 0) break;
        kept.push(part);
        used += part.length;
      }
      droppedEntries = parts.length - kept.length;
      text = kept.join("\n").trim();
    }
    // Stap 3 — laatste redmiddel: als één enkele entry nog te groot is, hard afkappen.
    if (text.length > maxChars) {
      text = text.slice(0, maxChars).trim();
    }
    if (droppedEntries > 0 || original.length > text.length) {
      text += `\n\n…(${droppedEntries > 0 ? `${droppedEntries} oudere run(s) ` : ""}afgekapt door Headroom — oudere historie samengevouwen)`;
    }
  }

  const tokensAfter = estimateTokens(text);
  const saved = Math.max(0, tokensBefore - tokensAfter);
  if (opts.record !== false) recordSavings(tokensBefore, tokensAfter);
  return { text, tokensBefore, tokensAfter, saved, droppedEntries };
}

// Splitst de STATE in losse run-entries op de "## "-koppen, met de kop erbij.
export function splitStateEntries(state: string): string[] {
  const matches = Array.from(state.matchAll(/^## /gm));
  if (matches.length === 0) return [state.trim()].filter(Boolean);
  const parts: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? state.length) : state.length;
    const part = state.slice(start, end).trim();
    if (part) parts.push(part);
  }
  return parts;
}

// ── Bespaar-teller (governance-dashboard) ───────────────────────────────────────
// Cumulatieve besparing over chat én loops, in de geest van `headroom dashboard`.
// Sluit aan op het bestaande token-budget: elke bespaarde token is budget dat níet
// verbruikt wordt.
let totalBefore = 0;
let totalAfter = 0;
let compressions = 0;

export function recordSavings(tokensBefore: number, tokensAfter: number) {
  totalBefore += tokensBefore;
  totalAfter += tokensAfter;
  compressions += 1;
}

export function getHeadroomStats() {
  const saved = Math.max(0, totalBefore - totalAfter);
  const ratio = totalBefore > 0 ? saved / totalBefore : 0;
  return {
    compressions,
    tokensBefore: totalBefore,
    tokensAfter: totalAfter,
    tokensSaved: saved,
    savingsRatio: Math.round(ratio * 1000) / 1000, // 0–1, op 3 decimalen
    savingsPct: Math.round(ratio * 100),
  };
}

// Alleen voor tests: reset de teller naar nul.
export function resetHeadroomStats() {
  totalBefore = 0;
  totalAfter = 0;
  compressions = 0;
}
