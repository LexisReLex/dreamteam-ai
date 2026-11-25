# Plakprompt voor Claude Code op de Mac: oogst opslaan in de vault

Plak alles tussen de lijnen in Claude Code (Terminal, op de Mac).

---

Jij leidt. Taal: Nederlands. Doel: de oogstbestanden van 25 en 26 nov 2026 uit GitHub landen in mijn vault, met bewijs. Niets op `main` pushen, niets installeren, niets verwijderen zonder back-up.

**Stap 1, bron ophalen (read-only):**
```bash
rm -rf /tmp/oogst-dt && git clone --depth 1 --branch claude/blissful-ptolemy-1dnf9p https://github.com/LexisReLex/dreamteam-ai.git /tmp/oogst-dt
```

**Stap 2, de checksums controleren vóór het kopiëren.** Draai `cd /tmp/oogst-dt/docs/oogst && find . -type f -name '*.skill' -o -name 'SKILL.md' | sort | xargs shasum -a 256` en vergelijk de uitkomst met deze lijst. Wijkt er één af: stop en meld het.
```
5006f82270f659a7600cc988004c43bdfa7a7fcb66ed5f2871f1d76834757b29  ./claude-ads-2026-11-25/ads.skill
7d302c25c3731591dbdd2e6fdc3ff820202c79f0886ec75b16d3754d2b34683b  ./claude-ads-2026-11-25/ads/SKILL.md
a3fa7ecf4e09049e043dd4960c1ee0167c98e310d84fc17a7865ca7763969bea  ./claude-ads-2026-11-25/klanttijd-advertentie-route.skill
7b54004f37c04a8ff856d3e0c612b24e62cc2b6a59c30dc132c3268b0b2348b6  ./claude-ads-2026-11-25/klanttijd-advertentie-route/SKILL.md
b68c1eabeac37d4c895d9329b7f06b07d4c96f3855f7d39984ed502fc0fc0a8f  ./claude-ads-2026-11-25/repo-onderzoek-routine.skill
d3cf490a5397951357a23e8374138825b0f56486cf354ea87b2661c7ebe514dd  ./claude-ads-2026-11-25/repo-onderzoek-routine/SKILL.md
1c520af5968c0bd1195c13e36d6923843e241d1fb073f082d76a27df456f3cda  ./magi-2-preview-2026-11-26/av-prompt-principes.skill
75585c4099620a5caa26b6eb34e0923da35f1bbc5688d69fa8fb7fb0b3efe721  ./magi-2-preview-2026-11-26/av-prompt-principes/SKILL.md
```

**Stap 3, kopiëren naar de vault.** Klop eerst aan met `ls` op het pad. Concludeer nooit "geen map": de iCloud-map opent pas bij aankloppen.
Vault: `/Users/lex/Library/Mobile Documents/com~apple~CloudDocs/LXY-Vault/00-System/cowork-start/skills-vault/`
- Zet de `SKILL.md` per skill in `bron-2026-11-25/<skill>/SKILL.md` (ads, klanttijd-advertentie-route, repo-onderzoek-routine) en in `bron-2026-11-26/av-prompt-principes/SKILL.md`.
- Zet de `.skill`-bestanden in `geleverd-2026-11-25/` en `geleverd-2026-11-26/`.
- Staat er al een bestand met dezelfde naam, maak dan eerst een kopie als `<naam>.bak-<tijd>` en meld dat.

**Stap 4, bewijs.** Draai `shasum -a 256` op elk gekopieerd bestand in de vault. Alle 8 moeten gelijk zijn aan de lijst hierboven. Tel ook de merktekens met `grep -c "oogst:avp-01[3-6]"` op de av-prompt-principes-bron: dat moet 4 zijn.

**Stap 5, handover.** Zet bovenaan `LXY-Vault/00-System/cowork-start/HANDOVER-LATEST.md` één blok: "UPDATE <datum tijd>: oogst 25+26 nov in skills-vault geland (8 bestanden, checksums gelijk). Open: Lex laadt 4 .skill-bestanden op via de Claude-app." Werk ook het Notion-blok HANDOVER-LATEST bij als de Notion-connector bereikbaar is.

**Stap 6, uploaden.** Open de twee geleverd-mappen in Finder (`open "<pad>/geleverd-2026-11-25" "<pad>/geleverd-2026-11-26"`), zodat ik de 4 `.skill`-bestanden met één sleepbeweging in de Claude-app (Instellingen → Skills) kan zetten. Zeg me precies welke 4 bestanden het zijn. Zodra ik "opgeslagen" zeg: zet in Notion de Oogst-register-rijen avp-013 t/m avp-016 (en die van claude-ads van 25 nov) op 🟢 Geland met de datum van vandaag.

**Stap 7, opruimen en slot.** Verwijder `/tmp/oogst-dt`. Sluit af met de slotregels: freeze ongeschonden · wat er op de Mac is geïnstalleerd (verwacht: niets) · €0,00 · geen sleutels.

---
