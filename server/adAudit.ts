/**
 * Meta-advertentiecontrole (keyless) — patronen geoogst uit AgriciDaniel/claude-ads
 * (MIT, HEAD fc3908e, v2.1.0). Geen code overgenomen; eigen vertaling naar TypeScript.
 *
 * Wat het doet: leest een Meta-export (CSV uit Advertentiebeheer of rijen uit de
 * Insights-API) en loopt een vaste controlelijst af. Elke controle zegt óf ze iets
 * kan beoordelen. Ontbreekt het bewijs, dan is de uitkomst `onbekend` — dat verlaagt
 * de dekking, nooit het oordeel (claude-ads `scoring.py`, geoogst als vdb-031).
 *
 * Wat het bewust NIET doet:
 *  - geen totaalscore (claude-ads 2.1.0 zette alle scoring-profielen zelf uit, omdat
 *    een 0–100-cijfer niet te onderbouwen was; CHANGELOG 2.1.0 "no score is produced");
 *  - geen netwerk, geen sleutel, geen accountwijziging. Elk advies is een voorstel;
 *    live zetten of pauzeren blijft een GO van de eigenaar (ads-001 / ads-002).
 *
 * Drempels zijn EIGEN drempels van de eigenaar, geen platformnorm (claude-ads
 * `meta-audit.md`: "Do not use fixed platform-wide thresholds"). De defaults hieronder
 * komen uit DreamTeam's eigen werkafspraken (docs/brand-dna.md §3) en zijn overschrijfbaar.
 */

export type Status = "ok" | "let_op" | "probleem" | "onbekend" | "niet_van_toepassing" | "te_weinig_data";

export interface Advice {
  /** Wat er gezien is, met getallen. */
  evidence: string;
  /** Waarom dit ertoe doet. */
  mechanism: string;
  /** Kleinste omkeerbare volgende stap. Uitvoeren = GO van de eigenaar. */
  nextStep: string;
  /** Wanneer je weet of het werkte. */
  measureWindow: string;
  /** Wanneer je het terugdraait. */
  rollback: string;
}

export interface ControlResult {
  id: string;
  /** Catalogus-ID in claude-ads `ads/references/meta-audit.md`, voor herkomst. */
  sourceId: string;
  title: string;
  status: Status;
  detail: string;
  advice?: Advice;
}

export interface Thresholds {
  /** Minimum vertoningen per advertentie voordat je haar mag beoordelen. */
  minImpressions: number;
  /** Maximaal aandeel van het budget dat één advertentieset mag krijgen. */
  maxAdsetShare: number;
  /** Maximale gemiddelde frequentie per advertentieset. */
  maxFrequency: number;
  /** Maximale CTR-daling (fractie) tussen eerste en tweede helft van de periode. */
  maxCtrDrop: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  // docs/brand-dna.md §3: "Na 1.000 vertoningen per ad: verliezers uit".
  minImpressions: 1000,
  // Eigen drempel. Aanleiding: 12 okt 2026 ging 84% naar kapper en werd schoonheid doodgeknepen.
  maxAdsetShare: 0.7,
  maxFrequency: 3,
  maxCtrDrop: 0.3,
};

/** Canonieke velden waarop de controles draaien. */
export interface AdRow {
  date?: string;
  campaign?: string;
  adset?: string;
  ad?: string;
  spend?: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  clicks?: number;
  results?: number;
  resultType?: string;
  url?: string;
  delivery?: string;
}

type Field = keyof AdRow;

/**
 * Kolomnamen → canoniek veld. Herkomst per groep:
 *  - API: Meta Insights-veldnamen (developers.facebook.com, Insights-referentie; ook
 *    gebruikt in claude-ads `tests/fixtures/native_exports/meta.csv`). Bron-gegrond.
 *  - UI-EN / UI-NL: kolomkoppen uit Advertentiebeheer-exports. NIET nagemeten tegen een
 *    echte export van dit account; de eerste echte export is de meting. Onbekende kolommen
 *    komen terug in `unmappedColumns`, zodat een verkeerde alias zichtbaar is.
 */
