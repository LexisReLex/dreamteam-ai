// ─── Self-Review: self-evaluatie van het antwoord + begrensde loop-back ────────
//
// Geleend van video-use (github.com/browser-use/video-use). Dat project zelf is een
// Python video-editing CLI/Claude-skill (FFmpeg + ElevenLabs-key) — verkeerde vorm,
// stack én domein voor deze chat-webapp, dus NIET installeerbaar (zelfde verdict als
// gstack en MemPalace). Wél overgenomen: zijn kern-onderscheider — de kwaliteitslus
// "self-evaluate rendered output → fix indien onder de lat → re-check", begrensd op
// max 3 iteraties en alleen uitgevoerd op beslispunten (on-demand, niet elke keer).
//
// Waarom dit product dit nodig heeft: het LIVE chat-pad produceert één antwoord en
// stuurt dat direct naar de ondernemer. Er is geen kwaliteitscontrole — de bestaande
// maker/checker-splitsing (loop-engineering) zit uitsluitend in de autonome Loops en
// scoort pas achteraf, tussen runs, zonder binnen één beurt te herstellen. Deze module
// brengt video-use's loop-back naar de live beurt: een keyless heuristische critic
// beoordeelt het antwoord, en ALLEEN bij een echte tekortkoming (leeg, afgekapt,
// verkeerde taal, uitwijk-antwoord, boilerplate, achtergebleven placeholder) volgt één
// begrensde revisie. Het gewone geval (goed antwoord) kost NUL extra calls — dat is de
// on-demand-discipline van video-use, waar alleen op beslispunten wordt "gerenderd".
//
// Keyless-first en additief: de critic is pure lokale heuristiek (geen netwerk, geen
// dependency, geen ML-model). De revisie hergebruikt het bestaande provider-pad
// (Groq gratis; Claude budget-bewaakt) via een callback uit routes.ts, zodat hier geen
// providerlogica gedupliceerd wordt. Er wordt nooit een slechter antwoord teruggegeven
// dan het origineel, en een falende revisie laat het origineel staan — de chat breekt
// dus nooit. Volledig uitzetten: SELF_REVIEW=off (dan is dit een no-op).

// ─── Configuratie (allemaal optioneel) ─────────────────────────────────────────

/** Aan tenzij expliciet uitgezet. De heuristische critic is keyless/gratis; een
 * revisie vuurt alleen bij een echte tekortkoming en is begrensd + budget-bewaakt. */
export function selfReviewEnabled(): boolean {
  const v = (process.env.SELF_REVIEW || "").trim().toLowerCase();
  return !(v === "off" || v === "0" || v === "false" || v === "no");
}

/** Maximaal aantal revisie-pogingen per beurt. Video-use cap = 3; live chat is
 * latency-gevoelig, dus default 1. Geklemd op 1..3. */
export function maxRevisions(): number {
  const raw = Math.floor(Number(process.env.SELF_REVIEW_MAX_REVISIONS));
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(3, raw));
}

/** Heuristische kwaliteitsdrempel 0..1. Onder deze score geldt een antwoord als
 * tekortschietend en wordt (begrensd) herzien. Conservatief zodat een normaal goed
 * antwoord nooit onnodig een (mogelijk betaalde) revisie triggert. */
export function minScore(): number {
  const raw = Number(process.env.SELF_REVIEW_MIN_SCORE);
  if (!Number.isFinite(raw) || raw <= 0 || raw >= 1) return 0.5;
  return raw;
}

/** Optionele Tier-2 LLM-critic (default UIT). Aan = een extra, budget-bewaakte
 * modelbeoordeling bovenop de heuristiek, voor tekortkomingen die lokaal niet te
 * zien zijn (relevantie, verzinsels). Uit houdt de kosten voorspelbaar. */
export function llmCriticEnabled(): boolean {
  const v = (process.env.SELF_REVIEW_LLM || "").trim().toLowerCase();
  return v === "on" || v === "1" || v === "true" || v === "yes";
}

// ─── Bekende systeem-fallbacks — NOOIT herzien ─────────────────────────────────
// Deze strings zet het chat-pad zelf bij een budgetstop of API-fout. Ze herzien zou
// zinloos budget kosten (het probleem is niet de tekst maar de provider/limiet).
const SYSTEM_FALLBACKS = [
  "momenteel niet beschikbaar",
  "dagelijkse gebruik-limiet is bereikt",
  "Er is een fout opgetreden",
];

