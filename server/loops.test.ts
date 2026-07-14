import { describe, it, expect } from "vitest";
import { parseCadenceMs, computeNextRunAt, parseCheckerResult } from "./loops";

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