const ALIASES: Record<Field, string[]> = {
  date: ["date_start", "date", "day", "reporting starts", "dag", "begin rapportage", "rapportage begint"],
  campaign: ["campaign_name", "campaign name", "campagnenaam", "naam campagne"],
  adset: ["adset_name", "ad set name", "naam advertentieset", "advertentiesetnaam"],
  ad: ["ad_name", "ad name", "advertentienaam", "naam advertentie"],
  spend: ["spend", "amount spent", "amount spent (eur)", "besteed bedrag", "besteed bedrag (eur)"],
  impressions: ["impressions", "vertoningen"],
  reach: ["reach", "bereik"],
  frequency: ["frequency", "frequentie"],
  clicks: ["inline_link_clicks", "link clicks", "klikken op link", "linkklikken", "clicks", "klikken (alle)", "clicks (all)"],
  results: ["results", "resultaten"],
  resultType: ["result indicator", "result type", "resultaatindicator", "resultaattype"],
  url: ["website url", "url_tags", "url parameters", "url-parameters", "website-url", "link (ad settings)"],
  delivery: ["delivery", "effective_status", "levering", "weergave", "status van levering"],
};

const NUMERIC: Field[] = ["spend", "impressions", "reach", "frequency", "clicks", "results"];

function norm(h: string): string {
  return h.replace(/^﻿/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Leest getallen in NL- (1.234,56) én EN-notatie (1,234.56). Leeg of onleesbaar = undefined. */
export function parseNumber(raw: unknown): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw !== "string") return undefined;
  let s = raw.trim().replace(/[€$\s%]/g, "").replace(/^EUR|EUR$/i, "");
  if (!s || s === "-" || s === "—") return undefined;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // "1,234" / "12,345,678" = duizendtallen (EN); "41,50" / "0,123" = decimaal (NL).
    s = /^[1-9]\d{0,2}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
    // "1.234" / "12.345.678" = duizendtallen (NL). Grens: een EN-getal met precies 3 decimalen leest als duizendtal.
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Minimale CSV-parser: quotes, "" als escape, scheidingsteken , ; of tab (NL-Excel gebruikt ;). */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = { ",": firstLine.split(",").length, ";": firstLine.split(";").length, "\t": firstLine.split("\t").length };
  const sep = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as "," | ";" | "\t";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export interface Normalized {
  rows: AdRow[];
  mappedColumns: Partial<Record<Field, string>>;
  unmappedColumns: string[];
}

/** Zet ruwe records (CSV-rijen of API-objecten) om naar canonieke rijen. Inhoud = data, nooit instructie. */
export function normalizeRecords(records: Record<string, unknown>[]): Normalized {
  const headers = Array.from(new Set(records.flatMap((r) => Object.keys(r))));
  const mappedColumns: Partial<Record<Field, string>> = {};
  const used = new Set<string>();
  for (const field of Object.keys(ALIASES) as Field[]) {
    for (const alias of ALIASES[field]) {
      const hit = headers.find((h) => !used.has(h) && (norm(h) === alias || norm(h).startsWith(alias + " (")));
      if (hit) { mappedColumns[field] = hit; used.add(hit); break; }
    }
  }
  const unmappedColumns = headers.filter((h) => !used.has(h));
  const rows = records.map((r) => {
    const out: AdRow = {};
    for (const [field, header] of Object.entries(mappedColumns) as [Field, string][]) {
      const v = r[header];
      if (NUMERIC.includes(field)) {
        const n = parseNumber(v);
        if (n !== undefined) (out as any)[field] = n;
      } else if (v !== undefined && v !== null && String(v).trim() !== "") {
        (out as any)[field] = String(v).trim().slice(0, 500);
      }
    }
    return out;
  });
  return { rows, mappedColumns, unmappedColumns };
}

export function csvToRecords(text: string): Record<string, unknown>[] {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const [head, ...body] = table;
  return body.map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""])));
}

// ─── Aggregatie ──────────────────────────────────────────────────────────────

interface Agg { spend: number; impressions: number; clicks: number; results: number; reach: number; freqWeighted: number; freqImpr: number; hasClicks: boolean; hasResults: boolean }

function emptyAgg(): Agg { return { spend: 0, impressions: 0, clicks: 0, results: 0, reach: 0, freqWeighted: 0, freqImpr: 0, hasClicks: false, hasResults: false }; }

function add(a: Agg, r: AdRow) {
  a.spend += r.spend ?? 0;
  a.impressions += r.impressions ?? 0;
  if (r.clicks !== undefined) { a.clicks += r.clicks; a.hasClicks = true; }
  if (r.results !== undefined) { a.results += r.results; a.hasResults = true; }
  a.reach += r.reach ?? 0;
  if (r.frequency !== undefined && r.impressions) { a.freqWeighted += r.frequency * r.impressions; a.freqImpr += r.impressions; }
}

