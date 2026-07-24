import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Integratietest: de volledige geheugen-BEDRADING ───────────────────────────
// De pure ranker/parse-functies zijn los getest in memory.test.ts. Hier bewijzen
// we de orkestratie tegen de ECHTE (in-memory) SQLite-storage: extractie →
// parsing → dedup → opslag → persona-synthese → recall-injectie. Alleen de
// LLM-grens (anthropicClient) is gemockt; al het andere is echt.
//
// De mock beslist op basis van de system-prompt of het een extractie- of een
// persona-call is, en geeft een realistisch antwoord terug.

// vi.hoisted zorgt dat de mock bestaat vóór de (gehoiste) vi.mock-factory 'm gebruikt.
const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async ({ system }: { system: string }) => {
    if (system.includes("geheugen-extractor")) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              { kind: "fact", content: "Lex runt een webshop in schoenen", keywords: ["webshop", "schoenen"], salience: 90 },
              { kind: "goal", content: "Wil de omzet verdubbelen in 2026", keywords: ["omzet", "doel"], salience: 80 },
              { kind: "preference", content: "Houdt van korte, directe antwoorden", keywords: ["stijl"], salience: 70 },
            ]),
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      };
    }
    if (system.includes("profiel")) {
      return {
        content: [{ type: "text", text: "Lex runt een webshop in schoenen en wil in 2026 zijn omzet verdubbelen. Hij houdt van korte, directe antwoorden." }],
        usage: { input_tokens: 80, output_tokens: 40 },
      };
    }
    return { content: [{ type: "text", text: "[]" }], usage: { input_tokens: 10, output_tokens: 5 } };
  }),
}));

// Mock de LLM-grens + budget (deterministisch, geen netwerk, geen budget-limiet).
vi.mock("./ai", () => ({
  anthropicClient: { messages: { create: createMock } },
  checkAndUpdateBudget: () => true,
  reconcileBudget: () => {},
  getBudgetStatus: () => ({ used: 0, limit: 1000, remaining: 1000, resetAt: "" }),
}));

import { extractMemories, maybeSynthesizePersona, recallForChat, visibleMemories, MARKER_CONTENT } from "./memory";
import { storage } from "./storage";

function seedAgent(): number {
  const agent = storage.createAgent({
    name: "Nova", role: "Marketing", description: "d", avatarColor: "#000", avatarIcon: "Megaphone",
    specialty: "s", status: "active", tasksCompleted: 0, category: "marketing",
  });
  return agent.id;
}

function chat(agentId: number, turns: number) {
  for (let i = 0; i < turns; i++) {
    storage.createMessage({ agentId, role: "user", content: `Vraag ${i} over mijn webshop en omzet` });
    storage.createMessage({ agentId, role: "assistant", content: `Antwoord ${i}` });
  }
}

describe("geheugen-bedrading (integratie)", () => {
  let agentId: number;
  beforeEach(() => {
    createMock.mockClear();
    agentId = seedAgent();
  });

  it("destilleert echte herinneringen uit de dialoog en slaat ze op in de database", async () => {
    chat(agentId, 3);
    const created = await extractMemories(agentId, { force: true });

    expect(createMock).toHaveBeenCalledTimes(1); // extractie-call gedaan
    expect(created.length).toBe(3);
    const stored = visibleMemories(agentId);
    expect(stored.map((m) => m.content)).toContain("Lex runt een webshop in schoenen");
    // salience en kind komen echt uit de opslag terug
    const goal = stored.find((m) => m.kind === "goal");
    expect(goal?.content).toContain("omzet verdubbelen");
    expect(goal?.salience).toBe(80);
    // traceerbaarheid: source_message_id is gezet
    expect(stored.every((m) => m.sourceMessageId != null)).toBe(true);
  });

  it("triggert NIET automatisch onder de beurt-drempel, maar wel na genoeg beurten", async () => {
    chat(agentId, 2); // < EXTRACT_EVERY_TURNS (4)
    expect(await extractMemories(agentId)).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();

    chat(agentId, 3); // nu ruim boven de drempel
    const created = await extractMemories(agentId);
    expect(created.length).toBe(3);
  });

  it("ontdubbelt bij een tweede extractie en laat het geheugen niet groeien", async () => {
    chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    const afterFirst = visibleMemories(agentId).length;

    // Zelfde soort gesprek → mock geeft dezelfde feiten → dedup moet ze weren.
    chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    const afterSecond = visibleMemories(agentId).length;

    expect(afterSecond).toBe(afterFirst); // geen duplicaten
  });

  it("synthetiseert een persona-profiel (L3) uit de opgeslagen feiten", async () => {
    chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    const ok = await maybeSynthesizePersona(agentId, { force: true });

    expect(ok).toBe(true);
    const persona = storage.getPersona(agentId);
    expect(persona?.profile).toContain("webshop");
    expect(persona?.memoryCount).toBeGreaterThan(0);
  });

  it("injecteert persona + relevante herinnering in het recall-blok voor de chat", async () => {
    chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    await maybeSynthesizePersona(agentId, { force: true });

    const recall = recallForChat(agentId, "hoe verhoog ik de omzet van mijn webshop?");
    expect(recall.block).toContain("GEHEUGEN");
    expect(recall.block).toContain("webshop"); // relevante herinnering opgehaald
    expect(recall.persona).toBe(true);
    expect(recall.memories.length).toBeGreaterThan(0);
    // recall markeert gebruik (use_count) — observability
    const used = visibleMemories(agentId).filter((m) => m.useCount > 0);
    expect(used.length).toBeGreaterThan(0);
  });

  it("laat twee gelijktijdige extracties niet dubbel draaien (concurrency-slot)", async () => {
    chat(agentId, 3);
    // Twee tegelijk afvuren (zoals een snelle beurt + 'onthoud nu').
    const [a, b] = await Promise.all([
      extractMemories(agentId, { force: true }),
      extractMemories(agentId, { force: true }),
    ]);

    expect(createMock).toHaveBeenCalledTimes(1); // slechts één LLM-call → geen dubbel budget
    // Eén run levert de feiten, de ander wordt geweigerd (leeg) → geen duplicaten.
    const totalCreated = a.length + b.length;
    expect(totalCreated).toBe(3);
    expect(visibleMemories(agentId).length).toBe(3);
  });

  it("verzet de watermark zodat dezelfde beurten niet opnieuw worden geëxtraheerd", async () => {
    chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    createMock.mockClear();

    // Geen nieuwe berichten → onverwerkte staart is leeg → geen LLM-call.
    const again = await extractMemories(agentId, { force: true });
    expect(again).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
    // Het interne watermark-baken lekt niet naar de zichtbare herinneringen.
    expect(visibleMemories(agentId).every((m) => m.content !== MARKER_CONTENT)).toBe(true);
  });
});
