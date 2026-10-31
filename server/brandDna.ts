// ─── Brand DNA + advertentie-matrix (keyless) ─────────────────────────────────
//
// Functionele reverse engineering van de marketingmotor van Holo (tryholo.ai),
// zie docs/onderzoek/HOLO-benchmark-reverse-engineering-2026-10-31.md en
// docs/brand-dna.md. Holo's kernlus is:
//
//   URL plakken → Brand DNA → invalshoeken × platformen → assets → publiceren → meten
//
// Deze module bouwt de eerste twee schakels keyless (geen LLM, geen kosten):
//   1. extractBrandDna(html)  — merkprofiel uit statische HTML, mét gaten-lijst
//   2. buildAdMatrix(dna)     — 4 invalshoeken × 3 platformen = 12 ad-briefs,
//                               binnen de tekenlimieten van Meta en Google,
//                               met Holo's naamgeving + UTM-conventie.
//
// Geen kopie van Holo-code (die is niet openbaar); dit is een eigen vertaling
// van het waargenomen gedrag. Eerlijk over de grens: heuristiek op statische
// HTML. Een LLM-verrijking (key-gated) kan later bovenop deze laag.

import { fetchHtmlSafe, visibleText } from "./seo";

export type Lang = "nl" | "en";

export interface BrandDna {
  url: string;
  name: string | null;
  promise: string | null; // kernbelofte (meta/og-description of h1)
  headline: string | null; // h1
  language: Lang;
  businessTypes: string[]; // JSON-LD @type's + niche-heuristiek
  niche: string | null;
  offerings: string[]; // producten/diensten
  prices: string[];
  ctas: string[];
  colors: string[]; // hex, meest gebruikt eerst
  logo: string | null;
  image: string | null;
  socials: Record<string, string>;
  tone: { address: "formeel" | "informeel" | "onbekend"; exclamationsPer1000Words: number; usesEmoji: boolean };
  hasPhone: boolean;
  hasEmail: boolean;
  completeness: number; // 0-100
  gaps: string[]; // wat ontbreekt → content wordt generieker
}

export type Platform = "meta_feed" | "meta_reels" | "google_search";
export type Angle = "pijn" | "resultaat" | "bewijs" | "gratis_tip";

export interface AdBrief {
  adName: string;
  angle: Angle;
  platform: Platform;
  format: string;
  hook: string;
  headline: string;
  primaryText: string;
  cta: string;
  visualBrief: string;
  utm: Record<string, string>;
}

export interface CampaignPlan {
  structure: string[];
  namingConvention: string;
  testPlan: string[];
}

export interface BrandDnaReport {
  dna: BrandDna;
  matrix: AdBrief[];
  campaign: CampaignPlan;
  disclaimer: string;
}

// Tekenlimieten (Meta: headline ~40 zichtbaar, primary text ~125 vóór "meer";
// Google RSA: headline 30, description 90).
export const LIMITS = {
  meta_feed: { headline: 40, primaryText: 125 },
  meta_reels: { headline: 40, primaryText: 125 },
  google_search: { headline: 30, primaryText: 90 },
} as const;

const DISCLAIMER =
  "Keyless heuristiek op statische HTML (geen JS-rendering, geen LLM). Briefs zijn een startpunt " +
  "voor creatives en tests, geen gegarandeerde winnaars. Controleer claims en prijzen vóór publicatie.";

// ─── Kleine HTML-helpers ──────────────────────────────────────────────────────

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(s: string): string {
  return decode(s.replace(/<[^>]+>/g, " "));
}

