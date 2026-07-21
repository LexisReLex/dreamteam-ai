# claude-seo in DreamTeam

> Onderzoek → analyse → implementatie van [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)
> (MIT, v2.2.4) toegepast op het DreamTeam AI-agentplatform.

Dit volgt hetzelfde patroon als `docs/loop-engineering.md`: we nemen een externe
repo, begrijpen de kern, en implementeren de bruikbare essentie in DreamTeam —
geen kopie, maar een vertaling naar onze eigen server-side code.

## 1. Onderzoek — wat is claude-seo?

`claude-seo` is een **Claude Code marketplace-plugin** voor SEO-analyse: 25
sub-skills, 18 sub-agents en 8 optionele MCP-extensies (DataForSEO, Firecrawl,
Ahrefs, SE Ranking, Profound, Bing Webmaster, Banana, Unlighthouse). Het dekt
vrijwel het hele SEO-spectrum:

| Domein | Kern van de analyse |
|--------|---------------------|
| **Technical** | crawlability, indexeerbaarheid, security-headers, URL-structuur, mobile, JS-rendering |
| **Content / E-E-A-T** | Who/How/Why-test, E-E-A-T-weging, dunne content, AI-content-markers |
| **Schema** | JSON-LD detectie/validatie/generatie, actieve vs. verouderde typen |
| **Core Web Vitals** | LCP/INP/CLS-drempels op 75e percentiel veld-data (CrUX) |
| **GEO / AI-search** | citability, SSR-toegankelijkheid voor AI-crawlers, brand mentions |
| **Sitemap / hreflang** | XML-sitemap-kwaliteit, taal/regio-targeting, content-pariteit |
| **Backlinks / Local / Ecommerce / Clustering / Drift / SXO** | domeinspecifieke audits |

Architectuur in drie lagen: een **orchestrator** (routing + scoring + synthese),
**skills** (kennis/checklists per domein, pure natuurlijke taal) en **sub-agents**
(dispatchbare specialisten met eigen toolset). Onder de skills zit een
deterministische **script-laag** (fetch, parse, render, API-calls) — waaronder een
`url_safety.py` met SSRF/DNS-rebinding-bescherming waar élke user-URL doorheen gaat.

Een kernidee dat de hele plugin uitdraagt: het **4-fasen denkraamwerk**
(PERCEIVE → ANALYZE → VALIDATE → ACT). "Een finding die niet door alle vier fasen
is gegaan is geen aanbeveling." En: **graceful degradation** — een analyse verrijkt
zichzelf als een API-key beschikbaar is, en draait anders op HTML-heuristiek mét
de eerlijke disclaimer dat het heuristiek is, geen Google-intern signaal.

## 2. Analyse — wat past bij DreamTeam?

DreamTeam is géén Claude Code; het is een Node/TypeScript-webapp met agent-stoelen
(chat via de Anthropic SDK, `claude-haiku-4-5`) en autonome Agent Loops. We kunnen
de plugin dus niet "installeren" — we vertalen de bruikbare kern naar server-code.

Twee dingen sprongen eruit:

1. **DreamTeam heeft al een SEO-stoel**: agent #4, *Kai, SEO Specialist* — maar met
   een dunne prompt van vier regels. De plugin levert precies de methodiek die Kai
   mist (gestructureerde audit, drempels, prioritering, eerlijkheid).
2. **De keyless kern van de plugin draait puur op één URL ophalen + HTML lezen.**
   Dat is direct te bouwen zonder betaalde API's — en het maakt de implementatie
   een *echte tool*, geen prompt alleen.

Wat we bewust **niet** overnemen: de betaalde MCP-extensies (DataForSEO/Ahrefs),
veld-CWV (CrUX/PageSpeed), backlinks (Moz) en SERP-data. Die vereisen keys en zijn
een aparte mijlpaal. We volgen het degradation-principe van de plugin: bouw de
keyless laag goed, wees eerlijk over de grens.

## 3. Implementatie — wat we bouwden

### 3.1 Kai's brein (`server/prompts.ts`)
Agent #4 kreeg een volledige methodiek-prompt: het 4-fasen denkraamwerk, de
audit-dimensies, en de concrete drempels/heuristieken uit de plugin, o.a.:
- **E-E-A-T-weging Trust 30% / Expertise 25% / Authoritativeness 25% / Experience 20%**
  (Trust is het zwaarst — expliciet níét 25/25/25/25).