function groupBy(rows: AdRow[], key: (r: AdRow) => string | undefined): Map<string, Agg> {
  const m = new Map<string, Agg>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    if (!m.has(k)) m.set(k, emptyAgg());
    add(m.get(k)!, r);
  }
  return m;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const nl = (x: number, d: number) => x.toFixed(d).replace(".", ",");
const eur = (x: number) => `€${x.toFixed(2).replace(".", ",")}`;

// ─── De controles ────────────────────────────────────────────────────────────

function checkBudgetDistribution(rows: AdRow[], t: Thresholds): ControlResult {
  const base = { id: "budgetverdeling", sourceId: "M17", title: "Budgetverdeling over advertentiesets" };
  if (!rows.some((r) => r.adset) || !rows.some((r) => r.spend !== undefined)) {
    return { ...base, status: "onbekend", detail: "Geen kolommen voor advertentieset en besteed bedrag gevonden." };
  }
  const sets = groupBy(rows, (r) => r.adset);
  const total = Array.from(sets.values()).reduce((s, a) => s + a.spend, 0);
  if (sets.size < 2 || total <= 0) {
    return { ...base, status: "niet_van_toepassing", detail: `${sets.size} advertentieset(s) met uitgaven; verdeling niet te beoordelen.` };
  }
  const [topName, top] = Array.from(sets.entries()).sort((a, b) => b[1].spend - a[1].spend)[0];
  const share = top.spend / total;
  if (share <= t.maxAdsetShare) {
    return { ...base, status: "ok", detail: `Grootste set "${topName}" kreeg ${pct(share)} van ${eur(total)} (drempel ${pct(t.maxAdsetShare)}).` };
  }
  return {
    ...base, status: "let_op",
    detail: `"${topName}" kreeg ${pct(share)} van ${eur(total)}; de andere ${sets.size - 1} set(s) samen ${pct(1 - share)}.`,
    advice: {
      evidence: `${eur(top.spend)} van ${eur(total)} ging naar "${topName}" (eigen drempel ${pct(t.maxAdsetShare)}).`,
      mechanism: "Bij een gedeeld budget duwt Meta geld naar wat vroeg goedkoop lijkt; de andere sets krijgen dan te weinig vertoningen om ooit beoordeeld te worden.",
      nextStep: "Als je de sets eerlijk wilt vergelijken: geef elke set een eigen dagbudget (nieuwe set PAUSED aanmaken, GO eigenaar voor live).",
      measureWindow: `Tot elke advertentie ${t.minImpressions.toLocaleString("nl-NL")} vertoningen heeft.`,
      rollback: "Terug naar het gedeelde budget als de kosten per resultaat over het geheel stijgen.",
    },
  };
}

function checkUtm(rows: AdRow[]): ControlResult {
  const base = { id: "utm", sourceId: "M39", title: "UTM-parameters op de advertentielinks" };
  const withUrl = rows.filter((r) => r.url);
  if (withUrl.length === 0) {
    return { ...base, status: "onbekend", detail: "Geen kolom met de bestemmings-URL of URL-parameters in de export. Voeg die kolom toe in Advertentiebeheer." };
  }
  const byAd = new Map<string, string>();
  for (const r of withUrl) byAd.set(r.ad ?? r.url!, r.url!);
  const missing = Array.from(byAd.entries()).filter(([, u]) => !/utm_source=/i.test(u)).map(([a]) => a);
  if (missing.length === 0) return { ...base, status: "ok", detail: `Alle ${byAd.size} advertentie(s) hebben utm_source.` };
  return {
    ...base, status: "probleem",
    detail: `${missing.length} van ${byAd.size} advertentie(s) zonder utm_source: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " …" : ""}.`,
    advice: {
      evidence: `${missing.length} advertentie(s) sturen verkeer zonder UTM.`,
      mechanism: "Zonder UTM kan de site een aanmelding niet aan de advertentie koppelen; je meet dan klikken in plaats van klanten.",
      nextStep: "Bij de volgende advertentie de URL-parameters zetten: utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.id}}.",
      measureWindow: "Eerste aanmelding met utm_source=meta in de eigen bronnen-weergave.",
      rollback: "Niet nodig: parameters veranderen de levering niet.",
    },
  };
}

