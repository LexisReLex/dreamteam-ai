# HANDOVER — Prompt D (Lexxy grind-job GO-LIVE, €0-route)

> Geschreven door Cowork, 16 juli 2026 ±17:15, omdat Lex ±2,5-3 uur weg moest en dit direct in een nieuwe Claude Code-terminal wil kunnen plakken. Bron van waarheid blijft het register: Notion "🏗️ DreamTeam → dagelijkse Lexxy-motor" (ID 39ea7e9e-8a8d-811f-b421-dcf84065d49e). Dit bestand is de gedetailleerde D-laag daaronder.

## Doel van Prompt D
De bewezen dispatch-stap live zetten in de échte n8n-workflow **Daily Competitor Watcher** (ID `Mr4j7huAH2vu1SrA`, op `lexdegroot.app.n8n.cloud`), via een Cloudflare Tunnel op de Mac (€0-hostingroute, besluit dirigent 15 jul). Twee oranje-lichtmomenten voor Lex staan nog open. Ná 14 dagen groen bewijs: verdict Mac-route houden of naar mini-cloud.

## Wat al AF is (A t/m C, en het begin van D)
- **Prompt A** — repo-audit + consolidatie `dreamteam-ai`: klaar, 3-2-1 dicht.
- **Prompt F** — dispatch-MCP-server aangesloten in Cowork: klaar, 3 tools live (`dispatch_run`/`dispatch_estimate`/`dispatch_seats`).
- **Prompt B** — 187N stap 1, merkstem-team `--voice` (lexxy/degroot/klanttijd/persoonlijk): klaar, gemerged naar master (`305ce68`).
- **Prompt C** — Observability Niveau 2 (span-log + eval-hook + paneel + drift-WARN): klaar, **PR #12 gemerged naar master (`062efce`)**. Poort-regel geverifieerd: `voice`-veld zit aantoonbaar in de span-log (bewijsregel `"seat":"research","voice":"lexxy"`).
- **Domein**: `lxy-dispatch.dev` gekocht via Cloudflare Registrar (±$12,20/jr), automatisch een Cloudflare-zone — geen NS-migratie nodig. Gekozen boven een bestaand domein migreren, om de live Lexxy-shop/e-mail-DNS niet te raken.
- **Workflow-JSON** van de échte n8n-workflow staat lokaal op `deploy/workflow-Mr4j7huAH2vu1SrA.json` (door Cowork zelf geëxporteerd/geplaatst, ná mapctoegang).
- **POORT-check**: `http.ts` loopt door de huidige dispatch-core + voice-passthrough (niet de verouderde 20-jun-sandboxversie) — groen.
- **launchd/wakker-window-bestanden** staan klaar in `deploy/` (`com.lexxy.dispatch-window.plist`, `dispatch-window.sh`, `deploy/cloudflared/`).
- **n8n Schedule Trigger**: geverifieerd rechtstreeks in de workflow-node — **06:45 dagelijks** (niet 07:00/08:00/09:00 zoals eerst voorgesteld).

## Waar we tegenaan liepen — en hoe opgelost
1. **Interactieve `cloudflared tunnel login` schreef geen `cert.pem` weg**, ondanks dat de browser "Success" toonde. Geverifieerd op bestandsniveau (`~/.cloudflared/` was leeg) — grond-waarheid vóór aanname. Vermoedelijke oorzaak: lokaal `cloudflared`-luisterproces ving de callback niet op.
   → **Opgelost door over te stappen op Route B**: een tunnel-token aanmaken via het Cloudflare Zero Trust-dashboard i.p.v. de OAuth-flow. Niet-interactief, betrouwbaarder.
2. **EXTRACT_VELD (n8n Extract-node output-sleutel) onbetrouwbaar uit te lezen via de n8n-UI** (code-editor is virtualized, screenshots/scrollen gaf onvolledig beeld).
   → Opgelost: workflow-JSON geëxporteerd/geplaatst zodat Claude Code de échte broncode rechtstreeks kan lezen i.p.v. UI-scrapen.
