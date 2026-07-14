# Kennisgraaf (graphify) in DreamTeam

> Onderzoek → analyse → implementatie van [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)
> toegepast op het DreamTeam AI-agentplatform.

## 1. Onderzoek — wat is Graphify?

Graphify ("Type `/graphify` en bevraag je project in plaats van te grep-en") verandert
een verzameling bestanden (code, docs, PDF's, afbeeldingen, video) in een **kennisgraaf**:
concepten worden **nodes**, hun onderlinge relaties worden **edges**. Je leest niet langer
bestanden — je bevraagt een graaf.

### De kernideeën

| Idee | Wat het betekent |
|------|------------------|
| **Graaf i.p.v. vector-index** | Geen embeddings, maar een echte graaf die je traverseert: `explain`, `path`, `query`. |
| **Elke edge is verklaard** | Elk verband draagt een vertrouwenslabel: `EXTRACTED` (expliciet in de bron), `INFERRED` (afgeleid), `AMBIGUOUS` (onzeker → menselijke controle). |
| **Deterministisch waar het kan** | Code wordt zonder LLM in kaart gebracht (tree-sitter AST). Alleen tekst/media krijgt een semantische pass door een model. |
| **Drie artefacten** | `graph.json` (de graaf), `graph.html` (interactief, force-directed) en `GRAPH_REPORT.md` (sleutelconcepten, verrassende verbanden, voorgestelde vragen). |

### De pijplijn

```
detect → extract → build_graph → cluster → analyze → report → export
```

Elke stap is één pure functie die via platte dicts/graven communiceert — geen gedeelde
state, geen bijeffecten. De extractie levert altijd hetzelfde schema:
`{nodes:[{id,label,…}], edges:[{source,target,relation,confidence}]}`.

## 2. Analyse — hoe past dit op DreamTeam?

DreamTeam heeft 10 agents en laat ondernemers chatten en autonome loops draaien. Maar de
**kennis** van een ondernemer — plannen, notities, strategieën — leeft als losse tekst in
chats en documenten. Er is geen manier om te zien hoe die concepten samenhangen.

Dat is precies het gat dat Graphify vult. De vertaling naar dit product:

| Graphify-idee | Implementatie in DreamTeam |
|---------------|-----------------------------|
| extract (semantische pass) | Een **agent** (standaard Atlas, de Data Analist) brengt de brontekst in kaart als `{nodes, edges}`. |
| Deterministische kern | De **server** doet graad, clustering, kortste pad en rapport — puur, zonder API, en dus unit-getest. |
| Confidence-labels | Elke edge is `EXTRACTED` · `INFERRED` · `AMBIGUOUS`; onzekere verbanden worden in het rapport gemarkeerd. |
| cluster | **Label-propagatie** (deterministisch) → clusters, met een kleur per cluster in de visualisatie. |
| analyze | **God-nodes** (best verbonden concepten) + cross-cluster-bruggen → sleutelconcepten en voorgestelde vragen. |
| graph.html | Een **interactieve force-directed SVG-graaf** in de client: klik een node voor `explain`, kies twee nodes voor `path`. |
| GRAPH_REPORT.md | Een **rapport** per graaf: tellingen, sleutelconcepten, clusters, onzekere verbanden, startvragen. |
| Governance | Dezelfde **gedeelde dagelijkse token-limiet** als chat en loops beschermt tegen kosten. |

De belangrijkste ontwerpkeuze is de splitsing uit Graphify: **het model doet de betekenis,
de code doet de grafiek**. Alleen de extractiestap kost API-budget; alle bevraging
(`explain`, `path`) is gratis en deterministisch.

## 3. Implementatie

Toegevoegd: **Kennisgraaf** — verander tekst in een bevraagbare graaf, bovenop de bestaande agents.

- `shared/schema.ts` — tabel `graphs` + gedeelde types `GraphNode`, `GraphEdge`, `EdgeConfidence`.
- `server/graph.ts` — de **GraphEngine**: extractie parsen → graad + clustering → kortste pad → rapport, plus de agent-extractieprompt.
- `server/routes.ts` — REST-endpoints voor grafen bouwen, bekijken, bevragen (`path`, `explain`) en verwijderen.
- `client/src/pages/Graph.tsx` — UI om een graaf te bouwen, de force-directed graaf te bekijken, nodes te verklaren, paden te traceren en het rapport te lezen.

### De bouw-cyclus (per graaf)

1. **Budgetcheck** — bij overschrijding wordt het bouwen geweigerd (kostenbescherming).
2. **Extractie (agent)** — de agent zet de brontekst om in `{nodes, edges}` met confidence-labels.
3. **Parsen + saneren** — JSON uit proza pakken, labels opschonen, edges resolven op id én label, self-loops/dode verwijzingen/duplicaten weggooien.
4. **Analyse (deterministisch)** — graad per node, clusters via label-propagatie, sleutelconcepten.
5. **Rapport** — sleutelconcepten, clusters, onzekere verbanden en voorgestelde vragen.
6. **Opslaan** — `graphs` bewaart nodes/edges (JSON), rapport en tellingen.

### Bevragen (zonder API)

- **`explain`** — klik een node: al zijn in- en uitgaande verbindingen, elk met relatie en confidence.
- **`path`** — kies twee concepten: het kortste pad (BFS) ertussen, of "geen verbinding" als ze in losse clusters zitten.

### Veiligheid & governance

- Labels worden gesaneerd (control chars gestript, lengte gecapt) — conform `graphify/security`.
- Onzekere verbanden (`AMBIGUOUS`) worden **niet weggemoffeld** maar expliciet gemarkeerd voor menselijke controle.
- Het bouwen valt onder het gedeelde dagelijkse token-plafond; bevraging kost geen budget.
- De bouw-endpoint zit achter de toegangsguard + rate limiting, net als de andere dure endpoints.
