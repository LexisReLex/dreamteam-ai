# claude-ads in DreamTeam: herbeoordeling en wat er gebouwd is

> Herbeoordeling 25 nov 2026 van [AgriciDaniel/claude-ads](https://github.com/AgriciDaniel/claude-ads)
> (MIT, HEAD `fc3908e`, v2.1.0, 17 okt 2026). Eerste besluit: 12 sep 2026 op HEAD `ac21644` (v2.0.2),
> besluitpagina in het Notion-register. Zelfde patroon als `docs/claude-seo.md` en `docs/brand-dna.md`:
> geen kopie, wel een eigen vertaling van de methode.

## 1. Oordeel in één zin
De plugin installeren we nog steeds niet (fit, tweede besturingslaag, zware runtime). Wat wél past, is nu
geoogst en gebouwd: de Meta-controlelijst als keyless controle in DreamTeam, de advertentiemethodiek in Nova,
en vier tekstregels in de skills.

## 2. Waarom herbeoordelen, en wat er veranderd is
**Aan de repo (ac21644 → fc3908e, 253 bestanden, +22k regels):**
- v2.1.0 zette **alle scoreprofielen uit**: "no score is produced" (CHANGELOG). De README liet eerder een
  0–100-score zien die het product niet kon onderbouwen.
- Nieuw: **Cockpit**, een optionele mod met `session.start`/`SessionStart`-hooks (`mods/claude-ads-cockpit/hooks/register.mjs:45-58`).
  `install.sh` installeert hem **niet** (nergens genoemd); alleen een aparte installatie zet hem aan. Hooks op sessiestart zijn freeze-vraag 3.
- Installer kan nu op een git-ref pinnen; releases zijn checksummed, niet gesigneerd.
- Meta Marketing API v26.0 verwerkt; v24.0 verliep 6 okt 2026.

**Aan Lex' situatie (uit de handover, gemeten):** sinds september kwamen Google Ads-tag, TikTok-pixel en Meta-pixel
per salon, "Rendement per advertentie", **Klanttijd Groei** (advertenties beheren voor salons à €49), een
advertentie-agent 2x per dag en een wekelijkse Meta-campagnetaak erbij. Herhaalbare advertentiecontroles over
meerdere accounts zijn dus geen hypothese meer.

**De ontdooi-trigger van 12 sep (alle drie tegelijk):** (1) ≥2 platforms tegelijk actief: **nee**. Alleen Meta draait;
Google en TikTok meten alleen. (2) Herhaalbare audit over ≥10 runs: **ja** (wekelijkse taak plus per-salon-gebruik).
(3) Exports of API in plaats van alleen de browser: **deels** (Meta ads_read in App Review). Twee van de drie, dus de
**plugin blijft 🔵**. Wel liet het oude besluit een gat: de Meta-catalogus werd met "22 platform-audit-skills voor
kanalen die Lex niet gebruikt" in één regel weggezet, terwijl Meta het kanaal is dat hij wél gebruikt. Dat is nu hersteld.

## 3. Besluit per onderdeel
| Onderdeel | Kleur | Grond |
|---|---|---|
| Plugin / framework installeren | 🔴 blijft | Tweede conductor + control-plane naast DreamTeam en dirigent-orkest; playwright/WeasyPrint-runtime (freeze-vraag 2); 12 platforms voor 1 actief kanaal. Niet op veiligheid: die is voorbeeldig (nul telemetrie, nul globale config, mutaties architectonisch uit). |
| Cockpit-mod | 🔴 | Hooks op sessiestart (freeze-vraag 3); dient alleen de plugin. |
| Meta-controlelijst + aanbevelingsgrens | 🟢 gebouwd | `server/adAudit.ts`, paneel bij Nova, regel ads-003. |
| Advertentiemethodiek | 🟢 gebouwd | Nova's systeemprompt (`server/prompts.ts`), zoals Kai de claude-seo-methodiek kreeg. |
| Lokale-diensten-meetpoort | 🟡 geoogst | kar-001/kar-002 in `klanttijd-advertentie-route`. |
| Google-/TikTok-controlelijst | 🔵 radar | Pas als daar campagnes draaien (nu alleen tags). Bron: `ads/references/google-audit.md`, `tiktok-audit.md`. |
| Deterministische multi-platform audit (de plugin) | 🔵 radar | Ontdooien zodra ≥2 platforms tegelijk campagnes draaien. Install-plan staat op de Notion-besluitpagina. |

## 4. Wat er gebouwd is: `POST /api/ad-audit/meta` (keyless)
- **Invoer:** de CSV uit Advertentiebeheer (`Content-Type: text/csv`, max 2 MB, `,` `;` of tab) of
  `{ rows: [...] }` met Insights-API-rijen. Drempels via de query (`?minImpressions=…&maxAdsetShare=…`).
- **Controles:** budgetverdeling (M17), UTM (M39), frequentie (M-CR2), creatieve moeheid (M28), leerfase (M13),
  vergelijkbaarheid van resultaattypes (gvd-012). Elke controle geeft een status. Bij een probleem komt er advies met
  vijf velden: bewijs, mechanisme, kleinste omkeerbare stap (PAUSED / GO eigenaar), meetvenster en terugdraaien.
- **Geen totaalscore.** Dekking = deel van de controles dat beoordeeld kon worden; onbekend verlaagt de dekking, nooit het oordeel.
- **Steekproefpoort:** advertenties onder 1.000 vertoningen worden getoond maar niet beoordeeld.
- **Ranglijst** binnen hetzelfde resultaattype (leads en klikken komen nooit in één ranking).
- **Kolommen:** Meta Insights-API-namen zijn bron-gegrond. Engelse en Nederlandse kolomkoppen uit Advertentiebeheer
  zijn als alias toegevoegd maar **niet nagemeten tegen een echte export van dit account**. De eerste echte export is
  die meting; onherkende kolommen komen terug in `unmappedColumns`.
- **Veiligheid:** geen netwerk, geen sleutel, geen accountwijziging. Guard + rate-limit zoals de andere bricks; aparte
  `express.text`-parser van 2 MB alleen op deze route (de globale JSON-limiet blijft 100 kB).

Twee fouten gevonden en gerepareerd tijdens de bouw: (1) de ranglijst zette kosten per lead naast kosten per klik;
(2) bij een dagexport middelde de frequentiecontrole dagfrequenties en zei ten onrechte "in orde". Beide hebben nu een test.

**Meten of het waarde toevoegt (regel 23):** na 5 echte exports (Klanttijd + Groei-salons): hoeveel controles gaven
een status anders dan onbekend, en leidde minstens één advies tot een wijziging met GO? Onder 1 van de 5: het paneel eruit.

## 5. Testen
`npx vitest run server/adAudit.test.ts` (21 tests). Volledige suite: 193 groen, typecheck schoon, build schoon.
Live nagemeten op een dev-server: CSV met NL-koppen en puntkomma, JSON-rijen, ongeldige drempel (400),
niet-Meta-invoer (422), en een screenshot van het paneel bij Nova (6 controles, 0 paginafouten).

## 6. Wat NIET overnemen
- De plugin, de conductor en het control-plane: tweede besturingslaag.
- `claude_ads_core` als code: Python, eigen schema's; DreamTeam is TypeScript.
- De Cockpit-mod: hooks op sessiestart.
- De 0–100-score: zelfs de maker heeft hem uitgezet.
- Platformcatalogi voor kanalen zonder campagnes (Amazon, Apple, Reddit, Snapchat, X, Pinterest, LinkedIn, Microsoft).