3. **Computer-Use/Claude-in-Chrome-verwarring**: Lex dacht dat Sonnet 5 minder zou kunnen dan eerdere Opus 4.8/Fable 5-sessies. Uitgezocht + bewezen met een citaat uit de eigen vault (10 jul, sessie op Fable): dezelfde "Chrome read-tier"-beperking gold toen ook al. Conclusie: geen model-verschil, wel een tool-verschil — **Claude Code (terminal) heeft altijd al directe shell/bestandstoegang gehad, los van het model.** Computer Use kan browsers altijd alléén bekijken, nooit klikken/typen; Claude in Chrome werkt alleen in zijn eigen tabgroep, nooit in Lex' eigen tabbladen of eenmalige login-callbacks.
4. **n8n-sessie in Cowork's browsertab per ongeluk uitgelogd** door een onbevoegde REST-API-probeer-poging. Er verscheen een inlogscherm met wachtwoord vooringevuld — **bewust niet aangeklikt/ingelogd** (hard verbod, login blijft altijd bij Lex). Geen schade, tabblad losgelaten.
5. **Workflow-JSON-download landde niet automatisch op de juiste plek**: Lex downloadde 'm handmatig (in zijn eigen browser), Cowork vond 'm terug in `~/Downloads` (na eenmalige mapctoegang) en kopieerde 'm zelf naar `deploy/workflow-Mr4j7huAH2vu1SrA.json` — geen Finder-werk meer nodig voor Lex.
6. **Herhaalde screenshot-heen-en-weer** rond browserstappen. Opgelost: Cowork heeft nu Computer-Use-toegang (Chrome=alleen-bekijken, Terminal=alleen-klikken) en mapctoegang tot `dreamteam-benchmark/`, `~/Downloads`, `~/.cloudflared` en de vault — kan sindsdien zelf meekijken en bestanden verplaatsen zonder Lex er telkens bij te halen.

## Waar we nu staan (16 jul, ±17:12)
De D-terminal ("Deploy dispatch-endpoint via Cloudflare-tunnel naar n8n") wacht op **3 dashboard-stappen van Lex** (Route B, token-methode):

1. Cloudflare-dashboard → **Zero Trust → Networks → Tunnels → Create tunnel → Cloudflared**, naam: `dispatch-mac`.
2. Run-token kopiëren (begint met `eyJ…`) en in de terminal:
   ```
   echo 'CF_TUNNEL_TOKEN=<GEKOPIEERDE_TOKEN>' > deploy/tunnel.env
   ```
3. Tab **Public Hostname** in hetzelfde tunnel-scherm: hostname `lxy-dispatch.dev`, Service **HTTP** → `127.0.0.1:8787` → **Save**.

Daarna in de terminal typen: `tunnel.env staat, test 'm` (staat al klaar als voorgesteld vervolgbericht).

**Deze 3 stappen waren bij het weggaan van Lex nog NIET gedaan** — dit is het eerstvolgende dat moet gebeuren.

Taken-status (uit de terminal zelf):
- ✅ POORT: http.ts door huidige dispatch-core + voice-passthrough
- ✅ Task 1: named Cloudflare-tunnel + launchd + wakker-window (ínfrastructuur-bestanden klaar; de live tunnelverbinding zelf hangt nog op de 3 stappen hierboven)
- 🟧 ORANJE LICHT 1: HTTP-node in echte workflow `Mr4j7huAH2vu1SrA` — nog niet bereikt
- ⬜ Task 3: handmatige e2e-run — grond-waarheid — nog niet bereikt
- 🟧 ORANJE LICHT 2: schema AAN (dagelijks) + 14-dagen-bewijs start — nog niet bereikt

