import { describe, it, expect } from "vitest";
import { auditMeta, auditMetaCsv, parseNumber, parseCsv, normalizeRecords, AdAuditError, DEFAULT_THRESHOLDS } from "./adAudit";

describe("parseNumber", () => {
  it("leest NL- en EN-notatie", () => {
    expect(parseNumber("41,50")).toBe(41.5);
    expect(parseNumber("1.234,56")).toBe(1234.56);
    expect(parseNumber("1,234.56")).toBe(1234.56);
    expect(parseNumber("1,234")).toBe(1234);
    expect(parseNumber("12.345")).toBe(12345);
    expect(parseNumber("0,123")).toBe(0.123);
    expect(parseNumber("€ 15,48")).toBe(15.48);
    expect(parseNumber("1.27%")).toBe(1.27);
    expect(parseNumber("1.234567")).toBe(1.234567);
    expect(parseNumber(7)).toBe(7);
  });
  it("geeft undefined bij leeg of onleesbaar", () => {
    expect(parseNumber("")).toBeUndefined();
    expect(parseNumber("-")).toBeUndefined();
    expect(parseNumber("abc")).toBeUndefined();
    expect(parseNumber(null)).toBeUndefined();
  });
});

describe("parseCsv", () => {
  it("herkent ; als scheidingsteken (NL-Excel) en quotes", () => {
    const t = parseCsv('Naam advertentie;Besteed bedrag (EUR)\n"Kapper; v1";15,48\n"Zeg ""hoi""";3,00\n');
    expect(t).toEqual([["Naam advertentie", "Besteed bedrag (EUR)"], ["Kapper; v1", "15,48"], ['Zeg "hoi"', "3,00"]]);
  });
  it("werkt met komma en CRLF", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("normalizeRecords", () => {
  it("koppelt API-veldnamen en meldt onbekende kolommen", () => {
    const n = normalizeRecords([{ date_start: "2026-10-12", adset_name: "Kapper", spend: "15.48", impressions: "3300", rare_kolom: "x" }]);
    expect(n.mappedColumns).toMatchObject({ date: "date_start", adset: "adset_name", spend: "spend", impressions: "impressions" });
    expect(n.unmappedColumns).toEqual(["rare_kolom"]);
    expect(n.rows[0]).toMatchObject({ spend: 15.48, impressions: 3300, adset: "Kapper" });
  });
  it("koppelt NL-kolomkoppen met valuta-achtervoegsel", () => {
    const n = normalizeRecords([{ "Naam advertentieset": "Schoonheid", "Besteed bedrag (EUR)": "3,00", Vertoningen: "730" }]);
    expect(n.rows[0]).toMatchObject({ adset: "Schoonheid", spend: 3, impressions: 730 });
  });
});

// Gemodelleerd op de gemeten ronde van 12 okt 2026 (handover): kapper €15,48 / 42 kliks,
// schoonheid €3,00 / 9 kliks — 84% van het budget naar kapper.
const OKT12 = [
  { adset_name: "Kapper", ad_name: "Kapper v1", spend: "15.48", impressions: "3307", inline_link_clicks: "42", frequency: "1.4", "Website URL": "https://klanttijd.nl/voor/kapper" },
  { adset_name: "Schoonheid", ad_name: "Schoonheid v1", spend: "3.00", impressions: "732", inline_link_clicks: "9", frequency: "1.2", "Website URL": "https://klanttijd.nl/voor/schoonheid?utm_source=meta&utm_medium=paid_social" },
];

describe("auditMeta — gemeten casus 12 okt", () => {
  const r = auditMeta(OKT12, {}, new Date("2026-11-25T12:00:00Z"));
  const byId = (id: string) => r.controls.find((c) => c.id === id)!;

  it("signaleert de budgetscheefstand met advies en terugdraaiconditie", () => {
    const c = byId("budgetverdeling");
    expect(c.status).toBe("let_op");
    expect(c.detail).toContain("84%");
    expect(c.advice?.nextStep).toMatch(/PAUSED/);
    expect(c.advice?.rollback).toBeTruthy();
    expect(c.advice?.measureWindow).toBeTruthy();
  });

  it("vindt de advertentie zonder UTM", () => {
    const c = byId("utm");
    expect(c.status).toBe("probleem");
    expect(c.detail).toContain("Kapper v1");
    expect(c.detail).not.toContain("Schoonheid v1");
  });

  it("past de steekproefpoort toe: schoonheid (<1000 vertoningen) wordt niet beoordeeld", () => {
    expect(r.ads.find((a) => a.ad === "Schoonheid v1")!.judged).toBe(false);
    expect(r.ads.find((a) => a.ad === "Kapper v1")!.judged).toBe(true);
    expect(r.notes.join(" ")).toMatch(/onder 1000 vertoningen/);
  });

  it("geeft geen totaalscore en zegt onbekend waar het bewijs ontbreekt", () => {
    expect(r).not.toHaveProperty("score");
    expect(byId("creatieve_moeheid").status).toBe("onbekend");
    expect(byId("leerfase").status).toBe("onbekend");
    expect(r.coverage).toBeGreaterThan(0);
    expect(r.coverage).toBeLessThan(1);
    expect(r.totals.spend).toBe(18.48);
  });
});

describe("auditMeta — overige controles", () => {
  it("frequentie boven de eigen drempel", () => {
    const r = auditMeta([{ adset_name: "A", spend: "10", impressions: "5000", frequency: "4.2" }]);
    expect(r.controls.find((c) => c.id === "frequentie")!.status).toBe("let_op");
  });

  it("frequentie bij een dagsplitsing is eerlijk onbekend", () => {
    const r = auditMeta([
      { date_start: "2026-11-01", adset_name: "A", spend: "5", impressions: "1000", frequency: "1.1" },
      { date_start: "2026-11-02", adset_name: "A", spend: "5", impressions: "1000", frequency: "1.1" },
    ]);
    expect(r.controls.find((c) => c.id === "frequentie")!.status).toBe("onbekend");
  });

  it("frequentie uit bereik als er geen frequentiekolom is", () => {
    const r = auditMeta([{ adset_name: "A", spend: "10", impressions: "4000", reach: "1000" }]);
    const c = r.controls.find((x) => x.id === "frequentie")!;
    expect(c.status).toBe("let_op");
    expect(c.detail).toContain("A: 4,0");
  });

  it("drempels zijn overschrijfbaar", () => {
    const r = auditMeta(OKT12, { maxAdsetShare: 0.9 });
    expect(r.controls.find((c) => c.id === "budgetverdeling")!.status).toBe("ok");
    expect(r.thresholds.maxAdsetShare).toBe(0.9);
    expect(DEFAULT_THRESHOLDS.maxAdsetShare).toBe(0.7);
  });

  it("creatieve moeheid op een dagsplitsing", () => {
    const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"];
    const rows = days.map((d, i) => ({ date_start: d, ad_name: "Hook A", adset_name: "S", spend: "5", impressions: "1000", inline_link_clicks: String(i < 3 ? 20 : 8) }));
    const c = auditMeta(rows).controls.find((x) => x.id === "creatieve_moeheid")!;
    expect(c.status).toBe("let_op");
    expect(c.detail).toContain("Hook A");
  });

  it("te weinig data bij korte reeksen", () => {
    const rows = ["2026-11-01", "2026-11-02"].map((d) => ({ date_start: d, ad_name: "X", spend: "1", impressions: "100", inline_link_clicks: "1" }));
    expect(auditMeta(rows).controls.find((x) => x.id === "creatieve_moeheid")!.status).toBe("te_weinig_data");
    const rows4 = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"].map((d) => ({ date_start: d, ad_name: "X", spend: "1", impressions: "100", inline_link_clicks: "1" }));
    expect(auditMeta(rows4).controls.find((x) => x.id === "creatieve_moeheid")!.status).toBe("te_weinig_data");
  });

  it("beperkt leren wordt gemeld", () => {
    const r = auditMeta([{ adset_name: "A", spend: "5", impressions: "500", delivery: "Learning limited" }]);
    expect(r.controls.find((c) => c.id === "leerfase")!.status).toBe("let_op");
  });

  it("telt verschillende resultaattypes niet op", () => {
    const r = auditMeta([
      { ad_name: "A", spend: "5", impressions: "1500", Results: "3", "Result indicator": "Leads" },
      { ad_name: "B", spend: "5", impressions: "1500", Results: "40", "Result indicator": "Link clicks" },
    ]);
    expect(r.controls.find((c) => c.id === "vergelijkbaarheid")!.status).toBe("let_op");
    expect(r.totals.resultsByType).toEqual({ Leads: 3, "Link clicks": 40 });
    // Kosten per lead en per klik worden niet tegen elkaar gerangschikt: groepering per type.
    expect(r.ads.map((a) => a.resultType)).toEqual(["Leads", "Link clicks"]);
  });

  it("rangschikt binnen één type op laagste kosten per resultaat", () => {
    const r = auditMeta([
      { ad_name: "Duur", spend: "20", impressions: "2000", Results: "2", "Result indicator": "Leads" },
      { ad_name: "Goedkoop", spend: "10", impressions: "2000", Results: "5", "Result indicator": "Leads" },
      { ad_name: "Klein", spend: "1", impressions: "50", Results: "1", "Result indicator": "Leads" },
    ]);
    expect(r.ads.map((a) => a.ad)).toEqual(["Goedkoop", "Duur", "Klein"]);
  });

  it("werkt end-to-end op een NL-CSV met puntkomma", () => {
    const csv = "Naam advertentieset;Advertentienaam;Besteed bedrag (EUR);Vertoningen;Klikken op link\nKapper;Kapper v1;15,48;3.307;42\nSchoonheid;Schoonheid v1;3,00;732;9\n";
    const r = auditMetaCsv(csv);
    expect(r.rowsRead).toBe(2);
    expect(r.totals.impressions).toBe(4039);
    expect(r.controls.find((c) => c.id === "budgetverdeling")!.status).toBe("let_op");
  });

  it("weigert lege of niet-Meta-invoer", () => {
    expect(() => auditMeta([])).toThrow(AdAuditError);
    expect(() => auditMeta([{ foo: "bar" }])).toThrow(/Meta-export/);
  });
});