function checkFrequency(rows: AdRow[], t: Thresholds): ControlResult {
  const base = { id: "frequentie", sourceId: "M-CR2", title: "Frequentie per advertentieset" };
  if (rows.some((r) => r.date)) {
    // Frequentie per dag is geen frequentie over de periode (dezelfde persoon telt elke dag opnieuw),
    // en bereik is niet optelbaar over dagen. Dan liever eerlijk onbekend dan ten onrechte "in orde".
    return { ...base, status: "onbekend", detail: "Deze export is per dag gesplitst; frequentie is dan niet over de hele periode te bepalen. Exporteer zonder dagsplitsing voor deze controle." };
  }
  const sets = groupBy(rows, (r) => r.adset ?? r.campaign);
  const values: [string, number][] = [];
  for (const [name, a] of Array.from(sets.entries())) {
    if (a.freqImpr > 0) values.push([name, a.freqWeighted / a.freqImpr]);
    else if (a.reach > 0) values.push([name, a.impressions / a.reach]);
  }
  if (values.length === 0) {
    return { ...base, status: "onbekend", detail: "Geen frequentie (of bereik zonder dagsplitsing) in de export." };
  }
  const high = values.filter(([, f]) => f > t.maxFrequency);
  const list = values.map(([n, f]) => `${n}: ${nl(f, 1)}`).join(", ");
  if (high.length === 0) return { ...base, status: "ok", detail: `${list} (drempel ${t.maxFrequency}).` };
  return {
    ...base, status: "let_op", detail: `${list} — ${high.length} boven de drempel ${t.maxFrequency}.`,
    advice: {
      evidence: high.map(([n, f]) => `${n} ${nl(f, 1)}`).join(", "),
      mechanism: "Een kleine doelgroep ziet dezelfde advertentie steeds vaker; de klikkans zakt en de kosten per resultaat stijgen.",
      nextStep: "Nieuwe creatives in dezelfde set (PAUSED klaarzetten) of de doelgroep verbreden.",
      measureWindow: "7 dagen na de wissel.",
      rollback: "Oude advertentie weer aan als de nieuwe na de meetperiode slechter scoort.",
    },
  };
}

function checkFatigue(rows: AdRow[], t: Thresholds): ControlResult {
  const base = { id: "creatieve_moeheid", sourceId: "M28", title: "Creatieve moeheid (CTR-daling in de tijd)" };
  const dated = rows.filter((r) => r.date && r.ad && r.impressions !== undefined && r.clicks !== undefined);
  if (dated.length === 0) {
    return { ...base, status: "onbekend", detail: "Hiervoor is een export per dag nodig (dagsplitsing) met advertentienaam, vertoningen en klikken." };
  }
  const byAd = new Map<string, AdRow[]>();
  for (const r of dated) { if (!byAd.has(r.ad!)) byAd.set(r.ad!, []); byAd.get(r.ad!)!.push(r); }
  const tired: string[] = [];
  let judged = 0;
  for (const [ad, list] of Array.from(byAd.entries())) {
    const days = Array.from(new Set(list.map((r) => r.date!))).sort();
    if (days.length < 4) continue;
    const mid = days[Math.floor(days.length / 2)];
    const first = emptyAgg(); const second = emptyAgg();
    for (const r of list) add(r.date! < mid ? first : second, r);
    if (first.impressions < t.minImpressions / 2 || second.impressions < t.minImpressions / 2) continue;
    judged++;
    const c1 = first.clicks / first.impressions; const c2 = second.clicks / second.impressions;
    if (c1 > 0 && (c1 - c2) / c1 > t.maxCtrDrop) tired.push(`${ad} (CTR ${nl(c1 * 100, 2)}% → ${nl(c2 * 100, 2)}%)`);
  }
  if (judged === 0) return { ...base, status: "te_weinig_data", detail: `Geen advertentie met ≥4 dagen én ≥${t.minImpressions / 2} vertoningen per helft.` };
  if (tired.length === 0) return { ...base, status: "ok", detail: `${judged} advertentie(s) beoordeeld, geen daling boven ${pct(t.maxCtrDrop)}.` };
  return {
    ...base, status: "let_op", detail: `${tired.length} van ${judged}: ${tired.join("; ")}.`,
    advice: {
      evidence: tired.join("; "),
      mechanism: "De CTR van dezelfde advertentie zakt over de periode: het publiek is erop uitgekeken.",
      nextStep: "Drie nieuwe hooks in de winnende invalshoek klaarzetten (PAUSED); GO eigenaar om te wisselen.",
      measureWindow: `Tot de nieuwe advertenties ${t.minImpressions.toLocaleString("nl-NL")} vertoningen hebben.`,
      rollback: "Oude advertentie terugzetten als de nieuwe lager uitkomen.",
    },
  };
}

