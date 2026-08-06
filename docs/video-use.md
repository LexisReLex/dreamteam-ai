# video-use — onderzocht, besluit & wat we geleend hebben

> Beslisdocument, zodat niemand (ook Lex niet) dit nóg een keer hoeft uit te
> zoeken. Vraag was het **hele traject** voor https://github.com/browser-use/video-use
> — onderzoeken, analyseren, en indien zinnig het goede overnemen. Zelfde traject
> als gstack (`docs/gstack.md`) en MemPalace (`docs/mempalace.md`).

**Datum:** 2026-07-26 · **Besluit:** video-use **niet installeren** in DreamTeam; de
kern-onderscheider (*self-evaluate → begrensde loop-back om te fixen*) **wél geleend**,
keyless-first en native in TypeScript, op het live chat-pad.

## 1. Wat is video-use?

Een open-source (MIT) tool van **browser-use** waarmee je video's bewerkt via
natuurlijke taal met een AI-agent (Claude Code / Codex / Hermes). Het kan filler-
woorden en dode ruimte wegknippen, kleurcorrigeren, audio-fades bij cuts zetten,
ondertitels inbranden, animatie-overlays maken, **de gerenderde output zelf
beoordelen** en sessiegeheugen bewaren.

- **Taal/stack:** Python (uv/pip), **FFmpeg** vereist, **ElevenLabs Scribe API**
  (betaalde key) voor transcriptie met word-level timestamps; optioneel yt-dlp,
  Remotion/Manim/PIL voor animatie.
- **Type:** een Python-CLI + agent-**skill** (registreert zich in de skill-map van
  Claude Code/Codex). Geen npm-library en geen product-feature om in een chat-app te
  importeren.
- **Pipeline:** Transcribe → **Pack** (transcript → ~12KB markdown) → LLM-reasoning →
  EDL (edit decision list) → Render → **Self-evaluation met loop-back** (fix en
  re-render, **max 3 iteraties**).
- **Twee onderscheiders:**
  1. **Text-first** — niet de videoframes in de LLM dumpen (duur in tokens), maar het
     transcript compact als tekst aanbieden en alleen op **beslispunten** on-demand
     een visueel composiet renderen.
  2. **Self-evaluation loop** — de agent beoordeelt zijn eigen gerenderde output en
     **herstelt begrensd** (max 3×) tot het de lat haalt.

## 2. Analyse — past dit op DreamTeam?

DreamTeam AI is een **product**: 10 Nederlandse business-agents (Nova, Rex, Mira, Kai,
Zara, Finn, Luna, Atlas, Sage, Orion) waar ondernemers mee chatten. Express + React +
Vite, SQLite/Drizzle, Claude/Groq-routing, Agent Memory, SEO-audit, Headroom, Prompt-
Guard.

| | DreamTeam (dit product) | video-use |
|---|---|---|
| Vorm | Web-app die je deployt | Python-CLI + agent-skill |
| Runtime | Node 20 | Python + FFmpeg + ElevenLabs-key |
| Domein | Zakelijk advies via chat | Video's monteren |
| Kosten | Keyless-first | Betaalde transcriptie-key vereist |

**Waarom niet installeren.** Verkeerde *vorm* (CLI/skill, geen library), verkeerde
*stack* (Python + FFmpeg), verkeerd *domein* (video-montage), en een **betaalde
ElevenLabs-key** voor de kernfunctie. Video-editing importeren in een business-chat-app
is precies het "installeren omdat het kan" dat we bij MemPalace en gstack ook vermeden.

**Text-first hebben we al.** Video-use's ene onderscheider — een zwaar medium compact
als tekst aanbieden zodat de LLM goedkoop redeneert — dekken wij al met **Headroom**
(`server/headroom.ts`, context-compressie). Dat lenen zou heruitvinden zijn.

**Wat video-use wél écht goed doet en op ons past:** de **self-evaluation loop met
begrensde loop-back**. En dat is een echt, ongedekt gat in dit product. DreamTeam
heeft een maker/checker-splitsing, maar **alleen in de autonome Loops**
(`server/loops.ts`): daar scoort een checker een run *achteraf* en draagt de critique
naar de *volgende* geplande run — er is geen herstel binnen één beurt. Het **live
chat-pad** — waar ondernemers daadwerkelijk chatten — produceert één antwoord en stuurt
dat **zonder enige controle** naar de gebruiker. Dát hebben we geleend.

## 3. Wat we geïmplementeerd hebben — self-review (keyless-first)

Toegevoegd als een lichte, additieve kwaliteitslus op het live antwoord. Trouw aan
video-use's discipline: **alleen op beslispunten** (bij een echt defect) betaal je de
revisie; het gewone geval kost niets.

