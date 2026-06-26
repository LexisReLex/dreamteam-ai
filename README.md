# DreamTeam Benchmark-harnas (v1)

Laat meerdere LLM's **parallel racen** op dezelfde **rol + taak** en scoort op **kwaliteit, kosten en latency**. Doel: meten welk model de beste "debugger", "architect", "security-engineer", enz. is voor DreamTeam.

Eén gateway: **OpenRouter** (model-agnostisch, OpenAI-compatibel) via de `openai`-sdk. Geen UI — CLI + rapport als **markdown én standalone HTML**.

---

## Snel starten

```bash
npm install

# 1) Kostenraming — draait GEEN echte calls, stopt voor go/no-go
npm run bench

# 2) Voorbeeldrapport met synthetische data — geen API, geen kosten
npm run bench:demo

# 3) Echte run — vereist OPENROUTER_API_KEY in .env
npm run bench:run
```

> `npm run bench` doet **nooit** een betaalde call. Het toont alleen de kostenraming en stopt. Alleen `npm run bench:run` belt de API.

### Sleutel instellen (pas vóór een echte run)

```bash
cp .env.example .env
# zet OPENROUTER_API_KEY=sk-or-...  (haal er een bij https://openrouter.ai/keys)
```

`.env` staat in `.gitignore` en wordt nooit gecommit.

---

## Hoe het werkt

```
roles/   rol-systeemprompts (10 actieve modi uit senior-ingenieur-modi.md)
tasks/   concrete taak-inputs per rol (nu 3 VOORBEELD-taken)
models.json      model-lineup + prijzen per 1M tokens (in/out)
bench.config.json  weging + jurymodel + concurrency + maxTokens
src/     runner (OpenRouter-calls) → judge (LLM-as-judge) → score → report
out/     gegenereerde rapporten (report.md / report.html)
```

Pijplijn: voor elke combinatie **(rol × taak × model)** → call via OpenRouter, meet latency + token-usage, bereken kosten uit `models.json`. Daarna scoort een sterk **jurymodel** elke output 0–10 (taakvervulling, correctheid, instructie-naleving, bondigheid). Een gewogen totaal bepaalt de winnaar per rol + overall.

### Scoreformule

De jury scoort vier assen 0–10. De **overall** wordt zelf berekend uit die assen
(`0.35·taakvervulling + 0.35·correctheid + 0.15·instructieNaleving + 0.15·bondigheid`) — niet
overgelaten aan de jury, omdat die `overall` soms naar 0 klapte bij een afgekapt antwoord ondanks hoge assen.

Per geslaagde run, alle deelscores 0–1:
- **kwaliteit** = berekende overall / 10
- **kosten** = goedkoopste run / deze run (goedkoper = hoger)
- **latency** = snelste run / deze run (sneller = hoger)

`totaal = 0.6·kwaliteit + 0.25·kosten + 0.15·latency` (weging instelbaar in `bench.config.json`).

Elke run schrijft `out/runs.json` (ruwe outputs + jury-motivatie per combo) zodat elke score auditeerbaar is.
Pas je de weging/scoring aan? Herbouw het rapport gratis uit dat bestand met `npm run bench:rescore` (geen API-calls).

---

## De 10 rollen (modi)

Overgenomen uit `00-System/prompts/senior-ingenieur-modi.md` — **10 actieve modi** (07 is vervallen, niet verzonnen):

| Bestand | Modus |
|---|---|
| `roles/startup-mvp.md` | 01 — Startup-engineeringteam |
| `roles/codebase-audit.md` | 02 — Codebase-audit |
| `roles/debugger.md` | 03 — Debugging op productieniveau |
| `roles/performance.md` | 04 — Performance-optimalisatie |
| `roles/clean-refactor.md` | 05 — Refactor naar clean architecture |
| `roles/backend-architect.md` | 06 — Backend-systeemarchitect |
| `roles/frontend.md` | 08 — Frontend-engineer |
| `roles/tech-lead.md` | 09 — Technical-lead |
| `roles/security.md` | 10 — Security-audit |
| `roles/devops.md` | 11 — DevOps + deployment |

