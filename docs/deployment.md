# Deployment & uitrol — DreamTeam + Agent Loops

Praktische gids om DreamTeam (inclusief de autonome **Agent Loops**) veilig live
te zetten. Volg de stappen op volgorde.

## 1. Omgevingsvariabelen

Zet deze in je hostingomgeving (bv. Railway → Variables). Zie ook `.env.example`.

| Variabele | Vereist | Aanbevolen start | Toelichting |
|-----------|---------|------------------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | `sk-ant-...` | API-sleutel voor de agents. `CUSTOM_CRED_API_ANTHROPIC_COM_TOKEN` werkt ook. |
| `DAILY_TOKEN_LIMIT` | — | `50000` | Gedeeld dagelijks tokenplafond (chat + loops). Begin laag, verhoog na kostenmeting. |
| `DB_PATH` | ⚠️ prod | `/data/dreamteam.db` | Pad naar SQLite. **Zet dit op een persistent volume** (zie §2), anders is data vluchtig. |
| `ALLOWED_ORIGINS` | — | `https://jouwdomein.nl` | Komma-gescheiden origin-allowlist voor de dure endpoints (defense-in-depth). Leeg = alles toestaan. |
| `API_ACCESS_TOKEN` | — | leeg | Optionele API-token voor **afgeschermde/interne** deploys (geen publieke SPA). Vereist dan header `x-api-token`. |
| `PORT` / `NODE_ENV` | — | zet host zelf | Railway vult deze automatisch. |

> **Let op — dit is geen gebruikers-auth.** Een publieke browser-SPA kan geen
> geheim bewaren, dus `API_ACCESS_TOKEN` is alleen zinvol voor interne/proxied
> deploys. Voor echte publieke multi-user beveiliging zijn gebruikersaccounts
> nodig (aparte mijlpaal). `ALLOWED_ORIGINS` + de rate limits + het token-budget
> vormen samen de defense-in-depth voor een publieke demo.

## 2. ⚠️ Persistente opslag (belangrijkste stap)

De app gebruikt SQLite. Standaard schrijft die naar `data.db` in de containermap,
en containers op Railway/Fly/Render zijn **ephemeral** — bij elke redeploy of
restart is die map weg. Voor de loops betekent dat: **loops, runs én het
state-geheugen verdwijnen**. State-geheugen is de kern van loop engineering, dus
dit moet je regelen.

**Railway (aanbevolen):**
1. Maak een **Volume** aan en mount die op `/data`.
2. Zet `DB_PATH=/data/dreamteam.db`.
3. Redeploy. De app maakt de map zo nodig zelf aan.

De database (en state) overleeft nu redeploys en restarts.

> Alternatief: migreren naar Postgres/Supabase (`@supabase/supabase-js` zit al in
> `package.json`). Meer werk, maar beter voor schaal en back-ups.

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
- [ ] Volume gemount en `DB_PATH` erop gezet.
- [ ] Eén instance/replica.
- [ ] `DAILY_TOKEN_LIMIT` bewust laag gezet voor de start.
- [ ] Eerste loops op **L1**, uitgeschakeld, handmatig gevalideerd.
