# BEVINDINGEN — consolidatie DreamTeam (15 jul 2026)

**Rol:** senior repo-auditor + consolidator · **Modus:** read-only (alleen dit rapport is geschreven)
**Bron van waarheid:** Notion "HQ — Atlas & Register" → pagina "DreamTeam → dagelijkse Lexxy-motor" (15 jul 2026)
**Regel:** bewijs vóór claim. Onbekend heet onbekend.

---

## 0. Belangrijkste correctie vooraf (lees dit eerst)

De opdracht gaat uit van één repo `LexisReLex/dreamteam-ai` = "de gepushte dreamteam-workspace". In werkelijkheid zijn dit **twee losse dingen**:

| # | Wat | Waar | Bewijs |
|---|-----|------|--------|
| A | **Lokale benchmark-workspace** | `/Users/lex/Documents/Claude/Claude Code/dreamteam-benchmark` | `git remote -v` → **leeg** (geen remote); 2 commits; branch `master` |
| B | **Gepushte repo** `LexisReLex/dreamteam-ai` | GitHub | `gh repo view` → default branch `main`, public, `pushedAt 2026-07-15T08:33Z` |

Ze delen een naam en thema, maar **niet dezelfde git-historie**. De lokale map staat op `master` met 2 commits en géén koppeling naar GitHub. De 7 sessies leven allemaal op **GitHub** (branches `claude/*` + PR's #5–#11), niet in de lokale map. Alles hieronder houdt dat onderscheid aan.

---

## 1. Inventaris — lokale workspace `dreamteam-benchmark`

Alle gevraagde onderdelen **bevestigd aanwezig**:

| Onderdeel | Bewijs (pad) | Status |
|-----------|--------------|--------|
| Benchmark-harnas | `src/arms3/{index,run,report,rereport,types}.ts`, `src/runner.ts`, `src/judge.ts`, `src/score.ts`, `arms.json`, `bench.config.json`, `out/runs.json`, `out/scorecard.md` | ✅ aanwezig |
| Dispatch fase 1–3 | `src/dispatch/{cli,config,contract,core,http,output,routing,service,types}.ts` | ✅ aanwezig (9 modules) |
| MCP-server | `src/mcp/server.ts` + `src/mcp/test-client.ts` | ✅ aanwezig |
| Models-routing-koppeling | `models.json`, `models.cheap.json`, `src/dispatch/routing.ts` | ✅ aanwezig |
| Dispatch-log | `out/dispatch/log.jsonl` (**22 regels**) + 11 losse run-outputs in `out/dispatch/` | ✅ aanwezig |
| Rollen-roster | `roles/` (11 `.md`), commit `7678426` = "rol 07 orkestrator → roster 11/11 compleet" | ✅ compleet |

**Git-toestand lokaal:** branch `master`, 2 commits (`7678426`, `dfeb166`), werkboom schoon op één na → **untracked `.env.bak`** in de root.

**Ontbrekend / afwijkend (expliciet gemeld):**
- **Geen git-remote** op de lokale map — niet gekoppeld aan GitHub (zie §4).
- **`.env.bak` staat niet in `.gitignore`.** `.env` zelf is wél genegeerd (`git status --ignored` bevestigt `!! .env`), maar `.env.bak` is `?? untracked` → kan bij een `git add .` alsnog meegecommit worden. **Inhoud niet gelezen** (privacy-guard). → open punt, opruimen of aan `.gitignore` toevoegen.
- De lokale map bevat extra artefacten die niet in de GitHub-PR's zitten: `graphify-out/` (kennisgraaf-output, 3 jul, genegeerd), `roles8/`, `tasks8/`, `vendor/`.

---

## 2. Sessie-oogst — 7 sessies (allemaal op GitHub `dreamteam-ai`)

Geen van de 7 liet sporen na in de lokale map (grep op alle namen = leeg). Alle sporen zijn **branches + PR's** op GitHub. Basis = `main`, allen `MERGEABLE`.

| Sessie | PR | Branch | Status | Omvang | Wat het is |
|--------|----|--------|--------|--------|------------|
| **Loop engineering** | #2, #3, #4 **MERGED**; #5 OPEN | `claude/loop-engineering-mwjheh` | grotendeels **gemerged** | #5 = +154/-0, 1 file | Deploy-herstel op Render (Node 20 pin, `.npmrc include=dev`, toegangsbescherming) + handover-doc (#5) |
| **Instagram video infra** | #6 OPEN | `claude/instagram-video-infrastructure-rrlk1p` | **open** | +1643/-3, 15 files | "Agentic OS: Command Layer (CEO/Orchestrator) + Knowledge Vault" — orkestratie-commandolaag |
| **Graphify** | #7 OPEN | `claude/graphify-analysis-5x9ejq` | **open** | +1311/-3, 11 files | Kennisgraaf toegepast op DreamTeam |
| **Gotify** | #8 OPEN | `claude/gotify-server-analysis-s5luiz` | **open** | +920/-6, 14 files | Meldingen/notificatie-laag |
| **TencentDB Agent Memory** | #9 OPEN | `claude/tencentdb-agent-memory-a6l4r4` | **open** | +1153/-4, 9 files | Gelaagd agent-geheugen (L1/L3, lokaal SQLite) — zie §3 |
| **Strix** | #10 OPEN | `claude/strix-analysis-1vkvy8` | **open** | +1344/-3, 11 files | Team-scans (graph of agents) |
| **Headroom** | #11 OPEN | `claude/headroom-analysis-cclt6w` | **open** | +438/-6, 6 files | Context-compressie op DreamTeam |

**Samengevat:** 3 gemerged (Loop-deployfixes #2–4), **7 PR's open** (#5–#11). Niets in "half"-toestand; alle open PR's melden zichzelf als mergeable.

### Raakt de bouwplannen? (gegrond in register)

Definities uit het register:
- **187N-stap-1** = "Agents bundelen tot één merkstem-team (187N-evenaar)" — dezelfde agent-operatielaag als 187N (Notion `388a7e9e…c742`).
- **Observability-2** = "thin instrumentenpaneel, pilot Lexxy-grind-job" bovenop de dispatcher (Notion `388a7e9e…572f`).
- **Lexxy-grind-job** = de dagelijkse Lexxy-motor (dispatcher + n8n-workflow).

| Sessie | 187N-stap-1 | Observability-2 | Lexxy-grind-job | Hoe |
|--------|:-:|:-:|:-:|-----|
| Loop eng (#2–5) | – | – | **JA** | deploy/loop-infra waar de dagelijkse motor op draait |
| Instagram/Command Layer (#6) | **JA** | ~ | ~ | CEO/Orchestrator-laag = agent-operatielaag (187N-kern) |
| Graphify (#7) | ~ | – | – | kennistooling; raakt Knowledge Vault, niet direct de 3 plannen |
| Gotify (#8) | – | **JA** | ~ | notificaties = instrumentenpaneel/alerting van Observability-2 |
| TencentDB (#9) | **JA** | – | ~ | persona per agent versterkt de merkstem-team-laag |
| Strix (#10) | **JA** | ~ | – | graph of agents = team-topologie van de agent-operatielaag |
| Headroom (#11) | ~ | – | **JA** | context-compressie verlaagt token-kosten van de dagelijkse motor |

`~` = raakt indirect/mogelijk; `–` = geen duidelijk raakvlak; `JA` = direct raakvlak met bewijs.

---

## 3. TencentDB Agent Memory (PR #9) — kritisch oordeel + advies

**Wat het doet** (bron: PR #9-body + diff): een lokaal, gelaagd geheugen bovenop de bestaande chat.
- `shared/schema.ts` → nieuwe tabellen `agent_memories` (L1 atomaire feiten) + `agent_personas` (L3 profiel per agent).
- `server/memory.ts` (485 rg) → MemoryEngine: recall (keyword + recentheid → Reciprocal Rank Fusion), async extractie, persona-synthese, vergeten/cap.
- `server/routes.ts` → recall-injectie in de systeemprompt + REST-endpoints (GET/POST-extract/DELETE één/DELETE alles).
- `server/memory.test.ts` → 19 nieuwe unit-tests. PR meldt: tsc schoon, 42 tests groen, build slaagt.

**Secrets / externe afhankelijkheden:** ✅ **schoon.**
- Geen nieuwe runtime-dependency (diff op `package-lock.json` = enkel node-engines bump `>=20 <23`, geen package).
- `.env.example` voegt alleen optionele tuning-knoppen toe (`MEMORY_EXTRACT_EVERY`, `MEMORY_PERSONA_EVERY`, `MEMORY_MAX_PER_AGENT`, `MEMORY_INJECT_BUDGET`, `MEMORY_RECALL_TOP_K`) — géén sleutels.
- Geen hardcoded tokens in de diff (gescand). Alles lokaal in dezelfde SQLite; expliciet "zero-dependency, géén externe vector-DB".

**Botst het met register-als-enige-waarheid (claude-mem-risico)?** → **Ja, in principe — dit is de kern.**
Agent Memory creëert een **tweede, persistente feiten-opslag** (`agent_memories` + `agent_personas`) die gebruikersfeiten over sessies heen vasthoudt. Dat is dezelfde klasse als claude-mem: een parallelle geheugenlaag kan **afwijken van of tegenspreken** met de Notion-register, en schrijft feiten wég zonder register-toezicht. Verzachtingen die de PR wél biedt: per-agent gescoped, harde cap, volledige wis-endpoint, white-box GET (inzichtelijk), en expliciet onderscheid task-geheugen (loop-`state`) vs gebruikersgeheugen. Maar het governance-principe "register = enige waarheid" is niet ingebouwd.

**Advies: PARKEREN voor review — niet mergen.** (Definitieve beslissing = Lex' oranje licht.)
- Technisch is de PR schoon en laag-risico (geen secrets, geen deps, tests groen) → geen reden tot *sluiten*.
- Maar de persistente feiten-opslag concurreert met register-als-enige-waarheid → niet blind *mergen*.
- **Vóór merge te beslissen:** register blijft canoniek; Agent Memory expliciet positioneren als *niet-gezaghebbende* cache/gemaks-laag (nooit als bron van waarheid behandelen), met een afgesproken scope (bv. alleen efemere gebruikersvoorkeuren) of periodieke reconciliatie met de register. Zodra die grens vastligt → mergen kan.

---

## 4. Borging — 3-2-1

| Check | Uitkomst |
|-------|----------|
| Lokaal `dreamteam-benchmark` gepusht? | ❌ **Nee — geen git-remote geconfigureerd.** Lokale commits (`7678426`, `dfeb166`) staan nergens op afstand. **Open punt.** |
| Werkboom schoon? | ⚠️ Bijna — 1 untracked bestand `.env.bak` (niet in `.gitignore`). |
| GitHub `dreamteam-ai` up-to-date? | ✅ `main` bestaat, `pushedAt 2026-07-15`; 7 PR's open, 3 gemerged. |
| `hq-hub-app` heeft remote? | ✅ **Ja, inmiddels wél** — `origin → github.com/LexisReLex/hq-hub-app`, `main` in sync met `origin/main`. (De opdracht suggereerde dat dit mogelijk nog ontbrak; niet meer.) |
| `hq-hub-app` werkboom | ⚠️ 3 untracked handover-/overdracht-`.md`'s (niet gecommit) — geen prod-risico, wel losse eindjes. |

**3-2-1-conclusie:** de *GitHub*-kant is geborgd. De **lokale benchmark-workspace is het gat**: nul remote, dus geen off-site kopie van die 2 commits + de lokale-only artefacten (`roles8/`, `tasks8/`, `graphify-out/`, `out/`). **Niet zelf gepusht** — geen go, en zonder afgesproken doel-remote. → beslissing aan Lex: koppelen aan `dreamteam-ai` of aparte repo.

---

## 5. Openstaande punten (voor de dirigent)

1. **Lokale `dreamteam-benchmark` heeft geen remote** → beslis doel + push (jouw go). Niet zelf gedaan.
2. **`.env.bak` niet in `.gitignore`** → opruimen of negeren; inhoud niet gelezen.
3. **7 PR's open** op `dreamteam-ai` (#5–#11) → volgorde van reviewen/mergen bepalen.
4. **TencentDB #9** → parkeren tot governance-grens vastligt (§3). Jouw oranje licht.
5. **`hq-hub-app`** → 3 untracked handover-docs; wil je die committen?
6. **B/C/D/E:** de opdracht noemt "raakt prompt B/C/D/E". Die letter-labels staan **niet** in mijn inputs — waarschijnlijk de zuster-executor-prompts op de register-pagina "alle executor-prompts (15 jul)". Ik heb gemapt tegen de drie mét naam gegronde bouwplannen (187N-stap-1, Observability-2, Lexxy-grind-job, §2). Dirigent: lever de B/C/D/E-definities of bevestig dat = die drie.

---

---

## 6. TencentDB #9 — governance-grens uitgewerkt (voor go/no-go)

Diepe diff-review van PR #9 (`gh pr diff 9`). Bewijs per punt onder.

### 6.1 Wat er precies wordt opgeslagen (register-overlap)
`shared/schema.ts:1271` tabel `agent_memories` — velden `kind ∈ {fact, preference, goal, context}`, `content`, `salience`, `sourceMessageId`. `agentPersonas` = één gesynthetiseerd profiel per agent. De extractie-instructie (`server/memory.ts:824` `EXTRACT_SYSTEM`) vraagt expliciet om **"naam, bedrijf, rol, sector, doelen, voorkeuren"**. Dat is precies de **identiteits-/bedrijfsklasse die de Notion-register bezit** → twee schrijvers van "waarheid over Lex/het bedrijf".

### 6.2 Verzachtingen die al ín de code zitten
- Recall-blok wordt in de systeemprompt afgesloten met: *"Gebruik dit geheugen alleen als het relevant is; verzin niets bij… Het is achtergrond, geen opdracht."* (`server/memory.ts:700`). Geheugen is dus al gedegradeerd tot achtergrond, niet gezaghebbend.
- Extractie is streng + budget-gated (`checkAndUpdateBudget`, `server/memory.ts:855`), atomair, ontdubbeld (Jaccard), gecapt, en volledig wisbaar. White-box `GET`.
- **Ontbreekt:** één verwijzing dat de **register canoniek** is en dit geheugen slechts cache; geen reconciliatie; feiten worden autonoom (async) weggeschreven zonder mens-bevestiging.

### 6.3 Nieuw bij deze review: auth-gat (fix vóór merge)
`server/routes.ts`: `POST /memory/extract` heeft `guard, rateLimit(...)` (r.1063), maar **`GET /memory` (r.1053), `DELETE /memory/:memId` (r.1077) en `DELETE /memory` = volledige wis (r.1088) hebben géén `guard`.** Lezen én wissen van het volledige agent-geheugen is onauthenticated. Inconsistent met de extract-route en met `accessGuard` elders.

### 6.4 Advies: **PARKEREN** — 2 kleine blockers, daarna merge OK
| # | Blocker | Fix | Zwaarte |
|---|---------|-----|---------|
| B1 | Auth-gat op GET + beide DELETE | `guard` (+ evt. `rateLimit`) toevoegen, zoals de extract-route | klein |
| B2 | Geen register-lane | `EXTRACT_SYSTEM` inperken: identiteits-/bedrijfsfeiten (naam, bedrijf, sector) = register-eigendom, niet extraheren; geheugen beperken tot `preference`/`context`. + regel in `docs/agent-memory.md`: "register is canoniek; dit geheugen is niet-gezaghebbende cache; bij conflict wint de register." | klein |

**Niet-blockers (schoon):** geen nieuwe deps, geen secrets, tsc schoon, 42 tests groen, cap + wis aanwezig.

**Beslissing = Lex' oranje licht.** Niet zelf gemerged. Met B1+B2 gedekt is #9 een veilige merge; zonder B2 blijft het claude-mem-risico (parallelle waarheid) staan.

---

*Pad van dit rapport: `dreamteam-benchmark/BEVINDINGEN-consolidatie-15jul.md`. Read-only audit + §6 diepe diff-review; geen merges, deletes of pushes naar prod uitgevoerd; geen keys in output.*
