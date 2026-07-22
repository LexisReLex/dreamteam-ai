# Headroom — context-compressie in DreamTeam

> Onderzoek → analyse → implementatie van [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)
> toegepast op het DreamTeam AI-agentplatform.

## 1. Onderzoek — wat is Headroom?

Headroom is een **context-compressielaag voor AI-agents**: _"The context compression
layer for AI agents."_ Het comprimeert alles wat een agent **leest** — tool-output,
logs, RAG-chunks, bestanden en gespreks-historie — vóórdat het de LLM bereikt.
Zelfde antwoord, een fractie van de tokens (60–95% minder voor JSON-data, 15–20%
minder voor coding-agents).

### Kernprincipes

| Primitive | Rol |
|-----------|-----|
| **ContentRouter** | Herkent het inhoudstype en kiest de juiste compressor |
| **SmartCrusher** | Content-bewuste compressie van JSON |
| **CodeCompressor** | AST-bewuste compressie van code |
| **Kompress (text)** | Compressie van proza |
| **CacheAligner** | Stabiliseert prefixes zodat provider-KV-caches raak zijn |
| **CCR (reversible)** | Bewaart originelen lokaal; de LLM kan ze terughalen indien nodig |

Belangrijk: Headroom draait **lokaal** (je data blijft bij jou), is **omkeerbaar**
(geen definitief verlies), en **meet de besparing** (`headroom dashboard`).

## 2. Analyse — hoe past dit op DreamTeam?

DreamTeam betaalt tokens op twee paden, beide onder één gedeeld dagelijks
token-budget (governance):

1. **Chat** (`server/routes.ts`) — stuurt per bericht de laatste ~10 berichten
   gespreks-historie mee als context.
2. **Loops** (`server/loops.ts`) — stuurt elke run de **STATE-ruggengraat** mee als
   geheugen. Die STATE groeit met elke run en werd voorheen bruut op tekens afgekapt
   (`slice(0, 4000)`), wat willekeurig midden in een run-entry signaal wegknipt.

Headroom vult precies dat gat: minder tokens per call betekent meer runs binnen
hetzelfde budget en meer nuttig geheugen dat past. De vertaling:

| Headroom-primitive | Implementatie in DreamTeam |
|--------------------|-----------------------------|
| ContentRouter | `detectContentType()` — JSON vs. tekst |
| SmartCrusher (JSON) | `compressJson()` — minify zonder betekenisverlies |
| Kompress (text) | `compressText()` — ceremonie (whitespace, dubbele lege regels) weg |
| Geheugencompressie | `compressState()` — nieuwste run-entries behouden, oudste hele entries laten vallen i.p.v. blind afkappen |
| CCR / omkeerbaar | Afgekapte historie wordt **expliciet gemarkeerd** ("afgekapt door Headroom") i.p.v. stil verdwenen |
| `headroom dashboard` | Bespaar-teller + `GET /api/headroom` + indicator in de budget-balk |
| Lokaal-first | Alle compressie draait in-proces; er gaat niets naar buiten |

## 3. Implementatie

Toegevoegd: **Headroom** — een lokale context-compressielaag bovenop chat en loops.

- `server/headroom.ts` — de compressielaag: `estimateTokens`, `detectContentType`
  (ContentRouter), `compressJson` (SmartCrusher-lite), `compressText`, `compress`
  (router + meting), `compressState` (geheugencompressie), en een cumulatieve
  bespaar-teller (`getHeadroomStats`).
- `server/loops.ts` — de STATE-ruggengraat gaat nu door `compressState()` in plaats
  van een blinde `slice()`, zodat besparing budget teruggeeft aan de volgende run.
- `server/routes.ts` — chat-historie én het huidige bericht gaan door `compress()`;
  nieuw endpoint `GET /api/headroom` voor de cumulatieve besparing.
- `client/src/pages/Loops.tsx` — een besparings-indicator naast de budget-balk
  ("−X tokens bespaard (Y%)").

### Wat er precies wordt gecomprimeerd (en wat niet)

- **Wél**: opmaak-whitespace, tabs, reeksen spaties, drie-of-meer lege regels, en
  JSON-inspringing. Dit is **ceremonie** — er gaat geen betekenis verloren.
- **Wél (STATE)**: de oudste hele run-entries wanneer de ruggengraat over het budget
  gaat — met een expliciete markering hoeveel er is afgekapt.
- **Niet**: woorden, cijfers of de volgorde van inhoud. Geen samenvatting-met-LLM
  (dat zou juist tokens kósten en betekenis kunnen verschuiven).

### Meetbaar resultaat

Op een typische JSON-tool-output levert dit ~59% tokenbesparing (in lijn met
Headrooms 60–95% voor JSON-data); op de loop-STATE verdwijnt de ceremonie en blijven
de nieuwste, meest relevante runs behouden. De besparing is zichtbaar via
`GET /api/headroom` en in de budget-balk op de Loops-pagina.

### Veiligheid & governance

- **Lokaal-first**: alle compressie draait in-proces; er verlaat niets de server.
- **Verliesvrij op betekenis**: alleen ceremonie wordt verwijderd; afgekapte
  historie wordt gemarkeerd, niet stil weggegooid (in de geest van Headrooms
  omkeerbare CCR).
- **Sluit aan op het bestaande budget**: elke bespaarde token is budget dat chat en
  loops níet verbruiken — dezelfde kostenbescherming, meer nuttig werk erbinnen.
