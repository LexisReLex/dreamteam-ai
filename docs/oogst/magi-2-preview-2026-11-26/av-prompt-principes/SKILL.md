---
name: av-prompt-principes
description: "Model-agnostische schrijfprincipes voor sterke video- en audiovisuele prompts (Higgsfield en elke andere AV-generator). Laad dit zodra Lex een videoprompt, shot, scène, commercial, faceless-explainer, keyframe of AV-generatie schrijft of laat schrijven. Kern: bouw een shot-tijdlijn, beschrijf camera als type plus amplitude plus snelheid, scheid diegetisch van non-diegetisch geluid, kies concreet boven abstract, en regisseer met keyframe-dramaturgie. Geen model-specifieke syntax, geen verbatim brontekst. Trefwoorden: videoprompt, shot, scène, camera, camerabeweging, keyframe, commercial, reclame, faceless, explainer, Higgsfield, AV, geluid, sound design, voice-over, dramaturgie, storyboard, cinematografie."
---

# AV-prompt-principes — sterkere video/AV-prompts, model-agnostisch

Deze skill borgt de schrijfprincipes voor audiovisuele prompts. Ze zijn **model-onafhankelijk**: geen syntax van één generator, geen overgenomen brontekst — alleen de principes, herschreven in eigen woorden. Bron: repo-onderzoek MiniMax-AI/MiniMax-H3 (19 aug 2026), waarvan de gewichten en de verbatim prompt-teksten onder een Community License vielen die de EU uitsluit; daarom zijn hier uitsluitend de onderliggende principes geoogst, niet de tekst.

## De principes

- **Schrijf een shot-tijdlijn, geen losse beschrijving.** Verdeel een clip expliciet in opeenvolgende momenten (begin → midden → eind) en zeg per moment wat er in beeld gebeurt en verandert. Een AV-generator die weet wélke verandering wanneer moet vallen, levert beweging met richting in plaats van een bewegend plaatje.
<!-- oogst:avp-001 -->
(bron: MiniMax-AI/MiniMax-H3@d21241f skills/h3-prompt-writing/references/base-en.txt r.36-162 — herschreven, niet verbatim)

- **Beschrijf camera als type + amplitude + snelheid.** Noem bij elke camerabeweging drie dingen: het type (pan, tilt, dolly, orbit, push-in, handheld), hoe groot de beweging is (subtiel vs. groot), en hoe snel (traag, gelijkmatig, snel). "Langzame push-in van klein naar groot" stuurt beter dan alleen "beweeg de camera".
<!-- oogst:avp-002 -->
(bron: MiniMax-AI/MiniMax-H3@d21241f skills/h3-prompt-writing/references/base-en.txt r.36-162 — herschreven, niet verbatim)

- **Scheid diegetisch van non-diegetisch geluid.** Benoem geluid dat uit de scène zelf komt (voetstappen, stem, wind, machines) apart van geluid dat eroverheen ligt (muziek, voice-over, sfx). Zo krijg je een gelaagd audiobeeld in plaats van één ononderscheiden geluidsbrij, en houd je regie over wat op de voorgrond staat.
<!-- oogst:avp-003 -->
(bron: MiniMax-AI/MiniMax-H3@d21241f skills/h3-prompt-writing/references/ref-en.txt r.161-168 — herschreven, niet verbatim)

- **Kies concreet boven abstract.** Vervang stemmingswoorden ("mooi", "episch", "dynamisch") door waarneembare details: licht (richting, kleur, hardheid), materiaal, textuur, kledingstuk, exacte handeling. Een generator rendert wat zichtbaar is, niet wat je voelt; concrete details zijn de enige knoppen die hij echt kan draaien.
<!-- oogst:avp-004 -->
(bron: MiniMax-AI/MiniMax-H3@d21241f skills/h3-prompt-writing/references/base-en.txt r.36-162 — herschreven, niet verbatim)

- **Regisseer met keyframe-dramaturgie.** Denk in sleutelbeelden: bepaal het openingsbeeld en het slotbeeld en laat de generator de weg ertussen invullen; leg de dramatische wending (de "act break") bewust op een keyframe. Bij first-frame/last-frame-modellen is dit letterlijk je sturing; bij andere blijft het een sterke manier om spanning op te bouwen.
<!-- oogst:avp-005 -->
(bron: MiniMax-AI/MiniMax-H3@d21241f skills/h3-prompt-writing/references/base-en.txt r.36-162 — herschreven, niet verbatim)

## Wat NIET overnemen
- De model-specifieke H3-promptsyntax en tags — niet overdraagbaar naar Higgsfield of andere generators.
- Verbatim voorbeeldprompts uit de bron — Community License sluit EU-gebruik uit; alleen de principes zijn geoogst.

