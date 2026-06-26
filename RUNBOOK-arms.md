# Runbook — 3-armen Fugu-benchmark (live draaien)

Alles is droog gebouwd en getypecheckt. Onderstaande stappen draaien de **live** run.
Harde grens: stopt automatisch bij **$50** arm-run-kosten (let op de C-caveat hieronder).

## 0. Wat je nodig hebt
- Eén **sandbox** OpenRouter-key (ontgrendelt arm A, B en C). Haal er een bij https://openrouter.ai/keys
- Voor arm C: de lokale OpenFugu-server draaiend (zie stap 2).

## 1. Key zetten
```bash
cd "/Users/lex/Documents/Claude/Claude Code/dreamteam-benchmark"
cp -n .env.example .env     # als .env nog niet bestaat
# zet in .env:
#   OPENROUTER_API_KEY=sk-or-...   (sandbox)
#   FUGU_LOCAL_KEY=local-dummy
```

## 2. Arm C — OpenFugu-server starten (apart terminalvenster)
Pool-modus = workers via OpenRouter, géén GPU. De Conductor (Qwen3-0.6B) draait op CPU.
```bash
cd "/Users/lex/Documents/Claude/Claude Code/dreamteam-benchmark/vendor/OpenFugu"
. .venv/bin/activate
export FUGU_BASE_URL=https://openrouter.ai/api/v1
export FUGU_API_KEY=sk-or-...        # je OpenRouter-key
SNAP=$(ls -d /Users/lex/.cache/huggingface/hub/models--Qwen--Qwen3-0.6B/snapshots/*/ | head -1)
HF_HUB_OFFLINE=1 python openfugu/serve.py \
  --model "$SNAP" \
  --vector artifacts/model_iter_60.LOWERBOUND.npy \
  --slot-models "deepseek/deepseek-v4-flash,minimax/minimax-m3" \
  --port 8088
# test: curl localhost:8088/health
# NB: vector = identity-SVF + ECHTE getrainde head. Objectief geverifieerd (verify_37.py):
#     agent 95% / role 100% routing-match. De originele model_iter_60.npy is NIET
#     geredistribueerd; deze geassembleerde vector is de getrouwe, geverifieerde stand-in.
```
> Lukt dit niet (download/torch/GPU)? Arm C wordt dan automatisch OVERGESLAGEN in de run,
> met de reden als bevinding in de scorecard. Niets verzonnen.

## 3. Live run (A + B + C)
```bash
cd "/Users/lex/Documents/Claude/Claude Code/dreamteam-benchmark"
npm run bench:arms            # eerst nog 1x DROOG: toont raming, stopt
npm run bench:arms -- --run   # LIVE binnen het $50-plafond
```
Resultaat: `out/scorecard.md` + `out/scorecard.runs.json` (ruwe outputs + jury-motivatie, auditeerbaar).

## Caveats / bevindingen (live mee te wegen)
- **$50-meter ziet arm C niet volledig.** Arm C's echte kosten = de interne OpenRouter-pool-calls
  van serve.py; die komen NIET terug in de enkele serve-respons (die geeft alleen `usage.fugu_turns`).
  Mijn meter telt arm A + B exact; arm C telt als $0. Check arm-C-spend apart in je OpenRouter-dashboard.
- **Arm B = sakana/fugu-ultra is premium** ($5/$30 per 1M, live geverifieerd 2026-06-26). Duurste arm.
- **Arm A modelkeuze** per domein staat in `arms.json` met expliciete aannames (5 van 8 domeinen hebben
  geen seat in je vault-routing; die keuzes zijn aanname, niet vault-beleid). Vault-routing is niet gewijzigd.
- Sakana-direct (api.sakana.ai) is EU-geblokkeerd (403); daarom B via OpenRouter.
```