function meta(html: string, key: string): string | null {
  const re1 = new RegExp(`<meta[^>]*(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, "i");
  const m = html.match(re1) ?? html.match(re2);
  return m && m[1].trim() ? decode(m[1]) : null;
}

function allTagTexts(html: string, tag: string, max: number): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    const t = stripTags(m[1]);
    if (t && t.length <= 160 && !out.includes(t)) out.push(t);
  }
  return out;
}

function absolute(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function jsonLdNodes(html: string): any[] {
  const nodes: any[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    nodes.push(n);
    if (Array.isArray(n["@graph"])) n["@graph"].forEach(walk);
    for (const k of ["offers", "itemListElement", "hasOfferCatalog", "makesOffer", "itemOffered", "item"]) if (n[k]) walk(n[k]);
  };
  while ((m = re.exec(html))) {
    try {
      walk(JSON.parse(m[1]));
    } catch {
      /* ongeldige JSON-LD negeren */
    }
  }
  return nodes;
}

function typesOf(n: any): string[] {
  const t = n?.["@type"];
  return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
}

// ─── Extractie ────────────────────────────────────────────────────────────────

const NICHES: { niche: string; words: RegExp }[] = [
  { niche: "kapper", words: /\b(kapper|kapsalon|barber|knippen|haarstylist|hair ?salon)\b/i },
  { niche: "schoonheidsspecialist", words: /\b(schoonheidssalon|schoonheidsspecialist|gezichtsbehandeling|beauty ?salon|nagelstudio|wimpers)\b/i },
  { niche: "coach/trainer", words: /\b(personal trainer|coach(ing)?|sportschool|fitness|yoga)\b/i },
  { niche: "horeca", words: /\b(restaurant|café|cafe|reserveren|menukaart|lunchroom)\b/i },
  { niche: "webshop", words: /\b(winkelwagen|in winkelmand|add to cart|webshop|gratis verzending|free shipping)\b/i },
  { niche: "software/saas", words: /\b(saas|software|app|dashboard|integraties|api|free trial|gratis proberen)\b/i },
];

const CTA_WORDS =
  /\b(boek|reserveer|bestel|koop|start|probeer|meld je aan|aanmelden|vraag .* aan|plan|download|bel|book|buy|order|get started|try|sign up|subscribe|shop|contact)\b/i;

const PRICE_RE = /(?:€|eur\s?)\s?\d{1,5}(?:[.,]\d{2})?|\d{1,5}(?:[.,]\d{2})?\s?(?:€|euro)|\$\s?\d{1,5}(?:[.,]\d{2})?/gi;

const SOCIAL_HOSTS: Record<string, RegExp> = {
  instagram: /instagram\.com\//i,
  facebook: /facebook\.com\//i,
  tiktok: /tiktok\.com\//i,
  linkedin: /linkedin\.com\//i,
  youtube: /youtube\.com\/|youtu\.be\//i,
};

/** Hex-kleuren uit theme-color + inline CSS, zonder (bijna) wit/zwart/grijs. */
export function extractColors(html: string): string[] {
  const counts = new Map<string, number>();
  const add = (hex: string, weight = 1) => {
    let h = hex.toLowerCase();
    if (h.length === 4) h = "#" + h.slice(1).split("").map((c) => c + c).join("");
    if (h.length !== 7) return;
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 24) return; // grijstinten, wit en zwart zijn geen merkkleur
    counts.set(h, (counts.get(h) || 0) + weight);
  };
  const theme = meta(html, "theme-color");
  if (theme && /^#[0-9a-f]{3,6}$/i.test(theme)) add(theme, 10);
  const css = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>|style=["']([^"']*)["']/gi)).map((m) => m[1] || m[2] || "").join(" ");
  for (const m of Array.from(css.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi))) add(m[0]);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([h]) => h);
}

/** Toon: formeel (u/uw) vs informeel (je/jij/jouw) in NL; uitroeptekens; emoji. */
export function detectTone(text: string): BrandDna["tone"] {
  const words = text.split(/\s+/).filter(Boolean);
  const formal = (text.match(/\b(u|uw)\b/gi) || []).length;
  const informal = (text.match(/\b(je|jij|jouw|jullie|you|your)\b/gi) || []).length;
  const address = formal === 0 && informal === 0 ? "onbekend" : formal > informal ? "formeel" : "informeel";
  const excl = (text.match(/!/g) || []).length;
  return {
    address,
    exclamationsPer1000Words: words.length ? Math.round((excl / words.length) * 1000 * 10) / 10 : 0,
    usesEmoji: new RegExp("\\p{Extended_Pictographic}", "u").test(text),
  };
}

export function extractBrandDna(html: string, url: string): BrandDna {
  const ld = jsonLdNodes(html);
  const text = visibleText(html);
  const lang: Lang = /<html[^>]*lang=["']en/i.test(html) ? "en" : /<html[^>]*lang=["']nl/i.test(html) ? "nl" : /\b(de|het|een|voor|en)\b/i.test(text.slice(0, 2000)) && !/\b(the|and|for|your)\b/i.test(text.slice(0, 2000)) ? "nl" : "en";

  const org = ld.find((n) => typesOf(n).some((t) => /Organization|LocalBusiness|Store|Salon|Shop|Restaurant|Brand/i.test(t)));
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const titleName = title ? decode(title).split(/\s[|–—-]\s/)[0].trim() : null;
  const name = meta(html, "og:site_name") || (org?.name ? String(org.name) : null) || titleName || null;

  const h1s = allTagTexts(html, "h1", 3);
  const h2s = allTagTexts(html, "h2", 12);
  const promise = meta(html, "description") || meta(html, "og:description") || h1s[0] || null;

  const businessTypes = Array.from(new Set(ld.flatMap(typesOf).filter((t) => !/WebSite|WebPage|BreadcrumbList|ImageObject|SearchAction|ListItem|Offer$/i.test(t))));
  const haystack = `${title || ""} ${promise || ""} ${h1s.join(" ")} ${text.slice(0, 5000)}`;
  const niche = NICHES.find((n) => n.words.test(haystack))?.niche ?? null;

  const ldOfferings = ld.filter((n) => typesOf(n).some((t) => /Product|Service|Offer|Course|MenuItem/i.test(t)) && n.name).map((n) => String(n.name));
  const offerings = Array.from(new Set(ldOfferings.length ? ldOfferings : h2s)).slice(0, 8);

  const prices = Array.from(new Set((text.match(PRICE_RE) || []).map((p) => p.replace(/\s+/g, " ").trim()))).slice(0, 6);

  const ctas: string[] = [];
  for (const m of Array.from(html.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi))) {
    const t = stripTags(m[2]);
    if (t && t.length <= 40 && CTA_WORDS.test(t) && !ctas.includes(t)) ctas.push(t);
    if (ctas.length >= 6) break;
  }

  const socials: Record<string, string> = {};
  for (const m of Array.from(html.matchAll(/href=["']([^"']+)["']/gi))) {
    for (const [k, re] of Object.entries(SOCIAL_HOSTS)) if (!socials[k] && re.test(m[1])) socials[k] = m[1];
  }

  const ldLogo = org?.logo ? (typeof org.logo === "string" ? org.logo : org.logo.url) : null;
  const iconHref = html.match(/<link[^>]*rel=["'](?:apple-touch-icon|icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? null;
  const logo = absolute(ldLogo || iconHref, url);
  const image = absolute(meta(html, "og:image"), url);

  const dna: BrandDna = {
    url,
    name,
    promise,
    headline: h1s[0] ?? null,
    language: lang,
    businessTypes,
    niche,
    offerings,
    prices,
    ctas,
    colors: extractColors(html),
    logo,
    image,
    socials,
    tone: detectTone(text),
    hasPhone: /href=["']tel:/i.test(html),
    hasEmail: /href=["']mailto:/i.test(html),
    completeness: 0,
    gaps: [],
  };
  scoreCompleteness(dna);
  return dna;
}

/** Holo's les: hoe specifieker de DNA, hoe minder generiek de content. We
 * scoren dus expliciet wat ontbreekt, zodat de gebruiker het kan aanvullen. */
function scoreCompleteness(dna: BrandDna): void {
  const checks: [boolean, number, string][] = [
    [!!dna.name, 15, "Geen merknaam gevonden (og:site_name of JSON-LD Organization)."],
    [!!dna.promise, 20, "Geen kernbelofte (meta description of h1) — hooks worden generiek."],
    [dna.offerings.length > 0, 15, "Geen producten/diensten herkend (h2's of JSON-LD Product/Service)."],
    [dna.ctas.length > 0, 10, "Geen duidelijke call-to-action-knop gevonden."],
    [dna.prices.length > 0, 10, "Geen prijzen zichtbaar — aanbod-advertenties missen een concreet anker."],
    [dna.colors.length > 0, 10, "Geen merkkleuren gevonden (theme-color of CSS)."],
    [!!dna.logo || !!dna.image, 10, "Geen logo of deelafbeelding (og:image) — visuals worden niet herkenbaar."],
    [Object.keys(dna.socials).length > 0, 5, "Geen social-profielen gelinkt — social proof ontbreekt."],
    [dna.niche !== null || dna.businessTypes.length > 0, 5, "Branche niet herkend — voeg JSON-LD LocalBusiness/Organization toe."],
  ];
  dna.completeness = checks.reduce((s, [ok, w]) => s + (ok ? w : 0), 0);
  dna.gaps = checks.filter(([ok]) => !ok).map(([, , msg]) => msg);
}

// ─── Advertentie-matrix ───────────────────────────────────────────────────────

/** Kort af op een woordgrens binnen `max` tekens (met … als er is afgekapt). */
export function fit(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–-]+$/, "") + "…";
}

/** Kiest de eerste kandidaat die zonder afkappen binnen `max` past; anders de
 * kortste, netjes ingekort. Advertentiekoppen met "…" verliezen klikken. */
export function pick(candidates: (string | null | undefined)[], max: number): string {
  const list = candidates.filter((c): c is string => !!c && !!c.trim()).map((c) => c.replace(/\s+/g, " ").trim());
  const ok = list.find((c) => c.length <= max);
  if (ok) return ok;
  const shortest = list.sort((a, b) => a.length - b.length)[0] || "";
  return fit(shortest, max);
}

/** Zoveel hele zinnen als binnen `max` passen (minstens één, eventueel ingekort). */
export function sentences(text: string, max: number): string {
  const parts = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*/g) || [text];
  let out = "";
  for (const p of parts.map((x) => x.trim())) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > max) break;
    out = next;
  }
  return out || fit(parts[0], max);
}

function slug(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "merk";
}

const PLATFORMS: { key: Platform; format: string; label: string }[] = [
  { key: "meta_feed", format: "Statisch of carrousel, 4:5 (1080×1350)", label: "Meta Feed" },
  { key: "meta_reels", format: "Video 9:16 (1080×1920), 15–30s, hook in de eerste 2s", label: "Reels" },
  { key: "google_search", format: "Responsive Search Ad (tekst)", label: "Google Search" },
];

const ANGLES: Angle[] = ["pijn", "resultaat", "bewijs", "gratis_tip"];

interface Copy {
  hook: string;
  headlines: (string | null)[]; // kandidaten in voorkeursvolgorde; pick() kiest de eerste die past
  primary: string[]; // zinnen in volgorde; sentences() vult tot de limiet
  cta: string;
  visual: string;
}

function firstSentence(t: string | null): string | null {
  if (!t) return null;
  const m = t.match(/[^.!?]+[.!?]?/);
  return m ? m[0].trim() : t;
}

function copyFor(angle: Angle, dna: BrandDna): Copy {
  const nl = dna.language === "nl";
  const brand = dna.name || (nl ? "ons" : "us");
  const offer = dna.offerings[0] || (nl ? "onze dienst" : "our service");
  const o = offer.toLowerCase();
  const promise = dna.promise || dna.headline || offer;
  const lead = firstSentence(promise);
  const price = dna.prices[0];
  const cta = dna.ctas[0] || (nl ? "Meer info" : "Learn more");
  const je = dna.tone.address === "formeel" ? "u" : "je";

  switch (angle) {
    case "pijn":
      return nl
        ? { hook: `Herken ${je} dit?`, headlines: [`Klaar met gedoe rond ${o}?`, `Nooit meer gedoe met ${o}`, `Minder gedoe, meer tijd`], primary: [`Herken ${je} dit?`, promise, `Zo lost ${brand} het op.`], cta, visual: "Voor/na-split: links het probleem herkenbaar in beeld, rechts de oplossing in merkkleuren." }
        : { hook: "Sound familiar?", headlines: [`Tired of the hassle with ${o}?`, `No more hassle with ${o}`, `Less hassle, more time`], primary: ["Sound familiar?", promise, `Here's how ${brand} fixes it.`], cta, visual: "Before/after split: the problem on the left, the solution on the right in brand colours." };
    case "resultaat":
      return nl
        ? { hook: `Dit is wat ${je} krijgt`, headlines: [dna.headline, lead, `${brand}: ${o}`, brand], primary: [promise, price ? `Vanaf ${price}.` : ""], cta, visual: "Het eindresultaat groot in beeld (product of tevreden klant), logo klein linksboven." }
        : { hook: "Here's what you get", headlines: [dna.headline, lead, `${brand}: ${o}`, brand], primary: [promise, price ? `From ${price}.` : ""], cta, visual: "The end result large in frame (product or happy customer), small logo top-left." };
    case "bewijs":
      return nl
        ? { hook: `Waarom klanten voor ${brand} kiezen`, headlines: [`Klanten over ${brand}`, `Waarom klanten kiezen voor ${brand}`, "Wat klanten zeggen"], primary: [`Echte ervaringen van klanten met ${o}.`, "Lees zelf waarom ze terugkomen."], cta, visual: "Echte review of sterrenscore als quote-kaart; gebruik alleen bestaande, controleerbare reviews." }
        : { hook: `Why customers choose ${brand}`, headlines: [`What customers say about ${brand}`, `Why customers choose ${brand}`, "What customers say"], primary: [`Real experiences with ${o}.`, "See why they come back."], cta, visual: "A real review or star rating as a quote card; only use existing, verifiable reviews." };
    case "gratis_tip":
      // Holo's eigen winnende hook-type ("free sauce on …"): geef eerst waarde.
      return nl
        ? { hook: `Gratis tip over ${o}`, headlines: [`3 tips voor ${o}`, `Gratis tip: ${o}`, "3 gratis tips"], primary: [`3 dingen die ${je} vandaag kunt doen voor ${o}.`, "Tip 3 doen de meesten fout."], cta, visual: "Talking-head of tekst-op-scherm met 3 genummerde tips; product pas in de laatste seconden." }
        : { hook: `Free tip on ${o}`, headlines: [`3 tips for ${o}`, `Free tip: ${o}`, "3 free tips"], primary: [`3 things you can do today for ${o}.`, "Most people get #3 wrong."], cta, visual: "Talking head or text-on-screen with 3 numbered tips; product only in the final seconds." };
  }
}

