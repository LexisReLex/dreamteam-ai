# Agent Memory in DreamTeam

> Onderzoek → analyse → implementatie van [TencentCloud/TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory)
> toegepast op het DreamTeam AI-agentplatform.

## 1. Onderzoek — wat is TencentDB Agent Memory?

TencentDB Agent Memory lost een concreet probleem op: agents lopen in lange taken vol
met context en gebruikers moeten telkens opnieuw hun achtergrond, voorkeuren en
werkwijze uitleggen. In plaats van "brute-force" de hele historie mee te sturen,
kiest het project voor **gelaagd + symbolisch** geheugen.

### Geheugen-lagen (de semantische piramide)

| Laag | Inhoud | Opslag |
|------|--------|--------|
| **L0 — Conversation** | ruwe dialoog en uitvoeringssporen | database |
| **L1 — Atom** | atomaire feiten / bruikbare inzichten | database (+ full-text) |
| **L2 — Scenario** | scène-blokken die L1-atomen groeperen | markdown |
| **L3 — Persona** | gesynthetiseerd gebruikersprofiel en voorkeuren | markdown |

Kernprincipe: **"onderste lagen bewaren bewijs; bovenste lagen bewaren structuur."**
Zo kun je deterministisch van een samenvatting terug naar de bron (traceerbaarheid)
en bespaar je fors op tokens (tot ~61% in hun benchmarks).

### Ophalen (recall)

- **Hybride strategie**: BM25-keyword-zoeken gefuseerd met embedding-similariteit
  via **Reciprocal Rank Fusion (RRF)**.
- **Fallback**: keyword-only of embedding-only, configureerbaar.
- **Timeout-bescherming**: standaard 5s recall-timeout zodat een chat nooit blokkeert.

### Overige kenmerken

- **Dual-backend**: lokaal SQLite + `sqlite-vec` (zero-dependency) óf Tencent Cloud
  Vector Database.
- **Extractie-pipeline**: destilleert elke N beurten atomen; genereert periodiek een
  persona.
- **White-box**: bovenste lagen zijn leesbare markdown, inspecteerbaar en auditbaar.

## 2. Analyse — hoe past dit op DreamTeam?

DreamTeam heeft 10 Nederlandse agents (Nova, Rex, Mira, …). De chat was **puur
reactief met een kort venster**: alleen de laatste ~10 berichten gingen mee. Tussen
gesprekken door onthield een agent **niets** — je moest elke sessie opnieuw je bedrijf,
rol en voorkeuren uitleggen. Precies het gat dat Agent Memory dicht.

De vertaling naar dit product (pragmatisch, zonder externe vector-DB — in lijn met de
"local, zero-dependency"-modus van het origineel):

| TencentDB-concept | Implementatie in DreamTeam |
|-------------------|-----------------------------|
| L0 Conversation | bestaande tabel `messages` (ongewijzigd) |
| L1 Atom | tabel `agent_memories` — atomaire feiten per agent |
| L2 Scenario | *bewust overgeslagen* — bij dit chatvolume voegt een scène-laag weinig toe; L1→L3 volstaat |
| L3 Persona | tabel `agent_personas` — één gesynthetiseerd profiel per agent |
| Hybride recall + RRF | lexicale keyword-score + recentheid, samengevoegd met **RRF** (geen embeddings nodig) |
| Extractie elke N beurten | `MEMORY_EXTRACT_EVERY` (standaard 4), asynchroon na een chatbeurt |
| Persona-synthese | drempel `MEMORY_PERSONA_EVERY` (standaard 15 nieuwe herinneringen) |
| Injectie-budget | `MEMORY_INJECT_BUDGET` tekens + top-K, zodat de prompt compact blijft |
| Recall-timeout (5s) | niet nodig: recall is volledig **lokaal en synchroon** (SQLite + lexicale ranker) |
| Vergeten / governance | cap `MEMORY_MAX_PER_AGENT`; zwakste herinneringen (lage salience) sneuvelen eerst |

> **Onderscheid met de bestaande Agent Loops.** Een loop heeft een `state`-ruggengraat:
> dat is **taak**-geheugen (voortgang van één doel over runs). Agent Memory is
> **gebruikers**-geheugen (wie is de gebruiker, over gesprekken heen). Ze vullen elkaar
> aan; `withPersona()` maakt het persona-profiel ook herbruikbaar in loops.

## 3. Implementatie

Toegevoegd: **Agent Memory** — gelaagd, zelf-destillerend geheugen bovenop de chat.

- `shared/schema.ts` — tabellen `agent_memories` (L1) en `agent_personas` (L3).
- `server/storage.ts` — CRUD + de high-water-mark (`lastProcessedMessageId`) en `upsertPersona`.
- `server/memory.ts` — de **MemoryEngine**: recall (hybride + RRF), extractie en persona-synthese.
- `server/routes.ts` — recall-injectie in de chat, achtergrond-extractie, en REST-endpoints.
- `client/src/pages/AgentDetail.tsx` — een **Geheugen**-paneel: persona, herinneringen,
  "onthoud nu" en per-herinnering "vergeten".
