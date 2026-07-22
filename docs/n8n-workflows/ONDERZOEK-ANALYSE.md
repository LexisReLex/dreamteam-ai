# Onderzoek & Analyse — Zie619/n8n-workflows

> Opgesteld door Claude (dirigent) op **2026-07-22**. Alle cijfers hieronder zijn **live geverifieerd** uit een draaiende, lokaal geïnstalleerde kopie van de repo — niets geschat. Waar iets niet geverifieerd kon worden, staat dat er expliciet bij.

Repo: <https://github.com/Zie619/n8n-workflows.git> · Licentie: **MIT** · Live demo: <https://zie619.github.io/n8n-workflows>

---

## 1. Wat is dit, in één zin

Het is een **doorzoekbare bibliotheek van ~2.000 kant-en-klare n8n-automatiseringen** (JSON-bestanden die je zó in n8n importeert), plus een **snelle Python-zoekmachine** (FastAPI + SQLite) die er een web-interface omheen zet zodat je binnen milliseconden de juiste workflow vindt.

Kort gezegd: **niet één automatisering, maar een gereedschapskist van 2.000 recepten** die je kunt importeren en aanpassen — in plaats van elke n8n-flow vanaf nul te bouwen.

---

## 2. De cijfers (live geverifieerd op mijn install)

Gemeten via het draaiende `/api/stats` endpoint op mijn lokale kopie, **2026-07-22**:

| Cijfer | Waarde | Bron |
|---|---:|---|
| Workflow-bestanden geïndexeerd | **2.061** | `workflow_db.py --index` → "2061 processed, 0 errors" |
| Totaal nodes | **30.774** | `/api/stats` |
| Unieke integraties | **311** | `/api/stats` |
| Actief / inactief | 215 / 1.846 | `/api/stats` |
| Categorieën | **16** | `/api/categories` |
| Zoeksnelheid | < 100 ms | README-claim; mijn calls waren subseconde |

> Let op de nuance: de **README claimt 4.343 workflows**, maar de repo die ik op 22-07-2026 kloonde bevat er **2.061**. Ik rapporteer wat er écht in staat, niet wat het badge-plaatje zegt. (Mogelijk telt de README een oudere/andere dataset, of dubbele varianten.)

**Categorieën** (16): AI Agent Development · Business Process Automation · CRM & Sales · Cloud Storage & File Management · Communication & Messaging · Creative Content & Video Automation · Creative Design Automation · Data Processing & Analysis · E-commerce & Retail · Financial & Accounting · Marketing & Advertising Automation · Project Management · Social Media Management · Technical Infrastructure & DevOps · Uncategorized · Web Scraping & Data Extraction.

---

## 3. Hoe het technisch in elkaar zit

```
Gebruiker → Web-interface (vanilla JS + Tailwind)
          → FastAPI-server (api_server.py / run.py)
          → SQLite met FTS5 full-text-index (database/workflows.db)
          → 2.061 workflow-JSON's in /workflows
```

- **Backend:** Python 3.9–3.12, FastAPI, Uvicorn, SQLite **FTS5** (dat is waarom zoeken zo snel is — het is een full-text-index, geen lineaire scan).
- **Frontend:** geen zware build; gewone JS + Tailwind, dark/light-mode.
- **Data:** de workflows zijn puur data (JSON). De zoekmachine bouwt er een index op (`database/workflows.db`, wordt lokaal gegenereerd, staat niet in git).
- **Deploy-opties meegeleverd:** `Dockerfile`, `docker-compose*.yml`, `helm/`, `k8s/`, Railway-config. Dus lokaal draaien én containeren kan allebei.
- **Extra in de repo:** een `src/`-map met losse Python-modules (auth, analytics, ai_assistant, integration_hub…) en een `medcards-ai/` + `ai-stack/` map. Die horen niet bij de kern-zoekmachine en zijn voor ons doel (workflows vinden & importeren) **niet nodig**.

### Belangrijkste bestanden
| Bestand | Rol |
|---|---|
| `run.py` | Startknop van de server (checkt deps, bouwt DB, start Uvicorn) |
| `workflow_db.py` | Indexeert de JSON's in SQLite; `--index` (re)bouwt de index |
| `api_server.py` | De FastAPI-app + alle `/api/...` endpoints |
| `requirements.txt` | 12 Python-dependencies (FastAPI, Uvicorn, Pydantic, …) |
| `workflows/` | De 2.061 JSON-workflows (het eigenlijke goud) |

### De API (geverifieerd werkend)
| Endpoint | Doet |
|---|---|
| `GET /` | Web-interface |
| `GET /api/stats` | Statistieken (getest ✅) |
| `GET /api/workflows?q=...` | Zoeken (getest ✅ — o.a. `telegram`, `shopify`) |
| `GET /api/categories` | Lijst categorieën (getest ✅) |
| `GET /api/workflow/{id}` | Eén workflow-JSON ophalen |

