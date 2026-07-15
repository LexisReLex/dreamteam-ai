import { describe, it, expect } from "vitest";
import {
  normalizeSeverity,
  computeRisk,
  parseCandidates,
  parseValidation,
  buildScannerSystem,
  buildValidatorSystem,
  buildSummary,
} from "./scans";

describe("normalizeSeverity", () => {
  it("accepteert geldige severities (case-insensitive)", () => {
    expect(normalizeSeverity("KRITIEK")).toBe("kritiek");
    expect(normalizeSeverity("hoog")).toBe("hoog");
    expect(normalizeSeverity(" middel ")).toBe("middel");
  });

  it("valt terug op 'info' bij onbekende of lege waarden", () => {
    expect(normalizeSeverity("critical")).toBe("info");
    expect(normalizeSeverity("")).toBe("info");
    expect(normalizeSeverity(undefined)).toBe("info");
    expect(normalizeSeverity(42)).toBe("info");
  });
});

describe("computeRisk", () => {
  it("geeft een schone scan zonder bevindingen", () => {
    expect(computeRisk([])).toEqual({ riskScore: 0, riskBand: "schoon" });
  });

  it("telt severity-gewichten op en klemt op 100", () => {
    const r = computeRisk([{ severity: "kritiek" }, { severity: "kritiek" }, { severity: "kritiek" }]);
    expect(r.riskScore).toBe(100); // 3 * 40 = 120 → geklemd op 100
    expect(r.riskBand).toBe("kritiek");
  });

  it("baseert de band op de zwaarste aanwezige severity", () => {
    const r = computeRisk([{ severity: "laag" }, { severity: "middel" }, { severity: "laag" }]);
    expect(r.riskBand).toBe("middel");
    expect(r.riskScore).toBe(5 + 12 + 5);
  });

  it("verwerkt uitsluitend lage severities correct", () => {
    const r = computeRisk([{ severity: "info" }, { severity: "info" }]);
    expect(r.riskScore).toBe(2);
    expect(r.riskBand).toBe("info");
  });
});

describe("parseCandidates", () => {
  it("parseert een schone JSON-array met titels", () => {
    const raw = '[{"title":"Geen call-to-action","category":"marketing","rationale":"De homepage mist een duidelijke CTA."}]';
    const c = parseCandidates(raw);
    expect(c).toHaveLength(1);
    expect(c[0].title).toBe("Geen call-to-action");
    expect(c[0].category).toBe("marketing");
  });

  it("pakt de array uit tekst eromheen en negeert items zonder titel", () => {
    const raw = 'Hier: [{"title":"A"},{"category":"x"},{"title":"B"}] klaar';
    const c = parseCandidates(raw);
    expect(c.map((x) => x.title)).toEqual(["A", "B"]);
  });

  it("respecteert de max en geeft leeg terug zonder JSON", () => {
    const raw = JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ title: `t${i}` })));
    expect(parseCandidates(raw, 3)).toHaveLength(3);
    expect(parseCandidates("geen json")).toEqual([]);
  });
});

describe("parseValidation", () => {
  it("parseert bevestigde bevindingen met genormaliseerde severity", () => {
    const raw = '{"confirmed":[{"ref":0,"severity":"HOOG","evidence":"e","impact":"i","remediation":"r"}]}';
    const v = parseValidation(raw);
    expect(v).toHaveLength(1);
    expect(v[0].ref).toBe(0);
    expect(v[0].severity).toBe("hoog");
    expect(v[0].remediation).toBe("r");
  });

  it("negeert items zonder geldige ref en niet-JSON", () => {
    expect(parseValidation('{"confirmed":[{"severity":"hoog"},{"ref":2,"severity":"laag"}]}').map((v) => v.ref)).toEqual([2]);
    expect(parseValidation("niets")).toEqual([]);
    expect(parseValidation('{"confirmed":[]}')).toEqual([]);
  });
});

describe("buildScannerSystem", () => {
  it("bevat het domein-prompt, doel en de JSON-instructie", () => {
    const s = buildScannerSystem("Je bent Finn.", "Finn", "Webshop met dalende marge", "alleen financiën");
    expect(s).toContain("Je bent Finn.");
    expect(s).toContain("VERKENNER");
    expect(s).toContain("Webshop met dalende marge");
    expect(s).toContain("alleen financiën");
    expect(s).toContain("JSON-array");
  });

  it("laat de scope-regel weg als er geen scope is", () => {
    const s = buildScannerSystem("Je bent Finn.", "Finn", "Doel", "");
    expect(s).not.toContain("Afbakening (scope):");
  });
});

describe("buildValidatorSystem", () => {
  it("beschrijft de maker/checker-splitsing en het confirmed-schema", () => {
    const s = buildValidatorSystem();
    expect(s).toContain("VALIDATOR");
    expect(s).toContain("false positives");
    expect(s).toContain('"confirmed"');
  });
});

describe("buildSummary", () => {
  it("meldt bevestigde bevindingen en gefilterde false positives", () => {
    expect(buildSummary(2, 3, 5, "hoog")).toContain("2 bevinding(en) bevestigd");
    expect(buildSummary(2, 3, 5, "hoog")).toContain("3 van 5");
  });

  it("meldt een schone uitkomst zonder bevindingen", () => {
    expect(buildSummary(0, 4, 4, "schoon")).toContain("Geen bevindingen bevestigd");
  });
});
