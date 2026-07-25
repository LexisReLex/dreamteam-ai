# Deployment & uitrol — DreamTeam + Agent Loops

Praktische gids om DreamTeam (inclusief de autonome **Agent Loops**) veilig live
te zetten. Volg de stappen op volgorde.

## 1. Omgevingsvariabelen

Zet deze in je hostingomgeving (bv. Railway → Variables). Zie ook `.env.example`.

| Variabele | Vereist | Aanbevolen start | Toelichting |
|-----------|---------|------------------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | `sk-ant-...` | API-sleutel voor de agents. `CUSTOM_CRED_API_ANTHROPIC_COM_TOKEN` werkt ook. |
| `DAILY_TOKEN_LIMIT` | — | `50000` | Gedeeld dagelijks tokenplafond (chat + loops). Begin laag, verhoog na kostenmeting. |
| `DATABASE_URL` | ⚠️ prod | `postgresql://…@…neon.tech/…?sslmode=require` | Neon (serverless Postgres) connectionstring. **Zet dit** (zie §2), anders draait de app op een vluchtige lokale PGlite en verdwijnt data bij elke redeploy. |
| `DB_PATH` | — | — | Alleen lokaal/zonder `DATABASE_URL`: mappad voor de embedded PGlite-database. In productie niet nodig. |
| `ALLOWED_ORIGINS` | — | `https://jouwdomein.nl` | Komma-gescheiden origin-allowlist voor de dure endpoints (defense-in-depth). Leeg = alles toestaan. |
| `API_ACCESS_TOKEN` | — | leeg | Optionele API-token voor **afgeschermde/interne** deploys (geen publieke SPA). Vereist dan header `x-api-token`. |
| `PORT` / `NODE_ENV` | — | zet host zelf | Railway vult deze automatisch. |

> **Let op — dit is geen gebruikers-auth.** Een publieke browser-SPA kan geen
> geheim bewaren, dus `API_ACCESS_TOKEN` is alleen zinvol voor interne/proxied
> deploys. Voor echte publieke multi-user beveiliging zijn gebruikersaccounts
> nodig (aparte mijlpaal). `ALLOWED_ORIGINS` + de rate limits + het token-budget
> vormen samen de defense-in-depth voor een publieke demo.

## 2. ⚠️ Database: Neon (serverless Postgres)

De app draait op **Postgres**. In productie gebruik je **Neon** (serverless
Postgres): de data leeft durable in de cloud, niet in de container. Containers op
Railway/Fly/Render zijn **ephemeral** — zonder externe database zou bij elke
redeploy of restart **alles weg zijn**: loops, runs én het state-geheugen. Dat
state-geheugen is de kern van loop engineering, dus dit moet je regelen.

