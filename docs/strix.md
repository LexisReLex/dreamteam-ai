# Team Scans in DreamTeam

> Onderzoek → analyse → implementatie van [usestrix/strix](https://github.com/usestrix/strix)
> toegepast op het DreamTeam AI-agentplatform.

## 1. Onderzoek — wat is Strix?

Strix is een open-source, autonoom AI-pentestplatform: het gedraagt zich als een
_gedistribueerd team van ethische hackers_. In plaats van statische analyse voert het
dynamisch code uit om kwetsbaarheden te vinden **en te valideren met een werkende
proof-of-concept**. Dat laatste is de kern: geen theoretische vlaggetjes, maar bewezen
bevindingen.

### De pijlers van Strix

| Pijler | Wat het doet |
|--------|--------------|
| **Graph of Agents** | Gespecialiseerde agents werken parallel samen over verkenning, exploitatie en post-exploitatie. Ze delen ontdekkingen en ketenen bevindingen aaneen. |
| **Scan → Validatie → Rapport** | Een vaste pijplijn: verkenning (attack surface) → exploitatie (bevindingen) → **validatie** (echte PoC) → rapportage (compliance-klaar). |
| **False-positive-reductie** | Elke bevinding wordt echt uitgevoerd/gevalideerd. Wat niet standhoudt, haalt het rapport niet. Dit is Strix' belangrijkste onderscheider t.o.v. klassieke scanners. |
| **Severity & taxonomie** | Bevindingen krijgen een CVSS-score en OWASP-classificatie. |
| **Auto-fix** | AI-gegenereerde fixes worden als merge-klare pull requests aangeleverd. |
| **Governance / veiligheid** | Headless-modus, CI/CD-integratie en gefaseerde uitrol. |

### Anatomie van een scan

```
Verkenning (graph of agents) → Kandidaat-bevindingen → Validatie (bewijs, geen false positives) → Severity → Rapport + fix
```

## 2. Analyse — hoe past dit op DreamTeam?

DreamTeam heeft 10 Nederlandse specialist-agents (Nova · marketing, Rex · sales,
Finn · financiën, Kai · SEO, …). Vóór deze feature waren die agents op twee manieren
inzetbaar: **reactief** (chat) en via **Agent Loops** (autonome, zelf-scorende cadans-loops).
In beide gevallen werkt een agent **solo**.

Strix' kernidee — _meerdere gespecialiseerde agents die samen één doel onderzoeken en
waarvan elke bevinding onafhankelijk wordt gevalideerd zodat er geen ruis overblijft_ —
was nog niet vertaald. De vertaling naar dit product is een **Team Scan**: geen
security-pentest (dat past niet bij het domein), maar een **multi-agent
bedrijfsassessment** met exact dezelfde architectuur.

| Strix-primitive | Implementatie in DreamTeam |
|-----------------|-----------------------------|
| Graph of Agents | Meerdere gekozen agents verkennen tegelijk (parallel) hun eigen vakgebied op één doel |
| Verkenning → exploitatie | Elke agent (verkenner) signaleert **kandidaat-bevindingen** binnen zijn domein |
| Validatie / geen false positives | Een onafhankelijke **Validator** bevestigt elke kandidaat met bewijs of verwerpt hem — alleen bevestigde bevindingen komen in het rapport |
| CVSS-severity | Severity `kritiek / hoog / middel / laag / info` + een risicoscore 0–100 |
| OWASP-taxonomie | `category` per bevinding (het domein van de verkenner) |
| Auto-fix (PR) | Elke bevinding draagt een concrete `remediation` — de aanbevolen fix |
| Compliance-rapport | Samenvatting + gesorteerde bevindingen (bewijs, impact, fix) per scan |
| Gefaseerde uitrol | `level` L1/L2/L3 per scan, standaard L1 (report-only) |
| Governance / budget | Hergebruikt het gedeelde dagelijkse token-plafond met kill switch |

De **risicoscore is bewust omgekeerd** aan de Loop Ready-score: bij loops betekent hoog
= goed, bij scans betekent hoog = méér risico. De risicoband is de zwaarste aanwezige
severity — precies zoals een pentestrapport zijn eindoordeel op de ernstigste bevinding baseert.

## 3. Implementatie

Toegevoegd: **Team Scans** — een graph-of-agents-assessment met gevalideerde bevindingen
bovenop de bestaande agents. Hergebruikt de gedeelde Anthropic-client, het token-budget en
de agent-systeemprompts.

- `shared/schema.ts` — tabellen `scans` en `findings` + severity-taxonomie.
- `server/scans.ts` — de **ScanEngine**: verkenners (parallel) → validator → risicoscore → rapport.
- `server/routes.ts` — REST-endpoints voor scans + bevindingen.
- `client/src/pages/Scans.tsx` — UI om scans te maken (agent-selectie), te draaien en het
  gevalideerde rapport per severity te bekijken.
- `server/scans.test.ts` — unit tests voor de pure kern (parsers, risicoscore, prompts).

### De scan-cyclus (per run)

1. **Budgetcheck** — reserveer `agents × 1400 + 1800` tokens; bij overschrijding faalt de scan gecontroleerd (kostenbescherming).
2. **Verkenning (graph of agents)** — elke gekozen agent draait **parallel** (`Promise.all`) en levert kandidaat-bevindingen als JSON binnen zijn eigen vakgebied.
3. **Validatie (maker/checker-splitsing)** — één onafhankelijke Validator beoordeelt álle kandidaten in context van het doel, bevestigt met bewijs + severity + fix, of verwerpt als false positive.
4. **Risicoscore** — severity-gewichten worden opgeteld (geklemd op 100); de band is de zwaarste aanwezige severity.
5. **Rapport** — alleen bevestigde bevindingen worden opgeslagen; het aantal gefilterde false positives wordt geteld als vertrouwenssignaal.

### Waarom een aparte Validator (geen false positives)

Dit is de directe vertaling van Strix' belangrijkste onderscheider. De verkenner (maker) is
geneigd veel te signaleren; de Validator (checker) heeft als standaardhouding **weigeren** en
laat alleen door wat aanwijsbaar hout snijdt voor _dít_ doel binnen de scope. De UI toont
expliciet "X van Y kandidaten als false positive gefilterd", zodat zichtbaar is dat het
rapport is geschoond in plaats van opgeblazen.

### Veiligheid (conform Strix' gefaseerde uitrol)

- Standaard **L1 report-only** — de scan rapporteert alleen, handelt niet zelf.
- Gedeeld dagelijks token-plafond over chat, loops én scans (governance + kill switch).
- De Validator is een _aparte rol_ dan de verkenner (maker/checker-splitsing).
- Scans draaien **on-demand** (handmatig gestart), niet ongevraagd op een cadans — de dure
  meervoudige API-call gebeurt alleen op expliciet verzoek en is rate-limited (6/min per IP).

### Vervolgstappen (buiten scope van deze iteratie)

- Geplande/continue scans (CI/CD-stijl) via de bestaande scheduler.
- L2 "assisted": de fixes als concreet actieplan/taak aanmaken (auto-fix → taak i.p.v. PR).
- Trend over tijd: risicoscore per scan historisch volgen.
