# Brand DNA + advertentie-matrix in DreamTeam

> Onderzoek → analyse → implementatie van de marketingmotor van **Holo (tryholo.ai)**.
> Onderzoek: [`docs/onderzoek/HOLO-benchmark-reverse-engineering-2026-10-31.md`](onderzoek/HOLO-benchmark-reverse-engineering-2026-10-31.md).
> Zelfde patroon als `docs/claude-seo.md`: geen kopie, maar een eigen vertaling van het waargenomen gedrag.

## 1. Is Holo's marketing te reverse-engineeren? Ja. Dit is de motor
Holo is geen magie. Het is een lus van zes schakels:

| # | Schakel | Wat Holo doet | Moeilijkheid | In DreamTeam |
|---|---|---|---|---|
| 1 | **Brand DNA** | URL scrapen → toon, kleuren, doelgroep, aanbod | laag | ✅ `extractBrandDna` (keyless) |
| 2 | **Strategie** | invalshoeken × platformen → kalender | laag | ✅ `buildAdMatrix` + `campaignPlan` (keyless) |
| 3 | **Copy** | per brief tekst in merktoon | laag (LLM) | ⏭ volgende stap: LLM-verrijking (key-gated, Claude + budget-guard) |
| 4 | **Beeld/video** | statisch, carrousel, UGC-video | middel | ⏭ via bestaande pijplijn (Higgsfield / hologram-route) |
| 5 | **Publiceren** | Meta-koppeling, social-kalender | middel (API-review) | ⏭ eerst handmatig met de UTM-namen hieronder |
| 6 | **Meten → budget** | winnaars krijgen budget | middel | ⏭ Meta Insights + UTM → aanmelding |

De echte voorsprong van Holo zit niet in de code, maar in **creative-volume + een strakke testdiscipline** (zie §3). Dat deel is vandaag al na te doen, zonder te bouwen.

## 2. Wat er gebouwd is (`server/brandDna.ts`)
`POST /api/brand-dna/analyze { "url": "https://…" }` geeft terug:
- **`dna`**: naam, belofte, h1, taal, branche/niche, aanbod, prijzen, CTA's, merkkleuren, logo/og-image, socials, toon (u/je, uitroeptekens, emoji), plus een **volledigheidsscore met gaten**. Dat volgt Holo's eigen les: hoe specifieker de DNA, hoe minder generiek de content. De gaten vertellen je wat je op je eigen site moet verbeteren.
- **`matrix`**: 12 briefs = 4 invalshoeken (**pijn, resultaat, bewijs, gratis_tip**) × 3 platformen (Meta Feed 4:5, Reels 9:16, Google Search). Elke brief heeft een hook, kop, tekst en CTA **binnen de tekenlimieten** (Meta 40/125, Google 30/90). Koppen worden niet afgekapt: per veld kiest `pick()` de eerste kandidaat die past. Elke brief krijgt ook een visuele brief in de merkkleuren en een `adName` plus UTM-tags volgens Holo's naamgeving.
- **`campaign`**: de campagnestructuur die uit Holo's eigen UTM-tags is afgeleid (CBO | Scaling | Broad | Mix L7D | 7C1V), vertaald naar een MKB-budget.

Veiligheid: dezelfde SSRF-veilige fetch als de SEO-audit (`fetchHtmlSafe` in `seo.ts`, nu gedeeld), met guard, rate-limit en een cap van 2MB.
Grens: heuristiek op statische HTML, geen JS-rendering en geen LLM. Gratis en voorspelbaar, maar de copy is sjabloonmatig. Schakel 3 (LLM) maakt die scherp.

## 3. Wat ik als mede-eigenaar doe (volgorde = hoogste opbrengst eerst)
1. **Deze week, zonder bouwen: Holo's advertentiediscipline op Klanttijd.**
   - Elk beroep een eigen ad set (kapper / schoonheid). Dat lost op dat schoonheid nu doodgeknepen wordt (84% van het budget ging naar kapper, 12 okt).
   - Per beroep 4 invalshoeken × 2 varianten = 8 ads. Begin met de **gratis_tip**-hook, Holo's eigen schaalwinnaar.
   - Naamgeving en UTM zoals de matrix ze geeft. Meet op `start_gratis` en aanmelding, niet op klik.
   - Na 1.000 vertoningen per ad: verliezers uit, 3 nieuwe hooks in de winnende invalshoek.
2. **Volgende bouwstap: schakel 3.** Claude herschrijft de 12 briefs in merktoon. Dat wordt key-gated met de bestaande budget-guard en valt terug op de keyless sjablonen.
3. **Dan schakel 4 + 6.** Creatives via de bestaande Higgsfield-/hologram-pijplijn, en een wekelijkse "winnaars-lus" die Meta-resultaten per `adName` terugleest.
4. **Pas daarna productiseren.** "Marketing-autopilot voor NL-salons" als betaalde Klanttijd-module. Het onderscheid dat Holo niet heeft: **agenda-data**. Advertenties als "dinsdag 14:00 nog vrij" worden gevuld met echte lege plekken. Plus eerlijke prijzen: geen afteltimer en geen vooraf-betalen-zonder-proef. Holo's billing-klachten zijn ons vertrouwensvoordeel.

Wat ik bewust **niet** doe: Holo frontaal nabouwen als generieke, Engelstalige, wereldwijde tool. Dat is een advertentieoorlog tegen €5M en 20.000 klanten. De niche plus de data is de wig.

## 4. Testen
`npx vitest run server/brandDna.test.ts`. Gedekt zijn extractie, kleuren en toon, het niet afkappen van koppen, de tekenlimieten, de naamgeving/UTM, Engels versus Nederlands en ongeldige JSON-LD.
