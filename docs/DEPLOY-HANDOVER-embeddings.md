# Deploy-handover — Semantische recall aanzetten (Agent Memory)

> **Geef dit bestand aan Claude Cowork of een terminal-agent.** Het is zelfstandig
> uit te voeren. Lex hoeft alleen een gratis key te regelen (Deel A); de agent doet
> Deel B (env zetten → deployen → **verifiëren met live bewijs**).
>
> Platform: **Railway** (`railway.json` + `nixpacks.toml`). Branch met de code:
> `claude/mempalace-repo-ari3y3`. Achtergrond/besluit: `docs/mempalace.md`.

---

## Wat je aanzet (en waarom het veilig is)

De DreamTeam-agents hebben een gelaagd geheugen (Agent Memory). De recall was puur
lexicaal (exacte woord-overlap). Deze deploy zet de **semantische recall-leg** aan:
herinneringen worden dan óók gevonden zonder woord-overlap (synoniemen, andere taal).

- **Uit-standaard.** Zonder `EMBEDDINGS_API_KEY` verandert er niets — recall blijft
  lexicaal (dit is byte-identiek getest). Deze deploy voegt alléén een opt-in laag toe.
- **Faalt het embeddings-endpoint, dan valt recall automatisch terug op lexicaal.**
  De chat blokkeert nooit. Terugdraaien = de key weer weghalen (zie Deel C).
- **Nul risico op de bestaande werking.** Typecheck schoon, **140 tests groen**, build schoon.

---

## Deel A — Gratis embeddings-key regelen  *(Lex, 2 min)*

Je hebt een key nodig van een provider met een **OpenAI-compatibel `/embeddings`-endpoint**.
Kies er één. Beide hebben een gratis tier (verifieer de actuele limieten op de providerpagina).

### Optie 1 — Google AI Studio (aanbevolen: royale gratis tier)
1. Ga naar https://aistudio.google.com/app/apikey → **Create API key** (gratis).
2. Onthoud deze waarden voor Deel B:
   - `EMBEDDINGS_API_KEY` = de key
   - `EMBEDDINGS_BASE_URL` = `https://generativelanguage.googleapis.com/v1beta/openai`
   - `EMBEDDINGS_MODEL` = `text-embedding-004`

### Optie 2 — Jina AI (alternatief)
1. Ga naar https://jina.ai/embeddings → gratis key aanmaken.
2. Waarden:
   - `EMBEDDINGS_API_KEY` = de key
   - `EMBEDDINGS_BASE_URL` = `https://api.jina.ai/v1`
   - `EMBEDDINGS_MODEL` = `jina-embeddings-v3`

> Elk ander OpenAI-compatibel endpoint werkt ook (Together, Voyage, OpenAI, …):
> zet dan `EMBEDDINGS_BASE_URL` op de `/v1`-basis (de app roept `<base>/embeddings` aan)
> en het bijbehorende model.

---

## Deel B — Deployen  *(Cowork / terminal-agent)*

> Doe de stappen op volgorde. **Verzin geen uitkomst — stap 4 is het enige bewijs
> dat het werkt.** Meld "klaar" pas na een groen antwoord van het health-endpoint.

### 0. Zorg dat de code op `main` staat (Railway deployt vanaf `main`)
De feature zit op branch `claude/mempalace-repo-ari3y3`. Als de bijbehorende PR nog
niet gemerged is, merge die eerst naar `main` (via GitHub, of):
```bash
git fetch origin
git checkout main && git pull origin main
git merge origin/claude/mempalace-repo-ari3y3
git push origin main
```
> Geen merge-toegang? Vraag Lex de PR te mergen; ga daarna verder.

### 1. Env-variabelen zetten op Railway
**Via dashboard:** Project → **Variables** → voeg de drie waarden uit Deel A toe →
Railway redeployt automatisch.

**Of via de Railway CLI** (in de projectmap, `railway link` gedaan):
```bash
railway variables --set "EMBEDDINGS_API_KEY=PLAK_KEY_HIER" \
                   --set "EMBEDDINGS_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai" \
                   --set "EMBEDDINGS_MODEL=text-embedding-004"
```
> Laat `EMBEDDINGS_BASE_URL`/`EMBEDDINGS_MODEL` weg als je Optie 1 níet gebruikt —
> pas ze aan op je gekozen provider. Alleen `EMBEDDINGS_API_KEY` is strikt nodig
> (zonder base-url valt de app terug op de OpenAI-default).

### 2. Redeploy
Dashboard-variabelen triggeren dit vanzelf. Anders:
```bash
railway up            # of: trigger een redeploy in het dashboard
```

### 3. Wacht tot de deploy READY is en de healthcheck (`/api/agents`) slaagt.
> LET OP: "deploy READY" bewijst alléén dat de app draait — **niet** dat semantische
> recall werkt. Dat doet stap 4.

### 4. ✅ VERIFIEER met live bewijs  *(het enige wat telt)*
Roep het speciaal hiervoor gebouwde endpoint aan (`<APP_URL>` = je Railway-URL):
```bash
curl -s https://<APP_URL>/api/embeddings/health
```
**Verwacht bij succes:**
```json
{"enabled":true,"ok":true,"model":"text-embedding-004","dimensions":768}
```
- `"enabled":true`  → de key is aangekomen in de app.
- `"ok":true`       → er is een **echte** embed-call gedaan en het endpoint antwoordde.
- `dimensions`      → aantal vectordimensies (bewijs dat er echt vectoren terugkomen).

**Foutbeelden en wat ze betekenen:**
| Antwoord | Betekenis | Actie |
|---|---|---|
| `{"enabled":false}` | Key niet aangekomen | Env-var + spelling `EMBEDDINGS_API_KEY` checken, redeploy |
| `{"enabled":true,"ok":false,...}` | Key gezet, maar endpoint faalt (verkeerde base-url/model/key) | `EMBEDDINGS_BASE_URL` + `EMBEDDINGS_MODEL` + key nakijken |

Pas bij `{"enabled":true,"ok":true,...}` is de deploy écht gelukt. De chat werkt in
alle gevallen door (bij `ok:false` gewoon via lexicale recall).

---

## Deel C — Terugdraaien (zero-risk)

Semantische recall uitzetten? Verwijder de variabele en redeploy:
```bash
railway variables --unset EMBEDDINGS_API_KEY
```
De app draait dan weer 100% op de (geteste) lexicale recall. Geen datamigratie,
geen schemawijziging — er is niets te herstellen.

---

## Kosten & governance

- Embeddings draaien op een **aparte, gratis** provider — ze raken het Anthropic
  `DAILY_TOKEN_LIMIT` niet. Herinneringen worden bovendien **gecached**, dus
  dezelfde tekst wordt maar één keer geëmbed.
- Ongewijzigd t.o.v. de bestaande deploy-gids (`docs/deployment.md`): zet
  `DB_PATH` op een persistent volume en draai **één** instance. Deze deploy verandert
  daar niets aan.

## Definitie van "klaar"

Klaar = `GET /api/embeddings/health` geeft `{"enabled":true,"ok":true,...}` op de
live-URL. Niet "deploy READY", niet "geen fout gezien" — een groen health-antwoord.
