import { describe, it, expect } from "vitest";
import {
  tokenize,
  keywordScore,
  rrfFuse,
  selectMemories,
  buildMemoryBlock,
  parseExtractedMemories,
  dedupeAgainstExisting,
} from "./memory";
import type { AgentMemory } from "@shared/schema";

// Kleine fabriek voor testherinneringen — alleen de velden die de rankers raken.
function mem(partial: Partial<AgentMemory> & { id: number; content: string }): AgentMemory {
  return {
    id: partial.id,
    agentId: 1,
    layer: "L1",
    kind: partial.kind ?? "fact",
    content: partial.content,
    keywords: partial.keywords ?? "",
    salience: partial.salience ?? 50,
    sourceMessageId: partial.sourceMessageId ?? null,
    useCount: partial.useCount ?? 0,
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    lastUsedAt: partial.lastUsedAt ?? null,
  };
}

describe("tokenize", () => {
  it("verwijdert stopwoorden, korte woorden en normaliseert naar kleine letters", () => {
    expect(tokenize("Ik heb een Webshop voor schoenen")).toEqual(["webshop", "schoenen"]);
  });

  it("geeft een lege array voor lege of stopwoord-only tekst", () => {
    expect(tokenize("de en het")).toEqual([]);
    expect(tokenize("")).toEqual([]);
  });
});

describe("keywordScore", () => {
  it("scoort een herinnering die de query-woorden dekt hoger dan een niet-relevante", () => {
    const q = tokenize("webshop schoenen voorraad");
    const hit = keywordScore(q, "De webshop verkoopt schoenen en houdt voorraad bij");
    const miss = keywordScore(q, "Kwartaalcijfers en belastingaangifte");
    expect(hit).toBeGreaterThan(miss);
    expect(miss).toBe(0);
  });

  it("geeft 0 als de query geen inhoudswoorden bevat", () => {
    expect(keywordScore([], "wat dan ook")).toBe(0);
  });
});

describe("rrfFuse", () => {
  it("beloont items die in meerdere ranglijsten bovenaan staan", () => {
    const fused = rrfFuse([
      [1, 2, 3],
      [2, 1, 3],
    ]);
    // 2 staat 1e en 2e; 1 staat 2e en 1e — vrijwel gelijk, beide boven 3.
    expect(fused.get(3)!).toBeLessThan(fused.get(1)!);
    expect(fused.get(3)!).toBeLessThan(fused.get(2)!);
  });

  it("een item bovenaan beide lijsten wint van een item onderaan beide", () => {
    const fused = rrfFuse([
      [10, 20],
      [10, 20],
    ]);
    expect(fused.get(10)!).toBeGreaterThan(fused.get(20)!);
  });
});

describe("selectMemories", () => {
  const memories = [
    mem({ id: 1, content: "De gebruiker runt een webshop in schoenen", keywords: "webshop schoenen", createdAt: "2026-01-01T00:00:00.000Z" }),
    mem({ id: 2, content: "Voorkeur voor korte, directe antwoorden", keywords: "voorkeur stijl", createdAt: "2026-02-01T00:00:00.000Z" }),
    mem({ id: 3, content: "Doel: omzet verdubbelen in 2026", keywords: "omzet doel", createdAt: "2026-03-01T00:00:00.000Z" }),
  ];

  it("selecteert de keyword-relevante herinnering voor een gerichte query", () => {
    const out = selectMemories(memories, "hoe verhoog ik de omzet van mijn webshop?");
    const ids = out.map((m) => m.id);
    expect(ids).toContain(1); // webshop
    expect(ids).toContain(3); // omzet
  });

  it("valt terug op recentheid als de query geen inhoudswoorden heeft (warmup)", () => {
    const out = selectMemories(memories, "");
    expect(out.length).toBeGreaterThan(0);
    // Nieuwste (id 3) hoort bovenaan bij een lege query.
    expect(out[0].id).toBe(3);
  });

  it("respecteert het teken-injectiebudget", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      mem({ id: i + 1, content: "x".repeat(100) + " omzet", keywords: "omzet", createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z` }),
    );
    const out = selectMemories(many, "omzet", 250);
    // Elk item ~108 tekens; budget 250 → max ~2 items.
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it("geeft niets terug bij een leeg geheugen", () => {
    expect(selectMemories([], "vraag")).toEqual([]);
  });
});

describe("buildMemoryBlock", () => {
  it("bevat zowel het persona-profiel als de herinneringen", () => {
    const block = buildMemoryBlock("Lex runt DreamTeam, een AI-platform.", [
      mem({ id: 1, content: "Werkt in het Nederlands", kind: "preference" }),
    ]);
    expect(block).toContain("GEHEUGEN");
    expect(block).toContain("Lex runt DreamTeam");
    expect(block).toContain("Werkt in het Nederlands");
    expect(block).toContain("Voorkeur");
  });

  it("is leeg zonder persona en zonder herinneringen", () => {
    expect(buildMemoryBlock(null, [])).toBe("");
  });

  it("werkt met alleen herinneringen (geen persona)", () => {
    const block = buildMemoryBlock(null, [mem({ id: 1, content: "Feit A" })]);
    expect(block).toContain("Feit A");
    expect(block).not.toContain("Profiel van deze gebruiker");
  });
});

describe("parseExtractedMemories", () => {
  it("parseert een schone JSON-array met normalisatie", () => {
    const raw = '[{"kind":"preference","content":"Houdt van korte antwoorden","keywords":["stijl","kort"],"salience":80}]';
    const out = parseExtractedMemories(raw);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("preference");
    expect(out[0].salience).toBe(80);
    expect(out[0].keywords).toContain("stijl");
  });

  it("pakt de array uit proza eromheen en klemt de salience", () => {
    const raw = 'Hier zijn de feiten: [{"content":"Bedrijf heet Acme","salience":150}] — klaar.';
    const out = parseExtractedMemories(raw);
    expect(out).toHaveLength(1);
    expect(out[0].salience).toBe(100);
    expect(out[0].kind).toBe("fact"); // default
    expect(out[0].keywords.length).toBeGreaterThan(0); // afgeleid uit content
  });

  it("ontdubbelt binnen dezelfde batch en negeert lege/ongeldige items", () => {
    const raw = '[{"content":"Runt een webshop"},{"content":"Webshop runt"},{"content":""},{"nonsense":true}]';
    const out = parseExtractedMemories(raw);
    expect(out).toHaveLength(1); // twee zijn token-identiek, twee zijn ongeldig
  });

  it("geeft een lege array zonder JSON of bij een lege array", () => {
    expect(parseExtractedMemories("geen json")).toEqual([]);
    expect(parseExtractedMemories("[]")).toEqual([]);
  });
});

describe("dedupeAgainstExisting", () => {
  it("verwijdert kandidaten die sterk lijken op bestaande herinneringen", () => {
    const existing = [mem({ id: 1, content: "De gebruiker runt een webshop in schoenen" })];
    const candidates = parseExtractedMemories(
      '[{"content":"Gebruiker runt webshop schoenen"},{"content":"Doel is meer omzet volgend jaar"}]',
    );
    const out = dedupeAgainstExisting(candidates, existing);
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain("omzet");
  });

  it("laat alles door als er niets bestaands is", () => {
    const candidates = parseExtractedMemories('[{"content":"Nieuw feit een"},{"content":"Nieuw feit twee"}]');
    expect(dedupeAgainstExisting(candidates, [])).toHaveLength(2);
  });
});
