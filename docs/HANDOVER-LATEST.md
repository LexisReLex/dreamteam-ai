# Handover — laatste stand

> Warme start voor de volgende sessie (o.a. op de Mac). Lees dit eerst.

**Laatst bijgewerkt:** 2026-07-22 · **Branch:** `claude/free-llm-api-resources-lu1ta3` (PR's gemerged naar `main`)

## Waar we staan — Fase 1 klaar (kostenefficiënte routing)

Drie bricks gebouwd, getest en gemerged naar `main`:

| # | Brick | PR | Kern |
|---|---|---|---|
| 1 | Gratis-provider catalogus | #13 | 26 providers, geverifieerd uit de bron · pagina `/free-llm` |
| 2 | Model-router (keyless) | #16 | per agent een aanbevolen gratis model + oranje-licht-escalatie |
| 3 | Groq als gratis chat-pad | #17 | Groq (gratis) met Claude als vangnet |

Status: **87 tests groen**, typecheck + build schoon. Het live LLM-pad draait onveranderd op Claude **tot** je een Groq-key zet.

## Groq activeren (jouw stap — key/productie)

1. Gratis key: https://console.groq.com/keys
2. In de deploy-omgeving (Railway/Render): `GROQ_API_KEY=gsk_...` → redeploy.
3. Optioneel: `GROQ_MODEL` (default `llama-3.3-70b-versatile`).

**Verifieer daarna** (dit is het enige bewijs dat nog open staat): stuur één bericht naar Zara (agent 5) en check het serverlog:
- `[chat] agent 5 via Groq (...)` → Groq is écht live.
- `Groq faalde, val terug op Claude` → key of model-id klopt niet; chat blijft werken via Claude terwijl je het fixt.

## Route — wat ik als eigenaar voorstel

- **Fase 2 — Observability (volgende brick).** Maak zichtbaar welk pad elk antwoord nam (Groq / Claude / fallback) en toon gratis-vs-betaald verbruik. Zo wordt "ik denk dat het bespaart" → "ik zie dat het bespaart". Sluit direct aan op de verificatie hierboven.
- **Fase 3 — Meer providers via de router.** Google AI Studio activeren voor het analyse-/lange-context-pad (Kai, Atlas); per-model precisie (8B voor support, 70B voor algemeen).
- **Fase 4 — Loops ook via de router.** `server/loops.ts` draait nog direct op Anthropic; consistent maken met het chat-pad.

**Directe eerste stap voor de Mac-sessie:** begin met Fase 2 (observability) — die is keyless, additief en maakt Groq meteen verifieerbaar.

## Werkafspraken (context)

- Jij leidt-ik-volg: ik beslis de route en houd je op de hoogte; jij onderbreekt als je iets anders wilt.
- Oranje licht = jouw go: keys, geld, productie, onomkeerbaar. Groep-activering en nieuwe provider-keys vallen hieronder.
- Elke claim met bewijs (test-/serverlog), geen verzonnen cijfers.

## Handige commando's

```bash
npm run check   # typecheck
npm test        # 87 tests
npm run build   # client + server
npm run dev     # lokaal draaien
```
