import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Regressietest: "vergeten" moet écht vergeten zijn ─────────────────────────
// Een gewist feit zit óók in het persona-profiel (L3) gebakken, en dat profiel
// gaat bij élke chatbeurt mee de systeemprompt in. Deze tests dekken af dat het
// feit uit béide lagen verdwijnt, en dat een volledige wis niet bij de volgende
// extractie stilletjes ongedaan gemaakt wordt.
//
// Alleen de LLM-grens is gemockt. De persona-mock echoot de feiten die hij
// krijgt, zodat "staat dit feit nog in het profiel?" een echte vraag is.

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async ({ system, messages }: { system: string; messages: { content: string }[] }) => {
    if (system.includes("geheugen-extractor")) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              { kind: "fact", content: "Lex runt een webshop in schoenen", keywords: ["webshop"], salience: 90 },
              { kind: "fact", content: "Lex heeft een scheiding achter de rug", keywords: ["scheiding"], salience: 85 },
              { kind: "preference", content: "Houdt van korte, directe antwoorden", keywords: ["stijl"], salience: 70 },
            ]),
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      };
    }
    if (system.includes("profiel")) {
      // Echo de aangeleverde feiten: zo meet de test of een gewist feit écht weg is.
      return {
        content: [{ type: "text", text: `Profiel op basis van: ${messages[0].content}` }],
        usage: { input_tokens: 80, output_tokens: 40 },
      };
    }
    return { content: [{ type: "text", text: "[]" }], usage: { input_tokens: 10, output_tokens: 5 } };
  }),
}));

vi.mock("./ai", () => ({
  anthropicClient: { messages: { create: createMock } },
  checkAndUpdateBudget: () => true,
  reconcileBudget: () => {},
  getBudgetStatus: () => ({ used: 0, limit: 1000, remaining: 1000, resetAt: "" }),
}));

import {
  extractMemories,
  maybeSynthesizePersona,
  recallForChat,
  visibleMemories,
  forgetMemory,
  forgetAll,
} from "./memory";
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

// forgetMemory retourneert de herbouw-belofte; awaiten is genoeg om de
// achtergrond-hersynthese uit te laten lopen.

describe("vergeten (L1 + L3)", () => {
  let agentId: number;
  beforeEach(async () => {
    createMock.mockClear();
    agentId = seedAgent();
    chat(agentId, 3);
    await extractMemories(agentId, { force: true });
    await maybeSynthesizePersona(agentId, { force: true });
  });

  it("haalt een vergeten feit óók uit het persona-profiel en uit het recall-blok", async () => {
    const gevoelig = visibleMemories(agentId).find((m) => m.content.includes("scheiding"))!;
    expect(storage.getPersona(agentId)?.profile).toContain("scheiding");

    await forgetMemory(agentId, gevoelig.id);

    expect(visibleMemories(agentId).some((m) => m.content.includes("scheiding"))).toBe(false);
    expect(storage.getPersona(agentId)?.profile ?? "").not.toContain("scheiding");

    const recall = recallForChat(agentId, "waar was ik ook alweer mee bezig");
    expect(recall.block).not.toContain("scheiding");
    // De overgebleven feiten zitten er nog wél in — we gooien niet te veel weg.
    expect(storage.getPersona(agentId)?.profile).toContain("webshop");
  });

  it("laat geen profiel achter als het laatste feit vergeten wordt", async () => {
    // Snel achter elkaar wissen: de herbouw van de eerste mag niet ná die van
    // de laatste landen. Alleen op de laatste belofte wachten is genoeg.
    let laatste: Promise<void> = Promise.resolve();
    for (const m of visibleMemories(agentId)) laatste = forgetMemory(agentId, m.id);
    await laatste;

    expect(visibleMemories(agentId).length).toBe(0);
    expect(storage.getPersona(agentId)).toBeUndefined();
    const recall = recallForChat(agentId, "hoi");
    expect(recall.persona).toBe(false);
    expect(recall.block).toBe("");
  });

  it("zet na een volledige wis de watermark door, zodat gewiste feiten niet terugkomen", async () => {
    forgetAll(agentId);
    expect(visibleMemories(agentId).length).toBe(0);
    expect(storage.getPersona(agentId)).toBeUndefined();

    createMock.mockClear();
    const opnieuw = await extractMemories(agentId); // zonder force: mag niets doen
    expect(createMock).not.toHaveBeenCalled();
    expect(opnieuw).toEqual([]);
    expect(visibleMemories(agentId).length).toBe(0);
  });

  it("hersynthetiseert het profiel ook als het geheugen krimpt in plaats van groeit", async () => {
    // Simuleer een profiel dat op véél meer feiten gebouwd was (prune/wis eerder).
    storage.upsertPersona(agentId, "verouderd profiel", 20);
    expect(visibleMemories(agentId).length).toBe(3);

    const opnieuw = await maybeSynthesizePersona(agentId); // zonder force
    expect(opnieuw).toBe(true);
    expect(storage.getPersona(agentId)?.profile).not.toBe("verouderd profiel");
    expect(storage.getPersona(agentId)?.memoryCount).toBe(3);
  });
});
