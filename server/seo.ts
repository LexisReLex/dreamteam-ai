// ─── Keyless technische SEO-analyzer ──────────────────────────────────────────
//
// Onderzoek → analyse → implementatie van de claude-seo-plugin
// (https://github.com/AgriciDaniel/claude-seo, MIT) toegepast op DreamTeam.
//
// De volledige plugin is een Claude Code-toolkit (25 skills + 18 sub-agents + 8
// betaalde MCP-extensies). Hier vertalen we de *keyless kern* naar server-side
// TS: haal één URL op (SSRF-veilig, zoals de plugin's `url_safety.py`), analyseer
// de statische HTML op de belangrijkste on-page/technical/schema/GEO-signalen en
// bereken een SEO Health Score met de gewichten uit `skills/seo/SKILL.md`.
//
// Eerlijk over de grenzen (graceful degradation, net als de plugin): dit meet
// alleen wat uit statische HTML + response-headers te halen is. Echte veld-Core
// Web Vitals (CrUX), backlinks (Moz/Ahrefs) en SERP-data vereisen API-keys en
// vallen buiten deze keyless laag — de scores zijn heuristiek, geen Google-
// interne signalen.

import { lookup } from "node:dns/promises";
import net from "node:net";

export type Severity = "critical" | "high" | "medium" | "low";

export interface Finding {
  category: string;
  severity: Severity;
  title: string;
  detail: string;
  recommendation: string;
}

export interface CategoryScore {
  key: string;
  label: string;
  weight: number;
  score: number; // 0-100
}

export interface SeoSignals {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  metaRobots: string | null;
  noindex: boolean;
  viewport: boolean;
  htmlLang: string | null;
  h1Count: number;
  h2Count: number;
  hreflang: string[];
  jsonLd: { types: string[]; count: number; invalid: number };
  ogTags: number;
  images: { total: number; missingAlt: number };
  wordCount: number;
  https: boolean;
  headers: {
    hsts: boolean;
    csp: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    referrerPolicy: boolean;
  };
}

export interface SeoReport {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  statusCode: number;
  healthScore: number; // 0-100
  categories: CategoryScore[];
  signals: SeoSignals;
  findings: Finding[];
  disclaimer: string;
}

export class SeoError extends Error {
  constructor(message: string, readonly code: "UNSAFE_URL" | "FETCH_FAILED" | "BAD_STATUS") {
    super(message);
    this.name = "SeoError";
  }
}

// Schema-typen die Google niet langer als rich result ondersteunt (bron:
// skills/seo-schema/SKILL.md). We bevelen ze nooit aan; markeren ze als verouderd.
const DEPRECATED_SCHEMA_TYPES = new Set([
  "HowTo",
  "SpecialAnnouncement",
  "ClaimReview",
  "VehicleListing",
  "CourseInfo",
]);

const DISCLAIMER =
  "Heuristische analyse op basis van statische HTML + response-headers (geen JS-rendering). " +
  "Scores zijn indicatief, geen Google-interne ranking-signalen. Veld-Core Web Vitals (CrUX), " +
  "backlinks en SERP-data vereisen aparte API-integraties en vallen buiten deze keyless analyse.";

// ─── SSRF-bescherming (repliceert scripts/url_safety.py) ──────────────────────
// Elke door de gebruiker aangeleverde URL gaat hierdoor vóór we iets ophalen.
// We weigeren niet-http(s), literal private IP's, en namen die naar private/
// gereserveerde adressen resolven (DNS-rebinding-bescherming).

/** Classificeert een IP als 'public', 'private' (incl. reserved/loopback) of
 * 'invalid'. Pure functie — direct testbaar zonder netwerk. */
export function classifyIp(ip: string): "public" | "private" | "invalid" {
  const kind = net.isIP(ip);
  if (kind === 4) return classifyIpv4(ip);
  if (kind === 6) return classifyIpv6(ip);
  return "invalid";
}

function classifyIpv4(ip: string): "public" | "private" {
  const p = ip.split(".").map((n) => parseInt(n, 10));
  const [a, b] = p;
  if (a === 0) return "private"; // 0.0.0.0/8 "this host"
  if (a === 10) return "private"; // 10.0.0.0/8
  if (a === 127) return "private"; // loopback
  if (a === 169 && b === 254) return "private"; // link-local + cloud-metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return "private"; // 172.16.0.0/12
  if (a === 192 && b === 168) return "private"; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return "private"; // 100.64.0.0/10 CGNAT
  if (a >= 224) return "private"; // multicast/reserved (224.0.0.0+)
  return "public";
}