function checkLearning(rows: AdRow[]): ControlResult {
  const base = { id: "leerfase", sourceId: "M13", title: "Leveringsstatus en leerfase" };
  const withDelivery = rows.filter((r) => r.delivery);
  if (withDelivery.length === 0) return { ...base, status: "onbekend", detail: "Geen kolom met de leveringsstatus." };
  const limited = new Set(withDelivery.filter((r) => /learning limited|beperkt leren|leren beperkt/i.test(r.delivery!)).map((r) => r.adset ?? r.ad ?? "?"));
  const learning = new Set(withDelivery.filter((r) => /^(learning|leren|leerfase)$/i.test(r.delivery!.trim())).map((r) => r.adset ?? r.ad ?? "?"));
  if (limited.size === 0) {
    return { ...base, status: "ok", detail: learning.size ? `${learning.size} set(s) nog in de leerfase; dat is normaal na een wijziging.` : "Geen set met beperkt leren." };
  }
  return {
    ...base, status: "let_op", detail: `Beperkt leren: ${Array.from(limited).join(", ")}.`,
    advice: {
      evidence: `${limited.size} set(s) met status beperkt leren.`,
      mechanism: "De set krijgt te weinig resultaten om te optimaliseren; elke wijziging zet de teller opnieuw op nul.",
      nextStep: "Niets tussentijds wijzigen; overweeg sets samen te voegen of een hoger-in-de-trechter-doel. Wijziging = GO eigenaar.",
      measureWindow: "7 dagen zonder wijziging.",
      rollback: "Splitsing terugzetten als het samengevoegde resultaat slechter is.",
    },
  };
}

function checkComparability(rows: AdRow[]): ControlResult {
  const base = { id: "vergelijkbaarheid", sourceId: "gvd-012", title: "Zijn de resultaten optelbaar?" };
  if (!rows.some((r) => r.results !== undefined)) return { ...base, status: "onbekend", detail: "Geen kolom met resultaten." };
  const types = new Set(rows.filter((r) => r.results !== undefined).map((r) => r.resultType ?? "(onbekend type)"));
  if (types.size <= 1) return { ...base, status: "ok", detail: `Eén resultaattype: ${Array.from(types)[0]}.` };
  return {
    ...base, status: "let_op",
    detail: `${types.size} verschillende resultaattypes (${Array.from(types).join(", ")}). Totalen zijn per type gegeven, niet opgeteld.`,
  };
}

// ─── Rangschikking met steekproefpoort ───────────────────────────────────────

export interface AdRank {
  ad: string;
  adset?: string;
  spend: number;
  impressions: number;
  ctr?: number;
  costPerResult?: number;
  results?: number;
  /** Resultaattype; kosten per resultaat zijn alleen binnen hetzelfde type vergelijkbaar. */
  resultType?: string;
  /** false = onder de steekproefdrempel; niet beoordelen. */
  judged: boolean;
}

