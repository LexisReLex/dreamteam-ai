---
name: "klanttijd-advertentie-route"
description: De weg om Klanttijd-advertenties (flyer plus demofilm) te laten draaien op Facebook en Instagram, de opbrengst te meten, het logboek bij te houden en binnen het al goedgekeurde budget zelf bij te sturen. Meten, bijhouden en sturen binnen het budget mag altijd; nieuw geld blijft Lex' GO.
---

# Klanttijd advertentie-route

Dit is een navigatiesysteem: de directe weg naar het doel, meter voor meter. Volg het precies. Geen omwegen, niets zelf verzinnen.

Doel: Klanttijd-advertenties laten draaien op Facebook en Instagram, binnen het budget dat Lex kiest (nu 35 euro per ronde), meten wat het oplevert, dat per dag in het logboek vastleggen, en binnen dat al goedgekeurde budget zelf bijsturen.

## Rol en grens (afspraak Lex, 8 nov 2026)

Je bent mede-eigenaar, geen meter alleen. De grens loopt bij NIEUW geld, niet bij de soort handeling. Lex kan alles terugdraaien, dus wacht niet op hem voor wat binnen zijn al toegezegde budget blijft: beslis zelf en meld het. Kom met het voorstel ("Lex, als ik jou was had ik dit gedaan"), niet met een keuzemenu.

ZELF, zonder GO, ook als Lex onbereikbaar is (alles wat BINNEN het al goedgekeurde budget van de lopende ronde blijft):
- een advertentie pauzeren die duidelijk onderpresteert, kapot is of is afgekeurd;
- de hele ronde stopzetten als het echt misgaat (stopt uitgaven, kost niks extra);
- budget herverdelen tussen advertenties binnen hetzelfde totaal, naar wat werkt;
- een eerder door jou gepauzeerde advertentie weer aanzetten.
Meet met bewijs (screenshot) en meld elke ingreep meteen (push, logboek, rapport). Stuur op de cijfers, maar thrash niet: geef een nieuwe advertentie een eerlijke kans voor je oordeelt (niet op dag 1, tenzij hij echt kapot of afgekeurd is) en pauzeer niet heen en weer op ruis.

OP LEX' GO (dit zet NIEUW geld buiten de deur):
- totaal- of dagbudget omhoog boven wat Lex toezegde;
- einddatum verlengen (meer dagen is meer geld);
- een nieuwe ronde of nieuwe advertentie publiceren;
- betaalmethode.
Zet dat klaar als concept (niet publiceren) en stuur Lex een korte ja/nee met de cijfers.

Onderscheid: een advertentie die goedkoop verkeer levert maar waar de site niet converteert (zoals nu: veel bezoekers, 0 start_gratis, 0 aanmelding) is geen advertentieprobleem maar een lek na de klik. Dat meld je en pauzeer je NIET, want de advertentie doet zijn werk. Pauzeren is voor een advertentie die zelf kapot, afgekeurd of te duur is.
Harde regel: een onbemande run verhoogt nooit het al toegezegde bedrag en start nooit iets nieuws.

## Logboek

Elke meting landt in het logboek-artifact "Klanttijd advertentie-logboek" (slug 68abc18b-6230-48b6-980f-29eeb338ace4). Lees met read_artifact, voeg met edit_version precies boven de regel met NIEUWE-DAGREGEL-HIERBOVEN-INVOEGEN een nieuw ROWS-object toe in dezelfde vorm, en werk de datum in de tag met id "updated" bij. Niet gemeten velden op null, nooit verzinnen. Lukt het niet, meld dat eerlijk.

## De huidige stand (8 nov 2026, gemeten in Advertentiebeheer, account 789794611050331)

- Actieve campagne: "Nov 2026 ronde 4 masseur solo (35 euro)" (id 52565642554435). Een set "Masseur 25-54 FB+IG", FB en IG, leeftijd 25-54, dagbudget 5 euro, landt op /voor/masseur, loopt 7 nov t/m 14 nov. Van de 4 advertenties is er 1 Actief en staan er 3 op Concept.
- Ronde 3 "kappers + andere beroepen" (id 52562990921035) is Voltooid: geeindigd 5 nov, 34,39 euro besteed, 120 landingspaginaweergaven, 114 linkkliks, 0,29 euro per weergave.
- Meting ronde 4 dag 1 (7 nov): 3,21 euro besteed, 698 weergaven, 621 bereik, frequentie 1,12, 17 linkkliks, CPC 0,19, CTR 2,44 procent, 18 landingspaginaweergaven, 0,18 euro per weergave. Vercel /voor/masseur 24 bezoekers, start_gratis 0, aanmelding 0. Het lek na de klik is er nog volop.
- Betaling: Meta schrijft eerst van het saldo af en daarna van de MasterCard eindigend op 6675.
- De actieve campagne wisselt per ronde. Ga nooit uit van een vast campagne-id; kijk eerst in het campagne-overzicht welke campagne Actief is en meet die.

