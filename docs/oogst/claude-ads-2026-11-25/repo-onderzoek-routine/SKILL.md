---
name: "repo-onderzoek-routine"
description: "Vaste routine voor elk onderzoek naar een GitHub-repo, plugin, skillpakket of model: nulmeting, poorten, stoplicht-besluit en borging."
---

# Repo-onderzoek-routine

## Waarvoor deze skill dient

Lex krijgt vaak een repo, een plugin, een skillpakket of een model onder ogen en wil één antwoord: gaat dit erin, oogsten we alleen de patronen, of gaat het eruit. Deze skill legt vast hoe dat onderzoek loopt, in welke volgorde, met welke poorten, en hoe het besluit wordt geborgd. Het doel is dat Lex nooit een tool binnenhaalt die hij niet begrijpt, niet mag gebruiken, niet kan draaien of niet kwijtraakt.

Deze skill vervangt geen enkele andere werkafspraak. Hij loopt bovenop geen-verzonnen-data, grondige-analyse, kritische-sparringpartner, leraar-en-leerling en de infra-freeze.

## De trigger

Zegt Lex "Jij leidt het gehele traject" bij een repo-URL, dan betekent dat concreet:

1. Jij bepaalt de volgorde, jij stelt geen vragen die je zelf kunt uitzoeken.
2. Jij vraagt Lex alleen om iets wat alleen hij kan geven: een keuze, een sleutel, een goedkeuring, of iets van zijn Mac.
3. Jij levert aan het eind een besluit met kleur, niet een verzameling observaties.
4. Jij borgt het besluit op alle vier de sporen, zonder dat Lex daarom hoeft te vragen.

Ook zonder die zin geldt deze routine bij elke repo-URL. De zin verandert alleen wie de regie voert.

## Stap 1, de nulmeting met drie netten

Voordat je één bestand opent, werp je drie netten uit:

- **Net 1, het register.** Zoek de repo in het Notion repo-register en de Repo Bibliotheek.
- **Net 2, de handover.** Zoek in de handover-documenten.
- **Net 3, de workspace-search.** Zoek in de verbonden bronnen en de workspace.

Meld het aantal treffers per net, ook als het nul is. Zoek op alle namen waaronder het project bestaat, want repo-naam en pakketnaam verschillen vaak.

Zoek in dezelfde beweging of de behoefte ergens genoteerd staat. Staat er nergens een behoefte, dan is dat zelf al een afwijsgrond.

Zijn de netten niet leeg, dan gaat het traject niet naar onderzoek maar naar herbeoordeling (stap 2).

## Stap 2, de herbeoordeel-poort

Is de repo al eerder beoordeeld, dan doe je geen volledig nieuw onderzoek. Je toetst gericht of de oude grond nog geldt, tegen de huidige HEAD, met commit-hash en datum erbij. Blijft de grond staan, dan is het besluit ongewijzigd en ben je klaar. Is de grond weg, dan pas start je het volledige traject.

## Stap 3, de poorten op volgorde

Loop deze poorten in deze volgorde. Valt een poort dicht, dan stopt het onderzoek daar en schrijf je dat op. Je gaat niet eerst de code bewonderen.

1. **Herkomst en legaliteit.** Noemt de repo zichzelf een crack, ontbreekt een licentie, of zit er andermans gecompileerde code of sleutel in, dan is het direct afwijzen.
2. **Licentie.** Lees het LICENSE-bestand zelf. Bij een AI-model lees je de licentie op de gewichten en op de encoder, niet die op de code.
3. **Hardware.** Kan dit op Lex zijn Mac draaien. Bij lokale modellen: hoeveel moet er tegelijk resident zijn en is er een offload-pad.
4. **Ingebouwd alternatief.** Zit dit al in een platform dat Lex al betaalt, of is er een API-route in plaats van zelf hosten.
5. **Overlap.** Wat dekt het bestaande gereedschap al, en welk gat blijft echt over.
6. **Veiligheid en defaults.** De vaste scanlijst, plus telemetrie, goedkeuringsmodus en auto-update zelf nameten.
7. **Bijdrage-beleid en gegevensbescherming.** Staat er beleid in dat Lex zijn manier van werken raakt, en is er een SECURITY.md met meldkanaal.
8. **Freeze-toets.** Pas als alle poorten open staan, toets je aan de drie freeze-vragen.

## Stap 4, het orkest

Pas als de poorten open staan, kloon je de repo zelf in een wegwerp-sandbox en lees je hem. Daarna zet je het orkest in:

- **Analisten**, meerdere parallel, elk met een eigen leesgebied: architectuur, veiligheid, licentie en voorwaarden, onderhoud en bus factor, installatie en reversibiliteit, patronen om te oogsten.
- **Sceptici**, minimaal twee, met een expliciete weerleg-opdracht: bewijs dat dit besluit fout is. De sceptici zien structureel dingen die de analisten missen, dus laat ze nooit weg.

## Stap 5, de eigen nameting

Elke claim die het besluit kan kantelen, meet je persoonlijk na op bestandspad en regelnummer. Je neemt de samenvatting van een sub-agent nooit over als bewijs. Noteer bij elke nameting de HEAD-commit waarop je gemeten hebt.

## Stap 6, het stoplicht

Het besluit valt in een van deze categorieën, per onderdeel apart en niet voor de repo als geheel:

- **Groen, installeren.** Alle poorten open, reversibel binnen vijf minuten, gepind op een commit.
- **Geel, oogsten.** Het product gaat niet mee, de patronen wel. Oogsten raakt geen infrastructuur.
- **Blauw, op de radar.** De mogelijkheid is gewenst maar de route nu niet, meestal via een API of een latere versie.
- **Rood, afwijzen.** Met de grond erbij, en met een heroverweeg-trigger.
- **Geparkeerd.** Alleen met een ontdooi-trigger die uit meerdere gelijktijdige voorwaarden bestaat.

## Stap 7, de vaste secties van een besluitpagina

Elke besluitpagina heeft deze secties, in deze volgorde:

1. Oordeel in één zin, met wat je wel en wat je niet overneemt.
2. Nulmeting, drie netten met treffers per net.
3. Kloonbewijs, HEAD-commit, versie en kloondatum.
4. De poorten, per poort de uitkomst.
5. Veiligheidsscan, per punt aanwezig of afwezig.
6. Onderhoudsprofiel, bus factor, releasetempo, stuwmeer.
7. Besluit per onderdeel, met kleur.
8. Wat NIET overnemen, met de reden per regel.
9. Amputatielijst bij een goedkeuring, wat wel en niet gebruikt mag worden.
10. Heroverweeg-trigger of ontdooi-trigger, meetbaar en gelijktijdig.
11. Slotregels, freeze ongeschonden, wat er wel of niet geïnstalleerd is, en de kosten in euro's en credits.

## Stap 8, de borging op vier sporen

Een besluit is pas af als het op alle vier de plekken staat:

1. **De besluitpagina** in Notion, met de secties hierboven.
2. **Het registerblok**, één regel met kleur, datum en grond.
3. **Het handoverblok**, zodat een volgende sessie het besluit zonder context terugvindt.
4. **Een rij in de Repo Bibliotheek**, plus de geoogste patronen in het Oogst-register.

## Geoogste regels — volledige inhaalslag 17 aug 2026

Bron: alle repo-onderzoeken van 6 juli tot 17 augustus 2026, samengevoegd uit het Notion-register. <!-- oogst-sectie -->

1. **Volg de vaste volgorde van het traject.** <!-- oogst:ror-160 -->
   Doe elk repo-onderzoek in deze volgorde: drie netten, zelf klonen, analisten plus sceptici met weerleg-opdracht, kantelende claims persoonlijk nameten op pad en regel, installatie proberen in een wegwerpproject, besluit, borgen. Sla geen stap over en wissel de volgorde niet. Wijk je af, meld dan expliciet welke stap je oversloeg en waarom. (deepseek-harness)

2. **Begin met een nulmeting van drie netten en zoek ook op de behoefte.** <!-- oogst:ror-146 --><!-- oogst:ror-083 --><!-- oogst:ror-071 --><!-- oogst:ror-084 --><!-- oogst:ror-121 --><!-- oogst:ror-082 -->
   Zoek voor je één bestand opent in register, handover en workspace-search of deze repo al eerder is onderzocht, en meld het aantal treffers per net, ook als dat nul is. Stel in dezelfde beweging vast welk pakket er werkelijk in de repo zit, want repo-naam en pakketnaam verschillen vaak, en meld dat als eerste bevinding. Zoek ook of de behoefte ergens genoteerd staat: geen genoteerde behoefte is zelf een afwijsgrond. Zijn de netten leeg, dan pas kloon je zelf. (qwen-code, ruflo, remotion, Unlimited-OCR, HQ repo-register)

3. **Herbeoordeel op de oude grond tegen de huidige HEAD, niet opnieuw alles.** <!-- oogst:ror-097 --><!-- oogst:ror-106 --><!-- oogst:ror-117 --><!-- oogst:ror-122 --><!-- oogst:ror-123 --><!-- oogst:ror-137 --><!-- oogst:ror-140 --><!-- oogst:ror-056 --><!-- oogst:ror-073 -->
   Is een repo eerder afgewezen op een feitelijke grond zoals prijs, licentie, beschikbaarheid of voorwaarden, toets dan bij een nieuw verzoek eerst gericht of die grond nog geldt, met commit-hash en datum erbij. Neem een oud besluit nooit uit het geheugen over, en handel pas na de hercontrole. Open ook een herbeoordeling als de repo stilstaat maar de inhoud die je gebruikt kan zijn verouderd. Lijkt een kandidaat op iets dat je eerder afwees, noem dat precedent bij naam, pas dezelfde toets toe en benoem de verschillen die het besluit nu anders maken. Zet de uitkomst boven aan de oorspronkelijke pagina met datum en of het besluit bevestigd is. (jcode, codex-plugin-cc, claude-code-templates, Agent-Reach, obsidian-skills, shadcn/improve)

4. **Kloon zelf in een wegwerp-sandbox, draai niets en maak geen kosten.** <!-- oogst:ror-012 --><!-- oogst:ror-020 --><!-- oogst:ror-038 --><!-- oogst:ror-046 --><!-- oogst:ror-074 --><!-- oogst:ror-129 --><!-- oogst:ror-005 --><!-- oogst:ror-018 -->
   Kloon de repo read-only in een tijdelijke map of container buiten de vault en buiten elk live project, en lees de echte code zelf. Baseer geen enkel feit op een samenvatting van derden, een blogpost of de README alleen, en noteer HEAD-commit, versie en kloondatum bij het besluit. Start niets op, build niets, vul geen API-keys of env-bestanden in en maak geen kosten: het budget van een verkenning is nul euro. Ruim de clone en alle testartefacten na afloop op, bewaar bewust wat voor echt gebruik nodig is, en meld beide. (ArcReel, OpenJarvis, playwright-cli, opencodex, colibri, ui-ux-pro-max, claude-video-vision)