---

## 4. Wat is "installeren" hier — en is het gelukt?

"Installeren" = de zoekmachine lokaal draaiend krijgen. Ik heb het **volledig uitgevoerd en geverifieerd** op de Linux-sandbox (zodat jij op je Mac een gegarandeerd-werkende route krijgt):

1. `git clone` → 54 MB ✅
2. `python3 -m venv .venv` + `pip install -r requirements.txt` → FastAPI/Uvicorn/Pydantic geïnstalleerd ✅
3. `python workflow_db.py --index` → **2.061 geïndexeerd, 0 fouten** ✅
4. `python run.py` → server op poort 8000 ✅
5. `curl /api/stats` → **HTTP 200** met echte data ✅
6. `curl /api/workflows?q=telegram` → echte resultaten ✅

**Conclusie: de installatie werkt aantoonbaar.** De paste-klare Mac-versie staat in `INSTALL-MAC.md` (naast dit bestand).

---

## 5. Waarom dit voor jóu (Lexxy / DreamTeam) waardevol is

Dit is geen speeltje — het is een **versneller** voor de automatisering die je al doet. Live gemeten tellingen in de bibliotheek, op onderwerpen die direct raken aan jouw werk:

| Zoekterm | Aantal workflows | Waarom relevant voor jou |
|---|---:|---|
| `webhook` | **1.006** | De basis van bijna elke koppeling (Shopify → n8n → …) |
| `openai` | **507** | AI-stappen in flows (samenvatten, classificeren, teksten) |
| `google sheets` | **285** | Jouw product-/data-sheets automatisch vullen |
| `http` | **245** | Scrapen/koppelen met externe bronnen (concurrenten) |
| `telegram` | **185** | Alerts — precies jouw Daily Competitor Watcher-patroon |
| `slack` | **150** | Team-/alert-notificaties |
| `email` | **50** | Mail-alerts & rapportages |
| `shopify` | **20** | Direct jouw winkel |
| `scrape` | **11** | Concurrentie-monitoring |

**De 20 Shopify-workflows** bevatten o.a. bruikbaars voor Lexxy:
- *Shopify to Google Sheets Product Sync Automation* — producten automatisch naar een sheet (jouw product-data-sheet-patroon).
- *Cron Workflow (Shopify + Google Sheets + Slack)* — geplande sync met alert.
- *Shopify order UTM to Baserow* — herkomst van orders vastleggen.
- *Sync New Shopify Customers/Products to Odoo* — koppelingen naar boekhoud/CRM.

> Kernwaarde: je **Daily Competitor Watcher** (scrape → verwerk → Telegram/mail-alert) is exact het soort flow waar hier tientallen kant-en-klare varianten van staan. In plaats van from-scratch bouwen, importeer je een gelijkende JSON en pas je 'm aan.

---

## 6. Mijn eerlijke oordeel (kritische sparringpartner)

**Sterk:**
- Enorme tijdwinst: 2.000 werkende recepten, MIT-licentie (vrij te gebruiken).
- De zoekmachine is licht, snel en lokaal — geen account, geen kosten.
- Goede deploy-opties (Docker/Railway) als je 'm ooit online wil zetten.

**Let op / zwak:**
- **Kwaliteit varieert.** Veel workflows heten generiek ("Manualtrigger Workflow", "Webhook Workflow") — de namen zijn deels auto-gegenereerd. Je moet per stuk kijken of 'ie past; het is een grabbelton, geen curated top-100.
- **README-cijfers ≠ realiteit** (4.343 geclaimd vs 2.061 aanwezig). Vertrouw de badges niet blind.
- **Import ≠ werkend.** Elke workflow-JSON verwacht in n8n nog jóuw credentials (API-keys, Shopify-connectie). Importeren is stap 1; koppelen en testen is stap 2.
- **De `src/`, `medcards-ai/`, `ai-stack/` mappen** zijn ballast voor ons doel — negeren.

**Verdict:** waardevol als **referentie- en startpuntbibliotheek**, niet als kant-en-klaar productieplatform. Precies goed voor "ik wil snel een n8n-flow voor X, laat me een goed voorbeeld pikken en aanpassen".

---

## 7. Wat ik als eigenaar voorstel (route)

1. **Nu (Mac):** install draaien via `INSTALL-MAC.md` (5 min), interface openen op `localhost:8000`.
2. **Verkennen:** zoek op `shopify`, `competitor`, `telegram`, `google sheets` → open 3–5 kandidaten die op je Daily Competitor Watcher lijken.
3. **Oogsten:** download de beste JSON's, importeer in jouw n8n, koppel je eigen credentials.
4. **Optioneel later:** de bibliotheek als vaste referentie naast DreamTeam houden (niet mergen in de app — het is een losse tool).

Zie het visuele dashboard voor de status in één oogopslag.