Alle 10 rollen staan klaar. De **3 voorbeeld-taken** dekken nu `debugger`, `performance` en `security`. Voeg taken toe om de andere rollen te benchmarken.

---

## Echte taken toevoegen

Maak een bestand in `tasks/`, bijv. `tasks/mijn-architect-taak.json`:

```json
{
  "example": false,
  "id": "architect-caching-laag",
  "role": "backend-architect",
  "title": "Ontwerp caching-laag voor orderservice",
  "prompt": "…hier de échte opgave waarop de rol wordt toegepast…"
}
```

- `role` = bestandsnaam (zonder `.md`) uit `roles/`.
- `example: false` voor echte taken; voorbeeld-taken houden `true`.
- Elke taak wordt tegen **alle** modellen in `models.json` gedraaid.

## Model-lineup aanpassen

Twee line-ups meegeleverd (slugs + prijzen geverifieerd tegen OpenRouter op 2026-06-20):

- **`models.json`** — volledige line-up: goedkoop/gratis veld (DeepSeek V4 Flash, Hermes 3 405B free, MiniMax-M3, Hermes 4 405B) **+ premium** (Claude Sonnet 4.6, GPT-5.5, Gemini 3.1 Pro).
- **`models.cheap.json`** — alleen het goedkope veld, voor proefruns (~€0).

Per model: OpenRouter-`id` (slug), `label`, prijs `promptPer1M` / `completionPer1M` in USD.

Kies een line-up per run met `-- --models <bestand>`. Jurymodel = sterk (`anthropic/claude-opus-4.8`) in `bench.config.json`; override per run met `-- --judge <slug>`.

```bash
# Goedkope proefrun (cheap veld + cheap judge) ~€0
npm run bench:run -- --models models.cheap.json --judge deepseek/deepseek-v4-flash

# Volledige run (cheap + premium, sterke judge) — eerst raming, dan go
npm run bench -- --models models.json          # raming, stopt
npm run bench:run -- --models models.json      # echte run
```

> Prijzen/slugs wijzigen. Verifieer opnieuw tegen <https://openrouter.ai/models> als je later draait.

---

## Guardrails (sandbox-first)

- v1 draait alleen op de **VOORBEELD-taken**. Geen klantdata, geen secrets, geen productie-repos.
- `npm run bench` print de **kostenraming** (bovengrens) en stopt — jij geeft go/no-go.
- Kosten ná een run komen uit de **echte API-usage**, niet hardcoded.

---

# Model-router dispatch (fase 2)

De benchmark **kiest** het beste model per stoel; de dispatch-laag **draait** een taak nu écht via dat model over OpenRouter en geeft het resultaat **plus de echte kosten** terug. Dit is de uitvoer-kant van de [`model-router`-skill](../../../../Library/Mobile%20Documents/com~apple~CloudDocs/LXY-Vault/00-System/skills/model-router/): de dirigent zei eerst "voor research pak ik DeepSeek, ~€X", en kan dat nu ook laten uitvoeren.

> **Zelfde repo, zelfde bedrading.** De dispatcher hergebruikt de OpenRouter-client, de prijs-/usage-afhandeling en de concurrency-helper van de benchmark. Geen losse repo.

## Eén adres — leidende bron

De routing-regels worden **niet gedupliceerd**. De dispatcher leest ze live uit:

```
~/Library/Mobile Documents/com~apple~CloudDocs/LXY-Vault/00-System/skills/model-router/models-routing.json
```

Daar staan de `seats` (copywriter / klantenservice / research), hun `default`/`draft`/`fallback`-model, de `tiers` (cheap/premium) en de prijzen per 1M tokens. Pad is configureerbaar via `--routing <pad>` of env `MODEL_ROUTING_PATH`; ontbreekt het bestand of een stoel → **nette fout, geen verzonnen routing**.

## Gebruik