## UGC-realisme, pacing en imperfectie — cue-banks (bron: arcads-onderzoek 27 aug 2026)

Voor UGC- en testimonial-video (selfie-stijl, een echte mens, nadrukkelijk geen model) gelden bovenop de principes hierboven deze cue-banks. Ze zijn model-onafhankelijk (werken op Higgsfield en elke andere generator) en herschreven in eigen woorden — geen verbatim brontekst, geen merknaam.

- **Dwing huid-imperfecties af met twee à drie reality-cues.** Zonder expliciete instructie valt een AI-generator terug op een gladgestreken, airbrushed gezicht dat direct als nep leest. Noem daarom concreet: zichtbare huidtextuur, lichte sproeten, een paar lachrimpels, subtiele wallen. Echt is het doel, niet perfect.
<!-- oogst:avp-006 -->
(bron: krusemediallc/arcads-claude-code@0bfafb2 skills/arcads-external-api/prompting/prompt-library/seedance-2-ugc.md:65-92 — herschreven, niet verbatim)

- **Verbied dermatologische termen.** Vraag om natuurlijke imperfectie, niet om een huidaandoening: woorden als acne, puistjes, uitbraken of rosacea sturen het beeld naar een medische close-up. Echt ≠ dermatologisch — hou het bij textuur en lichte oneffenheid.
<!-- oogst:avp-007 -->
(bron: krusemediallc/arcads-claude-code@0bfafb2 seedance-2-ugc.md:92 — herschreven, niet verbatim)

- **Zet altijd een expliciete pacing-cue.** AI-videogeneratoren praten standaard onnatuurlijk snel. Schrijf in elke toon-/regieaanwijzing letterlijk het tempo voor: pauzes, adembeats, rustig menselijk ritme. "Rustig, met pauzes tussen de zinnen" is een echte knop; zonder die cue ratelt de spreker de tekst af.
<!-- oogst:avp-008 -->
(bron: krusemediallc/arcads-claude-code@0bfafb2 seedance-2-ugc.md:198-204 — herschreven, niet verbatim)

- **Wissel spraak af met stille beats en filler words.** Niet elke beat hoeft dialoog. Een stille handeling (product inspecteren, een slok nemen, het etiket lezen, reageren met een blik) leest authentieker dan volgepropte tekst. En echte mensen gebruiken stopwoorden ("oké dus", "eigenlijk", "gewoon") — een vleugje daarvan haalt de gepolijste reclame-toon eruit.
<!-- oogst:avp-009 -->
(bron: krusemediallc/arcads-claude-code@0bfafb2 seedance-2-ugc.md:145,182 — herschreven, niet verbatim)

- **Hou dialoog op spreektempo binnen de looptijd.** Lees het script hardop; moet je haasten om het binnen de clip-duur te proppen, schrap dan woorden. Korte, rake zinnen boven lange uitleg. Een sweet-spot van grofweg honderd tot tweehonderdzestig woorden werkt voor een korte UGC-clip — maar het echte ijkpunt is: klinkt het ontspannen als je het voorleest.
<!-- oogst:avp-010 -->
(bron: krusemediallc/arcads-claude-code@0bfafb2 seedance-2-ugc.md:48,409 — herschreven, niet verbatim)

- **Vermijd de "reclame-verradende" woorden.** Termen als cinematic, 8k, perfect en color-graded duwen het beeld juist naar de gepolijste look die UGC ongeloofwaardig maakt. Vraag in plaats daarvan om natuurlijke telefoonkwaliteit, lichte oneffenheid, niet color-graded.
<!-- oogst:avp-011 -->
(bron: krusemediallc/arcads-claude-code@0bfafb2 seedance-2-ugc.md:243,350,415-418 — herschreven, niet verbatim)

## Geoogst uit AgriciDaniel/claude-ads, 12 sep 2026

Bron: repo-onderzoek AgriciDaniel/claude-ads (MIT, HEAD ac21644). Verse creatie-specs en AI-media-transparantie.

**Haal creatie-specs vers uit de officiele bron, niet uit geheugen; en overweeg AI-transparantie bij AI-beeld (EU).** <!-- oogst:avp-012 -->
De bron haalt creatie-specs en copy-velden per platform uit een gedateerde officiele bron; lokale notities overschrijven nooit de huidige officiele bron, en onbekend of verouderd wordt needs_input. AI-gegenereerde of gemanipuleerde media staat expliciet in de hoog-risico-lijst onder de EU-code voor transparantie van AI-content, en platform-aanbevelingen of auto-creatievarianten gelden als untrusted proposals, dezelfde poort als handwerk. Voor Lex, die AI-beeld en video-ads maakt in NL en EU: verzin geen specs uit het hoofd, en weeg transparantie en labeling bij AI-beeld. Slotcheck bij een AV-prompt voor een echte ad: verifieer aspect-ratio, duur en tekstlimiet uit de actuele Meta-bron (niet uit geheugen), en overweeg AI-transparantie bij AI-gegenereerde beelden.
(bron: AgriciDaniel/claude-ads@ac21644 ads/references/creative-source-registry.md:1-35, ads/references/compliance.md:66-84)

