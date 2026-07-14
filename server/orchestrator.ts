import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { anthropicClient, checkAndUpdateBudget, reconcileBudget } from "./ai";
import { getAgentSystemPrompt } from "./prompts";
import { storage } from "./storage";
import { buildKnowledgeContext } from "./knowledge";
import type { Agent, Orchestration } from "@shared/schema";

// ─── Modellen per laag (orchestrator-worker) ──────────────────────────────────
// Het "CEO-brein" (plannen + synthese) draait standaard op hetzelfde bewezen
// model als de rest van de app, maar is los te upgraden via ORCHESTRATOR_MODEL —
// zo kun je de command-laag een sterker model geven dan de specialisten, precies
// zoals in de agentic-OS demo (CEO ≠ specialist-model).
export const ORCHESTRATOR_MODEL = process.env.ORCHESTRATOR_MODEL || "claude-haiku-4-5";
export const SPECIALIST_MODEL = process.env.SPECIALIST_MODEL || "claude-haiku-4-5";

// Hoeveel specialisten mag de orchestrator maximaal inschakelen per opdracht.
// Begrenst de kosten en houdt de debrief scherp.
export const MAX_STEPS = 5;

// Ruwe token-schatting die vooraf uit het budget wordt gereserveerd
// (planner + MAX_STEPS specialisten + synthese). Achteraf gereconcilieerd.
const ESTIMATED_TOKENS = 6000;

interface PlanStep {
  agentId: number;
  task: string;
}
interface Plan {
  rationale: string;
  steps: PlanStep[];
}

function extractText(resp: Message): string {
  const block = resp.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

// ─── Planner-prompt: de orchestrator kiest wélke specialist wát doet ───────────
export function buildPlannerSystem(agents: Agent[], knowledgeContext = ""): string {
  const roster = agents
    .map((a) => `- id ${a.id}: ${a.name} — ${a.role} (${a.specialty})`)
    .join("\n");
  const knowledgeBlock = knowledgeContext ? `\n\n${knowledgeContext}\n` : "";
  return `Je bent de CEO/Orchestrator (de command-laag) van een team AI-specialisten voor Nederlandse ondernemers.
Je voert het werk NIET zelf uit. Je taak is routeren: je ontleedt de opdracht van de operator in
concrete deelopdrachten en wijst elke deelopdracht toe aan de best passende specialist.

Beschikbare specialisten (gebruik exact deze id's):
${roster}${knowledgeBlock}

Regels:
- Kies alleen specialisten die echt bijdragen. Liever 2 scherpe deelopdrachten dan 5 vage.
- Maximaal ${MAX_STEPS} deelopdrachten. Elke deelopdracht is één zin, concreet en uitvoerbaar.
- Wijs een specialist toe op basis van zijn rol/specialisme, niet willekeurig.
- Herhaal de opdracht niet letterlijk; vertaal 'm naar deeltaken.

Antwoord UITSLUITEND met één JSON-object, zonder tekst eromheen:
{"rationale":"<1 zin: hoe je het werk verdeelt>","steps":[{"agentId":<id>,"task":"<deelopdracht>"}]}`;
}

// ─── Planner-output parsen (robuust, met validatie) ────────────────────────────
// Pakt het eerste JSON-object uit de tekst, valideert agent-id's tegen de roster
// en begrenst het aantal stappen. Onbekende agents worden weggefilterd.
export function parsePlan(raw: string, validAgentIds: number[], maxSteps = MAX_STEPS): Plan {
  const valid = new Set(validAgentIds);
  let rationale = "";
  const steps: PlanStep[] = [];

  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.rationale === "string") rationale = parsed.rationale.trim().slice(0, 400);
      const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
      for (const s of rawSteps) {
        const agentId = Number(s?.agentId);
        const task = typeof s?.task === "string" ? s.task.trim() : "";
        if (Number.isInteger(agentId) && valid.has(agentId) && task) {
          steps.push({ agentId, task: task.slice(0, 500) });
        }
        if (steps.length >= maxSteps) break;
      }
    } catch {
      /* val terug op leeg plan */
    }
  }
  return { rationale, steps };
}

