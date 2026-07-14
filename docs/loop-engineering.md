# Loop Engineering in DreamTeam

> Onderzoek → analyse → implementatie van [cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering)
> toegepast op het DreamTeam AI-agentplatform.

## 1. Onderzoek — wat is Loop Engineering?

Loop Engineering ("**Stop prompting. Design the loop. Get a score.**") verplaatst het
hefboompunt van het schrijven van losse prompts naar het _ontwerpen van systemen die
agents over tijd aansturen_. In plaats van dat de mens telkens de agent prompt, draait
er een loop die de agent prompt, het resultaat verifieert en een score teruggeeft.

### De vijf bouwstenen + geheugen

| Primitive | Rol in de loop |
|-----------|-----------------|
| **Automations / Scheduling** | Ontdekking + triage op een cadans |
| **Worktrees** | Veilige parallelle uitvoering |
| **Skills** | Persistente projectkennis |
| **Plugins & Connectors** | Bereik je echte tools (MCP) |
| **Sub-agents** | Maker / checker-splitsing |
| **+ Memory / State** | Duurzame ruggengraat buiten een gesprek |

### Anatomie van een loop

```
Schedule → Triage/Maker → Read+Write STATE → (Worktree) → Implementer → Verifier → Human gate
```

### Gefaseerde uitrol (belangrijk voor veiligheid)

- **L1 — report-only**: de loop rapporteert alleen, geen automatische actie.
- **L2 — assisted**: de loop stelt kleine fixes voor, mens keurt goed.
- **L3 — unattended**: de loop handelt zelfstandig binnen allowlist + budget.

Start altijd op **L1** en verhoog pas als de kwaliteit consistent goed is.

## 2. Analyse — hoe past dit op DreamTeam?

DreamTeam had 10 Nederlandse AI-agents (Nova, Rex, Mira, …) die **puur reactief** zijn:
de gebruiker chat, de agent antwoordt via Claude. Er is geen cadans, geen geheugen tussen
runs, geen onafhankelijke verificatie en geen score.

Loop Engineering vult precies dat gat. De vertaling naar dit product:

| Loop-primitive | Implementatie in DreamTeam |
|----------------|-----------------------------|
| Scheduling | Cadans per loop (`15m` / `2h` / `6h` / `1d` / `manual`) + in-proces scheduler |
| Sub-agents (maker/checker) | **Maker** = de gekozen agent voert het doel uit; **Checker** = onafhankelijke Verifier-subagent die weigert tenzij het bewijs sterk is en een score 0–100 geeft |
| Memory / State | Per loop een `state`-ruggengraat (markdown) die elke run wordt bijgewerkt |
| Budget / governance | Gedeeld dagelijks token-budget + kill switch (`enabled`) |
| Gefaseerde uitrol | `level` L1/L2/L3 per loop, standaard L1 (report-only) |
| Get a score | Elke run levert een verdict (APPROVE/REJECT/ESCALATE) + score 0–100 |

## 3. Implementatie

Toegevoegd: **Agent Loops** — autonome, zelf-scorende loops bovenop de bestaande agents.

- `shared/schema.ts` — tabellen `loops` en `loop_runs`.
- `server/ai.ts` — gedeelde Anthropic-client + dagelijks token-budget (governance).
- `server/prompts.ts` — agent-systeemprompts (gedeeld tussen chat en loops).
- `server/loops.ts` — de **LoopEngine**: maker → checker → state → score, plus de scheduler.
- `server/routes.ts` — REST-endpoints voor loops + budgetstatus.
- `client/src/pages/Loops.tsx` — UI om loops te maken, nu te draaien, state-ruggengraat,
  rungeschiedenis en Loop Ready-score te bekijken.

### De loop-cyclus (per run)

1. Scheduler vuurt af als `nextRunAt <= nu` en `enabled = true`.
2. **Budgetcheck** — bij overschrijding wordt de run als `ERROR` gelogd (kostenbescherming).
3. **Maker** — de agent voert het doel uit met de vorige STATE als context.
4. **Checker** — onafhankelijke Verifier beoordeelt de output → `{verdict, score, critique}`.
5. **State** — samenvatting wordt vooraan de ruggengraat toegevoegd (gecapt op lengte).
6. **Log** — `loop_runs` krijgt maker-output, verdict, score en tokengebruik.

### Veiligheid (conform loop-engineering/safety)

- Standaard **L1 report-only** en **uitgeschakeld** bij aanmaken.
- Gedeeld dagelijks token-plafond met kill switch per loop (`enabled = false`).
- De checker is een _aparte rol_ dan de maker (maker/checker-splitsing), staat standaard
  op weigeren en produceert een controleerbaar oordeel.