function classifyIpv6(ip: string): "public" | "private" {
  const addr = ip.toLowerCase();
  if (addr === "::1" || addr === "::") return "private"; // loopback / unspecified
  if (addr.startsWith("fe80")) return "private"; // link-local
  if (addr.startsWith("fc") || addr.startsWith("fd")) return "private"; // unique local fc00::/7
  // IPv4-mapped (::ffff:a.b.c.d) → classificeer op het ingebedde IPv4-adres.
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return classifyIpv4(mapped[1]);
  return "public";
}

/** Syntactische controle: protocol http(s) en, als de host een literal IP is,
 * dat het publiek is. Pure functie (geen DNS). Geeft de geparste URL terug. */
export function checkUrlSyntax(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Geen geldige URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Alleen http(s)-URL's zijn toegestaan." };
  }
  const host = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6-brackets
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local") || lower.endsWith(".internal")) {
    return { ok: false, reason: "Interne hostnamen zijn niet toegestaan." };
  }
  if (net.isIP(host) && classifyIp(host) !== "public") {
    return { ok: false, reason: "Private of gereserveerde IP-adressen zijn niet toegestaan." };
  }
  return { ok: true, url };
}

/** Volledige veiligheidscontrole inclusief DNS-resolutie (async). Gooit SeoError
 * als de URL onveilig is. Geeft de geparste URL terug. */
export async function assertUrlSafe(raw: string): Promise<URL> {
  const syntax = checkUrlSyntax(raw);
  if (!syntax.ok) throw new SeoError(syntax.reason, "UNSAFE_URL");
  const host = syntax.url.hostname.replace(/^\[|\]$/g, "");

  if (!net.isIP(host)) {
    let addresses: { address: string }[];
    try {
      addresses = await lookup(host, { all: true });
    } catch {
      throw new SeoError("Hostnaam kon niet worden gevonden (DNS).", "UNSAFE_URL");
    }
    if (addresses.length === 0) throw new SeoError("Hostnaam resolvde naar geen enkel adres.", "UNSAFE_URL");
    for (const { address } of addresses) {
      if (classifyIp(address) !== "public") {
        throw new SeoError("Hostnaam resolvt naar een private/gereserveerd adres (SSRF geblokkeerd).", "UNSAFE_URL");
      }
    }
  }
  return syntax.url;
}

// ─── HTML-extractie (dependency-vrij, doelgericht op de SEO-signalen) ─────────

