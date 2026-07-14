import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { anthropicClient, checkAndUpdateBudget, reconcileBudget } from "./ai";
import { getAgentSystemPrompt } from "./prompts";
import { storage } from "./storage";
import type { Loop, LoopRun } from "@shared/schema";

// Loops draaien op het snelle, goedkope model — cadans-gedreven, kostenbewust.
const MODEL = "claude-haiku-4-5";
const MAX_STATE_CHARS = 4000;

// ─── Cadans ───────────────────────────────────────────────────────────────────
export function parseCadenceMs(cadence: string): number | null {
  const map: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "2h": 2 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
  };
  return map[cadence] ?? null;
}

export function computeNextRunAt(cadence: string, from = Date.now()): string | null {
  const ms = parseCadenceMs(cadence);
  return ms == null ? null : new Date(from + ms).toISOString();
}

// ─── Checker-oordeel parsen ────────────────────────────────────────────────────
type Verdict = "APPROVE" | "REJECT" | "ESCALATE";
interface CheckerResult { verdict: Verdict; score: number; critique: string; }

export function parseCheckerResult(raw: string): CheckerResult {
  // Pak het eerste JSON-object uit de tekst (het model kan er proza omheen zetten).
  const match = raw.match(/\{[\s\S]*\}/);
  let verdict: Verdict = "ESCALATE";
  let score = 0;
  let critique = raw.slice(0, 500).trim();
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      const v = String(parsed.verdict || "").toUpperCase();
      if (v === "APPROVE" || v === "REJECT" || v === "ESCALATE") verdict = v;
      const s = Number(parsed.score);
      if (Number.isFinite(s)) score = Math.max(0, Math.min(100, Math.round(s)));
      if (typeof parsed.critique === "string" && parsed.critique.trim()) {
        critique = parsed.critique.trim().slice(0, 800);
      }
    } catch {
      /* val terug op defaults */
    }
  }
  return { verdict, score, critique };
}

function extractText(resp: Message): string {
  const block = resp.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

function trimState(state: string): string {
  if (state.length <= MAX_STATE_CHARS) return state;
  return state.slice(0, MAX_STATE_CHARS) + "\n\n…(oudere historie afgekapt)";
}

// ─── Run-lock ──────────────────────────────────────────────────────────────────
// Voorkomt dat dezelfde loop tegelijk twee keer draait (bv. een geplande tick én
// een handmatige "Draai nu"). Dat zou de state-ruggengraat racen en dubbel
// API-budget kosten. Per-loop lock; verschillende loops draaien wel parallel.
const inFlight = new Set<number>();

export function isLoopRunning(id: number): boolean {
  return inFlight.has(id);
}

// ─── Eén loop-iteratie draaien: maker → checker → state → score ────────────────
// Geeft null terug als de loop al draait (geen dubbele run, geen API-kosten).
export async function runLoop(loop: Loop): Promise<LoopRun | null> {
  if (inFlight.has(loop.id)) {
    console.log(`[loop ${loop.id}] draait al — run overgeslagen.`);
    return null;
  }
  inFlight.add(loop.id);
  try {
    return await executeLoop(loop);
  } finally {
    inFlight.delete(loop.id);
  }
}

async function executeLoop(loop: Loop): Promise<LoopRun> {
  const runAt = new Date().toISOString();
  const agent = storage.getAgent(loop.agentId);
  const agentName = agent?.name ?? "Agent";

  // Budget reserveren (maker ~1024 + checker ~512 output, plus overhead).
  const estimatedTokens = 2500;
  if (!checkAndUpdateBudget(estimatedTokens)) {
    return finishRun(loop, runAt, {
      makerOutput: "",
      verdict: "ERROR",
      score: 0,
      critique: "Dagelijks token-budget bereikt — run overgeslagen (kostenbescherming).",
      tokensUsed: 0,
    });
  }

  const systemPrompt = getAgentSystemPrompt(loop.agentId);
  let tokensUsed = 0;

  try {
    // ── MAKER: de agent voert het doel uit, met de vorige STATE als geheugen ──
    const makerSystem = `${systemPrompt}

Je draait nu in een AUTONOME LOOP (loop engineering), niet in een chat. Doel van deze loop:
"${loop.objective}"

Bekende status uit eerdere runs (STATE — jouw geheugen-ruggengraat):
${loop.state?.trim() || "(nog geen historie — dit is de eerste run)"}

Instructies:
- Voer één iteratie van dit doel uit en lever een beknopt, concreet resultaat in het Nederlands.
- Bouw voort op de STATE; herhaal niet wat er al staat, voeg nieuwe waarde toe.
- Alleen signaal en bruikbare output — geen verzinsels, geen opvulling.`;

    const makerResp = await anthropicClient.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: makerSystem,
      messages: [{ role: "user", content: "Voer nu deze loop-iteratie uit." }],
    });
    const makerOutput = extractText(makerResp) || "(geen output geproduceerd)";
    if (makerResp.usage) tokensUsed += makerResp.usage.input_tokens + makerResp.usage.output_tokens;

    // ── CHECKER: onafhankelijke verifier (maker/checker-splitsing) ──
    const checkerSystem = `Je bent de onafhankelijke Verifier (de "checker") in een maker/checker-splitsing.
Je bent NIET de maker. Je standaardhouding is WEIGEREN, tenzij het bewijs sterk is.

Je beoordeelt of de output van de maker het gestelde doel echt dient:
1. Relevantie — beantwoordt het het doel, of iets anders?
2. Concreetheid — bruikbaar en specifiek, of vaag?
3. Correctheid — plausibel en niet verzonnen?
4. Voortgang — bouwt het voort op de STATE zonder nutteloze herhaling?

Antwoord UITSLUITEND met één JSON-object, zonder tekst eromheen:
{"verdict": "APPROVE" | "REJECT" | "ESCALATE", "score": <0-100>, "critique": "<max 2 zinnen, in het Nederlands>"}

- APPROVE alleen bij duidelijk goede, bruikbare output (score doorgaans >= 70).
- ESCALATE als het menselijke beoordeling vereist (gevoelig/ambigu).
- REJECT bij vaag, off-topic of verzonnen resultaat.`;

    const checkerResp = await anthropicClient.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: checkerSystem,
      messages: [
        {
          role: "user",
          content: `DOEL VAN DE LOOP:\n${loop.objective}\n\nOUTPUT VAN DE MAKER (${agentName}):\n${makerOutput}\n\nGeef je oordeel als JSON.`,
        },
      ],
    });
    if (checkerResp.usage) tokensUsed += checkerResp.usage.input_tokens + checkerResp.usage.output_tokens;

    const { verdict, score, critique } = parseCheckerResult(extractText(checkerResp));
    reconcileBudget(tokensUsed, estimatedTokens);

    return finishRun(loop, runAt, { makerOutput, verdict, score, critique, tokensUsed });
  } catch (err: any) {
    reconcileBudget(tokensUsed, estimatedTokens);
    console.error(`[loop ${loop.id}] fout:`, err?.message || err);
    return finishRun(loop, runAt, {
      makerOutput: "",
      verdict: "ERROR",
      score: 0,
      critique: `Fout tijdens run: ${err?.message || "onbekende fout"}`,
      tokensUsed,
    });
  }
}

