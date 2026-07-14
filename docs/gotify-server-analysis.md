# Meldingen in DreamTeam

> Onderzoek → analyse → implementatie van [gotify/server](https://github.com/gotify/server)
> toegepast op het DreamTeam AI-agentplatform.

## 1. Onderzoek — wat is Gotify?

[Gotify](https://gotify.net) is een self-hosted server om **berichten te versturen en
realtime (via WebSocket) te ontvangen**. Het is bewust simpel: een applicatie POST een
bericht naar de REST-API, en verbonden clients krijgen dat bericht meteen binnen. Geen
zware message-broker, geen externe push-provider — één klein server-proces.

### Kernbegrippen

| Gotify-begrip | Betekenis |
|---------------|-----------|
| **Application** | De _bron_ van berichten. Heeft een app-token; stuurt berichten met `POST /message?token=…`. |
| **Message** | Een bericht met `title`, `message`, `priority` (0–10) en optionele `extras`. |
| **Client** | Een _ontvanger_ (bv. de web-UI of Android-app). Opent de WebSocket `GET /stream` en krijgt nieuwe berichten realtime. |
| **Priority** | 0–10. De client vertaalt dit naar urgentie (zie buckets hieronder). |
| **Token-auth** | App-token om te versturen (`X-Gotify-Key` of `?token=`), client-token om te ontvangen. |

### Prioriteits-buckets (zoals de client ze interpreteert)

```
0–1  → min     (geen/stille melding)
2–3  → low      (zichtbaar, geen geluid)
4–7  → normal   (standaardmelding)
8–10 → high     (nadrukkelijk, doorbreekt "niet storen")
```

### Anatomie van de flow

```
Application → POST /message (token) → server slaat op → broadcast → Client(s) via WebSocket /stream
```

## 2. Analyse — hoe past dit op DreamTeam?

De vorige stap ([loop-engineering.md](./loop-engineering.md)) gaf DreamTeam autonome,
zelf-scorende **Agent Loops**. Elke run eindigt met een verdict: `APPROVE`, `REJECT`,
`ESCALATE` of `ERROR`. In het loop-engineering-model is de laatste schakel de **Human
gate** — de mens die ingrijpt als de loop escaleert.

Maar die gate was leeg. Een `ESCALATE` verdween in het runlog; niemand werd gewaarschuwd.
Een loop op cadans `6h` kon dagen om aandacht vragen zonder dat iemand het zag. Precies
hier past Gotify: een lichte laag die **berichten verstuurt en realtime aflevert**.

De vertaling naar dit product:

| Gotify-primitive | Implementatie in DreamTeam |
|------------------|-----------------------------|
| Application (bron) | `source`, bv. `loop:Nova` of `system` |
| Message | Tabel `notifications` (`title`, `message`, `priority`, `link`) |
| Client + `/stream` | De browser via WebSocket `/api/stream` |
| Priority 0–10 | Dezelfde schaal + buckets; verdict → priority |
| App-token | `NOTIFY_TOKEN` op de ingest-endpoint (default uit) |
| `extras` (click-actie) | `link` — in-app route om naartoe te springen |

**Verdict → prioriteit** (zo bereikt de Human gate écht een mens):

| Verdict | Priority | Bucket | Waarom |
|---------|----------|--------|--------|
| `ESCALATE` | 8 | high | Vereist menselijk oordeel |
| `ERROR` | 7 | normal | Er ging iets mis |
| `REJECT` | 5 | normal | Maker faalde de check |
| `APPROVE` | 2 | low | Ging goed, alleen ter info |

## 3. Implementatie

Toegevoegd: een **gotify-geïnspireerd meldingscentrum** met een realtime WebSocket-stream,
gekoppeld aan de loop-engine.

### Server

- `shared/schema.ts` — tabel `notifications` + `insertNotificationSchema` (ingest-validatie).
- `server/storage.ts` — CRUD: lijst, ongelezen-teller, aanmaken, gelezen markeren, wissen.
- `server/notifications.ts` — de kern:
  - `priorityBucket()` / `priorityForVerdict()` — pure, geteste prioriteitslogica.
  - `buildLoopNotification()` — pure builder die een loop-run omzet in een melding.
  - `NotificationHub` — WebSocket-hub (gotify `/stream`) met `noServer: true` zodat het
    níet botst met de Vite-HMR-WebSocket; broadcast naar alle open sockets.
  - `publish()` — dé centrale ingang: persisteren + realtime uitzenden.
  - `notifyTokenGuard` — de gotify-app-token gate (`NOTIFY_TOKEN`, default uit).
- `server/loops.ts` — `finishRun()` publiceert nu een melding per run (best-effort; een
  mislukte melding laat de loop nooit falen).
- `server/routes.ts` — endpoints:
  - `POST /api/message` — gotify-achtige ingest (origin-guard + token-gate + rate-limit).
  - `GET /api/notifications` — lijst + ongelezen-teller.
  - `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`.
  - `DELETE /api/notifications/:id`, `DELETE /api/notifications`.
  - `setupNotificationStream()` — routeert de HTTP-upgrade van `/api/stream` naar de hub.

### Client

- `client/src/hooks/useNotifications.ts` — query voor de lijst + `useNotificationStream()`
  die de WebSocket openhoudt (herverbindt met exponentiële backoff) en bij een nieuwe
  melding de query invalidateert en — vanaf priority ≥ 4 — een toast toont.
- `client/src/pages/Notifications.tsx` — het meldingscentrum: buckets met kleur, gelezen
  markeren, verwijderen, alles wissen, klik-door naar de `link`.
- `client/src/components/Sidebar.tsx` — nav-item **Meldingen** met een ongelezen-badge.
- `App.tsx` — route `/notifications` + de stream mount zolang de app-shell leeft.
- `client/src/lib/i18n.ts` — `nav_notifications` in alle vijf de talen.

### Tests

- `server/notifications.test.ts` — de pure logica: `priorityBucket`, `priorityForVerdict`,
  `buildLoopNotification` en `isNotifyTokenValid` (10 tests).

### Configuratie

| Env var | Effect |
|---------|--------|
| `NOTIFY_TOKEN` | Vereist dit token op `POST /api/message`. Leeg = ingest open (default). |

De laag sluit de loop: een `ESCALATE` van een agent-loop komt nu als high-priority melding
realtime binnen bij de mens — de Human gate is bemand.