**Neon opzetten (eenmalig):**
1. Maak een gratis account op [neon.com](https://neon.com) en een nieuw project
   (kies de regio het dichtst bij je hosting).
2. Kopieer de **connection string** (Dashboard → Connect). Vorm:
   `postgresql://<user>:<password>@<host>.neon.tech/<db>?sslmode=require`.
3. Zet die als `DATABASE_URL` in je hostingomgeving (Railway → Variables).
4. Redeploy. De app maakt de tabellen bij het opstarten zelf aan (idempotent).

De database (en state) overleeft nu redeploys en restarts. Branchen van de
database per preview-omgeving kan later via Neons branch-feature.

**Zonder `DATABASE_URL`** valt de app terug op een **embedded PGlite** (lokale
Postgres). Handig voor lokaal ontwikkelen en de testsuite — maar in de container
is dat vluchtig.

**Controleren in de logs (geen dashboard nodig).** De server logt bij het opstarten
welke databasemodus actief is:

```
[storage] Neon/Postgres via DATABASE_URL (durable).            ← goed
[storage] PGlite lokaal (data.db) — VLUCHTIG. DATABASE_URL … ← fout, data verdwijnt
```

Zie je de tweede regel in productie, dan draait de app op een vluchtige lokale
database en ben je alles kwijt bij de eerstvolgende redeploy. Let op: dit gaat
verder stíl mis — de build slaagt, de healthcheck op `/api/agents` slaagt en de
app seedt gewoon een verse database.

> Schema wijzigen? `shared/schema.ts` is de bron van waarheid. Voor lokaal
> itereren kun je `npm run db:push` (drizzle-kit) tegen je `DATABASE_URL` draaien;
> de app zelf maakt ontbrekende tabellen bij elke start idempotent aan.

## 3. Eén instance

De loop-**scheduler draait in-proces** (elke 60s controleert de server op
verschuldigde loops). Draai daarom **precies één instance/replica**. Met meerdere
replicas draait elke z'n eigen scheduler → dubbele runs en dubbele API-kosten.

- Railway: houd "Replicas" op 1.
- Wil je later horizontaal schalen, zet de scheduler dan achter een gedeelde lock
  of verplaats hem naar een aparte worker.

## 4. Build & start

Al geconfigureerd in `railway.json` / `nixpacks.toml`:

```bash
npm ci && npm run build          # bouwt client (vite) + server (esbuild → dist/index.cjs)
NODE_ENV=production node dist/index.cjs
```

Healthcheck staat op `/api/agents`.

## 5. Gefaseerde uitrol van loops (L1 → L2 → L3)

Zet loops **niet** meteen op automatisch. Volg de fasering uit loop engineering
(zie `docs/loop-engineering.md`).

**Fase 1 — handmatig valideren (week 1).**
- Maak 1–2 loops aan, laat ze **uitgeschakeld**.
- Draai ze met **"Draai nu"** en lees zowel de maker-output als het
  checker-oordeel (verdict + score + critique).
- Vertrouw je de kwaliteit (score consequent ≥ 70)? Ga door.

**Fase 2 — cadans aan, rustig (week 2).**
- Zet `enabled` aan met een **rustige cadans** (`1d` of `6h`, niet `15m`).
- Volg de **budgetbalk** en de score-trend een paar dagen.

**Fase 3 — opschalen.**
- Verhoog de cadans of het aantal loops alleen als de kwaliteit stabiel blijft.
- L2/L3 (assisteren/autonoom) pas per loop overwegen bij consistent goede scores.

**Goede eerste loops** (laag risico, laag frequent):

| Agent | Doel | Cadans |
|-------|------|--------|
| Nova (Marketing) | "3 concrete marketing-ideeën voor deze week" | `1d` |
| Mira (Content) | "content-kalender-suggesties voor de komende week" | `1d` |
| Orion (Strategie) | "wekelijkse strategische signalen en aandachtspunten" | `6h` |

Vermijd in het begin `15m`-loops: die verbruiken snel budget vóór je de kwaliteit
vertrouwt.

## 6. Bewaken & noodrem

- **Budgetbalk** (Loops-pagina) = je kostenrem. Bij het plafond worden runs
  overgeslagen en als `ERROR` gelogd — de server crasht niet.
- **Kill switch** = de `enabled`-toggle per loop. Zet 'm uit om een loop direct te
  stoppen; verwijderen wist de loop én zijn runs.
- **Score-trend + checker-critique**: dalende scores betekenen doel aanscherpen of
  loop uitzetten.
- `DAILY_TOKEN_LIMIT` verlagen is de snelste globale rem op de kosten.

## 7. Checklist vóór livegang

- [ ] `ANTHROPIC_API_KEY` gezet en getest (een handmatige "Draai nu" geeft geen `ERROR`).
- [ ] Neon-project aangemaakt en `DATABASE_URL` gezet (log toont "Neon/Postgres via DATABASE_URL").
- [ ] Eén instance/replica.
- [ ] `DAILY_TOKEN_LIMIT` bewust laag gezet voor de start.
- [ ] Eerste loops op **L1**, uitgeschakeld, handmatig gevalideerd.
