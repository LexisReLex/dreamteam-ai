# DreamTeam — Handover

_Overdrachtsdocument. Laatst bijgewerkt: 2026-07-14._

Live: **https://dreamteam-ai.onrender.com** · Repo: `LexisReLex/dreamteam-ai`

---

## 1. Wat is DreamTeam?

Een Nederlands **AI-agentplatform** voor ondernemers: 10 gespecialiseerde agents
(Nova/marketing, Rex/sales, Mira/content, Kai/SEO, Zara/support, Finn/finance,
Luna/social, Atlas/data, Sage/HR, Orion/strategie). Gebruikers chatten met agents,
beheren taken, en draaien sinds deze sessie **autonome Agent Loops**.

**Stack:** React 18 SPA (Vite, wouter/hash-routing, Tailwind, Radix) · Express 5 ·
SQLite via Drizzle ORM · Claude via `@anthropic-ai/sdk`. Eén Express-server bedient
zowel de API als de gebouwde client.

---

## 2. Wat er in deze sessie is gebouwd: Agent Loops

Toepassing van "loop engineering" (cobusgreyling/loop-engineering): niet de mens
prompt de agent, maar een **loop** doet dat op een cadans, verifieert het resultaat
en geeft een score. Zie `docs/loop-engineering.md` voor onderzoek + analyse.

**De loop-cyclus:** `scheduler → maker → checker → state → score`
1. Scheduler vuurt af (of handmatig "Draai nu").
2. **Budgetcheck** — bij overschrijding wordt de run als `ERROR` gelogd.
3. **Maker** — de gekozen agent voert het doel uit, met de vorige STATE als geheugen.
4. **Checker** — een onafhankelijke verifier-subagent beoordeelt de output →
   `{verdict, score 0-100, critique}`.
5. **State** — samenvatting + critique gaan vooraan de geheugen-ruggengraat; de
   volgende maker leest die en verbetert erop (post-run zelfverbetering).
6. **Log** — `loop_runs` bewaart maker-output, verdict, score en tokengebruik.

**Meegeleverd:** per-loop run-lock (geen dubbele runs), snelstart-templates
(6 presets), dashboard-kaart (aantal actief + gem. score), gedeeld dagbudget +
kill switch per loop, gefaseerde niveaus L1/L2/L3 (standaard L1 report-only).

---

## 3. Kernbestanden

| Bestand | Rol |
|---------|-----|
| `server/loops.ts` | **LoopEngine** (maker/checker) + in-proces scheduler + run-lock. Testbare pure helpers: `parseCadenceMs`, `computeNextRunAt`, `parseCheckerResult`, `buildMakerSystem`, `buildStateEntry`. |
| `server/ai.ts` | Gedeelde Anthropic-client + dagelijks token-budget (governance). |
| `server/prompts.ts` | Agent-systeemprompts (gedeeld door chat en loops). |
| `server/security.ts` | `accessGuard()` + `isOriginAllowed` / `isTokenValid` (defense-in-depth). |
| `server/storage.ts` | SQLite-init (`DB_PATH`) + CRUD voor agents/tasks/messages/profile/loops/runs. |
| `server/routes.ts` | REST-endpoints + scheduler-start. |
| `shared/schema.ts` | Drizzle-tabellen: `agents`, `tasks`, `messages`, `user_profile`, `loops`, `loop_runs`. |
| `client/src/pages/Loops.tsx` | Loops-UI: aanmaken, "Draai nu", score, state, runs, templates, budget. |
| `client/src/pages/Dashboard.tsx` | Agent Loops-overzichtskaart. |
| `server/*.test.ts` | 23 unit-tests (loop-logica, budget, security). |
| `docs/loop-engineering.md` · `docs/deployment.md` | Achtergrond + uitrolgids. |

**API (loops):** `GET/POST /api/loops`, `GET/PATCH/DELETE /api/loops/:id`,
`POST /api/loops/:id/run`, `GET /api/loops/:id/runs`, `GET /api/budget`.

---

## 4. Configuratie (environment variables)

