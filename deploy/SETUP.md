# Dispatch live-zetten — named Cloudflare-tunnel + launchd (€0-route)

Zet de bewezen dispatch-stap live: n8n-cloud → **vaste** Cloudflare-URL → tunnel →
thin HTTP-endpoint op de Mac (`src/dispatch/http.ts`) → dispatch-core (voice + span + eval).
Venster gaat dagelijks **net vóór** de run open en **30 min** later weer dicht.

Twee placeholders vul je één keer in:
- `TUNNEL_HOSTNAME` — je subdomein op je Cloudflare-domein, bv. `dispatch.jouwdomein.nl`
- `RUN_TIME` — het tijdstip van workflow `Mr4j7huAH2vu1SrA` (Schedule-trigger)

Regels die blijven gelden: key uit `.env` (nooit in workflow-JSON) · cheap-tier ·
geen andere n8n-nodes wijzigen.

---

## Stap A — Cloudflare login (jij, interactief)

Opent de browser; kies daar je zone/domein. Draai in deze sessie met `!` zodat de
output hier landt:

```
! cloudflared tunnel login
```

Resultaat: `~/.cloudflared/cert.pem`.

## Stap B — Named tunnel aanmaken

```
! cloudflared tunnel create dispatch-mac
```

Geeft een **UUID** terug en schrijft `~/.cloudflared/<UUID>.json`.

## Stap C — config.yml invullen

Bewerk `deploy/cloudflared/config.yml`:
- `<TUNNEL_UUID>` → de UUID uit stap B (op 2 plekken)
- `<TUNNEL_HOSTNAME>` → je gekozen subdomein

Service-poort staat op `8787` en moet gelijk zijn aan `DISPATCH_HTTP_PORT` in `.env` (is 8787).

## Stap D — DNS-route (vaste URL)

```
! cloudflared tunnel route dns dispatch-mac <TUNNEL_HOSTNAME>
```

Maakt een proxied CNAME → tunnel. Vanaf nu is `https://<TUNNEL_HOSTNAME>` de vaste URL.

## Stap E — Handmatig testen (vóór launchd)

Start endpoint + tunnel los, in twee terminals:

```
! DISPATCH_HTTP_PORT=8787 npm run serve
! cloudflared tunnel --config deploy/cloudflared/config.yml run dispatch-mac
```

Test dan van buitenaf (token uit `.env`, healthcheck heeft geen token nodig):

```
! curl -s https://<TUNNEL_HOSTNAME>/health
```

Verwacht: `{"ok":true,"service":"dispatch-http"}`. Stop beide met Ctrl-C.

---

## Stap F — launchd-venster installeren

De run-tijd bepaalt twee dingen: `START` = **run-tijd − 10 min**.

1. Bewerk `deploy/com.lexxy.dispatch-window.plist`: vul `<START_HOUR>` / `<START_MIN>`
   (bv. run 08:00 → Hour 7, Minute 50).
2. Installeer:

```
! cp deploy/com.lexxy.dispatch-window.plist ~/Library/LaunchAgents/
! launchctl load ~/Library/LaunchAgents/com.lexxy.dispatch-window.plist
```

Het venster: launchd start `dispatch-window.sh` → endpoint omhoog → `/health` groen →
tunnel omhoog → 30 min open → alles netjes gestopt. Logs: `out/dispatch/window.log`
en `out/dispatch/launchd-window.log`.

Handmatig het venster nú testen (zonder op de klok te wachten):

```
! bash deploy/dispatch-window.sh   # draait 30 min; Ctrl-C stopt + ruimt op via trap
```

## Stap G — Mac-wakker-window (pmset)

launchd vuurt alléén als de Mac wakker is. Wek 'm ~12 min vóór de run
(`RUN_TIME − 12 min`), dagelijks. Vereist sudo:

```
! sudo pmset repeat wakeorpoweron MTWRFSU <WAKE_HH:MM:SS>
```

- `wakeorpoweron` = uit slaap wekken **of** aanzetten indien uit.
- Controleren: `pmset -g sched`
- Uitzetten: `sudo pmset repeat cancel`

**Wakker-window samengevat:** wake op `RUN_TIME − 12m` → launchd-start op `RUN_TIME − 10m`
→ venster 30m open → dicht op `RUN_TIME + 20m`. Buiten dit venster mag de Mac slapen;
de endpoint en tunnel draaien dan niet (dat is de bedoeling — €0, geen 24/7).

---

## Verifiëren tijdens de 14-dagen-bewijsperiode

- **n8n**: elke dag een groene execution in workflow `Mr4j7huAH2vu1SrA`.
- **dispatch-log**: nieuwe regel in `out/dispatch/log.jsonl` (met `traceId`, `voice`, `eval`).
- **Sheet**: verrijkt signaal in Google Sheet (Auto-DE).

## Uninstall / rollback

```
! launchctl unload ~/Library/LaunchAgents/com.lexxy.dispatch-window.plist
! rm ~/Library/LaunchAgents/com.lexxy.dispatch-window.plist
! sudo pmset repeat cancel
! cloudflared tunnel delete dispatch-mac   # pas als je de tunnel echt weg wilt
```

## Veiligheid

- Endpoint is **fail-closed**: zonder `DISPATCH_HTTP_TOKEN` in `.env` start hij niet.
- `POST /dispatch` vereist header `x-dispatch-token`; mismatch → 401.
- Catch-all ingress → 404: geen open proxy naar andere lokale poorten.
- OpenRouter-key blijft in `.env` op de Mac; komt **nooit** in de workflow-JSON
  (n8n stuurt alleen `x-dispatch-token` + taak-body).