export function buildAdMatrix(dna: BrandDna, campaignDate = new Date()): AdBrief[] {
  const brand = slug(dna.name || new URL(dna.url).hostname);
  const date = `${String(campaignDate.getDate()).padStart(2, "0")}.${String(campaignDate.getMonth() + 1).padStart(2, "0")}`;
  const briefs: AdBrief[] = [];
  for (const angle of ANGLES) {
    const c = copyFor(angle, dna);
    for (const p of PLATFORMS) {
      const lim = LIMITS[p.key];
      const adName = `${brand} | ${angle} | ${p.key} | ${date} | v1`;
      briefs.push({
        adName,
        angle,
        platform: p.key,
        format: p.format,
        hook: c.hook,
        headline: pick(c.headlines, lim.headline),
        primaryText: sentences(c.primary.filter(Boolean).join(" "), lim.primaryText),
        cta: fit(c.cta, 25),
        visualBrief: p.key === "google_search" ? "n.v.t. (tekstadvertentie)" : c.visual + (dna.colors.length ? ` Merkkleuren: ${dna.colors.slice(0, 3).join(", ")}.` : ""),
        utm: {
          utm_source: p.key === "google_search" ? "google" : "meta",
          utm_medium: p.key === "google_search" ? "cpc" : "paidsocial",
          utm_campaign: `${brand}-${angle}`,
          utm_content: `${p.key}-v1`,
          utm_term: angle,
        },
      });
    }
  }
  return briefs;
}

