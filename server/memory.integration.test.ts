import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
import { _clearEmbeddingCache } from "./embeddings";
import { storage } from "./storage";

async function seedAgent(): Promise<number> {
  const agent = await storage.createAgent({
    name: "Nova", role: "Marketing", description: "d", avatarColor: "#000", avatarIcon: "Megaphone",
    specialty: "s", status: "active", tasksCompleted: 0, category: "marketing",
  });
  return agent.id;
}

async function chat(agentId: number, turns: number) {
  for (let i = 0; i < turns; i++) {
    await storage.createMessage({ agentId, role: "user", content: `Vraag ${i} over mijn webshop en omzet` });
    await storage.createMessage({ agentId, role: "assistant", content: `Antwoord ${i}` });
  }
}

describe("geheugen-bedrading (integratie)", () => {
  let agentId: number;
  beforeEach(async () => {
    createMock.mockClear();
    agentId = await seedAgent();
  });

  it("destilleert echte herinneringen uit de dialoog en slaat ze op in de database", async () => {
    await chat(agentId, 3);
    const created = await extractMemories(agentId, { force: true });

    expect(createMock).toHaveBeenCalledTimes(1); // extractie-call gedaan
    expect(created.length).toBe(3);
    const stored = (await visibleMemories(agentId));
    expect(stored.map((m) => m.content)).toContain("Lex runt een webshop in schoenen");
    // salience en kind komen echt uit de opslag terug
    const goal = stored.find((m) => m.kind === "goal");
    expect(goal?.content).toContain("omzet verdubbelen");
    expect(goal?.salience).toBe(80);
    // traceerbaarheid: source_message_id is gezet
    expect(stored.every((m) => m.sourceMessageId != null)).toBe(true);
  });

  it("triggert NIET automatisch onder de beurt-drempel, maar wel na genoeg beurten", async () => {
    await chat(agentId, 2); // < EXTRACT_EVERY_TURNS (4)
    expect(await extractMemories(agentId)).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();

    await chat(agentId, 3); // nu ruim boven de drempel
    const created = await extractMemories(agentId);
    expect(created.length).toBe(3);
  });

  it("ontdubbelt bij een tweede extractie en laat het geheugen niet groeien", async () => {
    await chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    const afterFirst = (await visibleMemories(agentId)).length;

    // Zelfde soort gesprek → mock geeft dezelfde feiten → dedup moet ze weren.
    await chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    const afterSecond = (await visibleMemories(agentId)).length;

    expect(afterSecond).toBe(afterFirst); // geen duplicaten
  });

  it("synthetiseert een persona-profiel (L3) uit de opgeslagen feiten", async () => {
    await chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    const ok = await maybeSynthesizePersona(agentId, { force: true });

    expect(ok).toBe(true);
    const persona = await storage.getPersona(agentId);
    expect(persona?.profile).toContain("webshop");
    expect(persona?.memoryCount).toBeGreaterThan(0);
  });

  it("injecteert persona + relevante herinnering in het recall-blok voor de chat", async () => {
    await chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    await maybeSynthesizePersona(agentId, { force: true });

    const recall = await recallForChat(agentId, "hoe verhoog ik de omzet van mijn webshop?");
    expect(recall.block).toContain("GEHEUGEN");
    expect(recall.block).toContain("webshop"); // relevante herinnering opgehaald
    expect(recall.persona).toBe(true);
    expect(recall.memories.length).toBeGreaterThan(0);
    // recall markeert gebruik (use_count) — observability
    const used = (await visibleMemories(agentId)).filter((m) => m.useCount > 0);
    expect(used.length).toBeGreaterThan(0);
  });

  it("laat twee gelijktijdige extracties niet dubbel draaien (concurrency-slot)", async () => {
    await chat(agentId, 3);
    // Twee tegelijk afvuren (zoals een snelle beurt + 'onthoud nu').
    const [a, b] = await Promise.all([
      extractMemories(agentId, { force: true }),
      extractMemories(agentId, { force: true }),
    ]);

    expect(createMock).toHaveBeenCalledTimes(1); // slechts één LLM-call → geen dubbel budget
    // Eén run levert de feiten, de ander wordt geweigerd (leeg) → geen duplicaten.
    const totalCreated = a.length + b.length;
    expect(totalCreated).toBe(3);
    expect((await visibleMemories(agentId)).length).toBe(3);
  });

  it("verzet de watermark zodat dezelfde beurten niet opnieuw worden geëxtraheerd", async () => {
    await chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    createMock.mockClear();

    // Geen nieuwe berichten → onverwerkte staart is leeg → geen LLM-call.
    const again = await extractMemories(agentId, { force: true });
    expect(again).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
    // Het interne watermark-baken lekt niet naar de zichtbare herinneringen.
    expect((await visibleMemories(agentId)).every((m) => m.content !== MARKER_CONTENT)).toBe(true);
  });
});

