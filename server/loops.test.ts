import { describe, it, expect } from "vitest";
import { parseCadenceMs, computeNextRunAt, parseCheckerResult, buildMakerSystem, buildStateEntry } from "./loops";

describe("parseCadenceMs", () => {
  it("zet bekende cadans om naar milliseconden", () => {
    expect(parseCadenceMs("15m")).toBe(15 * 60 * 1000);
    expect(parseCadenceMs("2h")).toBe(2 * 60 * 60 * 1000);
    expect(parseCadenceMs("6h")).toBe(6 * 60 * 60 * 1000);
    expect(parseCadenceMs("1d")).toBe(24 * 60 * 60 * 1000);
  });

  it("geeft null voor 'manual' en onbekende waarden", () => {
    expect(parseCadenceMs("manual")).toBeNull();
    expect(parseCadenceMs("onzin")).toBeNull();
    expect(parseCadenceMs("")).toBeNull();
  });
});

describe("computeNextRunAt", () => {
  it("telt de cadans op bij het startmoment", () => {
    expect(computeNextRunAt("2h", 0)).toBe(new Date(2 * 60 * 60 * 1000).toISOString());
    expect(computeNextRunAt("1d", 0)).toBe(new Date(24 * 60 * 60 * 1000).toISOString());
  });

  it("geeft null voor niet-planbare cadans", () => {
    expect(computeNextRunAt("manual", 0)).toBeNull();
    expect(computeNextRunAt("onzin", 0)).toBeNull();
  });
});

describe("parseCheckerResult", () => {
  it("parseert een schoon JSON-oordeel", () => {
    const r = parseCheckerResult('{"verdict":"APPROVE","score":85,"critique":"prima"}');
    expect(r.verdict).toBe("APPROVE");
    expect(r.score).toBe(85);
    expect(r.critique).toBe("prima");
  });

  it("pakt JSON uit tekst eromheen en normaliseert het verdict", () => {
    const r = parseCheckerResult('Hier is mijn oordeel: {"verdict":"reject","score":30} — klaar.');
    expect(r.verdict).toBe("REJECT");
    expect(r.score).toBe(30);
  });

  it("klemt de score tussen 0 en 100", () => {
    expect(parseCheckerResult('{"verdict":"APPROVE","score":150}').score).toBe(100);
    expect(parseCheckerResult('{"verdict":"REJECT","score":-20}').score).toBe(0);
  });

  it("valt terug op ESCALATE/score 0 bij een ongeldig verdict", () => {
    const r = parseCheckerResult('{"verdict":"MISSCHIEN","score":50}');
    expect(r.verdict).toBe("ESCALATE");
  });

  it("valt terug op ESCALATE/score 0 zonder JSON", () => {
    const r = parseCheckerResult("geen json hier");
    expect(r.verdict).toBe("ESCALATE");
    expect(r.score).toBe(0);
  });
});

describe("buildMakerSystem", () => {
  it("bevat doel, STATE en de zelfverbeterings-instructie", () => {
    const s = buildMakerSystem("Je bent Nova.", "Doe X", "## eerdere run\nVerifier: wees concreter");
    expect(s).toContain("Je bent Nova.");
    expect(s).toContain("Doe X");
    expect(s).toContain("Verifier: wees concreter");
    expect(s).toContain("verbeterpunten");
  });

  it("gebruikt een fallback als de STATE leeg is", () => {
    const s = buildMakerSystem("Je bent Nova.", "Doe X", null);
    expect(s).toContain("nog geen historie");
  });
});

describe("buildStateEntry", () => {
  it("zet de verifier-critique in de state zodat de loop ervan leert", () => {
    const e = buildStateEntry("2026-07-14T09:30:00.000Z", "APPROVE", 82, "3 ideeën...", "prima, maar meer cijfers");
    expect(e).toContain("2026-07-14 09:30 — APPROVE (score 82)");
    expect(e).toContain("3 ideeën...");
    expect(e).toContain("Verifier: prima, maar meer cijfers");
  });

  it("toont '(geen output)' zonder maker-output en laat de verifier-regel weg zonder critique", () => {
    const e = buildStateEntry("2026-07-14T09:30:00.000Z", "ERROR", 0, "", "");
    expect(e).toContain("(geen output)");
    expect(e).not.toContain("Verifier:");
  });
});