/** De campagnestructuur zoals afgeleid uit Holo's eigen UTM-tags
 * (CBO | Scaling | Broad | Mix L7D Adsets | 7C1V), vertaald naar een MKB-budget. */
export function campaignPlan(dna: BrandDna): CampaignPlan {
  const seg = dna.niche ? `per doelgroep/beroep (bv. ${dna.niche}) een eigen ad set of campagne, zodat één segment niet al het budget opeet` : "per doelgroep een eigen ad set, zodat één segment niet al het budget opeet";
  return {
    structure: [
      "Testcampagne (ABO): vast dagbudget per ad set, 3–4 varianten per hook, 3–5 dagen laten lopen.",
      "Schaalcampagne (CBO, breed targeten): alleen de winnaars van de laatste 7 dagen erin (Holo: 'Mix L7D Adsets').",
      `Segmenteren: ${seg}.`,
      "Attributie 7 dagen klik / 1 dag view (Holo: '7C1V'); meet op aanmelding/boeking, niet op klik.",
      "Elke week: verliezers uit, nieuwe hook-varianten erin (creative-volume wint van targeting).",
    ],
    namingConvention: "merk | invalshoek | platform | dd.mm | vN  — en dezelfde waarden in utm_campaign/utm_content, zodat elke aanmelding terug te leiden is naar één advertentie.",
    testPlan: [
      "Ronde 1: 4 invalshoeken × Reels + Feed (8 ads), gelijk budget.",
      "Winnaar = laagste kosten per aanmelding na ≥ 1.000 vertoningen per ad.",
      "Ronde 2: 3 nieuwe hooks binnen de winnende invalshoek; verliezende invalshoeken pauzeren.",
    ],
  };
}

export function buildReport(html: string, url: string, now = new Date()): BrandDnaReport {
  const dna = extractBrandDna(html, url);
  return { dna, matrix: buildAdMatrix(dna, now), campaign: campaignPlan(dna), disclaimer: DISCLAIMER };
}

/** Haalt de URL SSRF-veilig op (gedeelde helper met de SEO-audit) en bouwt het rapport. */
export async function fetchBrandDna(rawUrl: string): Promise<BrandDnaReport> {
  const page = await fetchHtmlSafe(rawUrl, "DreamTeamBrandDNA/1.0 (+https://dreamteam.nl; keyless brand profile)");
  return buildReport(page.html, page.finalUrl.toString());
}
