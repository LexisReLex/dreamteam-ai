# Holo (tryholo.ai): benchmark en reverse engineering
*Onderzoek 31 okt 2026. Geleid door Claude, voor Lex.*

## 0. Kort antwoord
**Ja, het kan, en grotendeels is het al gedaan.** Hieronder staan het product, de funnel, de advertentiestrategie en de vermoedelijke techniek, plus een bouwplan om iets vergelijkbaars te maken. Het gaat om *functionele* reverse engineering: hoe het werkt en waarom het verkoopt. Hun code of merk kopiëren doen we niet (juridisch en ethisch).

**Meetgrens (eerlijk):** deze cloud-container mag tryholo.ai, Trustpilot, archive.org en de reviewsites niet ophalen (proxy 403 / DNS geblokkeerd). Alles hieronder komt uit zoekmachine-extracten van hun eigen pagina's, hun docs (docs.tryholo.ai) en persberichten. Elk punt is gelabeld:
- **GEMETEN**: meerdere bronnen of hun eigen pagina zeggen het
- **AFGELEID**: mijn analyse
- **ONBEVESTIGD**: één bron of tegenstrijdig

---

## 1. Wat is Holo?
| | |
|---|---|
| Bedrijf | Holo, Vilnius (Litouwen). Oprichters Deividas Kovger (product) en Aleksandras Urbanavicius (groei). CTO Arnas Puidokas, design Karolis Vaiginis. **GEMETEN** |
| Positionering | "Marketing-autopilot voor kleine bedrijven zonder marketingteam". Plakt een URL, krijgt een plan plus content. **GEMETEN** |
| Tractie (eigen claim) | $5M ARR in 252 dagen, 20.000+ betalende bedrijven, 100+ landen. Minder dan €1M opgehaald vóór de seed. **GEMETEN (claim, niet geaudit)** |
| Funding | €5M seed, 15 okt 2026, lead Market One Capital (+ Silicon Gardens, FirstPick, Leonis, NGL, Tekton). **GEMETEN** |
| Rekensom | $5M ARR / 20k klanten ≈ **$250/jaar ≈ $21/mnd per klant**. Dat past bij de korting-prijzen. **AFGELEID** |

## 2. Product, ontleed (de "motor")
Uit hun docs (docs.tryholo.ai):

1. **Onboarding = URL plakken.** Holo scrapet de site en vult een **Brand DNA** (positionering, toon, kleuren, doelklant). Er zijn drie tabbladen: Overview, Integrations, **Catalogue** (producten). *"Hoe specifieker de DNA, hoe minder generiek de content."* **GEMETEN**
2. **Brands-werkruimtes.** Per merk: eigen DNA, catalogus, marketingstrategie en contentbibliotheek. Starter = 1 merk, Scale = 3. **GEMETEN**
3. **Ads-module.** AI-voorgestelde advertentie-ideeën, **concurrent-inspiratie**, en **"Clone"**: een bestaande winnende advertentie wordt naar jouw DNA en producten omgezet. Formaten: statisch, carrousel, video, plus AI-UGC en een "influencer generator". **Connect Meta** voor publiceren. In een beta zat ook een Meta Ads Manager CSV-export. **GEMETEN**
4. **Socials.** Je kiest kanaal, posts per week en formaten. Holo zet ideeën op een kalender en publiceert. **GEMETEN**
5. **E-mail.** Geen koppeling nodig. Genereert campagne-ideeën, onderwerpregels en invalshoeken. **GEMETEN**
6. **SEO.** Op de homepage genoemd, er zijn "SEO Webhooks" in de docs. Inhoud onduidelijk. **ONBEVESTIGD**
7. **Autopilot per functie.** "Plant, schrijft, publiceert, reageert en verschuift advertentiebudget op basis van resultaat." Het geld van de seed gaat naar *meer zonder handmatige goedkeuring*. **GEMETEN (claim)**
8. **Activation checklist** in de docs. Een klassieke activatie-funnel in het product. **GEMETEN**

Een beta-pagina (sslip.io) noemde "12 advertenties = 4 invalshoeken × 3 platformen + Meta-campagnebrief" en **~$0,78 inferentiekosten per run**. **ONBEVESTIGD**, maar het geeft wel een orde van grootte voor de kostprijs.