function firstMatch(re: RegExp, html: string): string | null {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

/** Haalt de waarde van een <meta>-attribuut op basis van name/property. */
function metaContent(html: string, key: string, attr: "name" | "property" = "name"): string | null {
  // Ondersteunt beide attribuutvolgordes: <meta name=".." content=".."> en omgekeerd.
  const re1 = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`, "i");
  return firstMatch(re1, html) ?? firstMatch(re2, html);
}

/** Verwijdert script/style/comments en tags → ruwe zichtbare tekst voor word count. */
export function visibleText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(html: string): number {
  const text = visibleText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function extractJsonLd(html: string): { types: string[]; count: number; invalid: number } {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const types: string[] = [];
  let invalid = 0;
  for (const block of blocks) {
    const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    try {
      const parsed = JSON.parse(inner);
      collectTypes(parsed, types);
    } catch {
      invalid++;
    }
  }
  return { types: Array.from(new Set(types)), count: blocks.length, invalid };
}

function collectTypes(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string") out.push(t);
    else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.push(x);
    if (Array.isArray(obj["@graph"])) collectTypes(obj["@graph"], out);
  }
}

export function extractSignals(html: string, https: boolean, headers: Record<string, string>): SeoSignals {
  const title = firstMatch(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
  const metaDescription = metaContent(html, "description");
  const canonical = firstMatch(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i, html)
    ?? firstMatch(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i, html);
  const metaRobots = metaContent(html, "robots");
  const htmlLang = firstMatch(/<html[^>]*\blang=["']([^"']*)["']/i, html);
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const hreflang = Array.from(html.matchAll(/<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']*)["']/gi)).map(
    (m) => m[1],
  );
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const missingAlt = imgs.filter((tag) => !/\balt=["'][^"']*["']/i.test(tag) || /\balt=["']["']/i.test(tag)).length;
  const ogTags = (html.match(/<meta[^>]*property=["']og:[^"']+["']/gi) || []).length;

  const h = (k: string) => (headers[k.toLowerCase()] || "").length > 0;

  return {
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    canonical,
    metaRobots,
    noindex: /noindex/i.test(metaRobots || ""),
    viewport: metaContent(html, "viewport") !== null,
    htmlLang,
    h1Count,
    h2Count,
    hreflang,
    jsonLd: extractJsonLd(html),
    ogTags,
    images: { total: imgs.length, missingAlt },
    wordCount: countWords(html),
    https,
    headers: {
      hsts: h("strict-transport-security"),
      csp: h("content-security-policy"),
      xContentTypeOptions: h("x-content-type-options"),
      xFrameOptions: h("x-frame-options"),
      referrerPolicy: h("referrer-policy"),
    },
  };
}

// ─── Scoring per categorie + gewogen Health Score ─────────────────────────────
// Gewichten uit skills/seo/SKILL.md, genormaliseerd over de categorieën die
// keyless (statische HTML) meetbaar zijn — CWV-veld-data en backlinks vallen weg.

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreReport(
  signals: SeoSignals,
  ctx: { url: string; finalUrl: string; statusCode: number },
): SeoReport {
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  // ── On-Page (titel, meta, headings, canonical) ──
  let onPage = 100;
  if (!signals.title) {
    onPage -= 40;
    add({ category: "On-Page", severity: "critical", title: "Geen <title>", detail: "De pagina heeft geen title-tag.", recommendation: "Voeg een unieke, beschrijvende title van 30–60 tekens toe met het primaire keyword vooraan." });
  } else if (signals.titleLength < 15 || signals.titleLength > 65) {
    onPage -= 10;
    add({ category: "On-Page", severity: "medium", title: "Title-lengte suboptimaal", detail: `Title is ${signals.titleLength} tekens.`, recommendation: "Streef naar ~30–60 tekens zodat de title niet wordt afgekapt in de SERP." });
  }
  if (!signals.metaDescription) {
    onPage -= 15;
    add({ category: "On-Page", severity: "medium", title: "Geen meta description", detail: "Er is geen meta description gevonden.", recommendation: "Schrijf een uitnodigende meta description van 120–155 tekens (beïnvloedt CTR, geen ranking-signaal)." });
  } else if (signals.metaDescriptionLength < 50 || signals.metaDescriptionLength > 160) {
    onPage -= 8;
    add({ category: "On-Page", severity: "low", title: "Meta description-lengte suboptimaal", detail: `Meta description is ${signals.metaDescriptionLength} tekens.`, recommendation: "Houd 120–155 tekens aan om afkapping te voorkomen." });
  }
  if (signals.h1Count === 0) {
    onPage -= 20;
    add({ category: "On-Page", severity: "high", title: "Geen H1", detail: "Er is geen H1-heading gevonden.", recommendation: "Voeg precies één H1 toe die het onderwerp van de pagina beschrijft." });
  } else if (signals.h1Count > 1) {
    onPage -= 8;
    add({ category: "On-Page", severity: "low", title: "Meerdere H1's", detail: `${signals.h1Count} H1-headings gevonden.`, recommendation: "Gebruik één H1; degradeer de rest naar H2/H3 voor een heldere hiërarchie." });
  }
  if (!signals.canonical) {
    onPage -= 10;
    add({ category: "On-Page", severity: "medium", title: "Geen canonical", detail: "Er is geen rel=canonical link gevonden.", recommendation: "Voeg een self-referencing canonical toe om duplicate-content-signalen te consolideren." });
  }

  // ── Technical (HTTPS, security-headers, indexeerbaarheid, status) ──
  let technical = 100;
  if (ctx.statusCode >= 400) {
    technical -= 50;
    add({ category: "Technical", severity: "critical", title: `HTTP-status ${ctx.statusCode}`, detail: "De pagina gaf een foutstatus terug.", recommendation: "Herstel de foutstatus; Google indexeert en rendert geen non-200 responses." });
  }
  if (!signals.https) {
    technical -= 40;
    add({ category: "Technical", severity: "critical", title: "Geen HTTPS", detail: "De pagina wordt over http geserveerd.", recommendation: "Forceer HTTPS met een 301-redirect en zet HSTS aan." });
  }
  if (signals.noindex) {
    technical -= 30;
    add({ category: "Technical", severity: "high", title: "noindex actief", detail: "meta robots bevat 'noindex'.", recommendation: "Verwijder noindex als de pagina bedoeld is om te ranken; laat staan als dat bewust is." });
  }
  if (!signals.viewport) {
    technical -= 10;
    add({ category: "Technical", severity: "high", title: "Geen viewport-meta", detail: "Geen responsive viewport-meta gevonden.", recommendation: "Voeg <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> toe (mobile-first indexing)." });
  }
  if (!signals.htmlLang) {
    technical -= 5;
    add({ category: "Technical", severity: "low", title: "Geen lang-attribuut", detail: "Het <html>-element mist een lang-attribuut.", recommendation: "Zet lang (bv. lang=\"nl\") voor toegankelijkheid en juiste taalsignalen." });
  }
  const missingHeaders: string[] = [];
  if (!signals.headers.hsts && signals.https) missingHeaders.push("Strict-Transport-Security");
  if (!signals.headers.xContentTypeOptions) missingHeaders.push("X-Content-Type-Options");
  if (!signals.headers.csp) missingHeaders.push("Content-Security-Policy");
  if (!signals.headers.xFrameOptions) missingHeaders.push("X-Frame-Options");
  if (!signals.headers.referrerPolicy) missingHeaders.push("Referrer-Policy");
  if (missingHeaders.length > 0) {
    technical -= Math.min(15, missingHeaders.length * 3);
    add({ category: "Technical", severity: "low", title: "Ontbrekende security-headers", detail: `Ontbreekt: ${missingHeaders.join(", ")}.`, recommendation: "Voeg de ontbrekende security-headers toe (page-experience + defense-in-depth)." });
  }

  // ── Content (dekkingsvloer + structuur) ──
  let content = 100;
  if (signals.wordCount < 300) {
    content -= 30;
    add({ category: "Content", severity: "high", title: "Dunne content", detail: `Slechts ~${signals.wordCount} woorden zichtbaar in de statische HTML.`, recommendation: "Breid uit tot volledige dekking van de zoekintentie (vloer, geen doel). Let op: kan ook duiden op JS-gerenderde content." });
  } else if (signals.wordCount < 500) {
    content -= 12;
    add({ category: "Content", severity: "low", title: "Beperkte contentdekking", detail: `~${signals.wordCount} woorden.`, recommendation: "Overweeg diepere dekking; word count is een dekkingsvloer, geen direct ranking-signaal." });
  }
  if (signals.h2Count === 0 && signals.wordCount > 400) {
    content -= 10;
    add({ category: "Content", severity: "low", title: "Geen subheadings", detail: "Lange content zonder H2-structuur.", recommendation: "Deel de content op met H2/H3 met vraag-gerichte headings (leesbaarheid + AI-citability)." });
  }

  // ── Schema (JSON-LD) ──
  let schema = 100;
  if (signals.jsonLd.count === 0) {
    schema -= 45;
    add({ category: "Schema", severity: "medium", title: "Geen structured data", detail: "Geen JSON-LD gevonden.", recommendation: "Voeg passende JSON-LD toe (bv. Organization + WebSite op de homepage, Article/Product/LocalBusiness per paginatype)." });
  } else {
    if (signals.jsonLd.invalid > 0) {
      schema -= 20;
      add({ category: "Schema", severity: "high", title: "Ongeldige JSON-LD", detail: `${signals.jsonLd.invalid} JSON-LD-blok(ken) parsen niet.`, recommendation: "Herstel de JSON-syntax; ongeldige structured data wordt genegeerd." });
    }
    const deprecated = signals.jsonLd.types.filter((t) => DEPRECATED_SCHEMA_TYPES.has(t));
    if (deprecated.length > 0) {
      schema -= 15;
      add({ category: "Schema", severity: "low", title: "Verouderde schema-typen", detail: `Verouderd: ${deprecated.join(", ")}.`, recommendation: "Deze typen leveren geen rich results meer; vervang door actieve typen of verwijder." });
    }
  }

  // ── AI / GEO-readiness (SSR-content, structuur, toegankelijkheid) ──
  let ai = 100;
  if (signals.wordCount < 200) {
    ai -= 35;
    add({ category: "AI/GEO", severity: "high", title: "Weinig server-gerenderde tekst", detail: "AI-crawlers voeren geen JavaScript uit; de statische HTML bevat nauwelijks tekst.", recommendation: "Serveer de kern-content server-side (SSR/SSG) zodat AI-zoekmachines en crawlers de inhoud zien." });
  }
  if (signals.h1Count === 0 || signals.h2Count === 0) {
    ai -= 15;
    add({ category: "AI/GEO", severity: "low", title: "Zwakke heading-hiërarchie", detail: "Een duidelijke H1→H2-structuur ontbreekt.", recommendation: "Structureer met vraag-gerichte headings; ~44% van AI-citaties komt uit de eerste 30% van de pagina." });
  }

  // ── Images (alt-dekking) ──
  let images: number | null = null;
  if (signals.images.total > 0) {
    const ratio = signals.images.missingAlt / signals.images.total;
    images = clamp(100 - ratio * 100);
    if (signals.images.missingAlt > 0) {
      add({ category: "Images", severity: ratio > 0.5 ? "medium" : "low", title: "Ontbrekende alt-teksten", detail: `${signals.images.missingAlt} van ${signals.images.total} afbeeldingen missen alt-tekst.`, recommendation: "Voeg beschrijvende alt-teksten toe (toegankelijkheid + Google Images/afbeelding-SERP)." });
    }
  }

  const categories: CategoryScore[] = [
    { key: "content", label: "Content", weight: 23, score: clamp(content) },
    { key: "technical", label: "Technical", weight: 22, score: clamp(technical) },
    { key: "onPage", label: "On-Page", weight: 20, score: clamp(onPage) },
    { key: "schema", label: "Schema", weight: 10, score: clamp(schema) },
    { key: "ai", label: "AI/GEO", weight: 10, score: clamp(ai) },
  ];
  if (images !== null) categories.push({ key: "images", label: "Images", weight: 5, score: images });

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const healthScore = clamp(categories.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight);

  const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    url: ctx.url,
    finalUrl: ctx.finalUrl,
    fetchedAt: new Date().toISOString(),
    statusCode: ctx.statusCode,
    healthScore,
    categories,
    signals,
    findings,
    disclaimer: DISCLAIMER,
  };
}

/** Pure analyse: HTML + context → rapport. Testbaar zonder netwerk. */
export function analyze(
  html: string,
  ctx: { url: string; finalUrl: string; statusCode: number; https: boolean; headers: Record<string, string> },
): SeoReport {
  const signals = extractSignals(html, ctx.https, ctx.headers);
  return scoreReport(signals, { url: ctx.url, finalUrl: ctx.finalUrl, statusCode: ctx.statusCode });
}

// ─── Veilige fetch + analyse (met redirect-revalidatie) ───────────────────────

const MAX_BYTES = 2_000_000; // Googlebot fetcht ~de eerste 2MB HTML.
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 4;

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/** Haalt een URL SSRF-veilig op (elke redirect-hop wordt opnieuw gevalideerd),
 * capt de body op 2MB en analyseert de HTML. */
export async function fetchAndAnalyze(rawUrl: string): Promise<SeoReport> {
  let current = await assertUrlSafe(rawUrl);
  let response: Response | null = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "DreamTeamSEO/1.0 (+https://dreamteam.nl; keyless SEO audit)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (err: any) {
      throw new SeoError(`Ophalen mislukt: ${err?.message || "onbekende fout"}`, "FETCH_FAILED");
    } finally {
      clearTimeout(timer);
    }

    // Redirect? Valideer de doel-URL opnieuw (voorkomt redirect-naar-intern).
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      if (hop === MAX_REDIRECTS) throw new SeoError("Te veel redirects.", "FETCH_FAILED");
      const next = new URL(res.headers.get("location")!, current);
      current = await assertUrlSafe(next.toString());
      continue;
    }
    response = res;
    break;
  }

  if (!response) throw new SeoError("Geen response ontvangen.", "FETCH_FAILED");

  // Lees de body met een harde bytelimiet.
  const html = await readCapped(response, MAX_BYTES);
  const headers = headersToObject(response.headers);

  return analyze(html, {
    url: rawUrl,
    finalUrl: current.toString(),
    statusCode: response.status,
    https: current.protocol === "https:",
    headers,
  });
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
      if (total >= maxBytes) {
        try {
          await reader.cancel();
        } catch {
          /* negeer */
        }
        break;
      }
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}