- **CWV-drempels** LCP ≤2,5s, INP ≤200ms, CLS ≤0,1 op 75e percentiel veld-data.
- **Anti-hallucinatie-guards**: noem nooit FID (vervangen door INP), er is geen "CWV 2.0".
- **Verouderde schema-typen** die je nooit aanbeveelt (HowTo, SpecialAnnouncement,
  ClaimReview, VehicleListing, CourseInfo).
- **GEO/AI-search**: self-contained passages ~134–167 woorden, SSR is kritisch
  (AI-crawlers voeren geen JS uit), brand mentions correleren ~3× sterker dan backlinks.
- **Eerlijkheid**: geen verzonnen cijfers; markeer heuristiek als heuristiek.

### 3.2 Keyless technische SEO-analyzer (`server/seo.ts`)
Een echte, werkende tool die één URL ophaalt en analyseert:

- **SSRF-veilige fetch** (repliceert `url_safety.py`): alleen http(s); weigert
  literal private/gereserveerde IP's, interne hostnamen (`localhost`, `.local`,
  `.internal`) en cloud-metadata (`169.254.169.254`); resolvt de hostnaam en weigert
  als die naar een private adres wijst (DNS-rebinding); **elke redirect-hop wordt
  opnieuw gevalideerd**. Body gecapt op 2MB (Googlebot fetcht ~de eerste 2MB) met
  time-out.
- **Dependency-vrije HTML-extractie**: title, meta description, canonical,
  meta robots/noindex, viewport, `<html lang>`, H1/H2-tellingen, hreflang, JSON-LD
  (met @type-detectie + parse-validatie), Open Graph, afbeeldingen + alt-dekking,
  woordtelling, en security-headers uit de response.
- **Scoring** naar een **SEO Health Score (0–100)** met de gewichten uit de plugin
  (`skills/seo/SKILL.md`), genormaliseerd over de keyless-meetbare categorieën:
  Content 23, Technical 22, On-Page 20, Schema 10, AI/GEO 10, Images 5. Elke
  bevinding krijgt een severity (Critical/High/Medium/Low), een concrete fix, en de
  lijst wordt op ernst gesorteerd.

### 3.3 Endpoint (`server/routes.ts`)
`POST /api/seo/analyze { url }` → het gescoorde rapport. Achter dezelfde
`accessGuard` als de andere dure endpoints en **rate-limited (10/min per IP)** omdat
het een outbound fetch doet. SSRF-weigeringen geven 400, upstream-fouten 502.

### 3.4 Client — SEO-audit-paneel (`client/src/components/SeoAuditPanel.tsx`)
In Kai's detailpagina (alleen agent #4) staat een compact paneel: voer een URL in,
klik **Scan**, en zie de Health Score-ring, de categorie-balken en de geprioriteerde
bevindingen — inclusief de eerlijke heuristiek-disclaimer.

### 3.5 Tests (`server/seo.test.ts`)
15 tests (pure functies, geen netwerk): de SSRF-classificatie (loopback, private,
CGNAT, link-local/metadata, IPv6), de URL-syntaxcontrole, de tekst/word-count-
extractie, en de scoring op een goede vs. slechte pagina + ongeldige/verouderde
JSON-LD. Draait mee in `npm test`.

## 4. Eerlijke grenzen (graceful degradation)

Deze laag meet **alleen wat uit statische HTML + response-headers komt** — geen
JS-rendering. De scores zijn **heuristiek, geen Google-interne ranking-signalen**.
Buiten scope (bewust, vereist API-keys → volgende mijlpaal):

- **Veld-Core Web Vitals** (CrUX / PageSpeed Insights) — nu alleen indirecte hints.
- **Backlinks** (Moz/Ahrefs/Common Crawl) en **SERP/keyword-volumes** (DataForSEO).
- **Search Console / GA4** en **JS-gerenderde SPA-content** (headless rendering).

De analyzer draait volledig zonder deze keys; een pagina die vooral client-side
rendert wordt eerlijk gemarkeerd ("weinig server-gerenderde tekst") in plaats van
stil verkeerd gescoord.

## 5. Attributie & licentie

`claude-seo` is **MIT** (© 2026 agricidaniel). We hebben geen bestanden letterlijk
overgenomen — dit is een eigen implementatie van de *ideeën en methodiek*. De
drempels, checklists en het 4-fasen-raamwerk zijn afkomstig uit de plugin en
worden hier met bronvermelding toegepast. Let op bij eventuele uitbreiding: de
`seo-flow`-skill in de originele repo staat onder **CC BY 4.0** (© Daniel Agrici) en
vereist expliciete naamsvermelding als je die prompts overneemt — dat hebben we
hier niet gedaan.

Bron: https://github.com/AgriciDaniel/claude-seo