## Waar we naartoe willen (resterende volgorde)
1. Lex rondt de 3 dashboard-stappen af (hierboven) → tunnel-token leeft.
2. Claude Code test de tunnel, bevestigt dat `dispatch.lxy-dispatch.dev` (of de gekozen hostname) de lokale dispatch-endpoint bereikt.
3. Claude Code bouwt het HTTP-node-blok voor de échte n8n-workflow via **Route 2 (n8n-API, sessie-only token — zie "nog nodig" hieronder)**, print het volledige blok (geen placeholders) — **wacht op Lex' tekstuele go** (= Oranje Licht 1).
4. Ná de go: node via API zetten, dan één handmatige end-to-end-run → bewijs verzamelen (n8n-execution groen + logregel in `out/dispatch/log.jsonl` + signaal in Auto-DE-sheet).
5. Lex geeft tweede tekstuele go → dagelijks schema AAN (Oranje Licht 2) → 14-dagen-bewijsperiode start.
6. Dag 14: verdict Mac-route houden of mini-cloud voorleggen.

## Wat nog nodig is (eerlijke tool-check)
**Hebben we alles?** Bijna — één concreet gat:
- ✅ Cloudflare-account + Zero Trust + domein — aanwezig, alleen de 3 handmatige stappen nog te doen.
- ✅ Terminal/Claude Code met repo-, launchd- en configbestanden — aanwezig en werkend.
- ✅ Notion-register + vault — aangesloten, bijgewerkt.
- ✅ Cowork-mapctoegang (repo, Downloads, .cloudflared, vault) — aanwezig.
- ✅ Computer Use (scherm bekijken) + Claude in Chrome — aangesloten, met bekende grenzen (zie boven).
- ⚠️ **ONTBREEKT NOG: een n8n-API-key/credential.** Voor Route 2 (node via API zetten i.p.v. handmatig in de UI klikken) heeft Claude Code een n8n-API-token nodig. Die is nog niet aangemaakt. Dit moet Lex zelf doen: n8n → Settings → **API** → nieuwe key genereren, en die als env-var/credential aan Claude Code geven (nooit door Cowork laten intypen — dit is een secret, valt onder Lex' eigen "API-keys/secrets"-regel).
  - **Alternatief als dit niet lukt/niet gewenst is**: terugvallen op Route 1 (handmatige UI-paste van de node), met Cowork die meekijkt via Computer Use (alleen-bekijken) en Lex die de daadwerkelijke klik doet.

## To-do-lijst (kort)
- [ ] 3 Cloudflare-dashboardstappen (tunnel-token + public hostname) — **Lex, eerstvolgende actie**
- [ ] `tunnel.env staat, test 'm` in terminal bevestigen
- [ ] n8n-API-key aanmaken (of bewust kiezen voor Route 1 UI-paste)
- [ ] Node-blok laten printen door Claude Code, reviewen
- [ ] Oranje licht 1 — go geven
- [ ] Handmatige e2e-run + bewijs verzamelen
- [ ] Oranje licht 2 — go geven, schema AAN
- [ ] 14-dagen-bewijsperiode volgen → dag-14-verdict

---

## PLAK DIT OM VERDER TE GAAN (nieuwe of bestaande Claude Code-sessie, in `dreamteam-benchmark`)
```
Lees eerst deploy/HANDOVER-prompt-D-16jul.md voor volledige context. We waren bezig met Route B (Cloudflare-tunnel-token). Check of deploy/tunnel.env al bestaat en een geldige CF_TUNNEL_TOKEN bevat:
- Zo nee: herhaal het verzoek aan Lex om de 3 dashboardstappen te doen (Zero Trust → Tunnels → Create tunnel "dispatch-mac" → token kopiëren → deploy/tunnel.env → Public Hostname lxy-dispatch.dev → 127.0.0.1:8787 → Save).
- Zo ja: test de tunnel, bevestig dat de hostname de lokale dispatch-endpoint bereikt, en ga door met het bouwen van het n8n HTTP-node-blok (Route 2, API, sessie-only token — vraag Lex om een n8n-API-key als die nog ontbreekt). Print het volledige blok en wacht op mijn tekstuele go voordat je 'm live zet.
```
