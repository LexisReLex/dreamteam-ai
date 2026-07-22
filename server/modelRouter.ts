// ─── Model-router (keyless beslislaag) ────────────────────────────────────────
//
// Bouwt voort op de gratis-provider-catalogus (shared/freeLlmProviders.ts).
// De catalogus is data; deze laag maakt er een *beslissing* van: welke provider
// en welk model passen bij het soort werk dat een DreamTeam-agent doet?
//
// Bewust keyless en ADVISEREND: dit verandert het live LLM-pad (server/ai.ts)
// niet en roept geen provider aan. Het is beslissingsondersteuning die later de
// echte, key-gated routing kan aansturen.
//
// Eerlijk over de grenzen (zoals seo.ts): de aanbevelingen zijn TRANSPARANTE
// HEURISTIEK op basis van *gepubliceerde* modeleigenschappen (grootte, snelheid,
// gratis limieten uit de catalogus) — GEEN benchmarks. Waar de inzet hoog is,
// zegt de router eerlijk dat het betaalde standaardmodel (Claude) vaak de juiste
// keuze blijft. Dat is het oranje-licht-principe: goedkoop waar het kan, premium
// waar het moet.

import { getProviderById, type LlmProvider } from "@shared/freeLlmProviders";

/** Het huidige betaalde standaardmodel (zie server/ai.ts / routes.ts). */
export const PAID_DEFAULT = { provider: "Anthropic", model: "claude-haiku-4-5" } as const;

export type TaskProfileKey =
  | "creatief-schrijven"
  | "hoog-volume-support"
  | "analyse-lange-context"
  | "hoge-inzet-redeneren"
  | "algemeen";

export interface TaskProfile {
  key: TaskProfileKey;
  label: string;
  /** Wat dit werk vooral vraagt — puur ter uitleg in de UI. */
  needs: string;
}

export const TASK_PROFILES: Record<TaskProfileKey, TaskProfile> = {
  "creatief-schrijven": {
    key: "creatief-schrijven",
    label: "Creatief schrijven",
    needs: "Kwaliteit en toon belangrijker dan snelheid; gemiddeld volume.",
  },
  "hoog-volume-support": {
    key: "hoog-volume-support",
    label: "Hoog-volume conversationeel",
    needs: "Veel korte gesprekken; snelheid en dag-limiet tellen zwaar.",
  },
  "analyse-lange-context": {
    key: "analyse-lange-context",
    label: "Analyse & lange context",
    needs: "Grote invoer verwerken; veel tokens/minuut nodig.",
  },
  "hoge-inzet-redeneren": {
    key: "hoge-inzet-redeneren",
    label: "Hoge inzet & redeneren",
    needs: "Fouten zijn duur (financieel/strategisch/juridisch); kwaliteit boven kosten.",
  },
  algemeen: {
    key: "algemeen",
    label: "Algemeen",
    needs: "Gemengd werk zonder uitgesproken eis.",
  },
};

/**
 * Leidt een taakprofiel af uit rol + categorie van een agent. Deterministisch en
 * testbaar; kijkt eerst naar rol-trefwoorden, dan naar categorie.
 */
export function profileForAgent(agent: { role?: string; category?: string }): TaskProfileKey {
  const role = (agent.role || "").toLowerCase();
  const cat = (agent.category || "").toLowerCase();

  if (/financ|strateg|advies|juridisch/.test(role)) return "hoge-inzet-redeneren";
  if (cat === "finance" || cat === "strategy") return "hoge-inzet-redeneren";
  if (/seo|data|analist|analytics/.test(role)) return "analyse-lange-context";
  if (cat === "analytics") return "analyse-lange-context";
  if (/klantenservice|support|sales|coach/.test(role)) return "hoog-volume-support";
  if (cat === "support" || cat === "sales") return "hoog-volume-support";
  if (/content|marketing|social|creator|schrijver/.test(role)) return "creatief-schrijven";
  if (cat === "content" || cat === "marketing") return "creatief-schrijven";
  return "algemeen";
}

export interface Candidate {
  providerId: string;
  provider: string;
  model: string;
  tier: "gratis" | "proeftegoed";
  rationale: string;
}

export interface Recommendation {
  profile: TaskProfileKey;
  profileLabel: string;
  needs: string;
  primary: Candidate;
  alternatives: Candidate[];
  /** Wanneer je ondanks de gratis optie beter het betaalde standaardmodel kiest. */
  escalation: string;
}