5. **Lees gericht met een vooraf bepaalde leeslijst en installeer alleen wat je zelf gelezen hebt.** <!-- oogst:ror-007 --><!-- oogst:ror-027 --><!-- oogst:ror-033 --><!-- oogst:ror-035 --><!-- oogst:ror-048 --><!-- oogst:ror-115 -->
   Bepaal vooraf welke bestanden en mappen je opent en noteer die lijst, zodat de dekking controleerbaar is. Installeer nooit een onderdeel dat je niet zelf integraal gelezen hebt in dezelfde sessie, ook niet uit een catalogus met goede reputatie, en kies nooit op titel of beschrijving. Noem als bewijs het aantal gelezen bestanden en de commit-hash. Kies een deterministische route zoals git plus cp in plaats van een installer die live van een branch haalt. (ArcReel, claude-code-templates, mattpocock/skills, agency-agents, shadcn/improve)

6. **Meet README, claims, defaults en versies zelf na op pad en regel.** <!-- oogst:ror-103 --><!-- oogst:ror-112 --><!-- oogst:ror-145 --><!-- oogst:ror-143 --><!-- oogst:ror-147 -->
   Toets de beloftes in de README letterlijk tegen de code, met bestand en regelnummer erbij, want een tegenspraak tussen belofte en code is zelf een afwijsgrond. Meet de standaardinstellingen zelf, in het bijzonder telemetrie, goedkeuringsmodus en automatisch bijwerken, en lees ze niet uit de documentatie. Verifieer de vijf zwaarste claims persoonlijk en steun niet op de samenvatting van een sub-agent. Stuurt het project oudere versies naar een apart legacy-domein, lees dat dan als harde versiegrens en meet eerst welke versie het doelproject draait. (ruflo, oh-my-claudecode, qwen-code, magicui)

7. **Zet de herkomst- en licentiepoort vóór alle technische analyse.** <!-- oogst:ror-124 --><!-- oogst:ror-125 --><!-- oogst:ror-087 --><!-- oogst:ror-127 --><!-- oogst:ror-008 --><!-- oogst:ror-001 --><!-- oogst:ror-025 --><!-- oogst:ror-050 --><!-- oogst:ror-089 --><!-- oogst:ror-100 -->
   Wijs direct af als de repo zichzelf een crack noemt, geen licentie heeft of andermans gecompileerde code of sleutel meedraagt. Lees daarna het LICENSE-bestand en de NOTICE zelf, niet de badge, niet het licentieveld en niet wat de hostingpagina toont, en stop het onderzoek als de licentie gebruik verbiedt: dat is binair en gaat vóór kwaliteit. Noteer expliciet of letterlijk hergebruik mag, of commercieel gebruik mag, of doorverkoop en AI-training uitgezonderd zijn, en controleer ook de licentie van optionele extras. Bij een AI-model lees je de licentie op de gewichten en op de meegeleverde encoder, niet die op de code, en let je op omzetdrempels en attributieplicht. Laat kandidaten op licentie en op de taalondersteuning die Lex nodig heeft afvallen. (Youtube-VidiQ, github-to-mcp, ArcReel, Chatterbox, react-doctor, cua, Z-Image)

8. **Zoek de duurste trigger in het prijsmodel en zet een herijkmoment.** <!-- oogst:ror-077 --><!-- oogst:ror-068 --><!-- oogst:ror-009 -->
   Zoek bij elk prijs- of licentiemodel de goedkoopst ogende integratie die de duurste trigger aanzet, en benoem die vóór je advies. Leg bij een gratis licentie vast onder welke voorwaarde hij geldt en zet een herijk-moment bij de eerstvolgende grote versie, want de grondslag kan verschuiven. Benoem expliciet of de repo Lex afhankelijk maakt van een betaalde derde partij, en weeg die lock-in als afwijsgrond. (remotion, Open-Generative-AI)

9. **Doe de hardware-poort vóór de interesse-poort.** <!-- oogst:ror-080 --><!-- oogst:ror-095 --><!-- oogst:ror-096 --><!-- oogst:ror-118 --><!-- oogst:ror-128 --><!-- oogst:ror-133 --><!-- oogst:ror-149 --><!-- oogst:ror-013 -->
   Controleer bij elk model of project dat lokaal moet draaien als allereerste of het überhaupt op Lex zijn Mac kan. Bij een NVIDIA-only-eis is het gesprek in twee minuten klaar. Vraag niet of het draait, maar hoeveel er tegelijk resident moet zijn en of het script waar de README naar wijst een offload-pad heeft. Behandel VRAM, RAM en schijf als één gelaagde staging-store en maak de opslag-rekensom expliciet in GB tegen de vrije ruimte die je gemeten hebt, ook als er streaming bestaat. Schat snelheid met de vuistregel tokens per seconde is ongeveer geheugenbandbreedte gedeeld door bytes per parameter. Installeer ook niets dat een lokale CLI of een draaiende app vereist die er niet is. (Unlimited-OCR, Z-Image, colibri, odysseus, ODS, obsidian-skills)

10. **Check het ingebouwde alternatief, de gratis proefroute en de API-route voordat je zelf gaat hosten.** <!-- oogst:ror-098 --><!-- oogst:ror-099 --><!-- oogst:ror-079 --><!-- oogst:ror-132 --><!-- oogst:ror-130 --><!-- oogst:ror-131 -->
    Vraag voordat je een model zelf gaat draaien of een leverancier toevoegt eerst of het al zit in een platform dat Lex al betaalt, en meet daar de prijs. Beantwoord een kwaliteitsvraag altijd eerst met de publieke demo of playground van de maker, voor nul euro en zonder eigen hardware. Wil Lex de mogelijkheid en niet het model, neem die dan via een API en zet hem op de radar in plaats van hem te hosten. Reken uit bij welk volume zelf hosten kantelt voordat je aan eigen infrastructuur begint. (Z-Image, Unlimited-OCR, SkyReels-V2)

11. **Toets de overlap met wat Lex al heeft en houd het één-adres-principe overeind.** <!-- oogst:ror-017 --><!-- oogst:ror-044 --><!-- oogst:ror-052 --><!-- oogst:ror-134 --><!-- oogst:ror-041 --><!-- oogst:ror-045 -->
    Zet vóór elk installatiebesluit op een rij wat bestaande tools al dekken en welk gat echt overblijft, en adviseer alleen installeren voor dat gat. Leg uit waarin de nieuwe tool verschilt van wat al gekoppeld is en welk deel van het werk bij de bestaande tool blijft. Wijs af wat een tweede adres maakt voor dezelfde data, dus eigen memory, taken, agenda, documenten of mail naast wat er al is: versnippering is een zelfstandige afwijsgrond. Controleer of een vereiste MCP-server in de verbonden connectoren staat en installeer niet als de skills zonder die server niet werken. Toets tenslotte op de Nederlandse context, dus NL en DE, btw, KOR en de pakketten die hier gangbaar zijn. (claude-video-vision, perplexity-MCP, Agent-Reach, odysseus, stitch-skills, quickbooks-online-mcp-server)

12. **Draai de headline-quickstart één keer echt, op de plek waar de tool gebruikt gaat worden.** <!-- oogst:ror-086 --><!-- oogst:ror-101 --><!-- oogst:ror-102 -->
    Voer het eerste commando uit de README één keer echt uit voordat je verder onderzoekt. Doe dat niet zomaar ergens, maar in de omgeving waar Lex de tool zou gebruiken, want een blokkade in de container zegt niets over de Mac en omgekeerd. Meet de netwerkroutes apart. Deze drie minuten versmallen de vraag vaak van installeren of niet naar op de Mac of nergens. (github-to-mcp, yt-dlp)

13. **Loop een vaste veiligheidsscan af vóór installatie en haal nooit externe instructies live op.** <!-- oogst:ror-016 --><!-- oogst:ror-053 --><!-- oogst:ror-075 --><!-- oogst:ror-139 --><!-- oogst:ror-031 --><!-- oogst:ror-021 --><!-- oogst:ror-060 --><!-- oogst:ror-026 --><!-- oogst:ror-108 -->
    Rapporteer per punt aanwezig of afwezig: shell-gebruik versus execFile, command-injection, domein-allowlists, waar API-keys vandaan komen, telemetrie en analytics, netwerkaanroepen in uitvoerbare code, pre- en postinstall-scripts in de lockfile, daemons en cron, curl-pipe-bash, obfuscatie, hooks, MCP-servers, hoe credentials worden opgeslagen, en of er een schone uninstall is. Lees het installatiescript zelf en meld wat het doet: lokaal kopiëren of het netwerk op, selectief of alles, idempotent of niet. Kies waar mogelijk het pad zonder installer. Draai nooit een script dat zichzelf dev-only noemt, zeker niet als het rm -rf uitvoert op mappen die Lex beheert, en leg zo'n verbod permanent vast. Markeer subsystemen die niets met het beloofde doel te maken hebben als rode vlag die bij installatie niet geactiveerd wordt. Wijs af of meld het expliciet als een skill tijdens gewoon gebruik instructies of playbooks van een URL ophaalt en uitvoert: configuratie loopt via Lex, niet via een bestand dat de eigenaar kan wijzigen. (claude-video-vision, Agent-Reach, mattpocock/skills, emilkowalski/skills, agency-agents, OpenJarvis, react-doctor)

14. **Ga ervan uit dat telemetrie aanstaat en zet hem uit in hetzelfde commando.** <!-- oogst:ror-022 --><!-- oogst:ror-028 --><!-- oogst:ror-029 --><!-- oogst:ror-054 --><!-- oogst:ror-070 -->
    Controleer bij elke repo en elke kern-dependency of er telemetrie in zit, en zet die uit met de gedocumenteerde vlag of variabele in hetzelfde installatiecommando, niet achteraf. Noteer die exacte vlag als vaste regel bij de tool. Dit is geen afweging per repo. Is de telemetrie niet uit te schakelen, dan mag het onderdeel niet in klant- of productcode, en noteer je expliciet in welke projecten het daarom niet mag. (OpenJarvis, claude-code-templates, cua, remotion)

15. **Behandel risico op Lex zijn hoofdaccount als asymmetrisch en dispositief.** <!-- oogst:ror-057 --><!-- oogst:ror-059 --><!-- oogst:ror-116 -->
    Wijs elke tool af die de officiële client nabootst, via een third-party proxy routeert of credentialbestanden en de keychain uitleest, ook als de code verder serieus en netjes is. Het risico is schorsing van het abonnement waar de hele stack op draait, en een klein voordeel weegt daar nooit tegenop. Noem deze grond dispositief, dus hij hoeft niet tegen andere voordelen afgewogen te worden. (opencodex, jcode)

