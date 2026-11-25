# Repo-onderzoek: SandAI-org/MAGI-2-preview (26 nov 2026)

**Oordeel in één zin:** het model zelf sluit niet aan op Lex' OS (8 NVIDIA Hopper-GPU's, 307 GB gewichten, geen Mac-pad). Wat wél aansluit is de meegeleverde prompt-compiler. Die principes zijn geoogst in `av-prompt-principes` en werken meteen op Kling, Wan en Seedance, die Lex al gebruikt.

## Nulmeting (drie netten)
- Net 1, Notion-register en Repo Bibliotheek: 0 treffers op MAGI, MAGI-2, SandAI en sand.ai.
- Net 2, handover: 0 echte treffers. De 2 hits waren "Grok Imagine", die het woord "magi" bevat.
- Net 3, deze repo (dreamteam-ai): 0 treffers.
- Behoefte genoteerd: ja, indirect. Video met geluid voor reels en Klanttijd-clips (Kling, Wan en Seedance via OpenRouter en Higgsfield).

## Kloonbewijs
HEAD `f68a0f9bbccbea56e0177a9bd912abc3b18ffe61`, 6 aug 2026. Gekloond op 26 nov 2026 (read-only, scratchpad). 62 bestanden. Pakket: inferentiecode, de gewichten staan apart op Hugging Face (`sand-ai/MAGI-2-preview`).

## Poorten
| # | Poort | Uitkomst |
|---|---|---|
| 1 | Herkomst | Open: officiële org van Sand.ai, geen gecompileerde code en geen sleutels meegeleverd. |
| 2 | Licentie | Open: Apache 2.0 (`LICENSE`, geen extra eis na END OF TERMS, r.177-191). Licentie op de **gewichten** kon niet gemeten worden: huggingface.co wordt door de containerproxy geweigerd. Onderdelen van derden: text-encoder Qwen3.5-27B, VAE uit Wan2.2, audio-VAE stable-audio-open-1.0. Die laatste heeft van zichzelf een eigen Stability-licentie. Niet nagemeten, en dat hoeft ook niet zolang poort 3 dicht is. |
| 3 | **Hardware** | **DICHT.** `README.md:25` noemt 8 NVIDIA Hopper-GPU's. In `configs/magi2_preview.json` staan `cp_size: 8` en `ep_size: 8`. 50 harde `torch.cuda`-aanroepen. De Dockerfile bouwt flash-attention voor Hopper en MagiAttention met compute capability 90. De gewichten zijn ~307 GB, de preview-transformer alleen al 228 GB. Er is geen MPS- of CPU-pad (de enige `mps`-regel is gekopieerde sampler-code, `sampler.py:1279`). Zelfs op 80 GB-kaarten moet er geofload worden (README, offload-sectie). |
| 4 | Ingebouwd alternatief | Higgsfield `models_explore` op "MAGI Sand AI": 0 modellen. OpenRouter-videolijst: niet meetbaar vanuit de container (proxy 403). De handover van 20 nov noemt 35 modellen, MAGI zit daar niet bij. Lex heeft al Kling, Wan, Seedance en Veo via OpenRouter en Higgsfield, voor $0,30 tot $2,31 per clip van 10 s. |
| 5–8 | Overlap, veiligheid, beleid, freeze | Na poort 3 niet volledig gelopen, conform de routine. Bijvangst uit de scan staat hieronder. |

## Veiligheidsscan (bijvangst, alleen gelezen)
- Telemetrie: niet gevonden (grep op posthog, wandb, telemetry, requests en urllib in `inference/`, `scripts/`).
- Netwerk: alleen de optionele prompt-verbetering via de `openai`-client naar Gemini (`enhancer.py:31-33,118`). Die staat uit zolang `API_KEY` leeg is.
- Shell: één `subprocess.run` met een argumentenlijst voor ffmpeg (`pipeline.py:231-238`). Geen `shell=True`.
- Antipatroon: `API_KEY = ""` als constante in de broncode (`enhancer.py:32`). Je moet dus een sleutel in een bestand typen.
- Docker: `latest` beweegt mee. Er bestaat een tag per commit (README, Docker-sectie).

## Onderhoudsprofiel
19 commits, allemaal van 5 en 6 aug 2026, en sindsdien stil (ruim 3,5 maand). 4 mensen, na het samenvoegen van e-mails: Cen ~8, Zhang ~6, Jia 4, Li 2. De gedistilleerde versie staat nog op "Coming soon".

## Besluit per onderdeel
- 🔴 **Zelf hosten (Mac of eigen server).** Grond: hardware, niet kwaliteit.
- 🔴 **GPU huren (8×H100).** Grond: kosten tegen nut. 100 + 5 ongedistilleerde stappen per clip van 10 s, terwijl een clip van 10 s met audio via OpenRouter $0,30 tot $1,26 kost.
- 🔵 **Radar: MAGI-2 via een API.** Ontdooi-trigger: zie hieronder.
- 🟡 **Oogst: prompt-compiler** (`inference/prompt_enhancement/prompts/t2v.md`, 1.543 regels). Vier principes, avp-013 t/m avp-016, in `av-prompt-principes`. De skill-kopie staat in `docs/oogst/magi-2-preview-2026-11-26/`.

## Wat NIET overnemen
- Het JSON-schema `global_layer`/`dynamic_layer`. Het is getraind op dit model, en andere generators lezen gewone tekst.
- De vaste duur van 10,0 s.
- Een API-sleutel als constante in de code (`enhancer.py:32`).
- Docker `latest`.

## Ontdooi-trigger (alle drie tegelijk)
1. Een gedistilleerde release staat op Hugging Face (README-tabel, rij "distilled" is niet meer "Coming soon").
2. MAGI-2 staat in `GET openrouter.ai/api/v1/videos/models`, of verschijnt in Higgsfield `models_explore` op "MAGI".
3. De prijs voor 10 s met audio is ≤ $1,26 (Kling 3.0 std met audio) en één proefclip haalt in `reel-keuring` ≥ 20, de huidige Kling-score.

## Slotregels
Freeze ongeschonden · niets op de Mac geïnstalleerd · niets gedraaid of gebouwd · €0,00 · 0 credits · geen sleutels.
