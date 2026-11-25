# Handover — laatste stand

> Warme start voor de volgende sessie (o.a. op de Mac). Lees dit eerst.

**Laatst bijgewerkt:** 2026-11-25 · **Branch:** `claude/vibrant-hawking-x3p7cc`

## claude-ads — herbeoordeeld & gebouwd (2026-11-25)

Vraag: claude-ads (AgriciDaniel) onderzoeken, alles installeren wat past, kijken wat het voor de
marketing kan doen. Eerder besluit 12 sep (🔴 plugin, 🔵 audit, 🟡 9 patronen, alle 9 nu in het account).
Herbeoordeeld op HEAD `fc3908e` (v2.1.0). **Plugin blijft 🔴** (fit, tweede besturingslaag,
zware runtime; Cockpit-mod heeft sessiestart-hooks). **Wél gebouwd:** `POST /api/ad-audit/meta`,
een keyless Meta-advertentiecontrole op een export (budgetverdeling, UTM, frequentie, creatieve
moeheid, leerfase, vergelijkbaarheid; geen totaalscore), plus paneel bij Nova en de advertentiemethodiek
in Nova's prompt. Volledig verhaal: **`docs/claude-ads.md`**. Status: typecheck schoon,
**193 tests groen** (was 172), build schoon, live nagemeten met screenshot.
Oogst-bestanden (4 nieuwe regels + 1 ontdubbeling): `docs/oogst/claude-ads-2026-11-25/`.
**Eerste echte meting open:** één echte export uit Advertentiebeheer door het paneel halen. De
Nederlandse kolomnamen zijn niet nagemeten; onherkende kolommen staan in `unmappedColumns`.

---

## gstack — onderzocht & besloten (2026-07-26)

Vraag: *"Het hele traject"* (github.com/garrytan/gstack). **Besluit: niet
installeren** — gstack is een Claude Code **skill-suite** (Bun/Playwright/iOS-daemons,
22–721MB ML-classifiers), geen npm-library en geen product-feature; verkeerde vorm én
stack voor deze webapp. Wél geleend: het kern-onderscheider **prompt-injection
defense**, in de lichte tier (heuristiek), keyless native in TypeScript.

Waarom het past: de chat voert onvertrouwde tekst aan de LLM's, én Agent Memory
destilleert die tekst tot feiten die later in de systeemprompt komen — een geplante
instructie kan zo een *persistente* directief worden. De guard (`server/promptGuard.ts`)
weigert zulke atomen vóór opslag en kadert een verdachte live-beurt defensief. Puur
additief: `PROMPT_GUARD=off` maakt het een no-op; blokkeert nooit een bericht.
Volledig verhaal: **`docs/gstack.md`**. Verifieerbaar: `GET /api/prompt-guard/health`.
Status: typecheck schoon, **155 tests groen** (was 140), build schoon. Standaard aan,
geen oranje licht nodig (keyless).

---

## MemPalace — onderzocht & besloten (2026-07-25)

Vraag: *"MemPalace onderzoeken/installeren"* (github.com/MemPalace/mempalace).
**Besluit: niet installeren** — het is een Python-CLI die grotendeels dupliceert
wat onze Agent Memory (#19) al in TypeScript doet. Wél geleend: het kernvoordeel
**semantische recall**, key-gated ingebouwd (spiegelt het Groq-pad). Zonder
`EMBEDDINGS_API_KEY` verandert er niets; met een gratis key wordt recall slimmer.
Volledig verhaal + verantwoording: **`docs/mempalace.md`**. Status: typecheck
schoon, **140 tests groen** (incl. end-to-end test van de ingeschakelde recall),
build schoon.

**Deployen = key plaatsen + redeploy.** Uitvoerbare gids voor Cowork/terminal:
**`docs/DEPLOY-HANDOVER-embeddings.md`** — provider + key, env's, redeploy, en
verificatie via het nieuwe endpoint `GET /api/embeddings/health` (geeft
`{"enabled":true,"ok":true,...}` als het écht werkt; lekt de key niet). Aanzetten
blijft jouw oranje licht (een key).

---


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
