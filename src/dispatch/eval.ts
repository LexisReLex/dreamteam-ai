import type OpenAI from "openai";
import { judgeWithRubric } from "../judge";
import type { DispatchOutcome, DispatchTask, SpanEval } from "./types";

// Observability Niveau 2 — online-eval-hook (bouwstuk 2).
// Ná een echte dispatch scoort een GOEDKOPE judge (DeepSeek) de output tegen een korte
// per-seat rubric. Cheap = auto (oranje licht niet nodig). De benchmark-jurylogica wordt
// HERGEBRUIKT via judgeWithRubric — niet gedupliceerd. Premium-judge = Niveau 3 / go.

// Bewust cheap: de VERGADERING besloot judge = DeepSeek. NOOIT de premium benchmark-judge
// (anthropic/claude-opus-4.8) hier gebruiken — dat is een oranje-licht-call.
export const DEFAULT_EVAL_MODEL = "deepseek/deepseek-v4-flash";
export const DEFAULT_PASS_THRESHOLD = 7.0;

export interface EvalConfig {
  enabled: boolean;      // hook aan/uit
  sampleN: number;       // 1 = elke call, N = ~1-op-N steekproef
  model: string;         // judge-model (cheap)
  passThreshold: number; // eval_pass = score >= drempel
}

export function defaultEvalConfig(overrides: Partial<EvalConfig> = {}): EvalConfig {
  return {
    enabled: overrides.enabled ?? true,
    sampleN: overrides.sampleN ?? 1,
    model: overrides.model ?? DEFAULT_EVAL_MODEL,
    passThreshold: overrides.passThreshold ?? DEFAULT_PASS_THRESHOLD,
  };
}

// Korte online-rubric. De vier canonieke assen (voor hergebruik van deriveOverall) worden
// hier op de spec-dimensies gemapt: relevantie / geen-hallucinatie / format / volledigheid.
const ONLINE_RUBRIC = `Je bent een strenge, snelle online-jury die één AI-antwoord live beoordeelt.
Je krijgt: (1) de rol/seat, (2) de taak, (3) het antwoord. Scoor op vier assen 0-10 (10 = uitmuntend).
Gebruik EXACT deze JSON-sleutels, met deze betekenis:
- "taakvervulling" = RELEVANTIE: sluit het antwoord aan op de gevraagde taak?
- "correctheid" = GEEN-HALLUCINATIE: geen verzonnen feiten, cijfers, prijzen of beleid (elk verzinsel = forse aftrek).
- "instructieNaleving" = FORMAT-CORRECT: volgt het het gevraagde teruggave-format en de grenzen?
- "bondigheid" = VOLLEDIGHEID: dekt het alle gevraagde onderdelen zonder gaten?
Antwoord UITSLUITEND met geldige JSON, geen markdown, exact deze vorm:
{"taakvervulling":0,"correctheid":0,"instructieNaleving":0,"bondigheid":0,"motivatie":"één zin"}
De motivatie is max 15 woorden, platte tekst, GEEN code, GEEN aanhalingstekens.`;

// Deterministische steekproef zonder random-state: verdeel op de laatste hex van de trace-id.
// sampleN<=1 → altijd. Zo is de keuze reproduceerbaar en test-vriendelijk.
export function shouldEval(cfg: EvalConfig, traceId: string): boolean {
  if (!cfg.enabled) return false;
  if (cfg.sampleN <= 1) return true;
  const last = traceId.slice(-1);
  const n = parseInt(last, 16);
  if (Number.isNaN(n)) return true;
  return n % cfg.sampleN === 0;
}

// Scoor één uitgevoerde dispatch. Geen call bij dry-run/geblokkeerd/fout/lege output.
// Gooit niet: een eval-fout mag de dispatch niet laten omvallen — geef null terug.
export async function evalOutcome(
  client: OpenAI,
  outcome: DispatchOutcome,
  task: DispatchTask,
  cfg: EvalConfig
): Promise<SpanEval | null> {
  if (!outcome.executed || outcome.error || !outcome.output) return null;
  if (!shouldEval(cfg, outcome.traceId)) return null;

  const seat = outcome.seat ?? "algemeen";
  const voice = outcome.voice ? ` · merkstem: ${outcome.voice}` : "";
  const userMsg =
    `## SEAT/ROL\n${seat}${voice}\n\n` +
    `## TAAK\n${task.prompt}\n\n` +
    `## ANTWOORD VAN HET MODEL\n${outcome.output}`;

  try {
    const score = await judgeWithRubric(client, cfg.model, ONLINE_RUBRIC, userMsg, 400);
    return {
      score: score.overall,
      pass: score.overall >= cfg.passThreshold,
      motivatie: score.motivatie,
    };
  } catch {
    // Kapotte JSON / time-out / API-fout in de judge: geen score, dispatch blijft staan.
    return null;
  }
}
