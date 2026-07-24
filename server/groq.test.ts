import { describe, it, expect } from "vitest";
import { chooseProvider, GROQ_MODEL } from "./groq";

describe("chooseProvider (pure routing-keuze)", () => {
  it("kiest altijd anthropic als Groq uit staat (geen key)", () => {
    expect(chooseProvider({ role: "Klantenservice", category: "support" }, false)).toBe("anthropic");
    expect(chooseProvider({ role: "Data Analist", category: "analytics" }, false)).toBe("anthropic");
  });

  it("routeert support-werk naar Groq als het aan staat", () => {
    expect(chooseProvider({ role: "Klantenservice", category: "support" }, true)).toBe("groq");
    expect(chooseProvider({ role: "Sales Coach", category: "sales" }, true)).toBe("groq");
  });

  it("routeert onbekend/algemeen werk naar Groq als het aan staat", () => {
    expect(chooseProvider({ role: "Onbekend", category: "" }, true)).toBe("groq");
  });

  it("houdt hoge-inzet werk op het betaalde model, ook met Groq aan", () => {
    expect(chooseProvider({ role: "Financieel Adviseur", category: "finance" }, true)).toBe("anthropic");
    expect(chooseProvider({ role: "Strategisch Adviseur", category: "strategy" }, true)).toBe("anthropic");
  });

  it("houdt creatief/analyse werk op het betaalde model (Groq is daar niet primair)", () => {
    expect(chooseProvider({ role: "Content Creator", category: "content" }, true)).toBe("anthropic");
    expect(chooseProvider({ role: "SEO Specialist", category: "marketing" }, true)).toBe("anthropic");
  });

  it("heeft een niet-lege default Groq-model-id", () => {
    expect(GROQ_MODEL).toBeTruthy();
  });
});
