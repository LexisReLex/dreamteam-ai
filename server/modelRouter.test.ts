import { describe, it, expect } from "vitest";
import {
  TASK_PROFILES,
  profileForAgent,
  recommendForProfile,
  recommendForAgent,
  allRecommendations,
  providerFor,
  type TaskProfileKey,
} from "./modelRouter";
import { getProviderById } from "@shared/freeLlmProviders";

const ALL_KEYS = Object.keys(TASK_PROFILES) as TaskProfileKey[];

describe("modelRouter — profiel-afleiding", () => {
  it("financieel en strategisch werk gaat naar hoge-inzet-redeneren", () => {
    expect(profileForAgent({ role: "Financieel Adviseur", category: "finance" })).toBe("hoge-inzet-redeneren");
    expect(profileForAgent({ role: "Strategisch Adviseur", category: "strategy" })).toBe("hoge-inzet-redeneren");
  });

  it("SEO en data gaan naar analyse-lange-context", () => {
    expect(profileForAgent({ role: "SEO Specialist", category: "marketing" })).toBe("analyse-lange-context");
    expect(profileForAgent({ role: "Data Analist", category: "analytics" })).toBe("analyse-lange-context");
  });

  it("klantenservice en sales gaan naar hoog-volume-support", () => {
    expect(profileForAgent({ role: "Klantenservice", category: "support" })).toBe("hoog-volume-support");
    expect(profileForAgent({ role: "Sales Coach", category: "sales" })).toBe("hoog-volume-support");
  });

  it("content en marketing gaan naar creatief-schrijven", () => {
    expect(profileForAgent({ role: "Content Creator", category: "content" })).toBe("creatief-schrijven");
    expect(profileForAgent({ role: "Marketing Strateeg", category: "marketing" })).toBe("creatief-schrijven");
  });

  it("valt terug op algemeen bij onbekend werk", () => {
    expect(profileForAgent({ role: "Onbekend", category: "" })).toBe("algemeen");
    expect(profileForAgent({})).toBe("algemeen");
  });
});

describe("modelRouter — aanbevelingen", () => {
  it("elke kandidaat verwijst naar een provider die echt in de catalogus staat", () => {
    for (const rec of allRecommendations()) {
      const candidates = [rec.primary, ...rec.alternatives];
      expect(candidates.length).toBeGreaterThan(0);
      for (const c of candidates) {
        const provider = getProviderById(c.providerId);
        expect(provider, `onbekende providerId: ${c.providerId}`).toBeDefined();
        expect(c.model).toBeTruthy();
        expect(c.rationale).toBeTruthy();
        expect(["gratis", "proeftegoed"]).toContain(c.tier);
      }
    }
  });

  it("levert voor elk profiel een primaire keuze met uitleg en escalatie", () => {
    for (const key of ALL_KEYS) {
      const rec = recommendForProfile(key);
      expect(rec.primary).toBeDefined();
      expect(rec.profileLabel).toBe(TASK_PROFILES[key].label);
      expect(rec.escalation).toBeTruthy();
    }
  });

  it("hoge inzet verwijst in de escalatie eerlijk naar het betaalde standaardmodel", () => {
    const rec = recommendForProfile("hoge-inzet-redeneren");
    expect(rec.escalation.toLowerCase()).toMatch(/betaalde|claude|oranje/);
  });

  it("recommendForAgent koppelt agent → profiel → aanbeveling", () => {
    const rec = recommendForAgent({ role: "Klantenservice", category: "support" });
    expect(rec.profile).toBe("hoog-volume-support");
    expect(rec.primary.providerId).toBe("groq");
  });

  it("providerFor geeft het volledige provider-detail terug", () => {
    const rec = recommendForProfile("hoog-volume-support");
    const provider = providerFor(rec.primary);
    expect(provider?.name).toBe("Groq");
    expect(provider?.url).toMatch(/^https?:\/\//);
  });
});
