# Command Layer — de CEO/Orchestrator in DreamTeam

> Nagebouwd naar het "Agentic OS"-patroon uit de Instagram-demo: één commando-brein
> dat een team specialisten aanstuurt (orchestrator-worker), bovenop de bestaande agents.

## 1. Wat het is

De **Command Layer** voegt een orchestrator toe boven de 10 bestaande specialist-agents.
Waar de chat 1-op-1 met één agent praat en een **loop** één agent op een cadans laat draaien,
neemt de orchestrator **één opdracht van de operator** en verdeelt die over meerdere specialisten:

```
Operator-opdracht
      │
      ▼
┌─────────────────────┐
│ CEO / Orchestrator  │  (Command Layer)
│  1. PLAN  – routeert werk naar specialisten
│  2. DISPATCH – elke specialist doet zijn deel
│  3. SYNTHESE – bundelt tot één operator-debrief
└─────────────────────┘
   │      │      │
   ▼      ▼      ▼
 Nova   Mira   Rex   …   (de makers / specialisten)
```

Dit is exact het orchestrator-worker-patroon: een router-agent die deelopdrachten uitdeelt
en de resultaten samenvat — de "CEO/Orchestrator" en zijn specialisten uit de demo.

## 2. Anatomie van één orchestratie

| Stap | Wie | Wat |
|------|-----|-----|
| **Plan** | Orchestrator (`ORCHESTRATOR_MODEL`) | Ontleedt de opdracht in max. `MAX_STEPS` deelopdrachten en wijst elk toe aan de best passende specialist (JSON-plan). |
| **Dispatch** | Specialisten (`SPECIALIST_MODEL`) | Elke gekozen agent voert met zijn eigen systeemprompt zijn deelopdracht uit. Sequentieel, zodat het gedeelde token-budget klopt. |
| **Synthese** | Orchestrator | Bundelt alle specialist-output tot één heldere operator-debrief (kernboodschap → resultaten → vervolgstappen). |

De status loopt door: `planning → dispatching → synthesizing → done` (of `error`).
Elke stap wordt gepersisteerd (`orchestrations` + `orchestration_steps`), zodat de UI de routing,
de losse bijdragen én de debrief kan tonen en je opdrachten kunt terugkijken.

## 3. Modellen per laag

Net als in de demo (CEO ≠ specialist-model) zijn de lagen los instelbaar:

| Env var | Default | Rol |
|---------|---------|-----|
| `ORCHESTRATOR_MODEL` | `claude-haiku-4-5` | Het CEO-brein: plannen + synthese. Upgrade dit naar een sterker model voor betere routing/debriefs. |
| `SPECIALIST_MODEL` | `claude-haiku-4-5` | De makers: de losse specialist-uitvoering. |

Standaard draaien beide op het bewezen model van de rest van de app, zodat het out-of-the-box werkt.
Zet `ORCHESTRATOR_MODEL` naar bijvoorbeeld een groter model om de command-laag slimmer te maken.

## 4. Veiligheid & governance

- **Gedeeld dagelijks token-budget** — de orchestrator reserveert vooraf uit hetzelfde plafond als
  chat en loops (`server/ai.ts`) en reconcilieert achteraf op werkelijk gebruik. Bij overschrijding
  wordt de opdracht netjes als `error` gelogd in plaats van door te draaien.
- **Rate limiting** — `POST /api/orchestrate` is begrensd op 5 per minuut per IP.
- **Begrensde fan-out** — maximaal `MAX_STEPS` (5) specialisten per opdracht: houdt kosten en de
  debrief scherp.
- **Robuuste parsing** — het plan wordt gevalideerd tegen de echte agent-roster; onbekende id's en
  lege taken worden weggefilterd. Zonder bruikbaar plan valt de orchestrator terug op één specialist.

## 5. Implementatie

- `shared/schema.ts` — tabellen `orchestrations` en `orchestration_steps` + types.
- `server/orchestrator.ts` — de **OrchestratorEngine**: plan → dispatch → synthese, plus pure,
  testbare helpers (`parsePlan`, `buildPlannerSystem`, `buildSpecialistUser`, `buildSynthesisUser`).
- `server/routes.ts` — endpoints:
  - `POST /api/orchestrate` — geef de CEO één opdracht (rate limited).
  - `GET /api/orchestrations` — recente opdrachten.
  - `GET /api/orchestrations/:id` — één opdracht mét stappen en agents.
  - `GET /api/orchestrator` — command-laag metadata (modellen + geaggregeerde routing-stats).
- `client/src/pages/Command.tsx` — het **Command Center**: het agent-network (CEO bovenaan, de
  specialisten als kaarten met live status), de commandobalk, en de debrief met de losse bijdragen.
- `server/orchestrator.test.ts` — unit tests voor de pure helpers.

## 6. Knowledge Vault (READS / RAG-laag)

De **Knowledge Vault** is de geheugen-/kennislaag onder de command-laag — de "READS" uit de demo.
Het zijn duurzame kennisbronnen (bedrijfsprofiel, merkstem, aanbod, feiten) die de orchestrator en
specialisten automatisch meelezen bij elke opdracht.

- **Opslag**: tabel `knowledge` (titel, inhoud, tags). CRUD via `/api/knowledge`.
- **Retrieval**: keyword-gebaseerd bovenop SQLite — géén externe embeddings-provider nodig.
  `server/knowledge.ts` bevat pure, testbare helpers: `tokenize`, `scoreEntry`, `rankKnowledge`
  (titel ×3, tags ×2, inhoud ×1) en `buildKnowledgeContext`. Later te vervangen door echte embeddings.
- **Injectie**: vóór het plannen haalt de orchestrator de top-K (4) relevante bronnen op en injecteert
  die zowel in de planner- als de specialist-prompts, zodat routing én uitvoering kennis-bewust zijn.
- **READS-stat**: elke orchestratie legt vast hoeveel bronnen zijn geraadpleegd (`orchestrations.reads`);
  de CEO-kaart toont het totaal, net als de "READS" in de screenshot.

```
Opdracht → [READS: top-K uit de Vault] → Plan → Dispatch (met kenniscontext) → Synthese
```

De UI (`client/src/pages/Vault.tsx`) laat je kennisbronnen toevoegen, bekijken en verwijderen.
Bij het seeden staan er drie voorbeeldbronnen in (bedrijfsprofiel, tone of voice, aanbod & prijzen).

## 7. Verhouding tot Agent Loops

| | Chat | Agent Loop | **Orchestrator** |
|--|------|-----------|------------------|
| Trigger | gebruiker typt | cadans/scheduler | één operator-opdracht |
| Agents | 1 | 1 | meerdere (team) |
| Geheugen | gesprekshistorie | STATE-ruggengraat | per-opdracht stappen |
| Output | antwoord | gescoorde run | operator-debrief |

Loops maken één agent autonoom over tijd; de orchestrator maakt het hele team coöperatief op één opdracht.
Samen vormen ze de kern van het "Agentic OS": scheduling + geheugen + verificatie (loops) en
routing + synthese over specialisten (command layer).