## 3. Verdienmodel en prijs
- Starter ≈ $20/mnd en Scale ≈ $48/mnd als lijstprijs. Er staat **vrijwel altijd een korting** met afteltimer ("Sale 40% OFF 19h 30m"), met effectief $10–20 voor Starter. Er is een `?competitors-upsell=test`-variant van de prijspagina: **ze A/B-testen prijs en upsell actief.** **GEMETEN**
- Maand-, kwartaal- en jaarfacturering. Er is **geen gratis proef**: betalen vooraf, met 14 dagen geld-terug, en die vervalt bij meer dan ~35 creaties. **ONBEVESTIGD (reviews)**
- Credits: Starter ~125 en Scale ~325 creatives per maand. Video kost meer credits. Ze zijn eerder **van "5 video-ads per dag" naar credits overgestapt**, wat voor boze reviews zorgde. **GEMETEN (Trustpilot)**
- **AFGELEID:** bij ~$0,78 per run en ~$15 per maand per klant is de marge alleen gezond omdat de meeste klanten hun credits niet opmaken. Het klassieke "breakage"-model.

## 4. De advertentie-machine, ontcijferd uit jouw link
De UTM-parameters in de link die jij kreeg verraden hun Meta-setup letterlijk. **GEMETEN (uit de URL zelf)**

| Parameter | Waarde | Betekenis |
|---|---|---|
| campaign | `(HOLO) CBO \| Scaling \| EN \| Mix L7D Adsets \| Broad \| 08.11 DJ \| CC` | Campagnebudget-optimalisatie, schaalcampagne, Engels, ad sets samengesteld uit winnaars van de laatste 7 dagen, brede targeting. "DJ" is waarschijnlijk de media buyer, "CC" vermoedelijk de creative-bron (bv. creator content). |
| content | `Broad \| WW \| All \| 18-65 \| 7C1V \| CC` | Wereldwijd, alle geslachten, 18–65, attributie 7 dagen klik / 1 dag view. |
| term (= advertentienaam) | `free sauce on creative diversification 1-4` | De hook van de creative: een "gratis tip"-video over creative-diversificatie, variant 1 van 4. |

**Conclusie (AFGELEID):** Holo is in de kern een **performance-marketingbedrijf dat een SaaS verkoopt**. De formule:
- **Breed + wereldwijd + CBO.** Ze laten Meta's algoritme de koper vinden en sturen alleen met creatives.
- **Content-led hooks.** Ze verkopen niet "koop Holo", maar geven een marketingtip ("free sauce"). Dat filtert op ondernemers die adverteren.
- **Creative-volume.** Varianten 1-4 per hook en wekelijks ververst ("Mix L7D"). Ze eten hun eigen kookkunst: dezelfde Clone/varianten-aanpak die het product verkoopt.
- **Prijs-urgentie op de landing** (afteltimer, korting) en **vooraf betalen**. Dat maximaliseert de cash-terugverdientijd van advertentiegeld.
- **SEO-longtail:** tientallen landingspagina's per zoekterm (`/facebook-ads-maker`, `/ig-ad-maker`, `/ai-ugc-generator`, `/tiktok-video-generator`, `/influencer-generator`). Programmatic SEO.
- Een Product Hunt-lancering voor de eerste social proof.

## 5. Benchmark tegen concurrenten
| | Holo | AdCreative.ai | Arcads / UGC-tools | Jasper / Copy-tools |
|---|---|---|---|---|
| Input | URL → Brand DNA | Brand kit handmatig | Script/product | Prompt |
| Breedte | Ads + social + e-mail + SEO + publiceren | Vooral ads (statisch) | Alleen video-UGC | Alleen tekst |
| Autopilot/publiceren | Ja (Meta, socials) | Beperkt | Nee | Nee |
| Instapprijs | ~$10–20 (promo) | ~$20–39 | $100+ | ~$40+ |
| Doelgroep | Micro-MKB, solo-ondernemer | Marketeer/bureau | DTC-merken | Content-teams |
| Zwakte | Billing-vertrouwen, generieke output, hallucinaties | Duurder, smaller | Duur | Geen beeld |

**Holo wint op:** laagste drempel (één URL), alles-in-één en een agressieve prijs.
**Holo verliest op:** vertrouwen (billing-klachten, credit-wissel), kwaliteit/consistentie ("hallucineert ondanks strikte instructies") en lokale talen en markten (Engels-first, EN-campagne).

