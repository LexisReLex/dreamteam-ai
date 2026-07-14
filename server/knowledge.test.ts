import { describe, it, expect } from "vitest";
import { tokenize, scoreEntry, rankKnowledge, buildKnowledgeContext } from "./knowledge";
import type { Knowledge } from "@shared/schema";

const entry = (id: number, title: string, content: string, tags = ""): Knowledge => ({
  id,
  title,
  content,
  tags,
  createdAt: new Date(2026, 0, id).toISOString(),
});

describe("tokenize", () => {
  it("splitst, verlaagt en verwijdert korte woorden en stopwoorden", () => {
    const t = tokenize("De nieuwe Marketing-strategie voor 2026!");
    expect(t).toContain("nieuwe");
    expect(t).toContain("marketing");
    expect(t).toContain("strategie");
    expect(t).not.toContain("de"); // stopwoord
    expect(t).not.toContain("voor"); // stopwoord
  });

  it("houdt cijferreeksen van 3+ tekens", () => {
    expect(tokenize("plan 2026")).toContain("2026");
  });

  it("geeft een lege lijst voor lege input", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("scoreEntry", () => {
  it("weegt titel zwaarder dan inhoud", () => {
    const titleHit = entry(1, "marketing plan", "iets anders");
    const contentHit = entry(2, "iets anders", "marketing plan");
    const q = tokenize("marketing");
    expect(scoreEntry(q, titleHit)).toBeGreaterThan(scoreEntry(q, contentHit));
  });

  it("geeft 0 zonder overlap", () => {
    expect(scoreEntry(tokenize("boekhouding"), entry(1, "social media", "posts"))).toBe(0);
  });

  it("geeft 0 bij lege query", () => {
    expect(scoreEntry([], entry(1, "titel", "inhoud"))).toBe(0);
  });

  it("telt tags mee", () => {
    const e = entry(1, "titel", "inhoud", "sales, pricing");
    expect(scoreEntry(tokenize("pricing"), e)).toBeGreaterThan(0);
  });
});

describe("rankKnowledge", () => {
  const entries = [
    entry(1, "Merkstem en tone of voice", "schrijf in de je-vorm", "merk, content"),
    entry(2, "Aanbod en prijzen", "drie plannen: starter pro team", "sales, pricing"),
    entry(3, "Boekhouding", "btw-aangifte per kwartaal", "finance"),
  ];

  it("geeft alleen relevante bronnen, gesorteerd op score", () => {
    const res = rankKnowledge("wat is onze merkstem voor content", entries);
    expect(res[0].id).toBe(1);
    expect(res.every((e) => e.id !== 3)).toBe(true); // boekhouding is niet relevant
  });

  it("respecteert de limit", () => {
    const res = rankKnowledge("plannen prijzen merk content sales", entries, 1);
    expect(res).toHaveLength(1);
  });

  it("geeft een lege lijst zonder enige overlap", () => {
    expect(rankKnowledge("astronomie ruimtevaart", entries)).toEqual([]);
  });

  it("geeft een lege lijst bij een lege query", () => {
    expect(rankKnowledge("", entries)).toEqual([]);
  });
});

describe("buildKnowledgeContext", () => {
  it("geeft een lege string zonder bronnen", () => {
    expect(buildKnowledgeContext([])).toBe("");
  });

  it("bevat de titels en kapt lange inhoud af", () => {
    const long = entry(1, "Lange bron", "x".repeat(2000));
    const ctx = buildKnowledgeContext([long], 100);
    expect(ctx).toContain("Lange bron");
    expect(ctx).toContain("Knowledge Vault");
    // inhoud gecapt op ~100 tekens, ver onder de 2000
    expect(ctx.length).toBeLessThan(400);
  });
});
