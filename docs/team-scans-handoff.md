# Team Scans — overdracht / status

_Laatste update: 15 jul 2026 · branch `claude/strix-analysis-1vkvy8` · PR [#10](https://github.com/LexisReLex/dreamteam-ai/pull/10)_

Korte overdracht van de **Team Scans**-feature (Strix toegepast op DreamTeam), zodat je
later zo weer verder kunt. De volledige uitleg staat in [`docs/strix.md`](./strix.md).

## Wat het is

Een **team van agents scant je bedrijf** (graph of agents). Elke agent verkent zijn eigen
vakgebied en levert kandidaat-bevindingen; een **onafhankelijke Validator** bevestigt elke
bevinding met bewijs óf verwerpt hem als false positive. Je krijgt alleen gevalideerde
bevindingen — met severity (`kritiek/hoog/middel/laag/info`), een risicoscore en een
concrete fix. Dit is de directe vertaling van Strix' "geen false positives"-principe.

## Status

| Onderdeel | Status |
|-----------|--------|
| Implementatie (server + client + docs) | ✅ klaar, gecommit & gepusht |
| Typecheck (`npm run check`) | ✅ schoon |
| Tests (`npx vitest run`) | ✅ 39 geslaagd (16 nieuw) |
| Build (`npm run build`) | ✅ client + server |
| CI op PR #10 ("Typecheck & build") | ✅ groen |
| Review-comments | geen openstaand |
| PR #10 | open, wordt bewaakt (auto-fix CI/reviews, stille zelf-check ~1u) |

> Let op: de **live happy-path van een scan** is niet gedraaid omdat er in de
> sessie-omgeving geen Anthropic API-key stond (de run gaf correct een 401 → status
> `failed`). De scan-logica zelf is gedekt door unit tests. Draai lokaal met een geldige
> `ANTHROPIC_API_KEY` (of `CUSTOM_CRED_API_ANTHROPIC_COM_TOKEN`) om een echte scan te zien.

## Bestanden

- `shared/schema.ts` — tabellen `scans` + `findings` + severity-taxonomie
- `server/scans.ts` — de ScanEngine (verkenners parallel → Validator → risicoscore → rapport)
- `server/scans.test.ts` — 16 unit tests voor de pure kern
- `server/storage.ts` — scans/findings CRUD + atomaire `replaceFindings`
- `server/routes.ts` — REST-endpoints (guarded, rate-limited 6/min)
- `client/src/pages/Scans.tsx` — UI (agent-selectie, run, severity-rapport)
- Nav/route/i18n: `client/src/components/Sidebar.tsx`, `client/src/App.tsx`, `client/src/lib/i18n.ts`
- `docs/strix.md` — onderzoek → analyse → implementatie writeup

## Zelf proberen (lokaal)

```bash
npm ci
npm run check && npx vitest run          # typecheck + tests
ANTHROPIC_API_KEY=sk-... npm run dev      # start de app
# → open de app, ga naar "Team Scans", kies een template of agents, en draai een scan
```

## Mogelijke vervolgstappen (nog niet gedaan)

- Geplande/continue scans (CI/CD-stijl) via de bestaande scheduler.
- L2 "assisted": de aanbevolen fixes automatisch als taak aanmaken.
- Risicoscore per scan historisch volgen (trend over tijd).
