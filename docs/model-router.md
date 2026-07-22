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

## Vervolgstap (nog niet gebouwd — oranje licht)

De echte, key-gated routing: op basis van deze beslissing daadwerkelijk een gratis
provider aanroepen in `server/ai.ts`, met de bestaande token-budget-governance
eromheen en een kostenraming vooraf. Dat raakt het productie-LLM-pad en vereist
API-keys — een bewuste stap met expliciete go.
