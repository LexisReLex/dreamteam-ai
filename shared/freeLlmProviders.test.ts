import { describe, it, expect } from "vitest";
import {
  LLM_PROVIDERS,
  getFreeProviders,
  getTrialProviders,
  getProviderById,
  getProviderSummary,
  SOURCE_URL,
  SNAPSHOT_DATE,
} from "./freeLlmProviders";

describe("freeLlmProviders dataset", () => {
  it("bevat providers en elke provider heeft de verplichte velden", () => {
    expect(LLM_PROVIDERS.length).toBeGreaterThan(0);
    for (const p of LLM_PROVIDERS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.url).toMatch(/^https?:\/\//);
      expect(["free", "trial"]).toContain(p.category);
      expect(Array.isArray(p.models)).toBe(true);
      expect(p.models.length).toBeGreaterThan(0);
      for (const m of p.models) expect(m.name).toBeTruthy();
    }
  });

  it("heeft unieke provider-id's", () => {
    const ids = LLM_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("splitst correct in gratis en trial (samen het geheel)", () => {
    const free = getFreeProviders();
    const trial = getTrialProviders();
    expect(free.every((p) => p.category === "free")).toBe(true);
    expect(trial.every((p) => p.category === "trial")).toBe(true);
    expect(free.length + trial.length).toBe(LLM_PROVIDERS.length);
  });

  it("elke trial-provider vermeldt credits, elke gratis-provider heeft context", () => {
    for (const p of getTrialProviders()) expect(p.credits).toBeTruthy();
    // Gratis providers hebben context: account-limiet, model-limiet óf een toelichting.
    // (Niet elke provider publiceert harde cijfers — die verzinnen we niet.)
    for (const p of getFreeProviders()) {
      const hasModelLimits = p.models.some((m) => !!m.limits);
      expect(!!p.limits || hasModelLimits || !!p.notes).toBe(true);
    }
  });

  it("getProviderById vindt een bestaande en geeft undefined voor onbekend", () => {
    expect(getProviderById("groq")?.name).toBe("Groq");
    expect(getProviderById("bestaat-niet")).toBeUndefined();
  });

  it("de samenvatting telt consistent en draagt de bronvermelding", () => {
    const s = getProviderSummary();
    expect(s.total).toBe(LLM_PROVIDERS.length);
    expect(s.free + s.trial).toBe(s.total);
    expect(s.models).toBe(LLM_PROVIDERS.reduce((n, p) => n + p.models.length, 0));
    expect(s.source).toBe(SOURCE_URL);
    expect(s.snapshotDate).toBe(SNAPSHOT_DATE);
  });
});
