# Visuele review & afrondlijst — Agentic OS (Command Layer + Knowledge Vault)

> Runbook om alles zelf visueel te bekijken, plus een to-do checklist om het af te ronden.
> Branch: `claude/instagram-video-infrastructure-rrlk1p`. We pakken dit later samen weer op.

---

## 1. Snel lokaal draaien (5 minuten)

```bash
# 1. Node 20 (zie .node-version), daarna dependencies
npm install

# 2. Zet je API-key in .env  (kopieer eerst .env.example)
cp .env.example .env
#   en vul in:
#   ANTHROPIC_API_KEY=sk-ant-...
#   (optioneel, sterker CEO-brein:  ORCHESTRATOR_MODEL=claude-sonnet-5 )

# 3. Start (client + server op één poort)
npm run dev
```

Open daarna **http://localhost:5000**. De app gebruikt hash-routing, dus je kunt direct naar:

- Command Center → **http://localhost:5000/#/command**
- Knowledge Vault → **http://localhost:5000/#/vault**
- Dashboard / Team / Loops → `#/dashboard`, `#/agents`, `#/loops`

> Zonder geldige `ANTHROPIC_API_KEY` werkt de UI en de Knowledge Vault gewoon, maar een
> orchestratie eindigt in status `error` (de model-calls falen). De retrieval/READS werkt wél
> zonder key, want die draait vóór de model-call.

### Database resetten (opnieuw seeden)
```bash
rm -f data.db data.db-wal data.db-shm   # dev gebruikt een lokaal SQLite-bestand
npm run dev                              # seedt agents, taken en 3 kennisbronnen opnieuw
```

---

## 2. Wat te bekijken per scherm

### Command Center (`#/command`)
- [ ] Het **Agent Network**: CEO/Orchestrator bovenaan met de stats **Routes · Reads · Opdrachten · Model**,
      daaronder de 5+ specialisten als kaarten.
- [ ] Typ een opdracht (of klik een voorbeeld) → **Verstuur naar CEO**.
- [ ] Kijk of de kaarten **live** oplichten: CEO `working` (plannen) → specialisten één voor één
      `working` → `done` → CEO `working` (bundelen) → **operator-debrief**.
- [ ] Open een specialist-bijdrage (klik erop) en lees de losse output.
- [ ] Controleer de **Routing van de CEO** (welke agent kreeg welke deeltaak) en de debrief.
- [ ] Onderaan: **Recente opdrachten** — klik er een aan om 'm terug te zien.

### Knowledge Vault (`#/vault`)
- [ ] De 3 geseede bronnen staan er (Bedrijfsprofiel, Tone of voice, Aanbod & prijzen).
- [ ] Voeg een eigen bron toe (titel + inhoud + labels) → verschijnt in de lijst.
- [ ] Ga terug naar Command Center, geef een opdracht die met die bron te maken heeft,
      en check dat de **Reads**-teller op de CEO-kaart oploopt.
- [ ] Verwijder een bron en bevestig dat 'ie weg is.

---

## 3. Status — wat is af ✅

- [x] **Command Layer / CEO-Orchestrator**: plan → dispatch → synthese (operator-debrief)
- [x] **Live status per specialist** (async run + polling, `currentAgentId`)
- [x] **Governance**: gedeeld token-budget, rate limiting, begrensde fan-out, robuuste plan-parsing
- [x] **Modellen per laag** instelbaar (`ORCHESTRATOR_MODEL` / `SPECIALIST_MODEL`)
- [x] **Knowledge Vault (RAG/READS)**: opslag, keyword-retrieval, injectie in prompts, READS-stat, UI
- [x] **Tests**: 48 groen · `tsc` schoon · `npm run build` OK
- [x] Docs: `docs/orchestrator.md`, dit runbook

---

## 4. To-do om het echt "af" te maken

### Must — om te valideren
- [ ] `ANTHROPIC_API_KEY` zetten en één echte orchestratie draaien (zie stap 1).
- [ ] Vul de Vault met **jouw** echte bedrijfscontext (merkstem, aanbod, doelgroep, FAQ).
- [ ] Beoordeel of de **routing** klopt: kiest de CEO de juiste specialisten voor jouw type opdrachten?
- [ ] Beoordeel de **debrief-kwaliteit**. Te dun? Zet `ORCHESTRATOR_MODEL` op een sterker model.

### Should — kwaliteit & robuustheid
- [ ] **Persistente DB op deploy**: zet `DB_PATH` op een gemount volume (Railway), anders zijn
      orchestraties/kennis weg na een redeploy. Zie `.env.example`.
- [ ] **Toegangsbescherming** aanzetten voor de dure endpoints (`ALLOWED_ORIGINS` / `API_ACCESS_TOKEN`).
- [ ] **Orphaned runs**: bij een redeploy midden in een run blijft een orchestratie op `dispatching`
      staan (in-proces, net als de loops). Overweeg een kleine job-queue of een "stale → error" opruimer.
- [ ] Debrief als **echte markdown** renderen (nu pre-wrapped tekst) voor mooiere opmaak.

### Could — dichter naar de video
- [ ] **Echte embeddings** i.p.v. keyword-retrieval in de Vault (semantische RAG).
- [ ] De overige nav-items uit de screenshot: **Lead Pipeline**, **Content Analytics**, **Schedule**, **Tools**.
- [ ] **Streaming** van de debrief-tekst (token-voor-token) i.p.v. in één keer.
- [ ] Orchestratie koppelen aan **Agent Loops** (een loop die periodiek een orchestratie triggert).

---

## 5. Bekende beperkingen (nu bewust zo)

- Retrieval is **keyword**, niet semantisch — snel en dependency-vrij, maar mist synoniemen.
- Orchestraties draaien **in-proces op de achtergrond** (zoals de loop-scheduler): geen queue,
  vluchtig bij redeploy zonder persistent volume.
- Modellen staan standaard op `claude-haiku-4-5` (bewezen, goedkoop). Upgrade het CEO-brein via env.
- Alle model-calls vallen onder het **gedeelde dagelijkse token-budget** (`DAILY_TOKEN_LIMIT`).

---

## 6. Waar de code staat

| Laag | Bestanden |
|------|-----------|
| Command Layer | `server/orchestrator.ts`, `server/routes.ts` (`/api/orchestrate`, `/api/orchestrations`, `/api/orchestrator`) |
| Knowledge Vault | `server/knowledge.ts`, `server/storage.ts`, `server/routes.ts` (`/api/knowledge`) |
| Data | `shared/schema.ts` (tabellen `orchestrations`, `orchestration_steps`, `knowledge`) |
| UI | `client/src/pages/Command.tsx`, `client/src/pages/Vault.tsx`, `client/src/components/Sidebar.tsx` |
| Docs | `docs/orchestrator.md`, `docs/VISUAL-REVIEW.md` (dit bestand) |
| Tests | `server/orchestrator.test.ts`, `server/knowledge.test.ts` |