## 6. Vermoedelijke techniek (AFGELEID, niet gemeten)
De site zelf kon ik niet inspecteren. Voor dit producttype is dit de standaard, en zo zou ik het nabouwen:
1. **Scraper:** headless browser (Playwright) of Firecrawl → tekst, kleuren (CSS/screenshot), logo, producten (schema.org / Shopify `products.json`).
2. **Brand DNA-extractie:** LLM-call met een vast JSON-schema (positionering, toon, doelgroep, USP's, kleuren).
3. **Strategie-laag:** LLM maakt invalshoeken × platformen → content-kalender.
4. **Generatie:** beeld (bv. Nano Banana / GPT-image / Flux), video en UGC (Veo / Kling / Seedance) plus avatar en stem (ElevenLabs), samengesteld met templates (Remotion of Canvas-render) zodat tekst en logo scherp blijven.
5. **Distributie:** Meta Marketing API (campagne/adset/ad aanmaken), Instagram/Facebook/TikTok publish-API's, e-mail via Klaviyo/Mailchimp of eigen.
6. **Lus:** Meta Insights → budget naar winnaars ("moves budget based on results").
7. **Billing:** Stripe-abonnementen plus creditsysteem.

## 7. Wat betekent dit voor Lex? (aanbeveling)
1. **Niet frontaal nabouwen.** Het is een kapitaalintensieve advertentieoorlog (wereldwijd, Engels) tegen een team met €5M en 20k klanten.
2. **Wel de formule overnemen voor een niche waarin jij al zit:** *Nederlandstalige marketing-autopilot voor kappers, schoonheidsspecialisten en coaches*, gekoppeld aan **Klanttijd**. Jouw voordelen:
   - Je hebt de **agenda-data** (lege plekken). Holo heeft die niet. Een advertentie "Dinsdag 14:00 nog vrij, boek nu" is concreter dan wat Holo kan.
   - Je kent de taal en de doelgroep (kapper-CPC €0,37 gemeten op 12 okt).
   - Je eigen Klanttijd-reclamefilm en de hologram-route zijn al bewezen productie-pijplijnen.
3. **Direct bruikbaar zonder te bouwen:** neem hun advertentiestructuur over voor je eigen Klanttijd-ads. Gebruik CBO, brede targeting, 3–4 varianten per hook, "gratis tip"-hooks ("3 manieren om lege plekken op te vullen") en wekelijks de winnaars mixen. Dat maakt ook het probleem uit de handover van 12 okt kleiner (schoonheid krijgt geen budget): geef elk beroep een eigen ad set of campagne.
4. **Leer van hun zwakte:** gratis start, transparante credits en geen afteltimer-trucs. Dat is in NL je vertrouwensvoordeel.

## 8. Wat ik niet kon meten en wat dat zou openen
- **Wel kon:** zoekextracten van hun site, docs, prijspagina, Trustpilot en persberichten, plus de UTM-analyse.
- **Dicht:** directe fetch van tryholo.ai, Trustpilot, archive.org en Meta Ad Library vanuit deze cloud-container (netwerkbeleid).
- **Wat opent:** (a) de domeinen toevoegen aan het netwerkbeleid van de omgeving, of (b) een sessie op je eigen Mac (Cowork/Chrome). Dan kan ik de echte HTML/JS-bundels (framework, trackers, Stripe, AI-endpoints) en hun live advertenties in de **Meta Ad Library** inspecteren (aantal actieve ads, hooks, looptijd = winnaars).

## Bronnen
- Funding/tractie: [The Recursive](https://www.therecursive.com/lithuanian-holo-raises-eur5m-to-put-small-business-marketing-on-autopilot/), [Dealroom](https://dealroom.co/news/162819-lithuanias-holo-raises-5m-seed-after-hitting-5m-arr-in-252-days/), [Vestbee](https://www.vestbee.com/insights/articles/holo-raises-5-m), [Cobalt](https://www.cobalt.legal/news-cases/market-one-capital-leads-eur-5-million-seed-round-for-lithuanian-startup-holo/)
- Docs: [Welcome](https://docs.tryholo.ai/), [Create Ads](https://docs.tryholo.ai/ads/create-ads), [Brands](https://docs.tryholo.ai/settings/brands), [Why Brand DNA](https://docs.tryholo.ai/brand-dna/why-brand-dna-matters), [Socials](https://docs.tryholo.ai/socials/socials-overview), [Activation checklist](https://docs.tryholo.ai/getting-started/activation-checklist), [Connect Meta](https://docs.tryholo.ai/ads/connect-meta)
- Prijs/reviews: [Pricing](https://www.tryholo.ai/pricing), [Trustpilot](https://www.trustpilot.com/review/tryholo.ai?page=4), [gethookd](https://www.gethookd.ai/learn/holo-ai-reviews-pricing-alternatives-is-this-ai-marketing-tool-legit/), [max-productive](https://max-productive.ai/ai-tools/holo/), [thatmarketingbuddy](https://thatmarketingbuddy.com/pricing/holo), [Product Hunt](https://www.producthunt.com/posts/1192696)
- Landingspagina's: [ad-generator](https://tryholo.ai/ad-generator), [facebook-ads-maker](https://tryholo.ai/facebook-ads-maker), [ai-ugc-generator](https://tryholo.ai/ai-ugc-generator)