// ─── Specialist-prompt: één deelopdracht binnen de teamcontext ─────────────────
export function buildSpecialistUser(command: string, task: string, knowledgeContext = ""): string {
  const knowledgeBlock = knowledgeContext ? `\n\n${knowledgeContext}\n` : "";
  return `De CEO/Orchestrator heeft jou als specialist ingeschakeld binnen een teamopdracht.

Volledige opdracht van de operator:
"${command}"

Jouw specifieke deelopdracht:
"${task}"${knowledgeBlock}

Lever een beknopt, concreet en direct bruikbaar resultaat voor jouw deel. Geen inleiding of samenvatting
van de hele opdracht — alleen jouw bijdrage. Blijf binnen je eigen vakgebied.`;
}

// ─── Synthese-prompt: de CEO bundelt alles tot één operator-debrief ────────────
export function buildSynthesisSystem(): string {
  return `Je bent de CEO/Orchestrator die de command-laag afsluit. Je specialisten hebben ieder hun deel geleverd.
Bundel hun output tot één heldere operator-debrief voor de ondernemer.

De debrief bevat:
1. Een korte kernboodschap (1-2 zinnen): wat is er gedaan en wat is de uitkomst.
2. De belangrijkste concrete resultaten per betrokken specialist, kort samengevat.
3. Duidelijke aanbevolen vervolgstappen (max 3 bullets).

Schrijf in het Nederlands, zakelijk en to-the-point. Geen verzinsels — gebruik alleen wat de specialisten leverden.`;
}

export function buildSynthesisUser(command: string, steps: { agentName: string; task: string; output: string }[]): string {
  const blocks = steps
    .map((s, i) => `### ${i + 1}. ${s.agentName} — opdracht: ${s.task}\n${s.output}`)
    .join("\n\n");
  return `OPDRACHT VAN DE OPERATOR:\n${command}\n\nOUTPUT VAN DE SPECIALISTEN:\n${blocks}\n\nSchrijf nu de operator-debrief.`;
}

function tokensOf(resp: Message): number {
  return resp.usage ? resp.usage.input_tokens + resp.usage.output_tokens : 0;
}

// ─── Orchestratie starten (sync) → achtergrondrun (async) ──────────────────────
// Geeft direct de "planning"-rij terug zodat de client kan gaan pollen en de
// live status per specialist kan tonen. De echte plan → dispatch → synthese
// draait op de achtergrond (in-proces, net als de loop-scheduler) en werkt de
// rij + currentAgentId onderweg bij.
export function startOrchestration(command: string): Orchestration {
  const orch = storage.createOrchestration({ command });

  // Budget vooraf reserveren (kostenbescherming, gedeeld met chat + loops).
  if (!checkAndUpdateBudget(ESTIMATED_TOKENS)) {
    return storage.updateOrchestration(orch.id, {
      status: "error",
      debrief: "Dagelijks token-budget bereikt — opdracht overgeslagen (kostenbescherming).",
    })!;
  }

  // Fire-and-forget: de achtergrondrun reconcilieert het budget zelf aan het eind.
  void executeOrchestration(orch.id, command);
  return orch;
}