## Geoogst uit SandAI-org/MAGI-2-preview, 26 nov 2026

Bron: repo-onderzoek SandAI-org/MAGI-2-preview (Apache 2.0, HEAD `f68a0f9`), de inferentiecode van een open audio-videomodel. Het model zelf is 🔴 (8 Hopper-GPU's), maar de meegeleverde prompt-compiler (`inference/prompt_enhancement/prompts/t2v.md`, 1.543 regels) is een rijke bron. Herschreven in eigen woorden. <!-- oogst-sectie-magi2 -->

- **Eén hoofdgebeurtenis per shot, en elk shot eindigt op een rustig resultaat.** Geef elk tijdvak precies één hoofdhandeling met één zichtbaar afgerond gevolg, en laat een fysieke gebeurtenis (oppakken, neerzetten, gieten, botsen) binnen één tijdvak volledig uitlopen. Leg de knip pas na dat rustpunt, nooit midden in een beweging. Zo ontstaan knippen die niet "springen".
<!-- oogst:avp-013 -->
(bron: SandAI-org/MAGI-2-preview@f68a0f9 inference/prompt_enhancement/prompts/t2v.md:735-742, :1486, :1493 — herschreven, niet verbatim)

- **Houd de bewegingslast laag: één dominante snelle beweging tegelijk.** Tel wat er tegelijk beweegt: losse ledematen, handen die elkaar kruisen, contact en overdracht, haar, stof, vloeistof, glas, deeltjes, camerabeweging en tekst in beeld. Stapelt dat, kies dan één snelle hoofdbeweging en zet de rest na elkaar of trager. Toon vakmanschap met twee of drie herkenbare signaal-handelingen in plaats van een volledige simulatie. Dit is de belangrijkste reden dat AI-handen en -objecten "smelten".
<!-- oogst:avp-014 -->
(bron: SandAI-org/MAGI-2-preview@f68a0f9 inference/prompt_enhancement/prompts/t2v.md:507-525 — herschreven, niet verbatim)

- **Schrijf alleen wat er wél in beeld is, en houd een toestandsregister bij.** Beschrijf positief de toestand die je wilt zien ("de kop staat leeg op tafel"), niet wat er niet mag zijn. Leg vaste kenmerken (uiterlijk, vorm, kleur) één keer vast, en neem de eindtoestand van elk persoon of object letterlijk mee naar het volgende shot (positie, wie het vasthoudt, wat er veranderd is). Zo blijft dezelfde persoon dezelfde persoon, het probleem dat bij de proefclips van 21 nov een ánder gezicht opleverde.
<!-- oogst:avp-015 -->
(bron: SandAI-org/MAGI-2-preview@f68a0f9 inference/prompt_enhancement/prompts/t2v.md:237-250, :550-580, :1487 — herschreven, niet verbatim)

- **Kalibreer elke handeling als subtiel, gewoon, energiek of bewuste slow motion, en scheid harde eisen van vrije keuzes.** Benoem per handeling de energieklasse, want "ze kijkt op" en "ze sprint weg" vragen een andere amplitude. Splits de opdracht eerst in wat de klant letterlijk vroeg (onderwerp, volgorde, tekst, slotbeeld) en wat je zelf mag kiezen (licht, lens, kleur); de harde eisen gaan altijd voor, de vrije keuzes vul je met vaste standaardwoorden zodat verschillende runs op hetzelfde uitkomen.
<!-- oogst:avp-016 -->
(bron: SandAI-org/MAGI-2-preview@f68a0f9 inference/prompt_enhancement/prompts/t2v.md:343-393, :439-462, :1033-1045 — herschreven, niet verbatim)

### Wat NIET overnemen (MAGI-2)
- Het volledige JSON-schema (`global_layer`/`dynamic_layer`): het is getraind op dít model; Kling, Wan en Seedance lezen gewone tekst. Gebruik de principes, niet het formaat.
- De vaste duur van 10,0 seconden: modelspecifiek.
- `enhancer.py:32` (API-sleutel als constante in de broncode) en de standaard Gemini-endpoint `:33`: sleutels horen in een omgevingsvariabele, nooit in een bestand.