| Variabele | Vereist | Toelichting |
|-----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Sleutel voor de agents (`CUSTOM_CRED_API_ANTHROPIC_COM_TOKEN` werkt ook). |
| `DAILY_TOKEN_LIMIT` | — | Gedeeld dagplafond (default 100000). Begin laag. |
| `DB_PATH` | ⚠️ | SQLite-pad (default `data.db`). **Zet op een persistent disk** (zie §6). |
| `ALLOWED_ORIGINS` | — | Origin-allowlist voor dure endpoints (leeg = alles toestaan). |
| `API_ACCESS_TOKEN` | — | Optionele `x-api-token` voor interne/proxied deploys (geen publieke SPA). |
| `PORT` / `NODE_ENV` | — | Zet de host doorgaans zelf. |

Zie `.env.example`.

---

## 5. Ontwikkelen

```bash
npm install
npm run dev      # dev-server (tsx, Vite HMR)
npm run check    # tsc typecheck
npm test         # vitest (23 tests)
npm run build    # tsx script/build.ts → vite + esbuild → dist/index.cjs
npm start        # productie: node dist/index.cjs
```

CI: `.github/workflows/ci.yml` draait typecheck + test + build op **Node 20** bij
elke PR/push naar `main`.

---

## 6. Deployment (Render) — en de valkuilen

**Platform: Render** (auto-deploy van `main`). Live op
`dreamteam-ai.onrender.com`.

Twee deploy-fixes die nodig bleken (leg deze niet weer weg):
- **`.node-version` = `20`** — `tsx` (4.20.5) crasht op Node 24 (`ERR_MODULE_NOT_FOUND`).
  Render pakt zonder pin de nieuwste Node. Blijf op 20/22.
- **`.npmrc` met `include=dev`** — Render bouwt met `NODE_ENV=production`, wat de
  devDependencies (vite/esbuild/tsx) overslaat → `tsx: not found` (status 127).
  `.npmrc` forceert ze.

> Als er in Render → Environment een `NODE_VERSION`-var staat, overschrijft die
> `.node-version`. Zet 'm dan op `20`.

### ⚠️ HOOG-PRIORITEIT openstaand punt: persistentie
SQLite op de **standaard Render-filesystem is vluchtig** — bij elke redeploy
worden `data.db` en dus **alle loops, runs en state gewist**. Voor een
geheugen-gedreven feature is dat fataal.
**Actie:** mount een **Render Disk** (bv. op `/data`) en zet `DB_PATH=/data/dreamteam.db`.
Zolang dit niet gebeurt, verdwijnen aangemaakte loops bij de volgende deploy.

Houd **één instance** (de scheduler draait in-proces; meerdere replicas =
dubbele runs). Zie `docs/deployment.md` voor de volledige uitrol- en veiligheidsgids.

---

## 7. Bekende beperkingen

1. **Persistentie op Render** — zie §6 (belangrijkste).
2. **Geen gebruikers-auth** — de app is single-tenant: één globaal profiel, en
   `loops`/`tasks`/`messages` hebben geen eigenaar. `security.ts` is alleen
   defense-in-depth, geen echte auth.
3. **Scheduler in-proces** — vereist 1 instance; horizontaal schalen vraagt om
   een gedeelde lock of een aparte worker.
4. **Loop-niveaus** — alleen **L1 (report-only)** is functioneel geïmplementeerd;
   L2/L3 bestaan als configuratie maar voeren (nog) geen acties uit.

---

## 8. Aanbevolen volgende stappen (op prioriteit)

1. **Render Disk + `DB_PATH`** aanzetten — anders ben je loops/state kwijt bij elke
   deploy. Klein, urgent.
2. **Gebruikersaccounts + auth** (de grote mijlpaal om naar multi-user SaaS te gaan):
   `passport` staat al klaar. Fasen: (a) accounts + login, (b) `userId` op de
   tabellen + data-isolatie, (c) koppeling met de plannen (starter/pro/team).
3. **L2/L3 loop-acties** — de gefaseerde uitrol echt actie laten ondernemen, met
   human-gates.

---

## 9. Status bij overdracht

- ✅ Agent Loops **live** op Render en geverifieerd in productie.
- ✅ 23 unit-tests groen · CI groen (typecheck + test + build).
- ✅ PRs #1–#4 gemerged naar `main` (feature, hardening, deploy-fixes).
- ⚠️ Persistentie (Render Disk) nog niet ingesteld — zie §6.
- ⏭️ Auth/accounts is de volgende grote beslissing.