16. **Lees het bijdrage-beleid en de gegevensbescherming als vaste poorten.** <!-- oogst:ror-090 --><!-- oogst:ror-091 --><!-- oogst:ror-094 --><!-- oogst:ror-158 -->
    Controleer bij elke repo of er beleid in staat dat Lex zijn manier van werken raakt: een .NO_AI-bestand, een CLA, een gedragscode of exportbeperkingen. Verbiedt een project AI-bijdragen, dan levert Lex geen enkele bijdrage met AI, ook geen issue, pull request, review-comment of vertaling, en typt hij dat zelf, anders riskeert hij blokkade op alle repo's van die organisatie. Toets daarnaast of er iets staat over AVG, dataresidentie, jurisdictie en of er een SECURITY.md met meldkanaal is. Ontbreekt dat bij software die klantgegevens kan raken, behandel het dan als afwijsgrond en niet als detail. (yt-dlp, deepseek-harness)

17. **Meet het onderhoudsprofiel: bus factor, releasetempo, stuwmeer en release-kanaal.** <!-- oogst:ror-092 --><!-- oogst:ror-093 --><!-- oogst:ror-105 --><!-- oogst:ror-136 --><!-- oogst:ror-155 --><!-- oogst:ror-062 --><!-- oogst:ror-065 --><!-- oogst:ror-141 --><!-- oogst:ror-154 --><!-- oogst:ror-104 --><!-- oogst:ror-157 -->
    Behandel de bus factor van een gereedschapsrepo als even zwaar als de licentie: tel hoeveel mensen het kunnen onderhouden en noteer het commit-aandeel van de drukste bijdrager als hard cijfer, met de datum van de laatste commit. Reken commits van dezelfde persoon onder meerdere namen en e-mailadressen samen voordat je iets over spreiding zegt. Tel het aantal releases per week: een hoog tempo met één maintainer betekent dat elke update opnieuw geaudit moet worden, en die kosten reken je mee in het besluit. Meet ook de verhouding tussen open pull requests en merges, en controleer eerst op een stale-bot, want die maakt PR-tellers onbruikbaar en dan zijn de open issues de eerlijke maat. Liggen er reparaties klaar die de maker niet oppakt, behandel de inhoud dan als verouderd en repareer zelf. Lees welk release-kanaal de makers zelf aanraden en neem het woord stable niet als bewijs van stabiliteit. Stap niet in op een versie die zichzelf een patch-rollup noemt en zegt dat de gecureerde notities pas bij een volgende versie komen: wacht en noteer de stand in het watch-logboek. Noteer bij één maintainer een concrete herbeoordeeltermijn, bijvoorbeeld opnieuw wegen bij stilstand langer dan zes maanden. (yt-dlp, Agent-Reach, emilkowalski/skills, magicui, opencodex, obsidian-skills, qwen-code, Hermes-gereedschap-watch)

18. **Pin op een commit-hash en kopieer liever dan dat je je abonneert.** <!-- oogst:ror-015 --><!-- oogst:ror-076 --><!-- oogst:ror-107 --><!-- oogst:ror-109 --><!-- oogst:ror-114 --><!-- oogst:ror-067 -->
    Pin elke externe plugin, dependency en oogst op een exacte versie of commit en laat nooit een latest-verwijzing staan, want auto-update is een supply-chain-risico. Meld in welk bestand de pin staat. Stel bij gereedschap dat al draait vast welke commit erin zit en niet welk versienummer, want beveiligingsreparaties worden samengevoegd zonder versieophoging. Staan er ongereviewde branches open, pin dan op de merge-hash die je zelf gelezen hebt en volg main niet. Kopieer bij bus factor 1 de gewenste onderdelen naar een eigen plek in plaats van je te abonneren op een altijd-actuele bundel. Bewaar de meegeleverde licentietekst als bewijs van de voorwaarden op het moment van ingebruikname. Lever een oogst als één gepind pakket. (claude-video-vision, remotion, Agent-Reach, oh-my-claudecode, mattpocock/skills)

19. **Toets de freeze op risico in drie vragen en meet reversibiliteit aan wat achterblijft.** <!-- oogst:ror-110 --><!-- oogst:ror-119 --><!-- oogst:ror-120 --><!-- oogst:ror-148 --><!-- oogst:ror-113 --><!-- oogst:ror-063 --><!-- oogst:ror-055 --><!-- oogst:ror-085 --><!-- oogst:ror-151 --><!-- oogst:ror-152 -->
    De freeze gaat over risico, niet over de kalender. Vraag 1: is er iets kapot dat nu tijd, geld of rust kost, dan repareren. Vraag 2: is het binnen vijf minuten volledig terug te draaien én raakt het niets dat live staat, dan nu doen. Vraag 3: is dit een framework dat zich vastbijt met hooks op elke prompt of tool-call, of dat globale configuratiebestanden herschrijft, dan achter de freeze. Eén rood antwoord houdt de installatie tegen. Meet reversibiliteit aan wat er na verwijderen achterblijft, niet aan het bestaan van een uninstall-commando: noem de achterblijvende paden en wat erin staat, en blijft er een map met sleutels, tokens of geschiedenis staan, dan is het niet reversibel. Zet de kaders in een tabel: reversibel, read-only, geen infra, geen lock-in, geen sleutels, geen geld, plus huidige prioriteit en eerdere afwijzingen. Weeg leercurve, systeemeisen en schijfruimte mee als kosten, want de freeze bewaakt aandacht en niet alleen maandlasten. (werkafspraak 4 aug, colibri, Youtube-VidiQ, qwen-code, oh-my-claudecode, remotion, shadcn/improve, ruflo)

20. **Geef een oordeel in één zin en hak het besluit op in onderdelen met eigen kleur.** <!-- oogst:ror-010 --><!-- oogst:ror-011 --><!-- oogst:ror-156 --><!-- oogst:ror-144 --><!-- oogst:ror-142 --><!-- oogst:ror-023 -->
    Zet boven elke analyse een oordeel in één zin met wat je wel en wat je niet overneemt, en zet de onderbouwing daaronder. Beoordeel daarna elk onderdeel apart met een eigen kleur en een eigen grond, want een repo kan tegelijk niet installeerbaar zijn en waardevolle patronen bevatten, en een verzameling losse componenten is geen ja of nee op een framework. Scheid altijd het product van de patronen. Benoem of een tool analyseert of uitvoert: een analyzer levert een audit met geprioriteerd actieplan en de uitvoering blijft bij Claude Code zelf. Schrijf bij een afwijzing expliciet dat het oordeel over fit, defaults, timing of hardware gaat en niet over kwaliteit, als dat zo is. (Open-Generative-AI, deepseek-harness, magicui, qwen-code, claude-seo)

21. **Oogst patronen in plaats van een framework te adopteren.** <!-- oogst:ror-002 --><!-- oogst:ror-019 --><!-- oogst:ror-030 --><!-- oogst:ror-036 --><!-- oogst:ror-037 --><!-- oogst:ror-042 --><!-- oogst:ror-043 --><!-- oogst:ror-051 --><!-- oogst:ror-135 --><!-- oogst:ror-040 --><!-- oogst:ror-024 --><!-- oogst:ror-014 --><!-- oogst:ror-034 -->
    Installeer geen tweede dwingende besturingslaag naast de eigen werkafspraken en geen tweede of derde orkestratielaag naast de bestaande keten, want dat levert fragmentatie op. Beoordeel daarvoor of het pakket om de regie vecht: zonder control-layer-botsing is oogsten als referentie veilig, met botsing wijs je af. Behandel een grote agent- of skillcollectie als leverancierscatalogus en pik losse onderdelen die je volledig gelezen hebt, zeker als de kwaliteit binnen de verzameling wisselt, en benoem welke sterk zijn en welke dun. Zit de waarde in de tekst, bijvoorbeeld bij een naslagrepo, dan oogst je de regels, installeer je niets en is de freeze-toets niet eens nodig. Oogst alleen wat werkt zonder de afhankelijkheden van dat pakket. Is een repo actief onderhouden en open en past hij, gebruik hem dan als leverancier in plaats van hem na te bouwen, en bouw hooguit een dunne eigen laag. Bij concurrent- en voorbeeldanalyse herbouw je patronen in eigen stijl en neem je nooit copy, design, merknamen of materiaal letterlijk over. (agentic-stack, OpenJarvis, agency-agents, superpowers, stitch-skills, Hermes-Kanban, system-prompts-and-models-of-ai-tools, andrej-karpathy-skills, claude-seo, rocketplanner.nl, faceless-YouTube-onderzoek)

22. **Geef elke oogst een vaste vorm en sluit af met wat je niet overneemt.** <!-- oogst:ror-006 --><!-- oogst:ror-004 --><!-- oogst:ror-088 --><!-- oogst:ror-066 --><!-- oogst:ror-061 -->
    Beschrijf elk geoogst patroon met vier vaste velden: wat het is in de bron met exact bestandspad als provenance, waarom het relevant is voor Lex, naar welke eigen skill of component het vertaalt, en één concreet eerste implementatiestapje. Sluit elke extractie af met een sectie Wat NIET overnemen, met per regel de reden. Lever bij een goedkeuring een amputatielijst van precies welke onderdelen wel en niet gebruikt mogen worden, en wijk daar niet van af. Voeg bij elke externe skill die je installeert een huisregel toe op de plek waar hij botst met de eigen werkafspraken, en controleer dat die huisregel na herinstallatie precies één keer in het bestand staat. Wijs een externe werkwijze niet af met het argument dat een eigen skill het al dekt zolang die eigen skill alleen een houding beschrijft: een houding vervangt geen checklist, dus benoemde checklists, faalmodi en procedures zijn een aanvulling. (ArcReel, codex-plugin-cc, mattpocock/skills)

23. **Sluit elk nee en elk later af met een meetbare trigger of drempel.** <!-- oogst:ror-064 --><!-- oogst:ror-069 --><!-- oogst:ror-072 --><!-- oogst:ror-081 --><!-- oogst:ror-126 --><!-- oogst:ror-150 --><!-- oogst:ror-159 --><!-- oogst:ror-058 --><!-- oogst:ror-078 --><!-- oogst:ror-138 --><!-- oogst:ror-047 -->
    Een nee zonder heroverweeg-trigger is verboden, en een ooit nog eens ook. Schrijf de triggers als toetsbare voorwaarden die allemaal tegelijk moeten gelden, met per trigger een controleerbaar commando, een codepunt of een geturfde meting over een genoemde periode. Een vermoeden is geen trigger. Houd bij een nee het install-plan paste-klaar op de detailpagina. Leg bij elk later een meetbare drempel vast in aantallen en herhalingen, bijvoorbeeld minstens tien rijen die naar verwachting meer dan één keer opnieuw verwerkt worden, en zeg erbij dat bij N is 1 de bestaande route altijd wint. Spreek bij elk nieuw gereedschap vooraf af hoe je na een vast aantal gebruiken meet of het waarde toevoegt en bij welke drempel het er weer uit gaat. Zet niet alle mogelijkheden van een tool meteen aan: activeer alleen wat zonder configuratie werkt en wacht met de rest tot er een concrete klus is. (opencodex, mattpocock/skills, ruflo, colibri, qwen-code, deepseek-harness, remotion, Unlimited-OCR, Agent-Reach)

