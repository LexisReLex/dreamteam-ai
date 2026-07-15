# Span-schema v1 — herbruikbare template (Observability Niveau 2)

> Template-first: dit is het gevalideerde span-formaat dat de dispatcher naar
> `out/dispatch/log.jsonl` schrijft (één JSON-object per regel). Bewezen op een
> sandbox-run van de Lexxy-grind-job (15 jul 2026). Herbruik dit schema voor elke
> nieuwe onbemande grind-job die door één meetpunt (de dispatcher) loopt.

## Waarom één span-regel per call

Alles loopt door één poort (OpenRouter-dispatch). Daar, en nergens anders, wordt
geïnstrumenteerd. Elke call = één volledige "span". Het paneel (`npm run panel`) en
de drift-check (`npm run drift`) lezen exact dit formaat; een tweede lezer (HQ Hub,
aparte Tauri-app) leest dezelfde velden. **Één bron, meerdere lezers.**

## Velden

| Veld | Type | Bron | Nieuw in N2? | Betekenis |
|------|------|------|:---:|-----------|
| `timestamp` | ISO-8601 string | dispatch-core | — | tijdstip van de call (spec: `ts`) |
| `traceId` | `tr-<12hex>` | span.ts | ✅ | keten-ID; knoopt alle stappen van één job aan elkaar |
| `taskId` | string | taak | — | taak-id (bestandsnaam of label) |
| `taskPath` | string \| null | taak | — | bronpad indien uit bestand |
| `seat` | string \| null | routing | — | rol: research / copywriter / klantenservice |
| `voice` | string \| null | voice.ts | ✅ | merkstem-laag (187N): lexxy/degroot/klanttijd/persoonlijk |
| `mode` | `default`\|`draft`\|`quality` | CLI/MCP | — | dispatch-mode |
| `model` | slug | routing | — | model-id (spec: `model`) |
| `tier` | `cheap`\|`premium` | routing | — | prijsklasse |
| `gate` | `auto`\|`oranje` | core | — | oranje licht: cheap-onder-drempel = auto |
| `promptVersion` | `pv-<8hex>` | span.ts | ✅ | content-hash van het systeemblok (contract+merkstem+instructie) |
| `executed` | boolean | core | — | false bij dry-run of gestopt oranje licht |
| `blockedReason` | string \| null | core | — | bv. "premium zonder --yes" |
| `estCostUsd` | number | cost.ts | — | vooraf-raming (bovengrens) |
| `promptTokens` | number \| null | API-usage | — | echte in-tokens (spec: `tokens_in`) |
| `completionTokens` | number \| null | API-usage | — | echte out-tokens (spec: `tokens_out`) |
| `latencyMs` | number \| null | core | — | round-trip (spec: `latency_ms`) |
| `costUsd` | number \| null | cost.ts | — | ECHTE kosten uit API-usage (spec: `cost`) |
| `inputHash` | `in-<12hex>` | span.ts | ✅ | sha256-trunc van de taak-input — privacy-veilig, geen ruwe tekst |
| `outputHash` | `out-<12hex>` \| null | span.ts | ✅ | sha256-trunc van de output |
| `evalScore` | number 0-10 \| null | eval.ts | ✅ | online-judge-score (null = niet gescoord) |
| `evalPass` | boolean \| null | eval.ts | ✅ | score >= drempel (default 7.0) |
| `evalMotivatie` | string \| null | eval.ts | ✅ | één zin van de judge |
| `error` | string \| null | core | — | null of foutreden |

## Reconciliatie-regel (bij hergebruik)

1. **Dupliceer nooit.** Bestaat een dimensie al onder een andere naam, hergebruik die
   (spec's `tokens_in` = `promptTokens`; `ts` = `timestamp`). Voeg alleen toe wat ontbreekt.
2. **Privacy-veilig.** Log nooit ruwe klant-/merktekst. Gebruik `inputHash`/`outputHash`
   (of trunc), nooit de volledige in-/output.
3. **`promptVersion`** = content-hash van het effectieve systeemblok. Verandert de
   template of de merkstem, dan verandert de versie automatisch. Geen los versie-nummer
   verzinnen; wil je een echte template-registry, koppel die hier expliciet aan.
4. **`voice`** is een vaste, aparte dimensie (niet verstopt in `promptVersion`), zodat
   paneel + eval kosten/kwaliteit per merkstem kunnen splitsen.

## Voorbeeld (echte sandbox-span, 15 jul 2026)

```json
{"timestamp":"2026-07-15T12:59:23.385Z","traceId":"tr-55873d9f-674","taskId":"voorbeeld-n8n-competitor-watch","taskPath":"./examples-dispatch/voorbeeld-n8n-competitor-watch.md","seat":"research","voice":"lexxy","mode":"default","model":"deepseek/deepseek-v4-flash","tier":"cheap","gate":"auto","promptVersion":"pv-e6af65d7","executed":true,"blockedReason":null,"estCostUsd":0.000285,"promptTokens":1044,"completionTokens":627,"latencyMs":10155,"costUsd":0.000207,"inputHash":"in-49466aba8d2c","outputHash":"out-a6d4d122a930","evalScore":3,"evalPass":false,"evalMotivatie":"Sandbox-taak verwordt tot uitgebreide analyse en actiesuggestie, geen prijssignaal-enkel.","error":null}
```

## Code-adressen (één bron per zorg)

- Velden opbouwen: `src/dispatch/span.ts` (traceId/promptVersion/hashes), `src/dispatch/core.ts` (span-samenstelling)
- Wegschrijven: `src/dispatch/output.ts` (`appendLog`)
- Online-eval invullen: `src/dispatch/eval.ts` (vóór `appendLog`)
- Lezen/aggregeren: `src/panel/metrics.ts` (paneel + drift delen dit)
```
