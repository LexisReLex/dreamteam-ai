# MemPalace — onderzocht, besluit & wat we geleend hebben

> Beslisdocument. Zodat niemand (ook Lex niet) dit nóg een keer hoeft uit te
> zoeken. Vraag was: *"MemPalace onderzoeken, analyseren, implementeren, indien
> mogelijk installeren"* — https://github.com/MemPalace/mempalace

**Datum:** 2026-07-25 · **Besluit:** MemPalace **niet installeren**; het kern­voordeel
(semantische recall) **wél geleend** en key-gated ingebouwd.

## 1. Wat is MemPalace?

Een open-source AI-geheugensysteem (MIT). Slaat gespreks­historie **verbatim** op en
haalt het terug met **semantisch zoeken**. Organiseert content in een hiërarchie
(people/projects = "wings", topics = "rooms", content = "drawers").

- **Taal/stack:** Python 3.9+; **ChromaDB** als vector-store (pluggable: SQLite,
  Milvus, Qdrant, pgvector). Kennisgraaf op SQLite. **MCP-server**-integratie.
- **Type:** CLI-tool + Python-API + MCP-server (geen library, geen cloud-dienst).
- **Installatie:** `uv tool install mempalace` / pipx / pip / Docker.
- **Claim:** 96,6% retrieval-recall op LongMemEval, **lokaal, zonder API-calls**
  (lokale embeddings). Auto-save hooks voor Claude Code, Cursor, Codex.

## 2. Analyse — past dit op DreamTeam?

DreamTeam had al **Agent Memory** (PR #19, zie `docs/agent-memory.md`): een gelaagd,
zelf-destillerend geheugen (L1-atomen + L3-persona) met **hybride recall**
(keyword + recentheid via RRF), volledig in TypeScript op de bestaande SQLite,
**keyless en zonder externe vector-DB**. MemPalace lost dus grotendeels *hetzelfde
probleem* op als wat we al draaiend hebben.

| | Agent Memory (#19, huidig) | MemPalace |
|---|---|---|
| Taal/stack | TypeScript / Node — onze stack | Python 3.9+ CLI — andere stack |
| Opslag | SQLite, zero-dependency, al live | ChromaDB vector-DB — zwaarder |
| Integratie | Ingebouwd in chat + UI-paneel | Losse CLI / MCP-server ernaast |
| Recall | Lexicaal (keyword + recentheid, RRF) | **Semantisch** (embeddings) + kennisgraaf |
| Doel | Persistent agent-geheugen ✅ | Persistent agent-geheugen ✅ (zelfde) |

**Waarom niet installeren.** Een Python-CLI naast een TypeScript-app zetten die
grotendeels dupliceert wat we al ingebouwd hebben draaien, met een zwaardere
database, is netto negatief: dubbele functionaliteit, mismatch in stack, meer
onderhoud. Dat is precies het soort "installeren omdat het kan" dat we vermijden.

**Wat MemPalace wél écht beter doet:** *semantische* recall. Onze lexicale recall
mist relevante herinneringen zonder woord-overlap (synoniemen, andere taal,
herformuleringen) — bv. query "auto" vindt de herinnering "rijdt in een wagen" niet.
Dát is de enige echte winst, en die hebben we geleend in plaats van geïnstalleerd.

## 3. Wat we geïmplementeerd hebben — semantische recall (key-gated)

Toegevoegd als **derde recall-leg** bovenop de bestaande hybride recall. Ontwerp
spiegelt bewust het al aanwezige **Groq-pad**: uit-standaard, additief, met fallback.

- `server/embeddings.ts` — key-gated embeddings-client. Zonder `EMBEDDINGS_API_KEY`
  is het **uit** en verandert er niets (recall blijft byte-identiek lexicaal, geen
  netwerk, geen regressie). Provider-agnostisch via elk **OpenAI-compatibel
  `/embeddings`-endpoint** (kies een gratis provider). In-memory cache + timeout;
  faalt/hangt het endpoint, dan retourneert het `null` → recall valt terug op lexicaal.
- `server/memory.ts` — `selectMemories` accepteert een optionele `semantic`-map
  (id→cosine). Aanwezig → derde RRF-ranglijst + herinneringen met sterke semantische
  match (≥ `SEMANTIC_CANDIDATE_MIN`, behoudend op 0.72) mogen als kandidaat mee, óók
  zonder woord-overlap. Afwezig → **exact het oude gedrag**. `recallForChat` is nu
  async (embed query + herinneringen, cosine-rank, fuse) met timeout-fallback.
- `.env.example` — `EMBEDDINGS_*` blok, allemaal optioneel.
- Tests — `server/embeddings.test.ts` (cosine, enabled/disabled, embed-null-paden)
  en uitbreiding `server/memory.test.ts` (semantische inclusie, drempel, en de
  regressie-garantie dat recall zonder map onveranderd is).

### Verificatie (bewijs)

- `npm run check` — typecheck schoon.
- `npm test` — **138 tests groen** (was 87 vóór deze lijn). Dekt óók de
  INGESCHAKELDE path end-to-end: een integratietest met gemockt endpoint bewijst
  dat recall mét key een semantisch verwante herinnering ("wagen" bij query
  "auto") ophaalt die lexicaal buiten beeld blijft, en ruis onder de drempel
  ("belasting") weert.
- `npm run build` — client + server bundelen schoon.

Zonder key is dit dus een **no-op** (bewezen door de disabled-tests): de live demo
draait onveranderd. Er is geen recall-benchmark in dit project, dus we claimen géén
gemeten recall-verbetering — wél een correcte, geteste, opt-in capability.

## 4. Aanzetten (jouw stap — oranje licht: het vraagt een key)

1. Maak een gratis embeddings-key aan bij een provider met een OpenAI-compatibel
   endpoint.
2. Zet in de deploy-omgeving: `EMBEDDINGS_API_KEY=...` (optioneel
   `EMBEDDINGS_BASE_URL` / `EMBEDDINGS_MODEL`) → redeploy.
3. Vanaf dan fuseert de semantische leg mee in de recall; faalt het endpoint, dan
   blijft de chat werken via lexicale recall.

## 5. Openstaand / mogelijk vervolg

- **Kennisgraaf** (MemPalace's tweede onderscheider: temporele entity-relaties) is
  *niet* overgenomen — grote bouw, matige meerwaarde bij dit chatvolume. Bewust
  geparkeerd, niet vergeten.
- Een kleine recall-eval (LongMemEval-achtig) zou "ik denk beter" → "ik zie beter"
  maken. Nu bewust niet gebouwd om scope klein te houden.
