import { describe, it, expect, beforeEach } from "vitest";
import {
  estimateTokens,
  detectContentType,
  compressJson,
  compressText,
  compress,
  compressState,
  splitStateEntries,
  getHeadroomStats,
  resetHeadroomStats,
} from "./headroom";

beforeEach(() => resetHeadroomStats());

describe("estimateTokens", () => {
  it("schat ~4 tekens per token", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2); // afronden naar boven
  });
});

describe("detectContentType", () => {
  it("herkent geldige JSON-objecten en -arrays", () => {
    expect(detectContentType('{"a":1}')).toBe("json");
    expect(detectContentType("[1,2,3]")).toBe("json");
  });

  it("behandelt proza en kapotte JSON als tekst", () => {
    expect(detectContentType("gewoon een zin")).toBe("text");
    expect(detectContentType("{kapot: json")).toBe("text");
    expect(detectContentType("")).toBe("text");
  });
});

describe("compressJson", () => {
  it("verwijdert opmaak-whitespace maar behoudt de betekenis", () => {
    const pretty = '{\n  "a": 1,\n  "b": [1, 2, 3]\n}';
    const compact = compressJson(pretty);
    expect(compact).toBe('{"a":1,"b":[1,2,3]}');
    expect(JSON.parse(compact)).toEqual(JSON.parse(pretty));
    expect(compact.length).toBeLessThan(pretty.length);
  });

  it("laat ongeldige JSON ongemoeid", () => {
    expect(compressJson("{kapot")).toBe("{kapot");
  });
});

describe("compressText", () => {
  it("haalt ceremonie weg zonder inhoud te raken", () => {
    const input = "regel een   met   spaties  \n\n\n\nregel twee\t\tmet tabs";
    const out = compressText(input);
    expect(out).toBe("regel een met spaties\n\nregel twee met tabs");
    expect(out).toContain("regel een");
    expect(out).toContain("regel twee");
  });
});

describe("compress (ContentRouter)", () => {
  it("routeert JSON naar de JSON-compressor en meet de besparing", () => {
    const r = compress('{\n  "x": 1\n}', { record: false });
    expect(r.type).toBe("json");
    expect(r.saved).toBeGreaterThan(0);
    expect(r.tokensAfter).toBeLessThanOrEqual(r.tokensBefore);
  });

  it("routeert proza naar de tekst-compressor", () => {
    const r = compress("veel     spaties", { record: false });
    expect(r.type).toBe("text");
    expect(r.text).toBe("veel spaties");
  });
});

describe("splitStateEntries", () => {
  it("splitst de STATE op de run-koppen", () => {
    const state = "## 2026-07-14 09:30 — APPROVE (score 80)\noutput a\n## 2026-07-14 08:00 — REJECT (score 20)\noutput b";
    const parts = splitStateEntries(state);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("APPROVE");
    expect(parts[1]).toContain("REJECT");
  });

  it("geeft de hele tekst terug als er geen koppen zijn", () => {
    expect(splitStateEntries("geen koppen hier")).toEqual(["geen koppen hier"]);
    expect(splitStateEntries("")).toEqual([]);
  });
});

describe("compressState", () => {
  it("laat korte state ongemoeid (alleen ceremonie weg)", () => {
    const state = "## 2026-07-14 09:30 — APPROVE (score 80)\noutput";
    const r = compressState(state, 4000, { record: false });
    expect(r.droppedEntries).toBe(0);
    expect(r.text).toContain("APPROVE");
    expect(r.text).not.toContain("afgekapt");
  });

  it("laat de oudste hele entries vallen en markeert dat expliciet", () => {
    // Bouw meer entries dan het budget aankan; nieuwste staat vooraan.
    const entries = Array.from({ length: 20 }, (_, i) =>
      `## entry ${20 - i}\n${"x".repeat(100)}`
    ).join("\n");
    const r = compressState(entries, 300, { record: false });
    expect(r.droppedEntries).toBeGreaterThan(0);
    expect(r.text).toContain("afgekapt door Headroom");
    // De nieuwste entry (bovenaan) blijft behouden.
    expect(r.text).toContain("entry 20");
    // De oudste is weg.
    expect(r.text).not.toContain("entry 1\n");
    expect(r.tokensAfter).toBeLessThan(r.tokensBefore);
  });
});

describe("getHeadroomStats", () => {
  it("telt besparingen cumulatief op over meerdere compressies", () => {
    compress('{\n  "a": 1\n}'); // record = true
    compress("veel     spaties   hier");
    const s = getHeadroomStats();
    expect(s.compressions).toBe(2);
    expect(s.tokensSaved).toBeGreaterThan(0);
    expect(s.tokensBefore).toBeGreaterThan(s.tokensAfter);
    expect(s.savingsPct).toBeGreaterThanOrEqual(0);
    expect(s.savingsPct).toBeLessThanOrEqual(100);
  });

  it("start op nul na een reset", () => {
    const s = getHeadroomStats();
    expect(s).toMatchObject({ compressions: 0, tokensBefore: 0, tokensAfter: 0, tokensSaved: 0 });
  });
});
