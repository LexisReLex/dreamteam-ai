# Model-router (keyless beslislaag)

Bouwt voort op de [gratis-provider-catalogus](./free-llm-providers.md). Waar de
catalogus *data* is om naar te kijken, maakt de model-router er een **beslissing**
van: welke gratis provider en welk model passen bij het soort werk dat een
DreamTeam-agent doet — en wanneer je tóch beter het betaalde standaardmodel kiest.

## Ontwerpprincipe: adviserend, niet live

De router is bewust **keyless en adviserend**. Hij verandert het live LLM-pad
(`server/ai.ts`) niet en roept geen enkele provider aan. Reden: het écht aanroepen
van een provider raakt productie en vereist API-keys/kosten — dat is een bewuste,
key-gated vervolgstap (het "oranje licht"). Door de beslislaag eerst als pure,
geteste functie te bouwen, leveren we waarde zonder één onomkeerbare stap.

## Wat is er gebouwd

| Onderdeel | Bestand |
|---|---|
| Routing-logica (profielen, kandidaten, escalatie) | `server/modelRouter.ts` |
| Tests | `server/modelRouter.test.ts` |
| Endpoints `GET /api/model-router`, `GET /api/agents/:id/routing` | `server/routes.ts` |
| Contextueel paneel per agent | `client/src/components/ModelRoutingPanel.tsx` |

## Taakprofielen

Elke agent wordt op rol + categorie afgeleid naar één van vijf profielen:

| Profiel | Wie | Aanbevolen richting |
|---|---|---|
| Creatief schrijven | Nova, Mira, Luna | Google AI Studio (Gemini Flash), Groq (Llama 3.3 70B) |
| Hoog-volume conversationeel | Rex, Zara | Groq / Cerebras (Llama 3.1 8B) — snel, hoge dag-limiet |
| Analyse & lange context | Kai, Atlas | Google AI Studio (250k tokens/min gratis) |
| Hoge inzet & redeneren | Finn, Orion | **Betaald standaardmodel**; gratis alleen als sparring |
| Algemeen | overige | Groq / Google AI Studio |

## Eerlijkheid van de aanbevelingen

De aanbevelingen zijn **transparante heuristiek** op basis van *gepubliceerde*
modeleigenschappen (grootte, snelheid, gratis limieten uit de catalogus) — **geen
benchmarks**. Elke aanbeveling draagt een expliciete rationale én een escalatie:
wanneer de inzet hoog is, zegt de router eerlijk dat het betaalde standaardmodel
(Claude) doorgaans de juiste keuze blijft. Dat is het oranje-licht-principe in code.

Elke aanbevolen provider verwijst naar een provider die echt in de catalogus staat
— bewaakt door `server/modelRouter.test.ts`.

## Live pad: Groq (key-gated)

De eerste echte toepassing is gebouwd: eligible chat-werk gaat naar **Groq**
(gratis, snel, OpenAI-compatibele API), met Claude als vangnet. Zie `server/groq.ts`.

Drie veiligheidsgaranties:

1. **Keyless-veilig** — zonder `GROQ_API_KEY` kiest `chooseProvider` altijd
   `anthropic`; het gedrag is identiek aan vóór deze wijziging.
2. **Router stuurt de keuze** — alleen agents waarvan het primaire advies `groq`
   is (support/algemeen) gaan naar Groq; hoge-inzet/creatief/analyse blijft op het
   betaalde model.
3. **Vangnet** — faalt Groq (fout, stale model-id, timeout, netwerk), dan valt het
   antwoord automatisch terug op Claude. Kwaliteit daalt nooit stilletjes.

Budget: Groq is gratis en consumeert daarom níét het dagelijkse token-budget; dat
budget beschermt alleen het betaalde Claude-pad. Een gevolg: als het paid budget op
is, blijven Groq-agents gewoon werken.

Activeren: zet `GROQ_API_KEY` (gratis via https://console.groq.com/keys) en optioneel
`GROQ_MODEL` in de omgeving. Zie `.env.example`.

## Volgende mogelijke stappen (nog niet gebouwd)

- Meer providers activeren volgens de router (bv. Google AI Studio voor het
  analyse-/lange-context-pad).
- Per-model-id mapping i.p.v. één `GROQ_MODEL`, zodat het profiel het exacte model
  kiest (8B voor support, 70B voor algemeen).
- Kostenraming/telemetrie: gratis vs. betaald verbruik zichtbaar maken.