export function isSystemFallback(answer: string): boolean {
  const a = (answer || "").toLowerCase();
  return SYSTEM_FALLBACKS.some((f) => a.includes(f.toLowerCase()));
}

// ─── Taaldetectie (conservatief) ───────────────────────────────────────────────
// Alleen bedoeld om een grove taal-mismatch te vangen: de gebruiker schrijft
// duidelijk Nederlands maar het antwoord is overwegend Engels. De agents moeten
// "altijd in de taal van de gebruiker" antwoorden — een Engels antwoord op een
// Nederlandse vraag is een echte, detecteerbare kwaliteitsfout.
const NL_WORDS = /\b(de|het|een|en|ik|je|jij|wij|hoe|wat|waarom|niet|geen|voor|met|kan|kun|kunt|moet|wil|graag|alsjeblieft|dank|hallo|goed|omdat|maar|ook|deze|dit|die|dat|mijn|jouw|ons|onze|bij|naar|over|onder|zijn|heb|hebben|word|worden)\b/gi;
const EN_WORDS = /\b(the|a|an|and|is|are|you|your|how|what|why|not|for|with|can|should|must|want|please|thanks|hello|good|because|but|also|this|that|these|those|my|our|of|to|about|under|have|has|will|would)\b/gi;

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

/** True als de tekst duidelijk (overwegend) Nederlands is. */
export function looksDutch(text: string): boolean {
  const nl = countMatches(text, NL_WORDS);
  const en = countMatches(text, EN_WORDS);
  return nl >= 2 && nl > en;
}

/** True als de tekst duidelijk (overwegend) Engels is en nauwelijks Nederlands. */
export function looksEnglish(text: string): boolean {
  const nl = countMatches(text, NL_WORDS);
  const en = countMatches(text, EN_WORDS);
  return en >= 4 && en > nl * 2;
}

// ─── De heuristische critic ────────────────────────────────────────────────────

export interface AnswerEvaluation {
  ok: boolean; // haalt het antwoord de lat (score >= drempel én geen harde defect)?
  score: number; // 0..1, hoger = beter
  issues: string[]; // menselijk leesbare tekortkomingen (NL), leeg als ok
}