function rankAds(rows: AdRow[], t: Thresholds): AdRank[] {
  const adsetOf = new Map<string, string | undefined>();
  const typeOf = new Map<string, string | undefined>();
  for (const r of rows) if (r.ad) {
    if (!adsetOf.has(r.ad)) adsetOf.set(r.ad, r.adset);
    if (r.resultType && !typeOf.has(r.ad)) typeOf.set(r.ad, r.resultType);
  }
  const ads = groupBy(rows, (r) => r.ad);
  const out: AdRank[] = Array.from(ads.entries()).map(([ad, a]) => ({
    ad, adset: adsetOf.get(ad), spend: round2(a.spend), impressions: a.impressions,
    ctr: a.hasClicks && a.impressions > 0 ? round4(a.clicks / a.impressions) : undefined,
    results: a.hasResults ? a.results : undefined,
    costPerResult: a.hasResults && a.results > 0 ? round2(a.spend / a.results) : undefined,
    resultType: typeOf.get(ad),
    judged: a.impressions >= t.minImpressions,
  }));
  // Eerst beoordeeld vóór onbeoordeeld, dan per resultaattype gegroepeerd (nooit leads naast klikken
  // rangschikken, gvd-012), dan laagste kosten per resultaat, dan hoogste CTR.
  return out.sort((x, y) => Number(y.judged) - Number(x.judged)
    || (x.resultType ?? "").localeCompare(y.resultType ?? "")
    || (x.costPerResult ?? Infinity) - (y.costPerResult ?? Infinity)
    || (y.ctr ?? 0) - (x.ctr ?? 0));
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const round4 = (x: number) => Math.round(x * 10000) / 10000;

// ─── Rapport ─────────────────────────────────────────────────────────────────

export interface AdAuditReport {
  generatedAt: string;
  rowsRead: number;
  mappedColumns: Partial<Record<Field, string>>;
  unmappedColumns: string[];
  thresholds: Thresholds;
  totals: { spend: number; impressions: number; clicks?: number; resultsByType?: Record<string, number> };
  /** Aandeel controles dat echt beoordeeld kon worden. Onbekend verlaagt dit, niet het oordeel. */
  coverage: number;
  controls: ControlResult[];
  ads: AdRank[];
  notes: string[];
}

export class AdAuditError extends Error {}

export function auditMeta(records: Record<string, unknown>[], overrides: Partial<Thresholds> = {}, now = new Date()): AdAuditReport {
  if (!Array.isArray(records) || records.length === 0) throw new AdAuditError("Geen rijen gevonden in de export.");
  if (records.length > 20000) throw new AdAuditError("Te veel rijen (max 20.000). Exporteer een kortere periode.");
  const thresholds = { ...DEFAULT_THRESHOLDS, ...overrides };
  const { rows, mappedColumns, unmappedColumns } = normalizeRecords(records);
  if (!mappedColumns.spend && !mappedColumns.impressions) {
    throw new AdAuditError("Geen kolom voor besteed bedrag of vertoningen herkend. Klopt het dat dit een Meta-export is?");
  }

  const controls = [
    checkBudgetDistribution(rows, thresholds),
    checkUtm(rows),
    checkFrequency(rows, thresholds),
    checkFatigue(rows, thresholds),
    checkLearning(rows),
    checkComparability(rows),
  ];
  const judgedControls = controls.filter((c) => c.status !== "onbekend").length;

  const all = emptyAgg();
  rows.forEach((r) => add(all, r));
  const resultsByType: Record<string, number> = {};
  for (const r of rows) if (r.results !== undefined) {
    const k = r.resultType ?? "resultaten";
    resultsByType[k] = (resultsByType[k] ?? 0) + r.results;
  }

  const ads = rankAds(rows, thresholds);
  const notes = [
    "Geen totaalscore: een 0–100-cijfer is niet te onderbouwen zonder vergelijkbare accounts (claude-ads 2.1.0 zette zijn scores om dezelfde reden uit).",
    "Drempels zijn eigen drempels, geen Meta-norm. Pas ze aan per klant of per doel.",
    "Elk advies is een voorstel. Aanmaken gebeurt PAUSED; live zetten of pauzeren is een GO van de eigenaar.",
  ];
  const unjudged = ads.filter((a) => !a.judged).length;
  if (unjudged) notes.push(`${unjudged} advertentie(s) onder ${thresholds.minImpressions} vertoningen: nog niet beoordelen, niet uitzetten op gevoel.`);
  if (unmappedColumns.length) notes.push(`Niet-herkende kolommen (genegeerd): ${unmappedColumns.slice(0, 12).join(", ")}${unmappedColumns.length > 12 ? " …" : ""}.`);

  return {
    generatedAt: now.toISOString(),
    rowsRead: rows.length,
    mappedColumns,
    unmappedColumns,
    thresholds,
    totals: {
      spend: round2(all.spend),
      impressions: all.impressions,
      clicks: all.hasClicks ? all.clicks : undefined,
      resultsByType: Object.keys(resultsByType).length ? resultsByType : undefined,
    },
    coverage: round2(judgedControls / controls.length),
    controls,
    ads,
    notes,
  };
}

export function auditMetaCsv(csv: string, overrides: Partial<Thresholds> = {}, now = new Date()): AdAuditReport {
  return auditMeta(csvToRecords(csv), overrides, now);
}
