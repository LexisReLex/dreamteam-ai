# UITKOMST — DreamTeam-sweep (23 jul 2026)

Uitgevoerd als mede-eigenaar. Bewijs vóór claim: per item het gedraaide commando
+ zichtbaar resultaat. Geen "gelukt" zonder grond-waarheid op schijf.

> **Repo-noot:** de opdracht noemt `dreamteam-ai`; lokaal is dat de map
> `dreamteam-benchmark` — git remote = `github.com/LexisReLex/dreamteam-ai.git`
> (`git remote -v` → origin dreamteam-ai.git). Geen tweede map aangemaakt.

---

## STAP 0 — opdracht + werkafspraak geborgd ✓

| Wat | Bewijs |
|---|---|
| Opdracht weggeschreven | `OPDRACHT-dreamteam-sweep-23jul.md` in deze repo |
| Werkafspraak als skill | `~/.claude/skills/mede-eigenaar/SKILL.md` (bestond niet → nieuw) |
| Description-limiet gemeten | 1197 → 1088 → 1037 → **1009 tekens ≤ 1024 OK** (python3-telling, 4 inkortrondes) |

---

## STAP 1 — inventaris + installs

Elk item: éérst gecheckt of het er stond (stond er niet — `ls`/`grep`/`find` = leeg),
daarna geïnstalleerd + geverifieerd.

### ✅ 1. agency-agents (msitarzewski, MIT) — 6 e-commerce-agents
- **Check vooraf:** `ls ~/.claude/agents | grep -iE "shop|ecom|..."` → *none*.
- **Backup gemaakt** (onomkeerbaar vermeden): `~/.claude/agents.bak-20260723-200906` (6 files).
- **Gekozen 6** (funnel-dekkend, EU/Shopify-relevant, China-social bewust overgeslagen),
  `name:` geslugd naar Lex' kebab-conventie, géén botsing met de eigen 6:
  1. `payments-billing-engineer` (Stripe/Adyen/PayPal PSP)
  2. `cross-border-ecommerce-specialist` (Amazon/Shopee/marketplaces)
  3. `pricing-analyst` (prijsmodellen)
  4. `retail-customer-returns` (retouren/CX)
  5. `ppc-campaign-strategist` (Google Shopping ads)
  6. `email-marketing-strategist` (CRM/lifecycle)
- **Bewijs:** `grep -h '^name:' ~/.claude/agents/*.md` toont 12 slugs — de eigen 6
  (architect, boekings-qa, code-reviewer, onderzoeker, security-wachter,
  tekstschrijver-nl) **onaangetast** + de 6 nieuwe.

### ✅ 2. mattpocock/skills — 3 skills
- **Check vooraf:** niet in skill-listing.
- Gekopieerd naar `~/.claude/skills/`: `diagnosing-bugs`, `grilling`, `writing-great-skills`.
- Description-lengtes gemeten: 156 / 152 / 108 tekens — allemaal ≤ 1024 OK.
- **Bewijs:** skill-listing toont nu `diagnosing-bugs`, `grilling` én `writing-great-skills` live.

### ✅ 3. claude-code-templates (davila7) — shopify → dreamteam-ai
- `shopify-expert.md` → `dreamteam-benchmark/.claude/agents/` (name: shopify-expert).
- `shopify-development/` skill → `dreamteam-benchmark/.claude/skills/`
  (SKILL.md + references/ + scripts/shopify_graphql.py e.a.).
- **Bewijs:** `find .claude` toont beide op schijf in de repo.

### ✅ 4. microsoft/playwright-cli — als skill + geverifieerd
- `npm install -g @playwright/cli@latest` → **v0.1.17**, `which` = `/usr/local/bin/playwright-cli`.
- `playwright-cli install --skills` → skill in `~/.claude/skills/playwright-cli/`
  (gebruikt systeem-Chrome, geen chromium-download nodig).
- **Verificatie (bewijs vóór claim):** `playwright-cli open https://example.com` →
  `Page Title: Example Domain`; `eval "document.title"` → `"Example Domain"`;
  `close` → `Browser 'default' closed`. Skill nu live in listing.

### ✅ 5. prompt-master (nidhinjs/prompt-master) — vault + runtime
- **Runtime-install:** `~/.claude/skills/prompt-master/` (SKILL.md v1.7.0, desc 333 ≤ 1024).
- **In de vault:** `…/LXY-Vault/00-System/cowork-start/skills-nieuw/prompt-master/`.
- **Bewijs:** skill-listing toont `prompt-master` live.