async function executeOrchestration(orchId: number, command: string): Promise<void> {
  let tokensUsed = 0;
  try {
    const agents = storage.getAgents();
    if (agents.length === 0) throw new Error("Geen agents beschikbaar om werk aan te routeren.");

    // ── READS: relevante kennis uit de Vault ophalen (RAG-laag) ──
    const knowledge = storage.searchKnowledge(command, 4);
    const knowledgeContext = buildKnowledgeContext(knowledge);
    if (knowledge.length > 0) storage.updateOrchestration(orchId, { reads: knowledge.length });

    // ── PLAN: de orchestrator routeert het werk (kennis-bewust) ──
    const plannerResp = await anthropicClient.messages.create({
      model: ORCHESTRATOR_MODEL,
      max_tokens: 700,
      system: buildPlannerSystem(agents, knowledgeContext),
      messages: [{ role: "user", content: command }],
    });
    tokensUsed += tokensOf(plannerResp);

    const plan = parsePlan(extractText(plannerResp), agents.map((a) => a.id));
    if (plan.steps.length === 0) {
      // Fallback: geen bruikbaar plan → route de hele opdracht naar de strategisch
      // adviseur (Orion) of anders de eerste agent, zodat de operator toch iets krijgt.
      const fallback = agents.find((a) => a.name === "Orion") ?? agents[0];
      plan.steps.push({ agentId: fallback.id, task: command });
      if (!plan.rationale) plan.rationale = "Geen duidelijke opsplitsing — volledige opdracht naar één specialist gerouteerd.";
    }

    storage.updateOrchestration(orchId, { plan: plan.rationale, status: "dispatching" });

    // ── DISPATCH: elke specialist voert zijn deelopdracht uit (sequentieel) ──
    const agentMap = new Map(agents.map((a) => [a.id, a] as const));
    const synthInput: { agentName: string; task: string; output: string }[] = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const agent = agentMap.get(step.agentId);
      const agentName = agent?.name ?? "Specialist";

      // Live status: markeer wélke specialist nú draait (voor het network in de UI).
      storage.updateOrchestration(orchId, { currentAgentId: step.agentId });

      let output = "(geen output geproduceerd)";
      let stepTokens = 0;
      try {
        const resp = await anthropicClient.messages.create({
          model: SPECIALIST_MODEL,
          max_tokens: 900,
          system: getAgentSystemPrompt(step.agentId),
          messages: [{ role: "user", content: buildSpecialistUser(command, step.task, knowledgeContext) }],
        });
        stepTokens = tokensOf(resp);
        output = extractText(resp) || output;
      } catch (err: any) {
        output = `Fout bij deze specialist: ${err?.message || "onbekende fout"}`;
      }
      tokensUsed += stepTokens;

      storage.createOrchestrationStep({
        orchestrationId: orchId,
        agentId: step.agentId,
        stepOrder: i,
        task: step.task,
        output,
        tokensUsed: stepTokens,
      });
      synthInput.push({ agentName, task: step.task, output });
    }

    // ── SYNTHESE: de CEO bundelt alles tot de operator-debrief ──
    storage.updateOrchestration(orchId, { status: "synthesizing", currentAgentId: null });

    let debrief = "";
    try {
      const synthResp = await anthropicClient.messages.create({
        model: ORCHESTRATOR_MODEL,
        max_tokens: 1024,
        system: buildSynthesisSystem(),
        messages: [{ role: "user", content: buildSynthesisUser(command, synthInput) }],
      });
      tokensUsed += tokensOf(synthResp);
      debrief = extractText(synthResp);
    } catch (err: any) {
      debrief = `Synthese mislukt: ${err?.message || "onbekende fout"}. De losse specialist-output staat hierboven.`;
    }

    reconcileBudget(tokensUsed, ESTIMATED_TOKENS);
    storage.updateOrchestration(orchId, {
      status: "done",
      debrief: debrief || "(geen debrief geproduceerd)",
      currentAgentId: null,
      tokensUsed,
    });
  } catch (err: any) {
    reconcileBudget(tokensUsed, ESTIMATED_TOKENS);
    console.error(`[orchestrator ${orchId}] fout:`, err?.message || err);
    storage.updateOrchestration(orchId, {
      status: "error",
      debrief: `Fout tijdens orchestratie: ${err?.message || "onbekende fout"}`,
      currentAgentId: null,
      tokensUsed,
    });
  }
}