```bash
# Research → DeepSeek (cheap → draait automatisch)
npm run dispatch -- --seat research --task ./examples-dispatch/voorbeeld-research-concurrenten.md

# Copywriter draft → DeepSeek (cheap); inline taaktekst mag ook
npm run dispatch -- --seat copywriter --mode draft --task "schrijf 3 ad-haakjes"

# Expliciet model — omzeilt de seat-keuze (model moet in routing-JSON staan)
npm run dispatch -- --model deepseek/deepseek-v4-flash --task ./taak.md

# Alleen raming, geen call
npm run dispatch -- --dry-run --seat copywriter --task ./taak.md

# Premium-stoel bevestigen (oranje licht passeren)
npm run dispatch -- --seat copywriter --task ./taak.md --yes

# Meerdere taken parallel (begrensde concurrency)
npm run dispatch -- --seat research --parallel ./examples-dispatch/voorbeeld-research-*.md
```

Belangrijkste flags: `--seat`, `--mode default|draft|quality` (of `--draft` / `--quality`), `--model`, `--task`, `--parallel`, `--dry-run`, `--yes`, `--routing`, `--max-tokens`, `--threshold`, `--concurrency`. Volledige lijst: `npm run dispatch -- --help`.

## Oranje licht (Lex' principe, hard ingebouwd)

- **Cheap** model onder de kostendrempel → **draait automatisch**.
- **Premium** model (óf geschatte kosten boven de drempel, default **$0,25/call**) → **stopt** met de kostenraming en draait pas met `--yes`. Zo houdt Lex de go.
- Drempel instelbaar in `dispatch.config.json` (`oranjeThresholdUsd`) of per run met `--threshold`.

## Delegatie-contract

Een taakbestand mag het contract uit `agentic-stack/TEMPLATE-delegatie-contract.md` bevatten (`DOEL` / `GRENZEN` / `TERUGGAVE` / `BUDGET`). Dat wordt als systeem-/instructieblok vóór de taak gevouwen; `BUDGET … tokens` begrenst het completion-plafond. Zonder contract krijgt het model een neutrale, strakke instructie. Zie de voorbeelden in `examples-dispatch/`.

## Teruggave op één adres

Per dispatch:
- het resultaat in het `TERUGGAVE`-format → `out/dispatch/<timestamp>-<seat>.md`;
- één regel naar `out/dispatch/log.jsonl` (timestamp, seat, model, tier, gate, in/out-tokens, latency, **echte kosten $**, taak-pad). Dit is de kostenverantwoording die fase 3 (dashboard) uitleest.

## Config

- `OPENROUTER_API_KEY` uit `.env` (zelfde sleutel als de benchmark; in `.gitignore`).
- `dispatch.config.json`: `routingPath`, `maxTokens`, `temperature`, `concurrency`, `oranjeThresholdUsd`.

## Wat getest is (dispatch)

Sandbox-first: alleen **cheap** test-calls; het premium-pad is met dry-run/stop bewezen (geen premium-spend).

- ✅ **Dry-run per seat** — research→DeepSeek (auto), copywriter→GPT-5.5 (oranje), klantenservice draft→DeepSeek (auto): juist model + raming, **geen call**.
- ✅ **Echte cheap call** — research→DeepSeek loopt end-to-end; log toont **echte** kosten/tokens/latency uit de API (232 in / 628 out → $0.000134, klopt met de DeepSeek-prijs; niet hardcoded).
- ✅ **Premium-pad stopt** zonder `--yes` en toont de raming ($0,0368); met `--yes` zou het callen.
- ✅ **`--parallel`** draait 2 voorbeeld-taken tegelijk (overlappende timestamps) → 2 resultaatbestanden + 2 losse kostenregels.
- ✅ **Foutpaden** — onbekende seat, ontbrekend routing-bestand, onbekend model → nette melding, geen verzonnen routing.
- ✅ `npx tsc --noEmit` — typecheck schoon.
- ⛔ **Niet getest:** een échte premium-call (bewust geen spend; bewezen via dry-run/stop-logica). MCP-wrapper (fase 2b) en n8n/dashboard (fase 3) zijn buiten scope.

---

# Model-router MCP (fase 2b)