// Kandidaten per profiel. Elke providerId verwijst naar een bestaande provider in
// de catalogus (bewaakt door de tests). De rationale is heuristiek, geen benchmark.
const CANDIDATES: Record<TaskProfileKey, Candidate[]> = {
  "creatief-schrijven": [
    { providerId: "google-ai-studio", provider: "Google AI Studio", model: "Gemini 2.5 Flash", tier: "gratis",
      rationale: "Sterk in vrije tekst met genereuze gratis token-limieten; goede toon voor marketing/content." },
    { providerId: "groq", provider: "Groq", model: "Llama 3.3 70B", tier: "gratis",
      rationale: "Groot open model, gratis en snel — prima voor concepten en varianten." },
    { providerId: "openrouter", provider: "OpenRouter", model: "Llama 3.3 70B Instruct (:free)", tier: "gratis",
      rationale: "Eén sleutel, veel modellen om toon te vergelijken; wel een krappe dag-limiet." },
  ],
  "hoog-volume-support": [
    { providerId: "groq", provider: "Groq", model: "Llama 3.1 8B", tier: "gratis",
      rationale: "Zeer snel en 14.400 requests/dag gratis — gemaakt voor veel korte support-gesprekken." },
    { providerId: "cerebras", provider: "Cerebras", model: "Llama 3.1 8B", tier: "gratis",
      rationale: "Extreem lage latency; goede tweede bron als Groq's dag-limiet op is." },
    { providerId: "google-ai-studio", provider: "Google AI Studio", model: "Gemini 2.5 Flash-Lite", tier: "gratis",
      rationale: "Snel en goedkoop-gratis; ruime tokens/minuut voor pieken." },
  ],
  "analyse-lange-context": [
    { providerId: "google-ai-studio", provider: "Google AI Studio", model: "Gemini 2.5 Flash", tier: "gratis",
      rationale: "250.000 tokens/minuut gratis — het beste gratis pad voor grote invoer (SEO-audits, datasets)." },
    { providerId: "openrouter", provider: "OpenRouter", model: "DeepSeek R1 (:free)", tier: "gratis",
      rationale: "Sterk redeneer-/analysemodel via één sleutel; let op dag-limiet." },
    { providerId: "cloudflare-workers-ai", provider: "Cloudflare Workers AI", model: "Qwen 2.5 Coder 32B", tier: "gratis",
      rationale: "Gratis neurons/dag; geschikt voor gestructureerde analyse en code." },
  ],
  "hoge-inzet-redeneren": [
    { providerId: "openrouter", provider: "OpenRouter", model: "DeepSeek R1 (:free)", tier: "gratis",
      rationale: "Als je een gratis tweede mening wilt naast het betaalde model — nooit als enige bron bij hoge inzet." },
    { providerId: "google-ai-studio", provider: "Google AI Studio", model: "Gemini 2.5 Flash", tier: "gratis",
      rationale: "Gratis sparringpartner voor concepten; verifieer conclusies altijd." },
  ],
  algemeen: [
    { providerId: "groq", provider: "Groq", model: "Llama 3.3 70B", tier: "gratis",
      rationale: "Goede balans tussen kwaliteit en snelheid, gratis." },
    { providerId: "google-ai-studio", provider: "Google AI Studio", model: "Gemini 2.5 Flash", tier: "gratis",
      rationale: "Veelzijdig en ruim bemeten gratis tier." },
  ],
};

const ESCALATION: Record<TaskProfileKey, string> = {
  "creatief-schrijven":
    "Voor je belangrijkste, naar-buiten-gaande campagnes blijft het betaalde standaardmodel de veiligere keuze.",
  "hoog-volume-support":
    "Bij gevoelige klachten of juridisch geladen antwoorden: schakel naar het betaalde standaardmodel.",
  "analyse-lange-context":
    "Als de analyse een zakelijk besluit aanstuurt, laat het betaalde model de eindconclusie verifiëren.",
  "hoge-inzet-redeneren":
    "Hier is het betaalde standaardmodel (Claude) doorgaans de juiste keuze — gebruik gratis modellen alleen als extra sparring, niet als enige bron. Dit is het oranje licht.",
  algemeen:
    "Twijfel je over kwaliteit? Val terug op het betaalde standaardmodel.",
};

/** Geeft de routing-aanbeveling voor een taakprofiel. */
export function recommendForProfile(profile: TaskProfileKey): Recommendation {
  const candidates = CANDIDATES[profile];
  const [primary, ...alternatives] = candidates;
  return {
    profile,
    profileLabel: TASK_PROFILES[profile].label,
    needs: TASK_PROFILES[profile].needs,
    primary,
    alternatives,
    escalation: ESCALATION[profile],
  };
}

/** Geeft de routing-aanbeveling voor een concrete agent (rol + categorie). */
export function recommendForAgent(agent: { role?: string; category?: string }): Recommendation {
  return recommendForProfile(profileForAgent(agent));
}

/** Provider-detail (naam, url, limieten) bij een kandidaat, uit de catalogus. */
export function providerFor(candidate: Candidate): LlmProvider | undefined {
  return getProviderById(candidate.providerId);
}

/** Alle profielen met hun aanbeveling — voor een overzicht-endpoint. */
export function allRecommendations(): Recommendation[] {
  return (Object.keys(TASK_PROFILES) as TaskProfileKey[]).map(recommendForProfile);
}