## Meten (telt geen nieuw geld)

- Uit het echte account met screenshot: status, besteed, weergaven, bereik, linkkliks, landingspaginaweergaven, kosten per landingspaginaweergave, CPC, CTR, frequentie, einddatum, en Specificatie op Leeftijd en Plaatsing.
- Vercel Web Analytics (kapper-booking-demo) via het dashboard in Chrome, niet via de MCP (die kan Web Analytics niet uitlezen): bezoekers per /voor/<beroep>, start_gratis, aanmelding.
- Let op de trechter: waar valt het weg? Weergaven naar linkkliks naar bezoekers naar start_gratis naar aanmelding.

## Lessen uit eerdere rondes (gemeten)

- Doelgroep "NL 18+ breed" trok vooral 55-plussers. Zet altijd leeftijd 25 t/m 54 als harde grens (Doelgroep > Je doelgroep verder beperken > Bereik een beperkte doelgroep).
- Veel klikken, bijna geen "Start gratis", bijna geen aanmelding: het lek zit na de klik. Meet per advertentie ook in Vercel.
- Kosten per bezoeker van 25 t/m 54 lagen rond 0,15 tot 0,19 euro; kosten per landingspaginaweergave rond 0,18 tot 0,29 euro.

## Vaste instelregels bij elke nieuwe of gekopieerde advertentie

- Nieuwe ronde = kopie van de vorige campagne (Kopie maken), aanbevelingen (Advantage+-plaatsingen en AI-materiaal) UIT, kopie blijft uit tot Lex GO geeft.
- "Gerelateerde media" altijd op 0 zetten.
- AI-verbeteringen (retouchering, tekstverbeteringen, details) uit; geen AI-gegenereerde beelden kiezen.
- AI-transparantielabel AAN (flyers zijn met AI gemaakt).
- Upload: HTMLInputElement.click onderscheppen, dan het bestand uit de uploads-map van de sessie aanbieden (eerst device_stage_files vanuit de vault).

## Als een advertentie onverwacht stilstaat

- Betaling mislukt of een beoordeling door Meta: meld dat aan Lex met bewijs. Een afgekeurde advertentie pauzeer je zelf; alles wat nieuw geld kost wacht op zijn GO.

## Vaste regels (gelden altijd)

- De grens is nieuw geld, niet de soort actie. Binnen het al toegezegde budget stuur je vrij (pauzeren, stopzetten, herverdelen, weer aanzetten) en meld je het meteen. Budget omhoog, einddatum verlengen, publiceren en betaalmethode gaan nooit zonder Lex' GO.
- Nooit twee campagnes tegelijk laten lopen zonder dat Lex dat zo kiest (dubbel betalen).
- Alles wat je tegen Lex zegt is geverifieerd uit het account, met screenshot. Niet gecontroleerd, dan zeg je dat.

## Geoogst: meetpoort voor lokale diensten (25 nov 2026)

Bron: herbeoordeling AgriciDaniel/claude-ads (MIT, HEAD `fc3908e`), `skills/ads-plan/assets/local-service.md`. Geldt voor Klanttijd zelf én voor elke salon in Klanttijd Groei. <!-- oogst-sectie-claude-ads -->

<!-- oogst:kar-001 -->
**Meet een advertentie op uitgevoerde afspraken, niet op klikken, en scheid vier treden.** Aanvraag (klik of formulier), gekwalificeerde aanvraag, geboekte afspraak, uitgevoerde afspraak. Trek annuleringen, no-shows, dubbele boekingen en spam ervan af voordat je zegt wat een advertentie opleverde. Bij Klanttijd zelf is de laatste trede een betalende zaak, niet een start_gratis. Een advertentie die veel klikken en weinig uitgevoerde afspraken geeft, is geen winnaar. (bron: `local-service.md:14-15`, Measurement gate, en `:33`, "lead quality and fulfilled work, not clicks alone")

<!-- oogst:kar-002 -->
**Adverteer niet voor capaciteit die er niet is.** Kijk vóór je een salon-advertentie aanzet of opschaalt in de agenda: zit de komende twee weken al vol, dan kost extra bereik geld zonder extra afspraken en levert het teleurgestelde klanten op. Dit is ook de wig van Klanttijd tegenover generieke advertentietools: wij zien de lege plekken. Gebruik ze in de tekst ("dinsdag 14:00 nog vrij") alleen als die plek echt vrij is op het moment dat de advertentie draait. (bron: `local-service.md:20-21`, "Which services and places can the business actually fulfill now?", en `:24`, capaciteit en seizoen; agenda-wig uit DreamTeam `docs/brand-dna.md` §3.4)