Dezelfde dispatch-core als fase 2, maar als **MCP-server** zodat Cowork / Claude / Claude Code de router **live in-sessie** kunnen aanroepen — niet alleen via de CLI. Eén bron van logica: CLI én MCP roepen `src/dispatch/service.ts` aan; de dispatch-core is niet gedupliceerd.

## Starten

```bash
npm run mcp
```

Stdio-transport. Stdout is voor het MCP-protocol; statusmeldingen gaan naar stderr.

## Tools

| Tool | Doet | Oranje licht |
|---|---|---|
| `dispatch_run` | Draait een taak via seat (of `model`) + `mode`. Args: `seat`, `model`, `mode`, `task`, `confirm_premium`. | cheap → auto; premium/boven drempel → **niet callen** tenzij `confirm_premium:true` (geeft dan raming + gate-melding) |
| `dispatch_estimate` | Altijd alleen raming (spiegelt `--dry-run`), nooit een call. | n.v.t. |
| `dispatch_seats` | Seats + gekozen modellen per mode + gates, live uit `models-routing.json`. | n.v.t. |

`task` mag inline tekst zijn of een bestandspad (.md/.json/.txt). Resultaat + kostenregel landen op hetzelfde adres als de CLI (`out/dispatch/`).

## Koppelen — MCP-config-snippet

Plak dit in de MCP-config van Cowork/Claude (pas het pad aan als de repo verhuist):

```json
{
  "mcpServers": {
    "model-router-dispatch": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/Users/lex/Documents/Claude/Claude Code/dreamteam-benchmark"
    }
  }
}
```

De server leest `OPENROUTER_API_KEY` uit `dreamteam-benchmark/.env` (zelfde sleutel, in `.gitignore`).

## Voorbeeld-aanroepen (door de aanroeper/LLM)

- `dispatch_seats` → toont de actuele routing-regels.
- `dispatch_estimate {seat:"research", task:"./examples-dispatch/voorbeeld-research-concurrenten.md"}` → raming, geen call.
- `dispatch_run {seat:"research", task:"…"}` → cheap, draait automatisch, geeft output + echte kosten.
- `dispatch_run {seat:"copywriter", task:"…"}` → premium, **stopt** met raming; voeg `confirm_premium:true` toe om te callen.

## Wat getest is (MCP)

Geverifieerd met een echte MCP-client (`src/mcp/test-client.ts`) die de server via stdio spawnt:

- ✅ **Server start** zonder errors via `npm run mcp` (stderr-melding, 3 tools geregistreerd).
- ✅ **`dispatch_seats`** geeft 3 seats + modellen + gates terug die overeenkomen met `models-routing.json` (research→DeepSeek auto, copywriter/klantenservice default→GPT-5.5 oranje).
- ✅ **`dispatch_run` research (cheap)** levert echte output + echte kosten ($0,000195 uit API) + latency + logregel in `out/dispatch/log.jsonl`.
- ✅ **`dispatch_run` copywriter zonder `confirm_premium`** → raming + gate-melding, **callt niet** (oranje licht binnen de MCP). De `confirm_premium:true`-tak bestaat (zelfde core als CLI `--yes`).
- ✅ `npx tsc --noEmit` schoon.
- ⛔ **Niet getest:** koppeling in de échte Cowork/Claude-app (config-snippet geleverd; Lex plakt + verbindt). Premium-call via MCP bewust niet uitgevoerd (geen spend; tak bewezen via stop-logica + CLI).

> Test zelf na: `npx tsx src/mcp/test-client.ts`.

---

# Benchmark — wat getest is

- ✅ `npm run bench` — end-to-end kostenraming, stopt voor go/no-go, geen API-call.
- ✅ `npm run bench:demo` — vol rapport (md + html) met synthetische data, alle 18 combos (3 taken × 6 modellen), winnaar per rol + overall-ranglijst.
- ✅ `npx tsc --noEmit` — typecheck schoon.
- ⛔ **Niet getest:** een echte `npm run bench:run` (vereist API-key + budget). Bewust niet gedraaid; prijzen/slugs in `models.json` nog te verifiëren tegen OpenRouter.