24. **Borg het besluit, bewijs de installatie en hang de watch aan een bestaande routine.** <!-- oogst:ror-111 --><!-- oogst:ror-039 --><!-- oogst:ror-003 --><!-- oogst:ror-049 --><!-- oogst:ror-153 --><!-- oogst:ror-032 -->
    Bewijs een installatie met een byte-identieke diff tegen de bron en een tweede run die identiek is, en meld de mechaniek die je zelf gelezen hebt. Vergelijk periodiek wat er werkelijk geïnstalleerd staat met wat op de besluitpagina staat, en vul ontbrekende onderdelen alsnog op die pagina in zodat de inventaris compleet is. Archiveer een afgewezen maar officieel en actief project als patroonbron met een terugkeerpunt, en schrijf erbij onder welke omstandigheid het alsnog relevant wordt. Houd een wekelijkse watch op releases van gereedschap dat Lex gebruikt en noteer per release wat het voor de eigen stack betekent, en hang een nieuwe terugkerende controle aan die bestaande watch in plaats van een nieuwe geplande taak aan te maken. Sluit elke onderzoekssessie af met slotregels: infra-freeze ongeschonden, wat er wel of niet op de Mac geïnstalleerd is, en de kosten in euro's, credits en keys. (agency-agents, quickbooks-online-mcp-server, gereedschap-watch, Agent-Reach, qwen-code)

## 🔒 Afsluitpoort: de laatste meter hoort bij dit onderzoek

Toegevoegd 17 aug 2026 na een gemeten fout. Tussen 5 en 17 augustus beloofden **21 handover-blokken** een landing in een skill zonder dat die landing gebeurde. De oorzaak was niet vergeetachtigheid maar een verkeerde definitie van klaar: een onderzoek gold als afgerond zodra het besluit op vier sporen geborgd was. Oogsten stond daarna, buiten het onderzoek, als losse belofte. Alles wat buiten de poort valt, gebeurt niet.

**Vanaf nu is een repo-onderzoek pas af als alle vijf punten waar zijn. Niet vier van de vijf.**

<!-- oogst:ror-161 -->
1. **Elk 🟢-patroon heeft een doel-skill en een merkteken.** Zet bij het besluit per patroon meteen de doel-skill erbij. Een patroon zonder doel-skill is geen oogst maar een aantekening, en die telt niet mee in de oogstlijst van het blok.

<!-- oogst:ror-162 -->
2. **De skill-bestanden zijn in dezelfde sessie geschreven.** Niet beschreven, geschreven. De regel staat als tekst met merkteken `<!-- oogst:id -->` in de SKILL.md, en de oorspronkelijke inhoud van die skill staat er woord voor woord nog in. Toets dat met een vergelijking op de frontmatter en op de oude tekst als voorloop.

<!-- oogst:ror-163 -->
3. **De bestanden staan in de vault, in dezelfde beurt als de levering.** Pad: `LXY-Vault/00-System/cowork-start/skills-vault/`, met `bron-<datum>/` als leidende kopie en `geleverd-<datum>/` voor de `.skill`-bestanden. Geleverd in de chat is niet bewaard. Een container wordt opgeruimd, de vault niet.

<!-- oogst:ror-164 -->
4. **De rijen in het Oogst-register staan op 🟠 Geleverd, met bewijs.** Bewijs is een pad plus regelnummer of een merkteken-id, niet een omschrijving. Pas als de peiling het merkteken in het account terugvindt, gaat de rij op 🟢 Geland.

<!-- oogst:ror-165 -->
5. **Het slotbericht noemt precies welke bestanden Lex nog moet opslaan.** Eén regel per bestand, op één plek, aan het eind. Niet druppelsgewijs verspreid door de sessie. Dit is de enige handeling in de hele keten die Claude niet zelf kan doen, dus die maak je zo klein en zo zichtbaar mogelijk.

**Waarom deze poort werkt en de vorige afspraak niet.** De vorige afspraak stond in proza en beschreef een intentie. Deze poort staat op de plek waar het onderzoek eindigt en noemt vijf dingen die je kunt meten. Een poort die je niet kunt meten, gaat nooit af. Zie ook `geen-blinde-vlekken`, regel over twee maten, en `handover-systeem`, merkteken hov-041.

## Geoogste regels — OmniRoute (28 aug 2026)

Bron: repo-onderzoek diegosouzapw/OmniRoute (MIT, HEAD 7c04e75), een LLM-gateway. <!-- oogst-sectie-omniroute -->

<!-- oogst:ror-166 -->
25. **Meet bij secrets-opslag of versleuteling-in-rust standaard UIT staat.** Voeg aan de veiligheidsscan (poort 6) toe: waar bewaart de tool API-keys en OAuth-tokens, en is at-rest-encryptie default aan of default uit. OmniRoute versleutelt pas met AES-256-GCM als `STORAGE_ENCRYPTION_KEY` gezet is; het `.env.example` levert die leeg, dus op een verse install staan alle sleutels en tokens plat in `~/.omniroute/storage.sqlite` — de passthrough-mode logt het zelfs. Provenance: `src/lib/db/encryption.ts` (passthrough-mode), `.env.example:77`. Een tool die klant- of eigen sleutels plat wegschrijft op default is een afwijs- of hardeningsgrond, geen detail. (OmniRoute)

<!-- oogst:ror-167 -->
26. **Waardeer een twee-traps opt-in als veilige default en oogst hem.** De sterkste veilige-default die je kunt tegenkomen: splits een risicovolle feature in "zichtbaar" (UI ontgrendeld) en "actief" (netwerk/data draait), beide default uit, zodat aanzetten nooit stilzwijgend verkeer start. OmniRoute doet dit expliciet: een module staat off by default, enablen ontgrendelt alleen de UI, en data-sync is een aparte tweede opt-in. Dit generaliseert de PAUSED-discipline (`ads`) naar elke risicovolle vlag. Provenance: `src/shared/constants/featureFlagDefinitions.ts`. Toets het bij eigen bouw: heeft elke risicovlag een aparte `visible`- en `active`-schakelaar. (OmniRoute)

<!-- oogst:ror-168 -->
27. **Controleer of `.gitignore` álle logformaten dekt die een agent tijdens gebruik wegschrijft.** Voeg aan de veiligheidsscan (poort 6) toe: een skill die de agent opdraagt elke actie te loggen in een git-tracked bestand (prompts, klant-/product-ID's, gegenereerde URL's) lekt die data bij de eerste push. Meet het zelf, lees het niet uit de `.gitignore`-tekst: draai `git check-ignore <logpad>` en `git ls-files <logmap>` op de kloon. Staat het meegeleverde logbestand al vol met de data van de maker, dan is dat het bewijs dat het lek echt is en niet theoretisch — en een AVG-afwijsgrond voor software die klantgegevens raakt. Gemeten fout in krusemediallc/arcads-claude-code@0bfafb2: `.gitignore:13` dekte alleen `*.log`, terwijl de agent naar `logs/*.jsonl` moest loggen en dat bestand git-tracked was (`git check-ignore logs/arcads-api.jsonl` → niet genegeerd). (arcads-claude-code)

## Geoogste regels — munder-difflin (29 aug 2026)

Bron: repo-onderzoek chaitanyagiri/munder-difflin (MIT, HEAD `956bfb4`), een multi-agent harness. Twee scan-lessen. <!-- oogst-sectie-munder-difflin -->

<!-- oogst:ror-169 -->
28. **Scan of een tool GLOBALE agent-config schrijft en de permissie-prompt UITZET.** Voeg aan de veiligheidsscan (poort 6) toe: schrijft de tool in `~/.claude/settings.json`, `~/.claude.json` of de home van een andere provider (`~/.codex`, `~/.gemini`, `~/.grok`), en zet hij daarbij `skipDangerousModePermissionPrompt`/`skipAutoPermissionPrompt` of spawnt hij default met `--permission-mode bypassPermissions`? Munder Difflin doet allebei **automatisch, zonder knop**, bij elke claude-spawn, en de globale verzwakking **blijft staan na de-installatie** (`config.ts:805-809` + `:425`, aangeroepen op `index.ts:2862`). Zo'n automatische, na-de-installatie-blijvende verzwakking van de HITL-poort is een **dispositieve** afwijs-/freeze-vraag-3-grond, geen detail — meet het altijd zelf op pad en regel, want het staat zelden in de README. (munder-difflin)