// Rungegevens wegschrijven + de loop bijwerken (state-ruggengraat, score, planning).
function finishRun(
  loop: Loop,
  runAt: string,
  result: { makerOutput: string; verdict: LoopRun["verdict"]; score: number; critique: string; tokensUsed: number },
): LoopRun {
  const run = storage.createLoopRun({
    loopId: loop.id,
    makerOutput: result.makerOutput,
    verdict: result.verdict,
    score: result.score,
    critique: result.critique,
    tokensUsed: result.tokensUsed,
  });

  // State-ruggengraat bijwerken: nieuwste run vooraan, gecapt op lengte.
  const stamp = runAt.replace("T", " ").slice(0, 16);
  const summary = result.makerOutput
    ? result.makerOutput.trim().slice(0, 600)
    : result.critique;
  const entry = `## ${stamp} — ${result.verdict} (score ${result.score})\n${summary}\n`;
  const newState = trimState(`${entry}\n${loop.state ?? ""}`.trim());

  storage.updateLoop(loop.id, {
    state: newState,
    lastScore: result.score,
    lastVerdict: result.verdict,
    lastRunAt: runAt,
    nextRunAt: loop.cadence === "manual" ? null : computeNextRunAt(loop.cadence, Date.now()),
  });

  return run;
}

// ─── Scheduler ─────────────────────────────────────────────────────────────────
// In-proces scheduler: controleert elke minuut op verschuldigde loops en draait
// ze sequentieel (respecteert het gedeelde budget). L1 report-only per default.
let running = false;

async function tick() {
  if (running) return; // geen overlappende ticks
  running = true;
  try {
    const due = storage.getDueLoops(new Date().toISOString());
    for (const loop of due) {
      console.log(`[scheduler] loop ${loop.id} (${loop.name}) draait…`);
      await runLoop(loop);
    }
  } catch (err: any) {
    console.error("[scheduler] fout:", err?.message || err);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  // Zet nextRunAt voor ingeschakelde loops die er nog geen hebben.
  for (const loop of storage.getLoops()) {
    if (loop.enabled && loop.cadence !== "manual" && !loop.nextRunAt) {
      storage.updateLoop(loop.id, { nextRunAt: computeNextRunAt(loop.cadence) });
    }
  }
  setInterval(tick, 60 * 1000);
  console.log("[scheduler] loop-scheduler gestart (interval 60s).");
}