### ✅ 6. stitch-skills (google-labs-code) — taste-design → iCloud cowork-start
- "taste-design-**checklist**" = de officiële skill `taste-design` (Google Labs).
- Gekopieerd naar `…/LXY-Vault/00-System/cowork-start/taste-design/`
  (SKILL.md + resources/DESIGN.md).
- **Bewijs:** `find` toont SKILL.md + DESIGN.md op de iCloud-locatie.

### ✅ 7. Impeccable (pbakaus, Apache-2.0) + SkillUI (MIT)
- **Impeccable:** `npx impeccable install` → globaal in `~/.claude` (skill + hooks),
  meegeliftt naar bestaande `~/.cursor`, `~/.gemini`, `~/.pi`, `~/.codex`-harnassen.
  Geverifieerd: `~/.claude/skills/impeccable/SKILL.md` bestaat, `impeccable detect --help`
  draait. Skill nu live in listing. (CLI heet de scan `detect` i.p.v. het oude `audit`.)
- **SkillUI:** `npm install -g skillui` → **v1.3.4**, `which` = `/usr/local/bin/skillui`.

---

## STAP 2 — resterende to-do, minst → meest tijd

Legenda: 🟢 zelf doorpakken · 🟠 Lex' go (oranje licht) · ✋ Lex' handeling.

| # | Item | Modus | Tijd | Status / route |
|---|---|---|---|---|
| A | `esbuild` postinstall-script goedkeuren (npm-warn van skillui) | 🟢 | 1 min | Optioneel; skillui werkt zonder. `npm approve-scripts esbuild` als je 't wilt. |
| B | `.claude/` + opdracht/uitkomst in dreamteam committen (lokaal) | 🟢 | 2 min | Reversibel; **push** hoort bij item E (oranje). Nu untracked op schijf. |
| C | git-remote dreamteam pushen (`feat/dispatch-http-live` -u) | 🟠 | 2 min | Remote bestáát (dreamteam-ai.git). Branch heeft géén upstream → alle dispatch/deploy-commits staan lokaal. Push = naar buiten → jouw go. |
| D | n8n-API-key-rotatie (workflow `Mr4j7huAH2vu1SrA`) | 🟠+✋ | 10 min | Key zit in n8n; rotatie raakt de live dispatch-tunnel. Ik kan het draaiboek klaarzetten; de nieuwe key genereer jij in n8n. |
| E | TencentDB Agent Memory merge | 🟠 | 15 min | Remote branch `claude/tencentdb-agent-memory-a6l4r4` staat klaar, ongemerged. Merge = productie-datamodel → jouw go. |
| F | DreamTeam-productinhoud | 🟠 | uur+ | Strategisch/inhoudelijk — jouw smaak-/richtingkeuze. |
| G | grind-job hosting | 🟠+✋ | uur+ | Kost geld + keys (hosting). Ik lever de opties + kosten; jij kiest + betaalt. |

---

## Oranje-licht-adviezen (jij beslist)

- **git-push (C):** ik zou `feat/dispatch-http-live` pushen met `-u` zodra de
  dispatch-laag stabiel is — nu staat al het deploy-werk alleen lokaal (verliesrisico
  bij schijfcrash). Reversibel-genoeg, maar het is naar-buiten → jouw GO.
- **n8n-key (D):** roteren is hygiëne, maar de key voedt de live tunnel-dispatch;
  roteren zonder de nieuwe waarde meteen in de deploy-config te zetten legt de
  06:45-run stil. Doe het samen: jij genereert, ik zet 'm in één handeling in de config.
- **TencentDB merge (E):** eerst de benchmark als rechter erover (past bij het
  agency-oordeel "mcp-memory als geheugenpatroon oogsten"), dán mergen. Niet blind.
- **DreamTeam-productinhoud (F) & grind-hosting (G):** strategie + geld — expliciet jouw stoel.

---

## Bijvangst / opruim

- Backup eigen agents: `~/.claude/agents.bak-20260723-200906` (kan weg als de 6 nieuwe bevallen).
- Clones in sessie-scratchpad (`…/dt-sweep/`) — session-isolated, ruimt zichzelf op.
- `~/.playwright-cli/` snapshot-map in home door de verificatie-run (onschadelijk).
