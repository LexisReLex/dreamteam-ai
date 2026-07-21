# Gratis LLM API-providers — catalogus

Een ingebouwde catalogus van providers die **gratis toegang of proeftegoed** bieden voor
API-gebruik van taalmodellen. Onderzocht, geanalyseerd en geïmplementeerd op basis van de
community-lijst [`cheahjs/free-llm-api-resources`](https://github.com/cheahjs/free-llm-api-resources).

## Waarom in DreamTeam?

De app draait nu op één betaalde provider (Anthropic, zie `server/ai.ts`) met een gedeeld
dagelijks **token-budget** als kostenbewaking. Deze catalogus is de **kennisbasis** voor de
volgende stap: een model-router die geschikt werk naar een gratis of goedkopere provider kan
sturen zonder de kostenbewaking los te laten.

## Wat is er gebouwd

| Onderdeel | Bestand |
|---|---|
| Geverifieerde dataset (providers, limieten, modellen) | `shared/freeLlmProviders.ts` |
| Dataset-integriteitstests | `shared/freeLlmProviders.test.ts` |
| API-endpoint `GET /api/free-llm-providers` | `server/routes.ts` |
| Visuele catalogus-pagina (`/free-llm`) | `client/src/pages/FreeLLM.tsx` |
| Navigatie + vertalingen (5 talen) | `Sidebar.tsx`, `App.tsx`, `lib/i18n.ts` |

## Databron & eerlijkheid

De cijfers (rate limits, credits) komen **rechtstreeks** uit de gegenereerde README van de
bronrepo — niets is geschat of verzonnen. De dataset draagt daarom expliciet:

- `SOURCE_URL` — de bron.
- `SNAPSHOT_DATE` — de datum waarop de cijfers zijn overgenomen (momenteel `2026-07-21`).

Providers zoals **OpenCode Zen** publiceren geen harde cijfers; daar staat een toelichting in
plaats van een verzonnen limiet.

## Bijwerken

De bron wordt community-gemaintaind en verandert. Om te verversen:

1. Lees de actuele README van de bronrepo.
2. Werk `shared/freeLlmProviders.ts` bij.
3. Zet `SNAPSHOT_DATE` op de nieuwe datum.
4. `npm test` — de integriteitstests bewaken structuur en consistentie.

> Let op: limieten en modellen bij de providers zelf kunnen op elk moment wijzigen.
> Controleer altijd bij de provider vóór productiegebruik.

## Vervolgstap (nog niet gebouwd)

Het daadwerkelijk *live* aanroepen van een gratis provider (bv. Groq, Google AI Studio of
OpenRouter) als fallback of goedkoop-pad in `server/ai.ts` raakt het productie-LLM-pad en
vereist API-keys. Dat is een bewuste volgende stap met een expliciete go (oranje licht:
keys/kosten/productie), niet iets dat deze catalogus stilzwijgend activeert.
