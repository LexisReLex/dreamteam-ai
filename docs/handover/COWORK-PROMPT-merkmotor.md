# Cowork-opdracht: bouw "Merkmotor", onze eigen Holo
*Opgesteld 31 okt 2026 (cloud-sessie, na PR #24). Plak alles onder de streep in Claude Cowork.*

---

Je bent mijn mede-eigenaar (laad skill `mede-eigenaar`). Jij leidt, beslist en voert uit. Ik kijk mee. Geen keuzemenu's. Vraag mij alleen een GO bij: geld dat weggaat (advertentiebudget, credits, abonnementen), wachtwoorden/API-keys, productie-deploy of iets onomkeerbaars. Taal: Nederlands.

## 0. Warme start (eerst, in deze volgorde)
1. Lees het Notion-register **"HQ — Atlas & Register"** + **HANDOVER-LATEST**.
2. Klop aan op `/Users/lex/Library/Mobile Documents/com~apple~CloudDocs/LXY-Vault/00-System/cowork-start/` en lees `00-START.md` + `HANDOVER-LATEST.md`. Concludeer nooit "geen map" uit de mount-lijst.
3. Haal de repo binnen. Bestaat `~/dreamteam-ai` al: `git pull origin main`. Bestaat hij niet: `git clone https://github.com/LexisReLex/dreamteam-ai ~/dreamteam-ai`. Daarna `npm ci && npx vitest run`. Verwacht: **172 tests groen**. Is dat niet zo, dan eerst repareren.
4. Lees in de repo: `docs/onderzoek/HOLO-benchmark-reverse-engineering-2026-10-31.md`, `docs/brand-dna.md`, `server/brandDna.ts`, `server/seo.ts`, `server/ai.ts`, `server/modelRouter.ts`, `server/loops.ts`, `shared/schema.ts`.

## 1. Het doel in één zin
Eén systeem waarin ik **elke app van mij (Klanttijd, Lexxy, DreamTeam …) en elke website die ik voor een klant bouw** als "merk" toevoeg. Daarna levert het systeem per merk automatisch: Brand DNA → strategie → advertentie- en socialcontent → creatives → publicatie-klare export → meting → winnaars-lus. Dit is Holo's motor, maar met drie dingen die Holo niet heeft: **Nederlandstalig, agenda/app-data als brandstof, en eerlijke meting per advertentie.**

Werknaam: **Merkmotor**. De naam kies ik later; hardcode hem niet in de UI-teksten, maar zet hem in één constante.

## 2. Wat er al staat (niet opnieuw bouwen)
- `POST /api/brand-dna/analyze {url}` (PR #24): keyless Brand DNA met volledigheidsscore en gaten, 12 ad-briefs (4 invalshoeken × Meta Feed/Reels/Google) binnen de tekenlimieten, naamgeving + UTM, en het campagneplan (CBO/breed/Mix L7D/7C1V).
- SSRF-veilige fetch `fetchHtmlSafe`, guard + rate-limit, Claude-client met dagbudget (`checkAndUpdateBudget`), model-router, Agent Loops (geplande taken), Agent Memory, prompt-injectie-guard.
- Stack: Express + React/Vite + Drizzle **SQLite**, deploy via Railway (`railway.json`). Houd deze stack aan. Geen Supabase-migratie; dat is een apart besluit.

## 3. Bouwen, in fasen. Elke fase eindigt met een bewijs-artefact
Werk per fase op een eigen branch `feat/merkmotor-fN-…`, met tests, `npx tsc`, `npm run build` en een PR. Is CI groen, vraag dan één GO voor de merge (één woord "go" van mij volstaat) en merge daarna zelf. Deployen naar productie = apart GO vragen.

### F1: Merken (workspaces) + opslag
- Nieuwe tabellen in `shared/schema.ts`: `brands` (id, naam, url, type: `eigen_app` | `klant_site`, eigenaar/klantnaam, dna_json, dna_overrides_json, completeness, created/updated), `brand_assets` (briefs, posts, creatives, status: concept/goedgekeurd/gepubliceerd), `brand_metrics` (adName, datum, vertoningen, klikken, kosten, conversies).
- **Overrides winnen altijd van scrape.** Ik moet DNA-velden handmatig kunnen corrigeren (toon, doelgroep, USP's, verboden woorden, merkkleuren). Holo's grootste klacht is generieke en gehallucineerde output; dit is het antwoord daarop.
- Endpoints: CRUD `/api/brands`, `POST /api/brands/:id/refresh-dna`.
- Bewijs: test die een merk aanmaakt, DNA opslaat, een override zet en ziet dat de matrix de override gebruikt.

### F2: DNA ook voor JS-sites
- Statische HTML mist SPA's (bv. Vite/React-sites). Voeg een optionele render-stap toe met Playwright (headless Chromium) achter `RENDER_JS=on`. Standaard uit; valt terug op `fetchHtmlSafe`. Zelfde SSRF-check op elke navigatie.
- Bewijs: test met een lokale fixture-SPA waarbij statisch < 40 scoort en gerenderd ≥ 80.

### F3: Copy in merktoon (Claude, key-gated)
- `server/brandCopy.ts`: herschrijft de 12 keyless briefs + een socialkalender (posts per week instelbaar, standaard 3) + 3 e-mailonderwerpen. Gebruik daarbij DNA + overrides + verboden woorden.
- Gebruik bestaande `anthropicClient`, `checkAndUpdateBudget`/`reconcileBudget` en de model-router. Output = **strikt JSON-schema**. Valideer met zod: tekenlimieten opnieuw afdwingen, geen claims/prijzen die niet in de DNA staan ("geen verzonnen data"), en bij een fout val je terug op de keyless brief. **Nooit een lege of half-gevalideerde brief opslaan.**
- Zonder `ANTHROPIC_API_KEY` werkt alles keyless door (zelfde patroon als Groq/embeddings).
- Bewijs: tests met een gemockte client: geldig JSON → opgeslagen; te lange kop → ingekort; verzonnen prijs → geweigerd; geen key → keyless.

### F4: Creatives
- Statisch: render 4:5 en 9:16 PNG's **in code** (HTML-template → Playwright-screenshot) met logo, merkkleuren en kop. Tekst en logo worden in code gezet, nooit door AI nagetekend; die les komt uit de hologram-film-route.
- Video/UGC: maak per Reels-brief een **opdracht** klaar voor de bestaande Higgsfield-route (skill `higgsfield-content-factory` / `marketing-studio-director`). Genereren kost credits = **GO vragen met een begroting** (aantal × prijs). Nooit stil genereren.
- Bewijs: 2 PNG's per merk in `brand_assets`, visueel gecontroleerd (open ze en kijk).

### F5: Publicatie-klare export (nog geen API-publicatie)
- Export per merk: **Meta Ads Manager bulk-CSV** (campagne/adset/ad-namen volgens de naamgeving, UTM in de URL), een Google Ads RSA-CSV en een socialkalender-CSV.
- Meta Marketing API-publicatie bouw je **niet** in deze opdracht; daarvoor zijn app-review en tokens nodig (apart besluit). Jij kunt met computer use de CSV in Ads Manager importeren als **concept** (niet activeren). Activeren = budget = GO.
- Bewijs: CSV die Ads Manager zonder fouten accepteert (screenshot van de importcontrole).

### F6: Meten + winnaars-lus
- Import van Meta-resultaten: eerst **CSV-export uit Ads Manager** (jij haalt die op met computer use) → `brand_metrics` per `adName`.
- Een Agent Loop "winnaars" per merk, wekelijks: ranking op kosten per conversie, met een minimum van 1.000 vertoningen per ad. Die levert een advies: welke uit, welke opschalen, en 3 nieuwe hooks in de winnende invalshoek (via F3). **Advies, geen automatische budgetwijziging.**
- Bewijs: test met een fixture-CSV → correcte ranking + advies.

### F7: UI
- Pagina **Merken** in de client: lijst → merk-detail met tabbladen DNA (score + gaten + overrides bewerken), Advertenties (12 briefs + creatives, goedkeuren), Kalender, Export, Resultaten.
- Bewijs: screenshots van elke tab met een echt merk (Klanttijd).

## 4. Toepassen (meteen na F3 al, niet pas aan het eind)
1. **Eigen apps:** voeg Klanttijd (`https://klanttijd.nl`, plus elke `/voor/<beroep>`-pagina als apart merk-segment), Lexxy en DreamTeam toe. Lees de gaten-lijst en **repareer de gaten op mijn eigen sites** (og:site_name, JSON-LD Organization/LocalBusiness, theme-color, og:image, prijzen zichtbaar). Elke gerepareerde site moet ≥ 90 scoren.
2. **Klanttijd-advertenties eerst:** per beroep een eigen ad set (in de ronde van 12 okt ging 84% van het budget naar kapper en kreeg schoonheid bijna niets). 4 invalshoeken × 2 varianten, beginnend met de **gratis_tip**-hook. Klaarzetten als concept; activeren = GO met budget.
3. **Websites voor klanten:** maak `docs/merkmotor-klantkit.md`, een vaste checklist die ik in elke klantsite bouw, zodat de motor er vanaf dag 1 op draait:
   - meta description, og:site_name, og:image (1200×630), theme-color
   - JSON-LD Organization of LocalBusiness met logo, `makesOffer`/Service + prijzen
   - zichtbare prijzen + één primaire CTA
   - UTM-bewaring + conversie-event (`start_gratis`/`boeking`/`contact`) in de analytics
   - social-links, en een `/privacy` waarin de advertentie-pixels staan
   - Daarna: klant toevoegen als merk `klant_site` → DNA ≥ 90 → eerste matrix als onderdeel van de oplevering. **Dit is een verkoopbare dienst**; zet de prijsvraag als één regel in de handover (dat is mijn smaakkeuze, niet die van jou).

## 5. Voorziene kruisingen (al besloten)
- **Bestaat een tabel/route/bestand al:** uitbreiden, niet vervangen. Bestaande tests mogen nooit rood worden.
- **Ontbreekt de Anthropic-key lokaal:** keyless doorbouwen en in de handover zetten welke env-variabele nodig is, inclusief het exacte commando om hem op Railway te zetten.
- **Faalt een fetch van een eigen site:** probeer de render-stap (F2). Lukt dat ook niet, noteer de URL en ga door met het volgende merk.
- **Zit een stap achter een login (Meta, Railway, Higgsfield):** gebruik computer use in mijn al ingelogde browser. Vraag nooit om mijn wachtwoord; staat er een loginscherm, zeg dat en wacht op mij.
- **Twijfel over een claim in een advertentie (reviews, cijfers):** niet gebruiken. Alleen wat op de site of in de DNA-overrides staat.

## 6. Afronden (elke sessie)
- Werk `docs/HANDOVER-LATEST.md` (repo) **en** de vault-HANDOVER-LATEST + Notion-HANDOVER bij: wat af is (met PR-nummers en testaantallen), wat GO nodig heeft (met bedrag), en de volgende fase.
- Komen er nieuwe vaste werkwijzen uit (bv. de klantkit), oogst ze in een skill en land die in dezelfde sessie (`skills-vault/` + uploaden in de Claude-app). Meld in een blok wat er geland is.
- Zeg nooit "klaar" zonder een verse meting: tests, build, screenshot of CSV-import.