- `server/selfReview.ts` — de geleende lus, keyless en provider-agnostisch:
  - **Heuristische critic** (`evaluateAnswer`, geen LLM/netwerk/dependency): markeert
    concrete defecten — leeg/te kort, **afgekapt** (geen zin-afsluiting), **taal-
    mismatch** (NL-vraag → EN-antwoord), **uitwijk/weigering**, **AI-boilerplate**,
    **achtergebleven placeholder**. Bewust conservatief: elk defect moet een revisie
    rechtvaardigen, dus geen stijl-oordelen.
  - **Begrensde loop-back** (`reviewAndMaybeRevise`): bij een defect volgt een revisie
    via een `regenerate`-callback (hetzelfde provider-pad), begrensd door
    `SELF_REVIEW_MAX_REVISIONS` (default 1, cap 3 zoals video-use). Houdt altijd het
    **strikt betere** antwoord; laat het origineel staan bij een falende/slechtere
    revisie. Slaat bekende systeem-fallbacks (budgetstop/API-fout) over.
  - **Optionele Tier-2 LLM-critic** (`SELF_REVIEW_LLM`, default UIT): een strenge,
    budget-bewaakte modelbeoordeling voor relevantie/verzinsels die de heuristiek niet
    ziet. Degradeert netjes naar heuristiek-only als hij faalt.
- `server/routes.ts` — in het chat-handler, ná generatie en vóór opslaan, draait de lus.
  De `regenerate`-closure spiegelt het bestaande pad (**Groq gratis eerst, anders Claude
  met budgetbewaking**), zodat er geen providerlogica gedupliceerd wordt. Plus
  `GET /api/self-review/health` voor verifieerbare status.
- `.env.example` — `SELF_REVIEW*`-blok, allemaal optioneel.
- Tests — `server/selfReview.test.ts`.

### Kostenafweging (eerlijk)

Standaard **aan**, maar de kosten zijn begrensd en het gewone geval is gratis:
- Een **goed antwoord** passeert de keyless heuristiek → **0 extra calls**.
- Een revisie vuurt alleen bij een **echt defect** (leeg/afgekapt/verkeerde taal/…),
  is **begrensd** (default 1×), **gratis op Groq** en **budget-bewaakt op Claude**
  (hergebruikt `checkAndUpdateBudget` — kan het dagbudget niet overschrijden).
- Er wordt **nooit** een slechter antwoord teruggegeven en de chat **breekt nooit**.

Wil je nul extra spend: `SELF_REVIEW=off` (volledige no-op, bewezen door de disabled-
tests). De Tier-2 LLM-critic staat bewust **uit** om de kosten voorspelbaar te houden.

### Verificatie (bewijs)

- `npm run check` — typecheck schoon.
- `npm test` — **186 tests groen** (was 155 vóór deze lijn; +31). De nieuwe tests
  dekken: config-schakelaars + clamping, detectie van elk defect, **zero false-
  positives** op echte goede agent-antwoorden (NL én een bewust Engels antwoord op een
  Engelse vraag), het uitgeschakelde pad (no-op, 0 regenerate-calls), no-op op goede
  antwoorden en op systeem-fallbacks, "houd het strikt betere antwoord", "houd het
  origineel bij falende/slechtere revisie", de revisie-cap, vroeg stoppen zodra de lat
  gehaald is, en de Tier-2 critic (alleen bij aanstaan; nette degradatie bij falen).
- `npm run build` — client + server bundelen schoon.

## 4. Aanzetten

Niets te doen: keyless en **standaard aan**. Verifieerbaar via
`GET /api/self-review/health` → `{"enabled":true,"maxRevisions":1,"minScore":0.5,"llmCritic":false}`.
Knoppen (zie `.env.example`): `SELF_REVIEW`, `SELF_REVIEW_MAX_REVISIONS`,
`SELF_REVIEW_MIN_SCORE`, `SELF_REVIEW_LLM`. Geen oranje licht nodig — geen key, geen
gegarandeerde extra kosten (revisie is zeldzaam, gratis op Groq, budget-bewaakt op Claude).

## 5. Openstaand / mogelijk vervolg

- **Text-first / transcript-packing** is bewust *niet* overgenomen — dat dekt Headroom
  al. Video-montage zelf valt buiten dit product (Python/FFmpeg/ElevenLabs).
- **Self-review in de Loops** — de autonome loop-engine heeft al een maker/checker,
  maar zou dezelfde `evaluateAnswer`-heuristiek als goedkope voorfilter kunnen
  gebruiken vóór de (duurdere) LLM-checker. Nu niet gedaan om scope klein te houden;
  de heuristiek is herbruikbaar.
- **Observability in de UI** — het aantal herzieningen en de meest voorkomende defecten
  zichtbaar maken (net als de Headroom-/budgetstats) zou laten zien hóé vaak de lus
  bijstuurt. Geparkeerd, niet vergeten.