const PLACEHOLDER_RE = /(\[(naam|bedrijf|invullen|hier|datum|bedrag|xxx+)\]|\blorem ipsum\b|\bXXXX+\b|\{\{[^}]+\}\}|<invoer[^>]*>|\binsert [a-z ]+ here\b)/i;
const AI_BOILERPLATE_RE = /\b(as an ai (language )?model|als een ai[- ]?taalmodel|ik ben (slechts )?een ai|i(?:'m| am) (just|only) an ai)\b/i;
const REFUSAL_RE = /\b(ik kan (je |u )?daar niet mee helpen|ik kan die vraag niet beantwoorden|daar kan ik niet bij helpen|i (cannot|can't|am unable to) (help|assist|answer))\b/i;

/** Eindigt de tekst afgekapt (geen zin-afsluiting, of duidelijk mid-woord)?
 * Conservatief: alleen als het laatste niet-lege teken géén afsluiting is en de
 * laatste "zin" een redelijke lengte heeft (anders is het waarschijnlijk bedoeld,
 * bv. een kop of een enkel woord). */
export function looksTruncated(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 40) return false;
  const last = t[t.length - 1];
  // Correcte afsluitingen: leesteken, aanhalingsteken, haakje, emoji-achtig, lijst-/code-blok.
  if (/[.!?…"'’)\]}*`_~]/.test(last)) return false;
  if (/[:]\s*$/.test(t)) return false; // eindigt op ":" — vaak een opsomming die volgt
  // Eindigt op een cijfer of letter (incl. accenten) zonder afsluiting →
  // waarschijnlijk afgekapt. Bewust geen \p{L}/u-flag (past niet bij het TS-target).
  const tail = t.slice(-60);
  return /[a-zA-Z0-9À-ɏ,;-]$/.test(tail);
}

/**
 * Beoordeelt een geproduceerd antwoord op concrete, goedkoop detecteerbare
 * tekortkomingen. Puur lokaal en synchroon — geen LLM, geen netwerk. Bewust
 * conservatief: elke gemarkeerde tekortkoming moet een revisie rechtvaardigen, dus
 * geen vage stijl-oordelen, alleen harde defecten.
 *
 * @param question de gebruikersvraag (voor context, o.a. taal en refusal-oordeel)
 * @param answer   het door de agent geproduceerde antwoord
 */
export function evaluateAnswer(question: string, answer: string): AnswerEvaluation {
  const issues: string[] = [];
  const a = (answer || "").trim();
  const q = (question || "").trim();

  // Leeg / vrijwel leeg antwoord op een echte vraag.
  if (a.length === 0) {
    return { ok: false, score: 0, issues: ["Leeg antwoord."] };
  }
  if (a.length < 15 && q.length > 15) {
    issues.push("Antwoord is te kort/inhoudsloos voor de vraag.");
  }

  // Afgekapt (waarschijnlijk max_tokens geraakt of afgebroken generatie).
  if (looksTruncated(a)) {
    issues.push("Antwoord lijkt middenin afgekapt (geen afsluiting).");
  }

  // Taal-mismatch: Nederlandse vraag, Engels antwoord.
  if (looksDutch(q) && looksEnglish(a) && !looksDutch(a)) {
    issues.push("Antwoord is in het Engels terwijl de vraag Nederlands is.");
  }

  // Uitwijk-/weigerantwoord op een substantiële vraag.
  if (REFUSAL_RE.test(a) && q.length > 20) {
    issues.push("Antwoord wijkt uit of weigert zonder de vraag te helpen.");
  }

  // AI-boilerplate lek ("als een AI-taalmodel ...").
  if (AI_BOILERPLATE_RE.test(a)) {
    issues.push("Antwoord bevat AI-boilerplate in plaats van inhoud.");
  }

  // Achtergebleven placeholder ("[naam]", "lorem ipsum", "{{...}}").
  if (PLACEHOLDER_RE.test(a)) {
    issues.push("Antwoord bevat een niet-ingevulde placeholder.");
  }

  // Score: begin bij 1.0 en trek per tekortkoming af (voor logging/merge met de
  // optionele LLM-score). De heuristische detectoren markeren echte defecten, geen
  // stijl — dus élk defect maakt het antwoord niet-ok en rechtvaardigt een revisie.
  const score = Math.max(0, 1 - issues.length * 0.35);
  const ok = issues.length === 0;
  return { ok, score, issues };
}

// ─── Revisie-instructie voor het model ─────────────────────────────────────────
/** Bouwt de correctie-notitie die vóór/naast de systeemprompt wordt gezet bij een
 * revisie. Benoemt de concrete tekortkomingen zodat het model gericht herstelt —
 * spiegelt hoe de loop-engine de verifier-critique aan de maker teruggeeft. */
export function buildRevisionNote(issues: string[]): string {
  const list = issues.map((i) => `- ${i}`).join("\n");
  return (
    "ZELF-REVISIE: je vorige antwoord schoot op de volgende punten tekort:\n" +
    `${list}\n\n` +
    "Herschrijf je antwoord volledig zodat deze punten zijn opgelost. Antwoord in de " +
    "taal van de gebruiker (Nederlands tenzij de vraag een andere taal is), maak het " +
    "concreet en volledig, zonder placeholders en zonder de vraag te ontwijken. Geef " +
    "alleen het verbeterde antwoord, geen meta-uitleg over de revisie.\n\n"
  );
}

// ─── De loop-back: evalueer en herzie indien nodig ─────────────────────────────

export interface ReviewOutcome {
  content: string; // het (mogelijk verbeterde) antwoord — nooit slechter dan input
  revised: boolean; // is er daadwerkelijk herzien?
  revisions: number; // aantal uitgevoerde revisie-pogingen
  initialIssues: string[]; // tekortkomingen van het oorspronkelijke antwoord
  finalScore: number; // score van het teruggegeven antwoord
}

/** Optionele Tier-2 modelbeoordeling. Levert een extra oordeel voor tekortkomingen
 * die de heuristiek niet ziet (relevantie, verzinsels). Geeft null bij falen/geen
 * budget — dan telt alleen de heuristiek. Wordt aangeleverd door routes.ts zodat
 * deze module provider-agnostisch en keyless-testbaar blijft. */
export type LlmCritique = (
  question: string,
  answer: string,
) => Promise<AnswerEvaluation | null>;

export interface ReviewOptions {
  /** Callback naar de begrensde revisie-generatie via hetzelfde provider-pad. */
  regenerate: (revisionNote: string) => Promise<string | null>;
  /** Optionele Tier-2 LLM-critic; alleen gebruikt als SELF_REVIEW_LLM aanstaat. */
  llmCritique?: LlmCritique;
}

/** Combineert de heuristische evaluatie met een optioneel LLM-oordeel: de laagste
 * score wint (streng), tekortkomingen worden samengevoegd en ontdubbeld. */
function combineEval(heur: AnswerEvaluation, llm: AnswerEvaluation | null): AnswerEvaluation {
  if (!llm) return heur;
  const issues = Array.from(new Set([...heur.issues, ...llm.issues]));
  const score = Math.min(heur.score, llm.score);
  // Ok alleen als er geen enkel defect is (heuristiek of LLM) én de graded score de
  // drempel haalt. Zo triggert ook een lage LLM-score zonder expliciete issues nog een revisie.
  return { ok: issues.length === 0 && score >= minScore(), score, issues };
}

/**
 * Kern van de geleende lus. Evalueert `answer` (heuristiek + optioneel LLM-critic);
 * bij een tekortkoming voert het — begrensd — één of meer revisies uit via
 * `regenerate` en houdt telkens het beste antwoord. Geeft nooit een slechter
 * antwoord terug dan binnenkwam, en laat het origineel staan als een revisie faalt
 * of niet beter is. Breekt de chat nooit.
 *
 * @param question de gebruikersvraag
 * @param answer   het oorspronkelijke antwoord
 * @param opts     regenerate-callback (verplicht) + optionele LLM-critic
 */
export async function reviewAndMaybeRevise(
  question: string,
  answer: string,
  opts: ReviewOptions,
): Promise<ReviewOutcome> {
  const { regenerate, llmCritique } = opts;

  const runEval = async (ans: string): Promise<AnswerEvaluation> => {
    const heur = evaluateAnswer(question, ans);
    if (!llmCriticEnabled() || !llmCritique) return heur;
    let llm: AnswerEvaluation | null = null;
    try {
      llm = await llmCritique(question, ans);
    } catch {
      llm = null; // een falende critic degradeert netjes naar heuristiek-only
    }
    return combineEval(heur, llm);
  };

  const initial = await runEval(answer);
  const base: ReviewOutcome = {
    content: answer,
    revised: false,
    revisions: 0,
    initialIssues: initial.issues,
    finalScore: initial.score,
  };

  // Uit, systeem-fallback, of antwoord haalt de lat al → niets te doen (0 extra calls).
  if (!selfReviewEnabled() || isSystemFallback(answer) || initial.ok) {
    return base;
  }

  let bestContent = answer;
  let bestScore = initial.score;
  let bestEval = initial;
  let revisions = 0;
  const cap = maxRevisions();

  for (let i = 0; i < cap; i++) {
    let candidate: string | null = null;
    try {
      candidate = await regenerate(buildRevisionNote(bestEval.issues));
    } catch {
      candidate = null; // een falende revisie mag de chat nooit breken
    }
    revisions++;
    if (!candidate || !candidate.trim() || isSystemFallback(candidate)) {
      break; // geen bruikbare revisie — houd het beste dat we hebben
    }
    const candEval = await runEval(candidate);
    // Alleen overnemen als het strikt beter is (nooit een regressie doorlaten).
    if (candEval.score > bestScore) {
      bestContent = candidate;
      bestScore = candEval.score;
      bestEval = candEval;
    }
    if (bestEval.ok) break; // lat gehaald — stop met itereren
  }

  return {
    content: bestContent,
    revised: bestContent !== answer,
    revisions,
    initialIssues: initial.issues,
    finalScore: bestScore,
  };
}

// ─── Observability: status zonder geheimen (er zijn er geen — keyless) ──────────
export function reviewInfo(): {
  enabled: boolean;
  maxRevisions: number;
  minScore: number;
  llmCritic: boolean;
} {
  return {
    enabled: selfReviewEnabled(),
    maxRevisions: maxRevisions(),
    minScore: minScore(),
    llmCritic: llmCriticEnabled(),
  };
}