<!-- oogst:ror-170 -->
29. **Herken een harde-allowlist-gespiegeld-aan-een-publiek-doc telemetriecontract, en "source-build stuurt niets", als GROENE governance-default.** De tegenhanger van een afwijsgrond: soms is de telemetrie juist voorbeeldig. Munder Difflin spiegelt elke gebeurtenis aan een publiek `TELEMETRY.md` als harde allowlist die in code wordt afgedwongen (`analytics.ts`), injecteert de PostHog-key pas bij de release-build zodat een dev/fork/**source-build de key leeg heeft en niets stuurt** (`analytics.ts:191` `if (!__POSTHOG_KEY__) return`), zet GeoIP uit en respecteert `DO_NOT_TRACK`. Crediteer zo'n default expliciet (zoals ror-166 de at-rest-encryptie crediteert), en trek de praktische conclusie: **zelf uit de bron bouwen neutraliseert de telemetrie volledig** — noteer de exacte opt-out (`DO_NOT_TRACK=1`) als vaste regel bij de tool. (munder-difflin)

## Geoogste regels — ScrapeGraphAI/Scrapegraph-ai (31 aug 2026)

Bron: repo-onderzoek ScrapeGraphAI/Scrapegraph-ai (MIT, HEAD `532dfff`, v2.2.2), een LLM-web-scraper. Twee scan-lessen over telemetrie. <!-- oogst-sectie-scrapegraphai -->

<!-- oogst:ror-171 -->
30. **Meet WÁT de telemetrie-payload draagt, niet alleen ÓF er telemetrie is.** Uitbreiding op poort 6 en op ror-014/054/166: een tool kan "telemetrie" hebben die je werk-product zélf exfiltreert. Open de payload-bouwer en lees welke velden mee gaan — draagt hij de user-prompt, de doel-URL, de ruwe input-content en/of het model-antwoord? scrapegraphai stuurt op default bij elke succesvolle graph-run de volledige `website_content` + `user_prompt` + `json_schema` + `llm_response` (de geëxtraheerde data) + doel-`url` naar een render.com-endpoint. Provenance: `scrapegraphai/telemetry/telemetry.py:115-122` (payload-dict) + `:12` (`TRACK_URL = https://sgai-oss-tracing.onrender.com/v1/telemetry`), bedraad in het basis-uitvoeringspad `scrapegraphai/graphs/base_graph.py:296` en `:326`. Content-dragende telemetrie is een AVG-exfiltratie van de scrape-inhoud, geen anonieme usage-ping → afwijs- of hardeningsgrond voor klant- of productcode, niet een detail. (ScrapeGraphAI/Scrapegraph-ai)

<!-- oogst:ror-172 -->
31. **Test de gedocumenteerde opt-out zelf; vertrouw de vlag niet.** Uitbreiding op ror-006/ror-014: een env-var of config-vlag die "opt-out" heet, kan stuk zijn. Draai de opt-out-logica zelf na — op pad+regel of empirisch met een losse reproductie — en lees hem niet uit de README. Gemeten in scrapegraphai@532dfff: `SCRAPEGRAPHAI_TELEMETRY_ENABLED=false` zet telemetrie NIET uit. De env-tak (`scrapegraphai/telemetry/telemetry.py:47-53`) gebruikt de aanwezigheid van de env-var alleen als trigger om de *config-file*-boolean `telemetry_enabled` te herlezen, niet de env-waarde zelf; zonder `~/.scrapegraphai.conf` gooit dat een exceptie (pass) en blijft de default `True` staan. Empirisch nagemeten (losse kopie van de functie): env=false + geen conf → `True`. De WERKENDE opt-outs zijn `telemetry_enabled = false` in `~/.scrapegraphai.conf` óf `scrapegraphai.telemetry.disable_telemetry()` in code vóór elke run. Noteer altijd de bewezen-werkende opt-out als vaste regel bij de tool, nooit de gedocumenteerde-maar-ongeteste. (ScrapeGraphAI/Scrapegraph-ai)


## Geoogste regels, agency-agents herbeoordeling (12 sep 2026)

Bron: herbeoordeling msitarzewski/agency-agents (MIT, HEAD `6d29a9b`, 8 sep 2026), een agent-collectie (325 md, 297 bron-agents in 18 divisies). Eén scan-verfijning. <!-- oogst-sectie-agency-agents-2 -->

<!-- oogst:ror-173 -->
32. **Meet het install-pad van de specifieke doel-vlag, niet de installer als geheel.** Uitbreiding op poort 13 en op ror-169: één `install.sh` kan per `--tool`-doel een totaal ander risicoprofiel hebben, dus beoordeel het exacte vlag-pad dat Lex draait en laat een schone route de andere routes niet vrijpleiten (en omgekeerd). Gemeten in agency-agents@6d29a9b: `--tool claude-code` is puur lokaal kopiëren (`install_claude_code()` rond regel 758, doel `resolve_dest claude-code "${HOME}/.claude/agents"`, `install_file` is `cp` op regel 282), geen config-write, geen netwerk, geen telemetrie. Maar `--tool hermes` roept `ensure_hermes_plugin_enabled()` (regel 1063 e.v.) aan, die de Hermes-`config.yaml` `plugins.enabled` herschrijft via een python-heredoc (regel 1070 maakt eerst een `.bak`-backup, en er is zelfs een CI-regressietest `check-hermes-config-rewrite`). Dat tweede pad is netjes gebouwd (backup plus test), maar het blijft een config-herschrijving van een andere provider die Lex draait, dus freeze-vraag-3-materiaal. Praktische regel: kies `--tool claude-code` voor de cherry-pick, draai nooit `--tool hermes` tenzij je die Hermes-config-wissel bewust wilt. De les generaliseert: turf het gedrag per subcommando en per vlag, want "de installer is schoon" is nooit een uitspraak over de installer maar over precies één pad erdoorheen. (agency-agents)

## Geoogste regels — Everything Claude Code / affaan-m/ECC (12 sep 2026)

Bron: repo-onderzoek affaan-m/ECC (echte naam "Everything Claude Code", npm `ecc-universal` v2.2.1, MIT, HEAD `8321021c`), een Claude Code-plugin/agent-harness (68 agents, 292 skills, hooks). Product 🔴 afgewezen op fit/footprint (niet veiligheid), patronen rijk geoogst. Drie scan-lessen. <!-- oogst-sectie-ecc -->

<!-- oogst:ror-174 -->
33. **Draai een supply-chain-IOC-scan tegen elke kloon vóór je npm/pip install overweegt.** Uitbreiding op de nulmeting en poort 6: een gekloonde repo kan een bekend-gecompromitteerde package-versie of een agent-persistentie-payload meedragen. ECC levert een standalone scanner (alleen fs/crypto/os/path, geen deps) die manifests, lockfiles en AI-tool-configs aftast op een onderhouden IOC-dataset: circa 200 gecompromitteerde package@versies (o.a. node-ipc 9.1.6 tot 12.0.1, TanStack- en @mistralai-clusters, Mini Shai-Hulud), exfil-indicatoren (169.254.169.254 cloud-metadata, catbox-payloads, shai-hulud-workflow.yml) en payload-hashes, en het let specifiek op persistentie in `~/.claude/`, `.cursor/`, `.vscode/`, `LaunchAgents/` en `.github/workflows/`. Non-zero exit is een rood stoplicht. Provenance: `scan-supply-chain-iocs.js:14` (MALICIOUS_PACKAGE_VERSIONS), `:215` (CRITICAL_TEXT_INDICATORS), `:357`/`:414` (persistentie-paden), `:841` (exit-code); `supply-chain-advisory-sources.js:15` (9 gecureerde bronnen CISA/Wiz/Socket/StepSecurity, minimaal 8 vereist). Let op: het is een handmatige/CI-scan, geen pre-install hook, dus je draait hem zelf. Eerste stap: kopieer beide .js-bestanden naar een `scripts/`-map bij deze skill en draai `node scan-supply-chain-iocs.js --root <kloon>` als vaste poort in de nulmeting, vóór de licentie- en bus-factor-netten. (ECC/Everything Claude Code)

<!-- oogst:ror-175 -->
34. **Voer nooit een repo-meegeleverd install- of build-script uit zonder eerst de herkomst van de root te verifiëren.** Uitbreiding op poort 1 en poort 13: een gekloonde repo kan een genest `evil/{package.json, scripts/install-apply.js}` meesmokkelen; draai je blind het script, dan voer je aanvallerscode uit (ECC noemt GHSA-hfpv-w6mp-5g95 expliciet). ECC's verweer: vóór executie leest het `package.json.name` en weigert te draaien als de naam geen verwachte upstream is. Provenance: `auto-update.js:133-159` (validateRepoRoot, ECC_PACKAGE_NAMES, throw "Refusing to run install from untrusted repo root"). Eerste stap: voeg aan het stoplicht-besluit één regel toe: vóór het draaien van welk repo-meegeleverd script dan ook, bevestig dat `package.json.name` en de repository-URL de verwachte upstream matchen; zo niet, rood. (ECC/Everything Claude Code)

<!-- oogst:ror-176 -->
35. **Meet of het eigen commerciële product van de maintainer in de defaults, skills en zelfs de "neutrale" tooling is geweven, en weeg maintainer-COI als fit- en onafhankelijkheidsgrond.** Uitbreiding op poort 11 (overlap/één-adres) en op ror-166 (crediteer defaults): soms is de grond niet veiligheid maar belang. In ECC (bus factor 1: Affaan Mustafa is circa 57% van 2700 commits onder vier e-mails, waaronder affaan@itomarkets.com; de tweede mens haalt circa 10%) stuurt de auteur naar zijn eigen bedrijf Itô/Nasiko: de npm-welcome en de compute-sponsor-copy bakken Itô in als "preferred compute sponsor", vijf `ito-*`/`nasiko-*`-skills zijn meegeleverd, en zelfs de security- en audit-tooling is geïnstrumenteerd voor de commerciële projectadministratie (de platform-audit eist pass/fail dat de roadmap naar `linear.app/itomarkets` verwijst; de supply-chain-watch rapporteert naar Linear-issue ITO-57). Het is netjes gebouwd en meestal opt-in, maar het maakt het framework geen neutrale infrastructuur. Provenance: `compute-sponsor.js:3` (ITO_COMPUTE_URL), `ito.js:14` (CANONICAL_REPOSITORY Ito-Markets/ito-cloud-runtime), `platform-audit.js:454` (roadmap eist linear.app/itomarkets + ITO-44 + ITO-59), `supply-chain-advisory-sources.js:294` (issueId ITO-57). Eerste stap: voeg aan poort 6/11 een sub-check toe: wie profiteert commercieel van adoptie, en zit dat belang in de defaults of alleen in opt-in? Bij verwevenheid tot in de "neutrale" tooling: behandel als fit-grond en oogst hooguit de losse patronen. (ECC/Everything Claude Code)

## Geoogste regels, Osmantic ODS herbeoordeling (13 sep 2026)

Bron: herbeoordeling Osmantic/ODS (Apache 2.0, HEAD `21f4b3a`, stabiel v2.6.0), een een-commando lokale AI-server. Oorspronkelijk besluit 16 aug 2026 was 🔴 niet installeren op hardware-grond. Een scan-verfijning. <!-- oogst-sectie-ods-herbeoordeling -->

<!-- oogst:ror-177 -->
36. **Meet bij een lokale-inferentie-repo het native-host installatiepad apart van de Docker-overlay voordat je "geen GPU-route" concludeert, en bouw nooit een heroverweeg-trigger op een valse hardware-premisse.** Uitbreiding op poort 3 (hardware) en ror-149, en op de herbeoordeel-poort (ror-097). Gemeten fout: het onderzoek van 16 aug 2026 las alleen `ods/docker-compose.apple.yml` (CPU-only, want Docker op macOS heeft geen Metal-passthrough, `:3-4`) en concludeerde "🔴 geen route op de Mac", met als enige heroverweeg-trigger "aanschaf van een aparte NVIDIA-machine". Maar er stond een apart native-host pad in dezelfde repo, `ods/installers/macos/install-macos.sh:7` en `ods/installers/macos/docker-compose.macos.yml:2,12`, dat llama-server native op de macOS-host draait met Metal-GPU op Apple Silicon (M1+), met de rest in Docker. `git show v2.6.0:ods/installers/macos/docker-compose.macos.yml` bewees dat dit pad al in de geevalueerde versie zat: het was een gemiste grond, geen wijziging. De les: bij elke repo die lokaal moet draaien turf je expliciet elk installatiepad (Docker-overlay en native-host apart), want een 🔴 op de duurste overlay zegt niets over een lichter native pad; en een hardware-heroverweeg-trigger op een premisse die je nooit hebt nagemeten (hier: NVIDIA nodig) bevriest een repo stil en voor onbepaalde tijd. Zet een hardware-trigger daarom op de eigen situatie plus een concrete, toetsbare behoefte, niet op een aanname over wat de tool zou vereisen. (Osmantic/ODS)

## Geoogste regels, Autom8AI/Open-Higgsfield-AI herbeoordeling (5 nov 2026)

Bron: herbeoordeling Autom8AI/Open-Higgsfield-AI (fork, HEAD `51a850c`) tegen upstream Anil-matcha/Open-Higgsfield-AI (MIT, HEAD `4998b37`), de oude naam van Open-Generative-AI. <!-- oogst-sectie-open-higgsfield -->

<!-- oogst:ror-178 -->
37. **Doe een fork-check vóór elk onderzoek: is dit het origineel, en wat is er anders dan upstream.** Uitbreiding op de nulmeting en poort 1. Een repo-URL kan een fork van een derde zijn die zich presenteert als het project zelf. Stel daarom als eerste vast wie de upstream is (README-links, release-URL's, copyright), kloon die ernaast en draai `diff -rq --exclude=.git fork upstream`. Meet daarna drie dingen: (1) is het LICENSE-bestand meegekomen, want een fork die de MIT-tekst weglaat valt op poort 1; (2) wijst de dev- of build-config (`vite.config.*`, `next.config.*`, proxy-instellingen, `netlify.toml`) naar de eigen server van de fork-eigenaar, want dan lopen jouw verzoeken en uploads via een vreemde partij; (3) welke extra diensten met sleutels de fork toevoegt (grep op `process.env.`). Zoek de upstream-naam ook in de drie netten, want het project kan onder een nieuwe naam al beoordeeld zijn. Gemeten in Autom8AI/Open-Higgsfield-AI@51a850c: geen LICENSE terwijl upstream MIT is, `vite.config.mjs:10-25` proxyt naar `higgsfield-matu.netlify.app` en naar `api.kie.ai` met `secure: false`, en vijf extra betaalde diensten; upstream stond al als Open-Generative-AI in het register (26 jun 2026). (Autom8AI/Open-Higgsfield-AI)

## Geoogste regels, paperclipai/paperclip (7 nov 2026)

Bron: repo-onderzoek paperclipai/paperclip (MIT, HEAD `84908d1`, 7 nov 2026), een orkestratie-app voor teams van AI-agents. Twee scan-lessen. <!-- oogst-sectie-paperclip -->

<!-- oogst:ror-179 -->
38. **Meet een permissie-bypass altijd samen met de isolatie-default en het platform waarop die isolatie werkt.** Uitbreiding op poort 6 en ror-169: een vlag als `--dangerously-skip-permissions` is pas gevaarlijk of onschuldig in combinatie met waar de agent draait. Meet daarom drie dingen tegelijk: (1) de default van de bypass, (2) of geïsoleerde werkmappen of sandboxes standaard aan staan, (3) op welk besturingssysteem die sandbox werkt. Gemeten in paperclip@84908d1: bypass default `true` (`packages/adapters/claude-local/src/server/execute.ts:446`), geïsoleerde werkmappen default `false` (`server/src/services/instance-settings.ts:309,315`), en de bubblewrap-sandbox is alleen Linux (`packages/adapters/claude-local/src/index.ts:79`). Op de Mac betekent dat: agents draaien zonder toestemmingsvraag in de echte projectmap. Dat is freeze-vraag-3-materiaal en botst met de vaste regel dat Claude Code bij Klanttijd nooit in automodus draait. (paperclipai/paperclip)

<!-- oogst:ror-180 -->
39. **Onderscheid bij credentials drie routes: bestaande login uitlezen, nieuw token laten aanmaken, en dat token in eigen opslag bewaren.** Uitbreiding op ror-057/059/116 (hoofdaccount dispositief): turf per route of hij standaard afgaat of pas na een gebruikersactie, en weeg alleen de routes die Lex echt zou gebruiken. Gemeten in paperclip@84908d1: de sleutelhanger-lezing van "Claude Code-credentials" gebeurt alleen bij `allowKeychain: true`, en die vlag komt buiten tests nergens voor (`quota.ts:205-208`, aanroep zonder opties `quota.ts:555`); maar de Anthropic-aanmelding in de app laat de officiële CLI een NIEUW abonnementstoken aanmaken dat Paperclip daarna in zijn eigen database bewaart (`server/src/services/local-ai-login.ts:356-357`). Conclusie per route, niet per repo: standaard op de Mac geen dispositief risico, de in-app aanmelding wel. Zet zo'n route op de amputatielijst in plaats van de hele repo erom af te wijzen. (paperclipai/paperclip)

## Geoogste regels, garrytan/gbrain (12 nov 2026)

Bron: repo-onderzoek garrytan/gbrain (MIT, HEAD `752ecbd`, v0.60.705.0), een geheugenlaag voor agents. Product 🔴 op fit (vierde geheugenadres), niet op kwaliteit. <!-- oogst-sectie-gbrain -->

<!-- oogst:ror-181 -->
40. **Schrijft een setup-commando hooks of instructieblokken in de globale agent-config, eis dan een droogloop en een uitschakelaar, en meet ze.** Uitbreiding op ror-169: `gbrain setup claude-code` zet SessionStart- en UserPromptSubmit-hooks in `~/.claude/settings.json` en een blok in `~/.claude/CLAUDE.md` (`src/commands/setup.ts:13-14`, `:128-144`), maar biedt `--dry-run` (toont wat het schrijft) en `--remove` (haalt het weg). Crediteer dat expliciet, het is de maatstaf. Een tool die globale hooks schrijft zonder droogloop én zonder uitschakelaar is rood; met beide blijft het freeze-vraag-3-materiaal, maar is reversibiliteit meetbaar. Draai bij twijfel alleen de droogloop en lees wat hij zou schrijven. (garrytan/gbrain)

<!-- oogst:ror-182 -->
41. **Tel het releasetempo per dag als het CHANGELOG duizenden versies heeft.** Uitbreiding op ror-092/093: gbrain had 1.457 releases in ruim zeven maanden (eerste commit 5 apr 2026), circa 7 per dag, met één maintainer op circa 86 procent van de commits. Deel het aantal `## [`-koppen in het CHANGELOG door het aantal dagen sinds de eerste commit. Boven één release per dag is installeren alleen verantwoord op een gepind stable-kanaal, en is "elke update opnieuw auditen" in de praktijk onhaalbaar: weeg dat als zelfstandige afwijsgrond voor iets dat in de globale config draait. (garrytan/gbrain)

## Geoogste regels, Agent-Reach herbeoordeling 3 (14 nov 2026)

Bron: herbeoordeling Panniantong/Agent-Reach (MIT, HEAD `c70ae6d`, v1.6.1), een leeslaag voor agents. Drie scan-lessen. <!-- oogst-sectie-agent-reach-3 -->

<!-- oogst:ror-183 -->
42. **Zoek in code-commentaar naar opgeheven beleid, en weeg het kopiëren van logins uit de eigen browser als dispositief.** Uitbreiding op poort 6 en op regel 15 (hoofdaccount): grep op zinnen als "removed the ... policy", "no longer dedicated-only" of "use existing browsers", want een maker schrijft een versoepeling vaak alleen in een docstring en niet in de README. Meet daarna of de tool cookies uit Lex zijn eigen browser haalt en in een eigen browser zet, en of die eigen browser een anti-detectie- of stealth-browser is. Gemeten in Agent-Reach@c70ae6d: `agent_reach/runtime/session_reuse.py:1-4` ("The user removed the dedicated-only policy. Use existing connected browsers ... before requesting a human login"), kopiëren per site op `:54-79` en `:113-125`, en de voorkeursbrowser is CloakBrowser ("stealth Chromium that passes every bot detection test", gesloten binary, `agent_reach/runtime/tools.py:57`). Hoofdaccount-logins in een anti-detectiebrowser zijn ban-risico op het account zelf: dispositief, dus zet de koppeling (hier de OpenCLI-extensie in de eigen Chrome) op de amputatielijst in plaats van de hele repo af te wijzen. (Agent-Reach)

<!-- oogst:ror-184 -->
43. **Tel in hoeveel AI-homes een setup de skill koppelt, tegen de echte home-mappen op Lex zijn Mac, en pin op de commit die het afkoppelen bevat.** Uitbreiding op regel 11 (één adres) en regel 18 (pinnen): een setup of update kan de skill als koppeling in de skills-map van elke gevonden AI zetten (Claude Code, Cursor, Gemini, Hermes, OpenClaw, Windsurf, Codex). Lees de lijst in de code (Agent-Reach@c70ae6d: `agent_reach/runtime/manage.py:391-401`, `place_skill()` op `:534-557`), leg die naast de home-mappen die `get_device_info` op de Mac toont, en noem het aantal AI's dat de skill zou krijgen. Eis een afkoppelcommando dat na een update standhoudt. Staat dat afkoppelen alleen op main en nog niet in de laatste release (hier: PR #851 na v1.6.1; in v1.6.1 komt `unlinked` 0 keer voor in `manage.py`), pin dan op de zelf gelezen main-hash en niet op de release-tag. Noteer ook dat een setup een eigen getemperde kopie met dezelfde naam kan herschrijven (`manage.py:515-518`): altijd eerst een back-up. (Agent-Reach)

<!-- oogst:ror-185 -->
44. **Meet in welke taal een tool zijn skill of prompt schrijft, en noteer de vlag die de taal vastzet.** Uitbreiding op regel 6 (defaults zelf meten): een tool kan zijn skilltekst kiezen op basis van de taalinstelling van het systeem en terugvallen op de taal van de maker. Agent-Reach@c70ae6d schrijft alleen Engels als `AGENT_REACH_LANG`, `LC_ALL`, `LC_MESSAGES` of `LANG` met `en` begint, en anders het Chinese `SKILL.md` (`agent_reach/runtime/manage.py:415-421`). Op een Nederlandse Mac wordt de skill dus Chinees. Zoek bij elke tool die skills of prompts rendert naar `LANG`/`locale` in de code, en zet de vaste vlag (hier `AGENT_REACH_LANG=en`) in het installatiecommando én in de shell-config, omdat elke latere update de skill opnieuw rendert. (Agent-Reach)

## Geoogste regels, storytold/craft-anything (18 nov 2026)

Bron: repo-onderzoek storytold/craft-anything (MIT OR Apache-2.0, HEAD `d6a1f888`, v0.6.1), een app die een website, app of game bestudeert en een codeeragent een eigen versie laat bouwen. Drie scan-lessen, twee ervan gevonden door de sceptici. <!-- oogst-sectie-craft-anything -->

<!-- oogst:ror-186 -->
45. **Meet het beleid achter een goedkeuringskanaal, niet alleen of het kanaal bestaat.** Uitbreiding op ror-169 en ror-179: een tool kan Claude Code netjes starten met `--permission-prompt-tool`, `--strict-mcp-config` en een beperkte `--allowedTools`, en toch alles goedkeuren omdat het beleid erachter standaard "ja" zegt. Zoek daarom de tabel of functie die een goedkeuringsvraag beantwoordt, lees per soort actie de standaardwaarde, en lees elke lijst met "veilige" commando's op prefix-matching. Gemeten in craft-anything@d6a1f888: de schakelaar "Keep going without asking" staat standaard aan (`crates/engine/src/settings.rs:215` `auto_mode: true`), en in die modus mogen willekeurige commando's en schrijven buiten het project zonder vraag (`crates/engine/src/workspace.rs:1186-1187`, `auto: Approval::Allow`); ook met de schakelaar uit mag `npm i <elk pakket>` altijd, inclusief install-scripts (`crates/engine/src/tools/interaction_tools.rs:151`, prefix-match op `:220`), terwijl de bouwagent Bash, Write en Edit krijgt (`crates/ai/src/cli_agents/adapters.rs:492`) zonder OS-sandbox op de Mac. Het kanaal zelf was schoon; het oordeel kantelde pas op het beleid. (craft-anything)

<!-- oogst:ror-187 -->
46. **Meet het tempo uit git log als de releasepagina of de API dicht is, en beperk het oordeel tot de gelezen hash.** Uitbreiding op ror-093 en ror-182: tel commits per dag met `git log --since=<datum> --format=%cd --date=short | sort | uniq -c`. Boven circa 100 commits per dag is de repo in de praktijk agent-gedreven (in craft-anything claimen agents roadmap-items, `AGENTS.md`, sectie Roles and ownership) en verandert hij sneller dan je kunt auditen: het besluit geldt dan alleen voor de commit die je zelf gelezen hebt, en de heroverweeg-trigger wordt een release-tag die minstens 14 dagen zonder hotfix blijft staan. Gemeten: 1.555 commits sinds 31 okt 2026, 170, 170 en 157 commits op 16, 17 en 18 nov; `api.github.com` gaf 403 en de releasepagina stond niet op de toegestane lijst, dus de git-log-maat was de enige eerlijke. Reken bij spreiding de e-mails per naam samen (hier drie namen op 19, 17 en 16 procent). (craft-anything)

<!-- oogst:ror-188 -->
47. **Lees de formule achter elk score-cijfer dat een tool als poort gebruikt.** Uitbreiding op regel 6 (claims nameten): een percentage als "lijkt 96% op het origineel" of "kwaliteit 90" zegt pas iets als je weet welke dimensies meetellen en wat er vóór de meting wordt weggesneden. Zoek de berekening op pad en regel, en vraag drie dingen: welke delen tellen echt mee in het cijfer en welke zijn alleen toelichting, wordt er bijgesneden of genormaliseerd zodat ontbrekende delen onzichtbaar worden, en op welke invoer is de drempel live aangetoond. Gemeten in craft-anything@d6a1f888: het cijfer is het gemiddelde van tegelkleuren en SSIM op helderheid, tekst en structuur "guide the builder but don't change the score" (`crates/ai/src/rebuild/kinds/website.rs:766-770`); beide screenshots worden eerst bijgesneden tot het gedeelde stuk (`crates/engine/src/tools/browser_tools.rs:1687-1691`), dus een veel kortere build met missende secties kan toch hoog scoren; en de enige live run haalde 96% op example.com (`docs/STATUS.md:762`) met een testdrempel van 80%. Neem zo'n cijfer nooit als bewijs van kwaliteit over zonder deze drie antwoorden. (craft-anything)

## Geoogste regels, HKUDS/CLI-Anything (19 nov 2026)

Bron: repo-onderzoek HKUDS/CLI-Anything (Apache 2.0, HEAD `34f5195`, 22 sep 2026), een methode plus hub om van GUI-apps een CLI voor agents te maken. Twee scan-lessen. <!-- oogst-sectie-cli-anything -->

<!-- oogst:ror-189 -->
48. **Meet of de telemetrie vastlegt WELKE AI-agent de tool aanroept, en test `DO_NOT_TRACK` apart van de eigen opt-out-vlag.** Uitbreiding op poort 6, ror-171 en ror-172: telemetrie kan behalve gebruik ook Lex zijn gereedschap in kaart brengen. Zoek naar lijsten met agentnamen (`CLAUDE_CODE`, `CODEX`, `CURSOR`) en naar code die ouderprocessen leest (`/proc/<pid>/status`, `cmdline`, `psutil`). Gemeten in CLI-Anything@34f5195: `cli-hub/cli_hub/analytics.py:28-70` (17 omgevingsregels en 21 procesregels), het resultaat gaat mee in elk event naar PostHog (`analytics.py:362-384`, aangeroepen op `cli.py:106`) samen met een vaste ID in `~/.cli-hub/.analytics_id` (`analytics.py:194-210`). Test daarna beide opt-outs los met een nep-netwerkmodule: `CLI_HUB_NO_ANALYTICS=1` gaf 0 events, `DO_NOT_TRACK=1` gaf nog steeds 1 event. Noteer alleen de bewezen vlag als vaste regel, en weeg agent-vingerafdruk als privacy-afwijsgrond. (HKUDS/CLI-Anything)

<!-- oogst:ror-190 -->
49. **Een commentaar "commands come from the trusted registry" naast `shell=True` is een rode vlag: meet waar dat register vandaan komt en tel de pipe-naar-shell-items.** Uitbreiding op poort 13 en ror-108: een package-manager die installatiecommando's uit een live opgehaald JSON-register met de shell uitvoert, voert instructies uit die de eigenaar van die webpagina op elk moment kan wijzigen. Meet drie dingen: (1) de register-URL en of die gepind is op een commit, (2) wanneer `shell=True` aangaat, (3) hoeveel registeritems `| bash` of `| sh` bevatten. Gemeten in CLI-Anything@34f5195: `cli-hub/cli_hub/registry.py:9-10` haalt live van `hkuds.github.io`, `installer.py:66-95` zet `shell=True` zodra `|`, `&&`, `;` of `$(` in het commando staat, en 3 items doen pipe-naar-shell (`quietshrink`, `android-cli`, `jimeng`). Live register plus shell is een afwijsgrond voor de installer, ook als de losse onderdelen netjes zijn. (HKUDS/CLI-Anything)

## Geoogste regels, unclecode/crawl4ai (24 nov 2026)

Bron: repo-onderzoek unclecode/crawl4ai (Apache 2.0 plus attributieplicht, HEAD `4e4bab5d`, release v0.9.6 `7fc14a5`), een web-crawler die pagina's als markdown voor AI aflevert. Drie lessen. <!-- oogst-sectie-crawl4ai -->

<!-- oogst:ror-191 -->
50. **Vergelijk het gepubliceerde pakket met de release-tag die je gelezen hebt.** Uitbreiding op regel 4 en regel 18: je auditeert de bron in git, maar je installeert het wheel of het npm-pakket, en dat kan van een andere commit gebouwd zijn of extra bestanden dragen. Haal het pakket op zonder te installeren (`pip download <naam>==<versie> --no-deps` of `npm pack <naam>@<versie>`), pak het uit en draai `diff -rq` tegen de map in de tag. Meld het aantal afwijkende bestanden en lees elk verschil. Gemeten in crawl4ai 0.9.6: 1 bestand anders, `crawl4ai/cloud_notice.py:28-29`, alleen de `?ref`-link van een reclamebanner. Onschuldig hier, maar zonder de diff had je het niet geweten. Afwijkende uitvoerbare code in het pakket is een rood stoplicht. (unclecode/crawl4ai)

<!-- oogst:ror-192 -->
51. **Lees het LICENSE-bestand tot het einde, ook na END OF TERMS AND CONDITIONS.** Uitbreiding op regel 7: een maker kan onder een standaardlicentie een eigen eis plakken, en de badge en het licentieveld tonen dan nog steeds alleen Apache 2.0 of MIT. Zoek met `grep -n "END OF TERMS" LICENSE` en lees alles wat daarna komt. Gemeten in crawl4ai: onder de Apache-tekst staat een Attribution Requirement die bij elk publiek gebruik een vaste creditzin eist, bij een website in een About- of Credits-sectie. Noteer zo'n eis op de besluitpagina bij elk product van Lex dat publiek of verkoopbaar wordt (hier Cloner). (unclecode/crawl4ai)

<!-- oogst:ror-193 -->
52. **Blokkeert de container de browserdownload, draai de quickstart dan op de browser die er al staat.** Uitbreiding op regel 12: een tool op Playwright of Puppeteer haalt bij setup zijn eigen Chromium op, en die download kan door de netwerklijst geweigerd worden. Meld de geweigerde host (hier `cdn.playwright.dev`, 403), zoek met `which google-chrome chromium chromium-browser` een aanwezige browser en start de tool daarop (bij Playwright `channel="chrome"`, bij crawl4ai `BrowserConfig(chrome_channel="chrome")`). Zo meet je echt gedrag in plaats van een fout. Gemeten in crawl4ai 0.9.6: github.com in 3,6 seconden, 47.566 tekens markdown, 130 interne links. De HTTP-modus zonder browser bewijst alleen de mechaniek: pypi.org gaf daarop een JavaScript-controlepagina van 211 tekens. Een blokkade in de container zegt niets over de Mac; die meting blijft apart staan. (unclecode/crawl4ai)

## Geoogste regels, cloudflare/claude-managed-agents (25 nov 2026)

Bron: repo-onderzoek cloudflare/claude-managed-agents (MIT, HEAD `22d60e7`, 22 mei 2026), een zelf-gehoste control plane voor Claude Managed Agents op Cloudflare Workers. Product 🔴 op fit, kosten en open defaults, niet op kwaliteit. Vier scan-lessen. <!-- oogst-sectie-cma-cloudflare -->

<!-- oogst:ror-194 -->
53. **Tel bij een zelf-gehost dashboard of control plane welke routes zonder login bereikbaar zijn, en zoek eerst naar een exec- of terminalroute.** Uitbreiding op poort 6 en ror-186: een sjabloon dat je zelf deployt kan "open by default" zijn en de beveiliging naar een latere stap in de README schuiven. Lees de router zelf (alle `pathname`-takken en `app.get/post`), zoek naar middleware die een login afdwingt, en zoek specifiek naar routes die commando's of een shell doorgeven (`exec`, `terminal`, `pty`, `ws`). Gemeten in claude-managed-agents@22d60e7: `src/index.ts:99-100` geeft elk `/api/*`-verzoek zonder controle door, `src/api/index.ts:404` voert `body.command` uit in de sandbox, `src/index.ts:48` opent een terminal via websocket, en `docs/securing-access.md:3-4` bevestigt "open by default". Een open exec- of terminalroute op een publieke URL is een rood stoplicht tot de login aantoonbaar vóór de eerste deploy staat; zet de login-stap daarom in het installatieplan vóór de deploy, nooit erna. (cloudflare/claude-managed-agents)

<!-- oogst:ror-195 -->
54. **Turf de herkomst van elke afhankelijkheid in de lockfile, niet alleen de versies.** Uitbreiding op regel 18 en ror-191: een pakket kan uit een tarball-URL buiten het register komen, en dan gelden de waarborgen van het register (vaste versies, herkomstbewijs, terugtrekken bij een lek) niet. Draai `grep -o '"resolved": "https\?://[^/]*' package-lock.json | sort | uniq -c` en lees elke host die niet `registry.npmjs.org` (of `files.pythonhosted.org` bij Python) is. Gemeten in claude-managed-agents@22d60e7: 782 pakketten uit het npm-register en 1 uit `app.stainless.com` (`package.json`, `@anthropic-ai/sdk` als tarball, `package-lock.json:93`). Noteer zo'n afwijkende bron op de besluitpagina en vervang hem vóór gebruik door de gepubliceerde registerversie, of pin hem met een integrity-hash. (cloudflare/claude-managed-agents)

<!-- oogst:ror-196 -->
55. **Controleer of een Dockerfile of installscript gedownloade programma's met een checksum toetst.** Uitbreiding op poort 13: `curl ... | tar -xz` naar `/usr/local/bin` vertrouwt blind op wat de server die dag teruggeeft, ook als de versie in een `ARG` vastligt. Zoek in `Dockerfile` en scripts naar `curl`, `wget` en `ADD http`, en kijk of er een `sha256sum -c` of een vergelijkbare controle direct achter staat. Gemeten in claude-managed-agents@22d60e7: `Dockerfile:41-43` haalt de `ant`-CLI van GitHub Releases en pakt hem uit zonder checksum. Bij eigen gebruik: voeg de checksum toe (vaste hash in een `ARG`, dan `echo "$HASH  bestand" | sha256sum -c`) voordat je het image bouwt. (cloudflare/claude-managed-agents)

<!-- oogst:ror-197 -->
56. **Meet of een beveiligingslaag open of dicht valt als er geen beleid is of het beleid niet geladen kan worden.** Uitbreiding op poort 6 en ror-186: een egress-filter, firewall of toegangsregel die bij "geen regel" of bij een leesfout alles doorlaat, beschermt alleen zolang alles goed gaat. Zoek drie plekken: de tak zonder beleid, de `catch` rond het laden van het beleid, en de uitzonderingen die altijd door mogen. Kijk daarna welke tools buiten de laag om ophalen. Gemeten in claude-managed-agents@22d60e7: zonder beleid gaat alles door (`src/egress/handler.ts:134-136`), een leesfout wordt stil "geen beleid" (`src/egress/resolve.ts:71-76`), de proxy volgt redirects naar andere hosts (`handler.ts:243`), een hostnaam met punt aan het eind glipt langs de denylijst (`src/egress/match.ts:9-14`), en de PDF-route van de browsertool haalt buiten het beleid om op (`src/tools/cf/browser.ts:279-284`). Fail-open op een laag die de README als beveiliging verkoopt is een tegenspraak tussen belofte en code, en dus een afwijsgrond voor gebruik zoals beloofd. (cloudflare/claude-managed-agents)

## Geoogste regels, morluto/rea (25 nov 2026)

Bron: repo-onderzoek morluto/rea (MIT, npm rea-agents 6.10.1, HEAD `adb4679`), een reverse-engineering-CLI en MCP-server. MCP-setup 🔴 op footprint, CLI 🔵 radar. Vijf scan-lessen. <!-- oogst-sectie-rea -->

<!-- oogst:ror-198 -->
57. **Meet de contextprijs van een MCP-server vóór je hem registreert.** Uitbreiding op poort 5 en regel 19 (aandacht is ook kosten): tel de tools en de schema-omvang in de gebouwde catalogus van het gepubliceerde pakket (zoek naar `*catalog*.json` in `dist/`) en zoek of de maker zelf een tokenmeting publiceert. Gemeten in rea-agents 6.10.1: 263 tools in `dist/mcp-catalog.json`, en de maker meet circa 72.000 tokens voor alleen namen, beschrijvingen en invoerschema's van 222 tools (`docs/verification/il2cpp-generic-instances-2026-10-24.md:85`). Bied een tool met tientallen of honderden tools die ook als CLI bestaat, aan als losse CLI-run per klus, of alleen met een familie-filter (hier `--tool-families`) waarvan je het aantal tools zelf gemeten hebt. (morluto/rea)

<!-- oogst:ror-199 -->
58. **Draai een setup-droogloop in een nep-thuismap en bewijs daarna dat er niets geschreven is.** Uitbreiding op regel 40 (ror-181): een droogloop op de echte Mac of in een container met echte config kan toch iets aanraken. Zet `HOME` om naar een lege wegwerpmap met een lege `~/.claude.json`, draai de setup met `--dry-run --json` vanuit het uitgepakte pakket, lees de geplande acties (doelpad, back-uppad, versie in het commando) en draai daarna `find <nep-home> -type f` om te bewijzen dat er niets bijkwam. Gemeten in rea-agents 6.10.1: `HOME=/tmp/x node package/scripts/rea.mjs setup --client claude_code --dry-run --json` gaf 2 acties (`~/.claude.json` met back-up `.claude.json.rea.backup`, en `~/.claude/skills/reverse-engineer-anything`), en de map bleef leeg op de ene lege `{}` na. (morluto/rea)

<!-- oogst:ror-200 -->
59. **Een update-melder is netwerkverkeer, en vaak alleen zichtbaar in een terminal.** Uitbreiding op poort 6 en regel 14: zoek in CLI-code naar `updateNotice`, `update-notifier` en `registry.npmjs.org`, lees wanneer hij start en waar hij zijn cache bewaart. Veel melders draaien alleen bij een interactieve terminal (TTY) en niet met `--json`, dus een test met `--json` bewijst niets. Gemeten in rea-agents@adb4679: eens per 24 uur een losgekoppeld proces naar registry.npmjs.org (`src/cli/updateNotice.ts:320-323`), alleen bij TTY (`src/cli/runCliCommand.ts:97-99`), uit met `NO_UPDATE_NOTIFIER=1` of `CI=1` (`updateNotice.ts:121-127`), cache in `~/.cache/incur/updates/` die uninstall laat staan (`updateNotice.ts:37`). Zet de opt-out in het installatiecommando en noem de cachemap bij reversibiliteit. (morluto/rea)

<!-- oogst:ror-201 -->
60. **Vergelijk de skill in de repo met de skill in het gepubliceerde pakket, en lees hoe hij goedkeuring regelt.** Uitbreiding op regel 18 en ror-191: de repo-skill kan ongepind `@latest` aanroepen terwijl de skill in het pakket op de releaseversie pint. Gemeten: repo `.agents/skills/reverse-engineer-anything/SKILL.md:58,66` gebruikt `npx -y rea-agents@latest`, het npm-pakket `skills/.../SKILL.md:65,73` gebruikt `@6.10.1`. Neem altijd de gepinde versie uit het pakket, nooit die uit README of main. Zoek daarna in de skill op zinnen als "call tools directly" of "no per-call approval" (hier `SKILL.md:418-419`): dan ligt alle goedkeuring bij de client, en botst de skill met de regel dat Lex beslist. Zet die zin op de lijst Wat NIET overnemen. (morluto/rea)

<!-- oogst:ror-202 -->
61. **Toets Lex' doel letterlijk tegen het eigen gebruiksbeleid van de tool, per functie.** Uitbreiding op poort 1 en poort 7: een tool met een nette licentie kan in zijn DISCLAIMER of acceptable-use-tekst precies het doel uitsluiten waarvoor Lex hem wil gebruiken. Lees die tekst zelf, noteer per functie (statisch lezen, browser koppelen, verkeer onderscheppen, decompileren, uitvoeren) of Lex' doel erbinnen valt, en geef elke functie een eigen kleur. Gemeten in rea: DISCLAIMER.md:6-9 noemt beveiligingsonderzoek, interoperabiliteit en eigen of geautoriseerde software, :16-19 sluit sleutelen aan online diensten, omzeilen van toegangscontrole en kopiëren van code uit, :41-44 zegt dat openbaar beschikbaar geen toestemming is. Voor concurrent-onderzoek blijft alleen observeren wat de eigen browser als gewone gebruiker ontvangt. Dit is geen juridisch advies; bij twijfel een jurist. (morluto/rea)

## Geoogste regel, qybaihe/bla (25 nov 2026)

Bron: repo-onderzoek qybaihe/bla (BLA, Blind LLM Agents, MIT, HEAD 8dcf985), een defensief anti-reverse-engineering-schild (de tegenhanger van morluto/rea). <!-- oogst-sectie-bla -->

<!-- oogst:ror-203 -->
62. **Een repo vol "telemetry"-strings hoeft niet naar huis te bellen: lees of de strings in output-generende code staan of in een echte netwerk-call.** Uitbreiding op poort 6 en ror-171. Bij een defensief obfuscatie- of anti-reverse-engineering-schild zijn de "telemetry"-, "analytics"- en callback-woorden vaak juist de NEP-strings die het schild IN het beschermde artefact weeft, geen exfiltratie. Meet met grep op fetch, axios en http in src of de hits in de schild- of output-generatie zitten (bij bla: src/shields/*, de decoy-weavers) dan wel in een echte client die bij gebruik van de tool afgaat. Oordeel op de call, niet op het woord. Gemeten in bla@8dcf985: alle "telemetry" is decoy-weefsel, de enige echte dependency is Babel (JS parsen om decoys te injecteren), geen pre- of postinstall-script. Let los daarvan op de voetafdruk van bla setup, die de MCP-server in de globale config van elke gevonden AI-client schrijft (zelfde patroon als ror-169/174/183). (qybaihe/bla)

## Geoogste regel, claude-ads herbeoordeling (25 nov 2026)

Bron: herbeoordeling AgriciDaniel/claude-ads (MIT, HEAD `fc3908e`, v2.1.0). Oud besluit 12 sep 2026 op HEAD `ac21644`. <!-- oogst-sectie-claude-ads-2 -->

<!-- oogst:ror-204 -->
63. **Herbeoordeel niet alleen de repo maar ook Lex' eigen situatie, en heropen elk weggezet onderdeel waarvan de afwijsgrond over zijn situatie ging.** Uitbreiding op de herbeoordeel-poort (regel 3) en ror-177. Een besluit kan stil verouderen omdat Lex verandert, niet de repo. Lees bij elke herbeoordeling eerst de laatste handover op de punten van de ontdooi-trigger (hier: hoeveel advertentieplatforms, welke metingen, hoeveel klanten) en lees daarna in de lijst Wat NIET overnemen elke regel die met "voor kanalen/klanten/werk die Lex niet heeft" is afgewezen opnieuw. Gemeten in claude-ads: het besluit van 12 sep zette "de 22 platform-audit-skills" weg als "platformspecifiek voor kanalen die Lex niet gebruikt", terwijl de Meta-catalogus daartussen zat en Meta precies het kanaal is dat Lex wél draait. In de tussentijd kwamen Google Ads-tag en TikTok-pixel per salon, Klanttijd Groei en een advertentie-agent 2x per dag erbij. Gevolg: de Meta-controlelijst is nu alsnog geoogst (ads-003) en als keyless controle in DreamTeam gebouwd. Turf een bundelafwijzing daarom altijd per onderdeel, nooit "de N skills" in één regel. (claude-ads)