// ─── Semantische recall (key-gated) — de volledige INGESCHAKELDE path ──────────
// Bewijst end-to-end dat recall MET een embeddings-key een herinnering ophaalt
// die puur lexicaal (zonder woord-overlap) buiten beeld zou blijven. Het
// endpoint is gemockt (deterministische vectoren, geen netwerk): "auto" en
// "wagen" delen richting, de rest staat er orthogonaal op.
describe("semantische recall — ingeschakelde path (gemockt endpoint)", () => {
  // Concept-signatuur: auto/wagen delen twee dimensies, zodat een 2-concept-query
  // toch ≥ drempel scoort tegen een 1-concept-herinnering.
  function fakeVec(s: string): number[] {
    const t = s.toLowerCase();
    const auto = /auto|wagen|elektrisch/.test(t) ? 1 : 0;
    const omzet = /omzet|verdubbel/.test(t) ? 1 : 0;
    const belasting = /belasting|aangifte/.test(t) ? 1 : 0;
    return [auto, auto, omzet, belasting];
  }

  let agentId: number;
  beforeEach(async () => {
    process.env.EMBEDDINGS_API_KEY = "sk-test-123";
    _clearEmbeddingCache();
    agentId = await seedAgent();
    await storage.createMemory({ agentId, layer: "L1", kind: "goal", content: "Wil de omzet verdubbelen", keywords: "omzet doel", salience: 80, sourceMessageId: null });
    await storage.createMemory({ agentId, layer: "L1", kind: "fact", content: "Rijdt in een elektrische wagen", keywords: "wagen elektrisch", salience: 70, sourceMessageId: null });
    await storage.createMemory({ agentId, layer: "L1", kind: "fact", content: "Doet elk jaar de belastingaangifte", keywords: "belasting aangifte", salience: 60, sourceMessageId: null });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: any) => {
        const inputs: string[] = JSON.parse(init.body).input;
        return { ok: true, json: async () => ({ data: inputs.map((s) => ({ embedding: fakeVec(s) })) }) };
      }),
    );
  });
  afterEach(() => {
    delete process.env.EMBEDDINGS_API_KEY;
    vi.unstubAllGlobals();
    _clearEmbeddingCache();
  });

  it("haalt een semantisch verwante herinnering op zónder woord-overlap", async () => {
    const query = "tips voor mijn omzet en mijn auto";

    // Zonder key: puur lexicaal — 'auto' matcht 'wagen' niet, dus die valt buiten beeld.
    delete process.env.EMBEDDINGS_API_KEY;
    const lexicaal = (await recallForChat(agentId, query)).memories.map((m) => m.content);
    expect(lexicaal.some((c) => c.includes("omzet"))).toBe(true);
    expect(lexicaal.some((c) => c.includes("wagen"))).toBe(false);

    // Met key: de semantische leg haalt 'wagen' er alsnog bij (auto ~ wagen),
    // terwijl 'belasting' (orthogonaal, onder de drempel) buiten beeld blijft.
    process.env.EMBEDDINGS_API_KEY = "sk-test-123";
    const semantisch = (await recallForChat(agentId, query)).memories.map((m) => m.content);
    expect(semantisch.some((c) => c.includes("omzet"))).toBe(true);
    expect(semantisch.some((c) => c.includes("wagen"))).toBe(true);
    expect(semantisch.some((c) => c.includes("belasting"))).toBe(false);
  });
});