- `server/memory.test.ts` — unit-tests voor de pure ranker- en parse-functies.

### De geheugen-cyclus (per chatbeurt)

1. **Recall** — vóór de Claude-call halen we relevante herinneringen op:
   - keyword-relevantie (dekkingsgraad van query-woorden, BM25-achtig lichtgewicht);
   - recentheid (nieuwste eerst);
   - beide ranglijsten → **RRF** → salience als tiebreak;
   - kappen op top-K en een tekenbudget.
2. **Injectie** — persona + geselecteerde herinneringen gaan als een `─── GEHEUGEN ───`
   blok in de systeemprompt (achtergrond, geen opdracht).
3. **Antwoord** — de agent antwoordt zoals altijd via Claude.
4. **Extractie (asynchroon)** — na de beurt destilleert een aparte call duurzame,
   atomaire feiten uit de onverwerkte staart van het gesprek — maar alleen als er
   ≥ `MEMORY_EXTRACT_EVERY` nieuwe user-beurten zijn. Fire-and-forget, dus geen
   chat-latency.
5. **Ontdubbeling** — nieuwe atomen die (via Jaccard) sterk lijken op bestaande worden
   weggelaten. Een onzichtbaar **watermark**-baken verzet de high-water-mark, ook als er
   niets te onthouden viel — zo groeit het extractievenster niet en verspillen we geen budget.
6. **Persona-synthese** — zijn er sinds de laatste keer ≥ `MEMORY_PERSONA_EVERY` nieuwe
   herinneringen, dan wordt het L3-profiel opnieuw samengevat.

### Traceerbaarheid & white-box

Elke L1-herinnering draagt `source_message_id` (het bericht waaruit ze komt), `kind`
(feit/voorkeur/doel/context), `salience` en `use_count`. Het persona-profiel is leesbare
tekst. Alles is zichtbaar in het Geheugen-paneel en via `GET /api/agents/:id/memory` —
in de geest van het "witte doos"-ontwerp van het origineel.

### Governance & veiligheid

- **Budget** — extractie en synthese lopen door hetzelfde gedeelde dagelijkse
  token-plafond als chat en loops; bij overschrijding worden ze stil overgeslagen.
- **Vergeten is echt vergeten** — cap per agent (`MEMORY_MAX_PER_AGENT`); de gebruiker
  kan één herinnering of het hele geheugen wissen. Een gewist feit zit óók in het
  persona-profiel (L3) gebakken, dus wissen raakt altijd béide lagen: het profiel gaat
  er meteen uit en wordt daarna opnieuw opgebouwd uit wat er nog wél is (blijft er niets
  over, dan blijft ook het profiel weg). Faalt die herbouw, dan is er géén profiel —
  nooit het oude. Een volledige wis verzet bovendien de extractie-watermark naar het
  laatste bericht, zodat de eerstvolgende extractie de gewiste feiten niet terugzet.
- **Het register wint** — L1/L3 is gespreks-context, **geen bron van waarheid**. Het
  geheugen is een tweede feitenopslag die kan afwijken van de officiële administratie;
  daarom staat in het geïnjecteerde blok expliciet dat een officiële bron (register,
  administratie, systeem) altijd wint bij tegenspraak. Neem nooit een bedrag, aantal of
  afspraak uit het geheugen over zonder het bij de bron te controleren.
- **Taal** — de extractor slaat feiten op in de taal die de gebruiker spreekt en het
  profiel volgt de taal van de feiten; het geheugenpaneel gebruikt de i18n-sleutels
  (`memory_*`), net als de rest van de pagina.
- **Geen verzinsels** — de extractor krijgt strikte instructies: alleen duurzame,
  bevestigde feiten, bij twijfel weglaten. Liever niets dan ruis.
- **Persistentie** — geheugen leeft in dezelfde SQLite-database; zet `DB_PATH` op een
  persistent volume (zie `docs/deployment.md`), anders overleeft het geen redeploy.

### REST-endpoints

| Methode | Pad | Doel |
|---------|-----|------|
| `GET` | `/api/agents/:id/memory` | persona + herinneringen (white-box) |
| `POST` | `/api/agents/:id/memory/extract` | forceer extractie + persona-synthese nu |
| `DELETE` | `/api/agents/:id/memory/:memId` | vergeet één herinnering |
| `DELETE` | `/api/agents/:id/memory` | wis het volledige geheugen van de agent |

### Configuratie

Alle knoppen zijn env-overschrijfbaar (zie `.env.example`): `MEMORY_EXTRACT_EVERY`,
`MEMORY_PERSONA_EVERY`, `MEMORY_MAX_PER_AGENT`, `MEMORY_INJECT_BUDGET`,
`MEMORY_RECALL_TOP_K`. Standaardwaarden zijn bewust behoudend gekozen voor een
kostenbewuste demo.
