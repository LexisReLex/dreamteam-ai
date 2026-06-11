import { useParams, Link } from "wouter";

/* ─────────────────────────────────────────────
   Shared prose wrapper
───────────────────────────────────────────── */
function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose-legal space-y-6 text-[#e2e8f0]/80 text-sm leading-relaxed">
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-[#e2e8f0] mt-8 mb-3 border-b border-[rgba(59,130,246,0.2)] pb-2">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-[#e2e8f0] mt-6 mb-2">
      {children}
    </h3>
  );
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-3${className ? ` ${className}` : ""}`}>{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-inside space-y-1 mb-3 pl-2">{children}</ul>
  );
}

function LI({ children }: { children: React.ReactNode }) {
  return <li className="text-[#e2e8f0]/80">{children}</li>;
}

/* ─────────────────────────────────────────────
   1. PRIVACYBELEID
───────────────────────────────────────────── */
function PrivacyContent() {
  return (
    <Prose>
      <P>
        <strong className="text-[#e2e8f0]">Laatste update: juni 2026</strong>
      </P>
      <P>
        DreamTeam B.V. (in oprichting) hecht veel waarde aan de bescherming van uw persoonsgegevens.
        In dit privacybeleid leggen wij uit welke gegevens wij verwerken, waarom wij dat doen,
        hoe lang wij die bewaren en welke rechten u heeft. Dit beleid is opgesteld conform de
        Algemene Verordening Gegevensbescherming (AVG / GDPR, Verordening (EU) 2016/679).
      </P>

      <H2>1. Wie zijn wij — verwerkingsverantwoordelijke</H2>
      <P>
        De verwerkingsverantwoordelijke in de zin van de AVG is:
      </P>
      <UL>
        <LI><strong className="text-[#e2e8f0]">Naam:</strong> DreamTeam B.V. (in oprichting)</LI>
        <LI><strong className="text-[#e2e8f0]">KvK-nummer:</strong> [KVK_NUMBER]</LI>
        <LI><strong className="text-[#e2e8f0]">BTW-nummer:</strong> [BTW_NUMBER]</LI>
        <LI><strong className="text-[#e2e8f0]">Adres:</strong> [ADRES], Nederland</LI>
        <LI><strong className="text-[#e2e8f0]">E-mail:</strong> privacy@dreamteam.nl</LI>
        <LI><strong className="text-[#e2e8f0]">Website:</strong> https://dreamteam.nl</LI>
      </UL>

      <H2>2. Welke persoonsgegevens wij verwerken</H2>
      <P>
        Wij verwerken persoonsgegevens die u zelf aan ons verstrekt bij het aanmaken van een account,
        het gebruik van het platform of anderszins contact met ons opneemt, alsmede gegevens die automatisch
        worden gegenereerd tijdens uw gebruik van onze dienst.
      </P>
      <H3>Accountgegevens</H3>
      <UL>
        <LI>Volledige naam</LI>
        <LI>E-mailadres</LI>
        <LI>Bedrijfsnaam en -sector</LI>
        <LI>Wachtwoord (versleuteld opgeslagen, nooit leesbaar)</LI>
        <LI>Factuuradres en betalingsinformatie (via onze betaalprovider Stripe)</LI>
      </UL>
      <H3>Gebruiksgegevens</H3>
      <UL>
        <LI>IP-adres en apparaatinformatie (browser, besturingssysteem)</LI>
        <LI>Gesprekgeschiedenis met AI-agents (prompts en antwoorden)</LI>
        <LI>Taken, workflows en instellingen aangemaakt op het platform</LI>
        <LI>Log- en foutgegevens ten behoeve van technische ondersteuning</LI>
        <LI>Tijdstippen van inloggen en gebruik</LI>
      </UL>

      <H2>3. Waarom wij uw gegevens verwerken — rechtsgrondslagen</H2>
      <P>
        Wij verwerken uw persoonsgegevens uitsluitend op basis van een rechtsgeldige rechtsgrondslag
        als bedoeld in artikel 6 AVG:
      </P>
      <UL>
        <LI>
          <strong className="text-[#e2e8f0]">Uitvoering van de overeenkomst (art. 6 lid 1 sub b AVG):</strong>{" "}
          Om uw account te beheren, de dienst te leveren en u toegang te geven tot de AI-agents.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Gerechtvaardigd belang (art. 6 lid 1 sub f AVG):</strong>{" "}
          Voor fraudepreventie, beveiliging van het platform, het verbeteren van onze dienst en
          directe communicatie over (technische) updates. Wij hebben hiervoor een afweging gemaakt
          waarbij uw privacybelangen niet onevenredig worden geschaad.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Wettelijke verplichting (art. 6 lid 1 sub c AVG):</strong>{" "}
          Voor het bijhouden van financiële administratie (fiscale bewaarplicht 7 jaar).
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Toestemming (art. 6 lid 1 sub a AVG):</strong>{" "}
          Voor het plaatsen van niet-noodzakelijke cookies en het verzenden van commerciële
          nieuwsbrieven, indien u daarvoor toestemming heeft gegeven. U kunt deze toestemming
          te allen tijde intrekken.
        </LI>
      </UL>

      <H2>4. Bewaartermijnen</H2>
      <UL>
        <LI>
          <strong className="text-[#e2e8f0]">Gesprekgeschiedenis met AI-agents:</strong>{" "}
          maximaal 2 jaar na de laatste interactie, of eerder indien u verwijdering verzoekt.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Accountgegevens:</strong>{" "}
          tot opzegging van het abonnement + 1 jaar daarna (voor het afhandelen van eventuele geschillen).
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Factuur- en betalingsgegevens:</strong>{" "}
          7 jaar conform de fiscale bewaarplicht.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Loggegevens en IP-adressen:</strong>{" "}
          maximaal 90 dagen.
        </LI>
      </UL>

      <H2>5. Met wie wij uw gegevens delen — verwerkers</H2>
      <P>
        Wij delen uw persoonsgegevens uitsluitend met derden voor zover dat noodzakelijk is voor
        de uitvoering van onze dienst of wanneer wij daartoe wettelijk verplicht zijn. Wij sluiten
        met alle verwerkers een verwerkersovereenkomst.
      </P>
      <H3>Anthropic (AI-verwerker)</H3>
      <P>
        DreamTeam maakt gebruik van de API van <strong className="text-[#e2e8f0]">Anthropic, PBC</strong> voor
        het verwerken van gesprekken met de AI-agents. Dit betekent dat de inhoud van uw gesprekken
        (uw prompts en de gegenereerde antwoorden) worden doorgegeven aan Anthropic ter verwerking.
        Anthropic treedt op als verwerker in de zin van de AVG. Met Anthropic is een
        verwerkersovereenkomst gesloten.
      </P>
      <H3>Overige subverwerkers</H3>
      <UL>
        <LI><strong className="text-[#e2e8f0]">Stripe:</strong> betalingsverwerking</LI>
        <LI><strong className="text-[#e2e8f0]">Hetzner / Cloudflare:</strong> hosting en CDN (servers binnen de EU)</LI>
        <LI><strong className="text-[#e2e8f0]">Postmark:</strong> transactionele e-mail (wachtwoordherstel, facturen)</LI>
      </UL>
      <P>
        Wij verkopen uw persoonsgegevens nooit aan derden en delen deze niet voor commerciële
        doeleinden van derden.
      </P>

      <H2>6. Doorgifte buiten de Europese Unie</H2>
      <P>
        Anthropic is gevestigd in de Verenigde Staten. De doorgifte van persoonsgegevens aan
        Anthropic vindt plaats op grond van de Standaard Contractuele Bepalingen (Standard
        Contractual Clauses, SCC's) die door de Europese Commissie zijn goedgekeurd
        (Uitvoeringsbesluit (EU) 2021/914). Dit biedt een passend beschermingsniveau conform
        de AVG. U kunt een kopie van de toepasselijke SCC's opvragen via privacy@dreamteam.nl.
      </P>

      <H2>7. Uw rechten</H2>
      <P>
        Op grond van de AVG heeft u de volgende rechten met betrekking tot uw persoonsgegevens:
      </P>
      <UL>
        <LI>
          <strong className="text-[#e2e8f0]">Recht op inzage (art. 15 AVG):</strong>{" "}
          U kunt opvragen welke persoonsgegevens wij van u verwerken.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Recht op rectificatie (art. 16 AVG):</strong>{" "}
          U kunt onjuiste of onvolledige gegevens laten corrigeren.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Recht op verwijdering (art. 17 AVG):</strong>{" "}
          U kunt verzoeken uw gegevens te laten verwijderen ("recht op vergetelheid"), tenzij wij
          een wettelijke bewaarplicht hebben.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Recht op beperking van verwerking (art. 18 AVG):</strong>{" "}
          U kunt verzoeken de verwerking van uw gegevens tijdelijk te beperken.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Recht op dataportabiliteit (art. 20 AVG):</strong>{" "}
          U kunt uw gegevens in een gestructureerd, gangbaar en machineleesbaar formaat opvragen
          om over te dragen aan een andere aanbieder.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Recht van bezwaar (art. 21 AVG):</strong>{" "}
          U kunt bezwaar maken tegen verwerking op grond van gerechtvaardigd belang, waaronder
          directe marketing.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Recht op intrekking van toestemming:</strong>{" "}
          Indien verwerking op toestemming is gebaseerd, kunt u deze te allen tijde intrekken.
        </LI>
      </UL>
      <P>
        U kunt uw rechten uitoefenen door een verzoek te sturen naar{" "}
        <a href="mailto:privacy@dreamteam.nl" className="text-[#3b82f6] hover:underline">
          privacy@dreamteam.nl
        </a>. Wij reageren binnen 1 maand op uw verzoek.
      </P>

      <H2>8. Cookies</H2>
      <P>
        Wij maken gebruik van cookies en soortgelijke technieken. Voor meer informatie over
        welke cookies wij plaatsen, waarvoor en hoe u deze kunt beheren, verwijzen wij u naar
        ons{" "}
        <Link href="/legal/cookies" className="text-[#3b82f6] hover:underline">
          Cookiebeleid
        </Link>
        .
      </P>

      <H2>9. Beveiliging</H2>
      <P>
        Wij nemen passende technische en organisatorische maatregelen om uw persoonsgegevens
        te beschermen tegen verlies, onbevoegde toegang of enige andere vorm van onrechtmatige
        verwerking:
      </P>
      <UL>
        <LI>Versleuteling van data in transit via TLS 1.3</LI>
        <LI>Versleuteling van data at rest (AES-256)</LI>
        <LI>Strikte toegangscontrole: medewerkers hebben alleen toegang tot gegevens die
          zij voor hun werkzaamheden nodig hebben (need-to-know principe)</LI>
        <LI>Tweefactorauthenticatie voor interne systemen</LI>
        <LI>Regelmatige beveiligingsreviews en penetratietests</LI>
      </UL>
      <P>
        Ondanks onze inspanningen kan geen enkele beveiligingsmaatregel absolute veiligheid
        garanderen. In geval van een datalek dat waarschijnlijk hoge risico's voor u oplevert,
        zullen wij u en de Autoriteit Persoonsgegevens tijdig informeren conform art. 33-34 AVG.
      </P>

      <H2>10. Klacht indienen</H2>
      <P>
        Als u van mening bent dat wij uw persoonsgegevens niet correct verwerken, kunt u
        een klacht indienen bij de{" "}
        <a
          href="https://autoriteitpersoonsgegevens.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3b82f6] hover:underline"
        >
          Autoriteit Persoonsgegevens
        </a>{" "}
        (autoriteitpersoonsgegevens.nl). Wij stellen het echter op prijs als u ons eerst
        de kans geeft het probleem te verhelpen via privacy@dreamteam.nl.
      </P>

      <H2>11. Wijzigingen in dit privacybeleid</H2>
      <P>
        Wij kunnen dit privacybeleid van tijd tot tijd aanpassen. Bij wezenlijke wijzigingen
        informeren wij u via e-mail of een melding op het platform. De meest actuele versie
        is altijd beschikbaar op onze website.
      </P>

      <H2>12. Contact</H2>
      <P>
        Voor vragen of verzoeken met betrekking tot dit privacybeleid kunt u contact opnemen via:
      </P>
      <UL>
        <LI>E-mail: privacy@dreamteam.nl</LI>
        <LI>Post: DreamTeam B.V. (i.o.), [ADRES], Nederland</LI>
      </UL>
    </Prose>
  );
}

/* ─────────────────────────────────────────────
   2. ALGEMENE VOORWAARDEN
───────────────────────────────────────────── */
function VoorwaardenContent() {
  return (
    <Prose>
      <P>
        <strong className="text-[#e2e8f0]">Laatste update: juni 2026</strong>
      </P>
      <P>
        Deze Algemene Voorwaarden zijn van toepassing op alle aanbiedingen, overeenkomsten en
        dienstverlening van DreamTeam B.V. (in oprichting), gevestigd te [ADRES], ingeschreven
        bij de Kamer van Koophandel onder nummer [KVK_NUMBER].
      </P>

      <H2>Artikel 1 — Definities</H2>
      <P>In deze Algemene Voorwaarden wordt verstaan onder:</P>
      <UL>
        <LI>
          <strong className="text-[#e2e8f0]">DreamTeam:</strong> DreamTeam B.V. (in oprichting),
          de aanbieder van het platform en de dienst.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Klant:</strong> iedere natuurlijke persoon of
          rechtspersoon die een overeenkomst aangaat met DreamTeam voor het gebruik van de dienst.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Dienst:</strong> het online SaaS-platform van
          DreamTeam dat toegang biedt tot AI-agents, taakbeheer en geautomatiseerde workflows,
          bereikbaar via dreamteam.nl.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">AI-agents:</strong> geautomatiseerde software-entiteiten
          die gebruik maken van grote taalmodellen (large language models) om taken uit te voeren,
          teksten te genereren en vragen te beantwoorden namens de Klant.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">AI-output:</strong> alle tekst, gegevens, analyses,
          aanbevelingen en andere resultaten die door AI-agents worden gegenereerd.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Account:</strong> de persoonlijke gebruikersomgeving
          van de Klant binnen het platform.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Overeenkomst:</strong> de abonnementsovereenkomst
          tussen DreamTeam en de Klant voor het gebruik van de dienst.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Abonnement:</strong> het door de Klant gekozen
          pakket inclusief bijbehorende gebruikslimieten en tarieven.
        </LI>
      </UL>

      <H2>Artikel 2 — Toepasselijkheid</H2>
      <P>
        2.1 Deze Algemene Voorwaarden zijn van toepassing op alle aanbiedingen, offertes,
        overeenkomsten en dienstverlening van DreamTeam, tenzij schriftelijk anders overeengekomen.
      </P>
      <P>
        2.2 De toepasselijkheid van eventuele inkoop- of andere voorwaarden van de Klant wordt
        uitdrukkelijk van de hand gewezen, tenzij DreamTeam hiermee uitdrukkelijk en schriftelijk
        heeft ingestemd.
      </P>
      <P>
        2.3 Indien enige bepaling van deze voorwaarden nietig is of vernietigd wordt, blijven de
        overige bepalingen onverminderd van kracht.
      </P>

      <H2>Artikel 3 — Aanbod en totstandkoming overeenkomst</H2>
      <P>
        3.1 De overeenkomst komt tot stand op het moment dat de Klant zich registreert via het
        platform en de Algemene Voorwaarden accepteert.
      </P>
      <P>
        3.2 <strong className="text-[#e2e8f0]">Proefperiode:</strong> Nieuwe Klanten ontvangen
        een proefperiode van 14 kalenderdagen, tenzij anders vermeld bij het aanbod. Tijdens de
        proefperiode is de dienst gratis beschikbaar met beperkte functionaliteit.
      </P>
      <P>
        3.3 Na afloop van de proefperiode wordt het account automatisch omgezet naar een betaald
        abonnement, tenzij de Klant het account vóór het einde van de proefperiode heeft opgezegd.
        De Klant ontvangt hierover tijdig een herinnering per e-mail.
      </P>
      <P>
        3.4 DreamTeam behoudt zich het recht voor een registratie te weigeren zonder opgave van
        redenen.
      </P>

      <H2>Artikel 4 — Gebruik van de dienst</H2>
      <H3>4.1 Toegestaan gebruik</H3>
      <P>De Klant mag de dienst uitsluitend gebruiken voor rechtmatige zakelijke doeleinden,
        overeenkomstig de overeenkomst en de documentatie van DreamTeam.</P>
      <H3>4.2 Verboden gebruik</H3>
      <P>Het is de Klant niet toegestaan:</P>
      <UL>
        <LI>de dienst te gebruiken voor onwettige, frauduleuze of kwaadwillige doeleinden;</LI>
        <LI>de dienst te gebruiken voor het genereren van misleidende, beledigende, discriminerende
          of anderszins onrechtmatige inhoud;</LI>
        <LI>de dienst te (her)verkopen, sublicentiëren of op andere wijze commercieel te exploiteren
          zonder schriftelijke toestemming van DreamTeam;</LI>
        <LI>beveiligingsmaatregelen te omzeilen of ongeautoriseerde toegang te verkrijgen tot
          systemen van DreamTeam;</LI>
        <LI>de dienst te gebruiken op een wijze die de technische infrastructuur overbelast of
          schaadt;</LI>
        <LI>automatisch grote hoeveelheden verzoeken in te dienen die buiten het redelijke gebruik
          vallen (spam, scraping);</LI>
        <LI>intellectuele eigendomsrechten van DreamTeam of derden te schenden.</LI>
      </UL>
      <P>
        4.3 Bij overtreding van artikel 4.2 is DreamTeam gerechtigd de toegang tot de dienst
        onmiddellijk en zonder restitutie op te schorten of te beëindigen.
      </P>

      <H2>Artikel 5 — AI-gegenereerde content en verantwoordelijkheid</H2>
      <P>
        5.1 <strong className="text-[#e2e8f0]">Verantwoordelijkheid Klant:</strong> De Klant is
        te allen tijde zelf verantwoordelijk voor het gebruik van de AI-output. De Klant dient
        AI-output altijd kritisch te beoordelen en te controleren alvorens deze te gebruiken,
        te publiceren of te vertrouwen voor zakelijke beslissingen.
      </P>
      <P>
        5.2 <strong className="text-[#e2e8f0]">Geen garanties op juistheid:</strong> AI-agents
        kunnen onjuiste, onvolledige, verouderde of misleidende informatie genereren. DreamTeam
        geeft geen garanties, expliciet noch impliciet, over de juistheid, volledigheid,
        actualiteit of geschiktheid van AI-output voor enig specifiek doel.
      </P>
      <P>
        5.3 <strong className="text-[#e2e8f0]">Uitsluiting aansprakelijkheid AI-output:</strong>{" "}
        DreamTeam aanvaardt geen enkele aansprakelijkheid voor schade — direct of indirect —
        die voortvloeit uit het gebruik van, het vertrouwen op of het handelen naar aanleiding
        van AI-output gegenereerd door het platform. Dit omvat maar is niet beperkt tot
        financiële verliezen, reputatieschade, gemiste kansen of beslissingen op basis van
        onjuiste AI-informatie.
      </P>
      <P>
        5.4 De Klant vrijwaart DreamTeam voor alle aanspraken van derden die verband houden
        met de inhoud van door de Klant gebruikte of gepubliceerde AI-output.
      </P>
      <P>
        5.5 AI-agents leveren geen professioneel financieel, juridisch, medisch of fiscaal advies.
        Voor dergelijke adviezen dient de Klant altijd een gekwalificeerde professional te raadplegen.
      </P>

      <H2>Artikel 6 — Prijzen en betaling</H2>
      <P>
        6.1 De actuele prijzen voor de abonnementen zijn vermeld op de website van DreamTeam
        (dreamteam.nl/pricing). Alle prijzen zijn exclusief btw, tenzij anders vermeld.
      </P>
      <P>
        6.2 Abonnementskosten worden <strong className="text-[#e2e8f0]">maandelijks vooruit</strong>{" "}
        in rekening gebracht via de door de Klant opgegeven betaalmethode.
      </P>
      <P>
        6.3 Bij niet-tijdige betaling is DreamTeam gerechtigd de toegang tot de dienst te
        opschorten totdat de openstaande bedragen zijn voldaan.
      </P>
      <P>
        6.4 DreamTeam behoudt zich het recht voor de prijzen te wijzigen. Prijsverhogingen worden
        minimaal <strong className="text-[#e2e8f0]">30 dagen van tevoren</strong> per e-mail
        aan de Klant medegedeeld. Bij prijsverhogingen heeft de Klant het recht het abonnement
        te beëindigen vóór de ingangsdatum van de nieuwe prijs.
      </P>

      <H2>Artikel 7 — Abonnement en opzegging</H2>
      <P>
        7.1 Het abonnement wordt aangegaan voor een periode van één maand en wordt automatisch
        verlengd, tenzij de Klant tijdig opzegt.
      </P>
      <P>
        7.2 De Klant kan het abonnement op ieder moment opzeggen via de accountinstellingen.
        De opzegging gaat in aan het einde van de lopende abonnementsperiode.
      </P>
      <P>
        7.3 <strong className="text-[#e2e8f0]">Geen restitutie:</strong> Bij opzegging vindt
        geen restitutie plaats van reeds betaalde abonnementskosten voor de lopende periode.
        De Klant behoudt toegang tot de dienst tot het einde van de betaalde periode.
      </P>
      <P>
        7.4 DreamTeam is gerechtigd het abonnement zonder opgave van redenen te beëindigen met
        inachtneming van een opzegtermijn van 30 dagen, waarbij reeds betaalde bedragen voor
        de resterende periode worden gerestitueerd.
      </P>
      <P>
        7.5 Bij ernstige of herhaalde schending van artikel 4.2 kan DreamTeam het abonnement
        onmiddellijk beëindigen zonder restitutie.
      </P>

      <H2>Artikel 8 — Intellectueel eigendom</H2>
      <P>
        8.1 Alle intellectuele eigendomsrechten op het platform, de software, de branding,
        de documentatie en de AI-agent-persona's berusten bij DreamTeam of haar licentiegevers.
        De Klant verkrijgt uitsluitend een niet-exclusief, niet-overdraagbaar gebruiksrecht
        voor de duur van de overeenkomst.
      </P>
      <P>
        8.2 <strong className="text-[#e2e8f0]">AI-gegenereerde content:</strong> Voor de door
        AI-agents gegenereerde output op verzoek van de Klant verkrijgt de Klant een niet-exclusief
        gebruiksrecht. DreamTeam claimt geen auteursrecht op individuele AI-outputs van de Klant,
        maar behoudt het recht de dienst en onderliggende modellen te verbeteren. Gelet op de
        huidige stand van de rechtspraak omtrent auteursrecht op AI-gegenereerde content, adviseert
        DreamTeam voorzichtigheid bij publicatie van AI-output zonder menselijke creatieve bijdrage.
      </P>
      <P>
        8.3 De Klant verleent DreamTeam een niet-exclusief recht om door de Klant ingevoerde
        gegevens te verwerken voor zover nodig voor de uitvoering van de dienst.
      </P>

      <H2>Artikel 9 — Privacy en gegevensbescherming</H2>
      <P>
        9.1 DreamTeam verwerkt persoonsgegevens in overeenstemming met de toepasselijke
        privacywetgeving (AVG). Voor meer informatie verwijzen wij naar ons{" "}
        <Link href="/legal/privacy" className="text-[#3b82f6] hover:underline">
          Privacybeleid
        </Link>
        .
      </P>
      <P>
        9.2 Indien de Klant in het kader van de dienst persoonsgegevens van zijn eigen klanten
        of medewerkers verwerkt via het platform, treedt de Klant op als verwerkingsverantwoordelijke
        en DreamTeam als verwerker. In dat geval wordt een afzonderlijke verwerkersovereenkomst
        gesloten.
      </P>

      <H2>Artikel 10 — Aansprakelijkheid</H2>
      <P>
        10.1 De aansprakelijkheid van DreamTeam voor schade als gevolg van toerekenbare tekortkoming
        in de nakoming van de overeenkomst is beperkt tot de directe schade en bedraagt nooit meer
        dan het totaalbedrag dat de Klant aan DreamTeam heeft betaald gedurende de{" "}
        <strong className="text-[#e2e8f0]">drie maanden</strong> voorafgaand aan het schadeveroorzakende
        evenement.
      </P>
      <P>
        10.2 Aansprakelijkheid van DreamTeam voor indirecte schade — waaronder gederfde winst,
        gemiste besparingen, gevolgschade, verlies van gegevens of reputatieschade — is
        uitdrukkelijk uitgesloten.
      </P>
      <P>
        10.3 De in dit artikel opgenomen beperkingen gelden niet in geval van opzet of bewuste
        roekeloosheid van DreamTeam of haar leidinggevenden.
      </P>
      <P>
        10.4 DreamTeam garandeert geen ononderbroken of foutloze beschikbaarheid van de dienst.
        DreamTeam streeft naar een beschikbaarheid van 99,5% per maand, maar geeft hierover geen
        contractuele garantie tenzij schriftelijk anders overeengekomen.
      </P>

      <H2>Artikel 11 — Overmacht</H2>
      <P>
        11.1 DreamTeam is niet aansprakelijk voor een tekortkoming in de nakoming van haar
        verplichtingen indien en voor zover deze tekortkoming het gevolg is van omstandigheden
        buiten haar redelijke invloedssfeer (overmacht).
      </P>
      <P>
        11.2 Onder overmacht wordt mede verstaan: storingen bij toeleveranciers (waaronder
        aanbieders van AI-modellen zoals Anthropic), DDoS-aanvallen, overheidsmaatregelen,
        stroomuitval, natuurrampen en pandemieën.
      </P>

      <H2>Artikel 12 — Wijziging voorwaarden</H2>
      <P>
        12.1 DreamTeam behoudt zich het recht voor deze Algemene Voorwaarden te wijzigen.
        Wezenlijke wijzigingen worden minimaal{" "}
        <strong className="text-[#e2e8f0]">30 dagen van tevoren</strong> per e-mail aan de
        Klant medegedeeld.
      </P>
      <P>
        12.2 Bij voortgezet gebruik van de dienst na de ingangsdatum van de gewijzigde voorwaarden
        wordt de Klant geacht de nieuwe voorwaarden te hebben aanvaard.
      </P>
      <P>
        12.3 Indien de Klant de gewijzigde voorwaarden niet accepteert, kan de Klant het
        abonnement beëindigen per de ingangsdatum van de nieuwe voorwaarden.
      </P>

      <H2>Artikel 13 — Toepasselijk recht en geschillenbeslechting</H2>
      <P>
        13.1 Op deze Algemene Voorwaarden en alle overeenkomsten met DreamTeam is uitsluitend
        <strong className="text-[#e2e8f0]"> Nederlands recht</strong> van toepassing.
      </P>
      <P>
        13.2 Geschillen die voortvloeien uit of verband houden met de overeenkomst worden bij
        uitsluiting voorgelegd aan de bevoegde rechter van de{" "}
        <strong className="text-[#e2e8f0]">Rechtbank Amsterdam</strong>, tenzij dwingend recht
        anders bepaalt.
      </P>
      <P>
        13.3 Partijen zullen eerst trachten een geschil in onderling overleg op te lossen
        alvorens een geschil aan de rechter voor te leggen.
      </P>

      <P className="pt-4 text-xs text-[#e2e8f0]/50">
        DreamTeam B.V. (i.o.) — KvK: [KVK_NUMBER] — BTW: [BTW_NUMBER] — [ADRES] —
        privacy@dreamteam.nl
      </P>
    </Prose>
  );
}

/* ─────────────────────────────────────────────
   3. COOKIEBELEID
───────────────────────────────────────────── */
function CookiesContent() {
  return (
    <Prose>
      <P>
        <strong className="text-[#e2e8f0]">Laatste update: juni 2026</strong>
      </P>
      <P>
        DreamTeam B.V. (in oprichting) gebruikt cookies en vergelijkbare technologieën op haar
        platform. In dit cookiebeleid leggen wij uit wat cookies zijn, welke cookies wij gebruiken,
        waarom en hoe u uw voorkeuren kunt beheren.
      </P>

      <H2>1. Wat zijn cookies?</H2>
      <P>
        Cookies zijn kleine tekstbestandjes die door een website op uw apparaat worden opgeslagen
        wanneer u die website bezoekt. Ze stellen de website in staat uw apparaat te herkennen
        bij een volgend bezoek en bepaalde instellingen of voorkeuren te onthouden.
      </P>
      <P>
        Naast traditionele cookies kan DreamTeam ook gebruik maken van vergelijkbare technieken
        zoals <em>local storage</em> en <em>session storage</em> voor functionele doeleinden.
      </P>

      <H2>2. Welke cookies gebruiken wij?</H2>

      <H3>2.1 Functionele cookies (strikt noodzakelijk)</H3>
      <P>
        Functionele cookies zijn noodzakelijk voor het correct functioneren van het platform.
        Zonder deze cookies kunt u niet inloggen of gebruik maken van de kernfunctionaliteiten.
        Op grond van de Telecommunicatiewet (en de AVG) is voor het plaatsen van strikt
        noodzakelijke cookies geen toestemming vereist.
      </P>

      <H3>2.2 Analytische cookies</H3>
      <P>
        Wij gebruiken analytische cookies om inzicht te krijgen in het gebruik van het platform,
        zodat wij de dienst kunnen verbeteren.{" "}
        <strong className="text-[#e2e8f0]">
          Wij gebruiken geen Google Analytics.
        </strong>{" "}
        Wij hanteren een privacy-first aanpak: eventuele analyses worden uitgevoerd met
        privacy-vriendelijke tooling die geen data deelt met advertentienetwerken en waarbij
        IP-adressen worden geanonimiseerd. Voor analytische cookies vragen wij uw toestemming.
      </P>

      <H3>2.3 Marketingcookies</H3>
      <P>
        Wij plaatsen <strong className="text-[#e2e8f0]">geen marketingcookies</strong> en wij
        delen geen gegevens met advertentienetwerken. U wordt niet gevolgd voor reclamedoeleinden.
      </P>

      <H2>3. Cookie-overzicht</H2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse mt-2 mb-4">
          <thead>
            <tr className="border-b border-[rgba(59,130,246,0.2)]">
              <th className="text-left py-2 pr-4 text-[#e2e8f0] font-semibold">Naam</th>
              <th className="text-left py-2 pr-4 text-[#e2e8f0] font-semibold">Type</th>
              <th className="text-left py-2 pr-4 text-[#e2e8f0] font-semibold">Doel</th>
              <th className="text-left py-2 text-[#e2e8f0] font-semibold">Bewaartermijn</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[rgba(255,255,255,0.05)]">
              <td className="py-2 pr-4 font-mono text-xs text-[#3b82f6]">session_id</td>
              <td className="py-2 pr-4">Functioneel</td>
              <td className="py-2 pr-4">Ingelogd blijven gedurende een sessie</td>
              <td className="py-2">Sessie (wordt gewist bij sluiten browser)</td>
            </tr>
            <tr className="border-b border-[rgba(255,255,255,0.05)]">
              <td className="py-2 pr-4 font-mono text-xs text-[#3b82f6]">lang_pref</td>
              <td className="py-2 pr-4">Functioneel</td>
              <td className="py-2 pr-4">Taalvoorkeur onthouden</td>
              <td className="py-2">1 jaar</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-mono text-xs text-[#3b82f6]">consent</td>
              <td className="py-2 pr-4">Functioneel</td>
              <td className="py-2 pr-4">Uw cookievoorkeur (ja/nee) opslaan</td>
              <td className="py-2">1 jaar</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>4. Toestemming voor cookies</H2>
      <P>
        Bij uw eerste bezoek aan het platform vragen wij uw toestemming voor het plaatsen van
        niet-noodzakelijke cookies (analytische cookies). Functionele cookies worden geplaatst
        zonder toestemming, omdat deze noodzakelijk zijn voor de werking van de dienst.
      </P>
      <P>
        U kunt uw toestemming op elk moment intrekken via de cookie-instellingen in uw account
        of door de cookies handmatig te verwijderen in uw browser.
      </P>

      <H2>5. Cookies beheren via uw browser</H2>
      <P>
        U kunt cookies uitschakelen of verwijderen via de instellingen van uw browser. Houd er
        rekening mee dat het uitschakelen van functionele cookies de werking van het platform
        kan beïnvloeden (u kunt dan mogelijk niet meer inloggen).
      </P>
      <UL>
        <LI>
          <strong className="text-[#e2e8f0]">Google Chrome:</strong> Instellingen → Privacy en
          beveiliging → Cookies en andere sitegegevens
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Mozilla Firefox:</strong> Instellingen → Privacy en
          beveiliging → Cookies en websitegegevens
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Safari (Mac/iOS):</strong> Voorkeuren → Privacy →
          Beheer websitegegevens
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Microsoft Edge:</strong> Instellingen → Cookies en
          sitemachtigingen
        </LI>
      </UL>
      <P>
        Meer informatie over het beheren van cookies vindt u op{" "}
        <a
          href="https://www.consumentenbond.nl/veilig-internetten/cookies-verwijderen"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3b82f6] hover:underline"
        >
          consumentenbond.nl
        </a>{" "}
        of{" "}
        <a
          href="https://www.cookielaw.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3b82f6] hover:underline"
        >
          cookielaw.org
        </a>
        .
      </P>

      <H2>6. Wijzigingen in dit cookiebeleid</H2>
      <P>
        Dit cookiebeleid kan worden aangepast wanneer wij nieuwe cookies implementeren of
        bestaande technieken wijzigen. Wezenlijke wijzigingen zullen wij via het platform of
        per e-mail communiceren.
      </P>

      <H2>7. Contact</H2>
      <P>
        Voor vragen over ons cookiegebruik kunt u contact opnemen via{" "}
        <a href="mailto:privacy@dreamteam.nl" className="text-[#3b82f6] hover:underline">
          privacy@dreamteam.nl
        </a>
        .
      </P>
    </Prose>
  );
}

/* ─────────────────────────────────────────────
   4. DISCLAIMER
───────────────────────────────────────────── */
function DisclaimerContent() {
  return (
    <Prose>
      <P>
        <strong className="text-[#e2e8f0]">Laatste update: juni 2026</strong>
      </P>
      <P>
        De informatie op dit platform en de output gegenereerd door de AI-agents van DreamTeam
        is uitsluitend bestemd voor algemene informatieve doeleinden. Aan het gebruik van het
        platform en de AI-output zijn de volgende disclaimers verbonden.
      </P>

      <H2>1. Geen garanties op AI-output</H2>
      <P>
        De AI-agents op het DreamTeam-platform maken gebruik van grote taalmodellen (large
        language models) die door derden worden aangeboden. Hoewel wij streven naar een
        zo nauwkeurig en nuttig mogelijke dienst, erkent DreamTeam uitdrukkelijk dat:
      </P>
      <UL>
        <LI>
          AI-output feitelijke onjuistheden, hallucinations (verzonnen feiten), onvolledige
          informatie of verouderde gegevens kan bevatten;
        </LI>
        <LI>
          AI-output niet altijd de meest recente stand van zaken, wetgeving, marktomstandigheden
          of wetenschappelijke inzichten weerspiegelt;
        </LI>
        <LI>
          de kwaliteit en juistheid van AI-output mede afhankelijk is van de manier waarop de
          Gebruiker vragen stelt (de "prompt");
        </LI>
        <LI>
          AI-modellen inherent niet-deterministisch zijn en bij vergelijkbare vragen verschillende
          antwoorden kunnen geven.
        </LI>
      </UL>
      <P>
        <strong className="text-[#e2e8f0]">
          De Gebruiker is te allen tijde zelf eindverantwoordelijk voor het beoordelen,
          verifiëren en toepassen van AI-output.
        </strong>{" "}
        DreamTeam aanvaardt geen enkele aansprakelijkheid voor schade die voortvloeit uit het
        gebruik van of het vertrouwen op AI-output.
      </P>

      <H2>2. Geen professioneel advies</H2>
      <P>
        De informatie en output die via het DreamTeam-platform wordt verstrekt, vormt uitdrukkelijk
        <strong className="text-[#e2e8f0]"> geen professioneel advies</strong> in de volgende
        domeinen:
      </P>
      <UL>
        <LI>
          <strong className="text-[#e2e8f0]">Financieel advies:</strong> AI-output over
          investeringen, financiële planning, belasting of financiële strategie is algemene
          informatie en vervangt niet het advies van een gecertificeerd financieel adviseur,
          accountant of belastingadviseur.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Juridisch advies:</strong> AI-output over
          juridische kwesties, contracten, wet- en regelgeving of rechtszaken is geen
          juridisch advies en vervangt niet de diensten van een advocaat of juridisch adviseur.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Medisch advies:</strong> AI-output over gezondheid,
          symptomen, medicatie of medische behandelingen is geen medisch advies en vervangt niet
          de diagnose of behandeling door een gekwalificeerde arts of zorgprofessional.
        </LI>
        <LI>
          <strong className="text-[#e2e8f0]">Overig professioneel advies:</strong> Voor
          specialistische vraagstukken op andere gebieden (psychologisch, technisch, e.d.)
          dient altijd een gekwalificeerde professional geraadpleegd te worden.
        </LI>
      </UL>
      <P>
        Beslissingen op basis van AI-output zijn voor rekening en risico van de Gebruiker.
      </P>

      <H2>3. Externe links</H2>
      <P>
        Het platform en de AI-output kunnen verwijzingen of hyperlinks bevatten naar externe
        websites en bronnen die niet door DreamTeam worden beheerd. DreamTeam heeft geen
        controle over de inhoud, het privacybeleid of de beschikbaarheid van deze externe
        websites en aanvaardt geen aansprakelijkheid voor schade die voortvloeit uit het
        gebruik van dergelijke externe bronnen.
      </P>
      <P>
        Het feit dat een AI-agent een externe bron noemt of citeert, impliceert geen goedkeuring
        of aanbeveling door DreamTeam van die bron of haar inhoud.
      </P>

      <H2>4. Intellectueel eigendom</H2>
      <P>
        Alle intellectuele eigendomsrechten — waaronder auteursrechten, merkrechten, octrooirechten
        en databankrechten — op de software, het platform, de vormgeving, de teksten, afbeeldingen
        en overige content van DreamTeam berusten bij DreamTeam B.V. of haar licentiegevers.
      </P>
      <P>
        Niets van het platform mag worden verveelvoudigd, opgeslagen in een geautomatiseerd
        gegevensbestand, of openbaar gemaakt, in enige vorm of op enige wijze, zonder
        voorafgaande schriftelijke toestemming van DreamTeam.
      </P>

      <H2>5. Beschikbaarheid van de dienst</H2>
      <P>
        DreamTeam streeft naar een maximale beschikbaarheid van het platform, maar geeft geen
        garantie voor ononderbroken toegang. Het platform kan tijdelijk niet beschikbaar zijn
        vanwege gepland onderhoud, storingen bij toeleveranciers (zoals aanbieders van
        AI-modellen), cyberaanvallen of andere omstandigheden buiten de invloedssfeer van
        DreamTeam. DreamTeam is niet aansprakelijk voor schade als gevolg van (tijdelijke)
        onbeschikbaarheid van de dienst.
      </P>

      <H2>6. Wijzigingen</H2>
      <P>
        DreamTeam behoudt zich het recht voor de inhoud van het platform, de functionaliteiten
        van de AI-agents en de inhoud van deze disclaimer op elk moment te wijzigen zonder
        voorafgaande kennisgeving. Wij adviseren u deze disclaimer regelmatig te raadplegen.
      </P>
      <P>
        DreamTeam behoudt zich tevens het recht voor om op elk moment en zonder voorafgaande
        kennisgeving wijzigingen aan te brengen in de dienst, inclusief het toevoegen,
        wijzigen of verwijderen van functies.
      </P>

      <P className="pt-4 text-xs text-[#e2e8f0]/50">
        DreamTeam B.V. (i.o.) — KvK: [KVK_NUMBER] — BTW: [BTW_NUMBER] — [ADRES] —
        privacy@dreamteam.nl
      </P>
    </Prose>
  );
}

/* ─────────────────────────────────────────────
   LEGAL DOCS REGISTRY
───────────────────────────────────────────── */
const LEGAL_DOCS: Record<
  string,
  { title: string; subtitle: string; content: React.ReactNode }
> = {
  privacy: {
    title: "Privacybeleid",
    subtitle: "Hoe wij omgaan met uw persoonsgegevens",
    content: <PrivacyContent />,
  },
  voorwaarden: {
    title: "Algemene Voorwaarden",
    subtitle: "Gebruiksvoorwaarden voor het DreamTeam-platform",
    content: <VoorwaardenContent />,
  },
  cookies: {
    title: "Cookiebeleid",
    subtitle: "Informatie over het gebruik van cookies",
    content: <CookiesContent />,
  },
  disclaimer: {
    title: "Disclaimer",
    subtitle: "Beperkingen en verantwoordelijkheden",
    content: <DisclaimerContent />,
  },
};

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
function LegalNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(59,130,246,0.12)] bg-[#050810]/90 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-[#3b82f6]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-[#e2e8f0] font-semibold text-sm group-hover:text-[#3b82f6] transition-colors">
            DreamTeam
          </span>
        </Link>

        {/* Back link */}
        <Link
          href="/"
          className="text-sm text-[#e2e8f0]/60 hover:text-[#3b82f6] transition-colors flex items-center gap-1"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Terug naar home
        </Link>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   PAGE COMPONENT
───────────────────────────────────────────── */
export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const doc = LEGAL_DOCS[slug as keyof typeof LEGAL_DOCS];

  return (
    <div className="min-h-screen bg-[#050810] text-[#e2e8f0]">
      <LegalNavbar />

      {/* Background subtle orbs */}
      <div
        className="fixed top-0 right-0 w-96 h-96 pointer-events-none opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed bottom-1/3 left-0 w-80 h-80 pointer-events-none opacity-10"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
        }}
      />

      <main className="relative z-10 pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {doc ? (
            <>
              {/* Page header */}
              <div className="mb-8">
                {/* Breadcrumb */}
                <p className="text-xs text-[#3b82f6]/70 mb-3 uppercase tracking-widest font-medium">
                  Juridisch &nbsp;/&nbsp; {doc.title}
                </p>
                <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">
                  {doc.title}
                </h1>
                <p className="text-[#e2e8f0]/50 text-sm">{doc.subtitle}</p>
              </div>

              {/* Content card */}
              <div className="glass-card rounded-xl p-8">
                {doc.content}
              </div>

              {/* Footer nav between docs */}
              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(LEGAL_DOCS).map(([s, d]) => (
                  <Link
                    key={s}
                    href={`/legal/${s}`}
                    className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all ${
                      s === slug
                        ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]"
                        : "border-[rgba(59,130,246,0.15)] text-[#e2e8f0]/50 hover:border-[rgba(59,130,246,0.4)] hover:text-[#e2e8f0]"
                    }`}
                  >
                    {d.title}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            /* 404 state */
            <div className="glass-card rounded-xl p-12 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">
                Pagina niet gevonden
              </h1>
              <p className="text-[#e2e8f0]/50 text-sm mb-6">
                Dit juridisch document bestaat niet. Kies een van de beschikbare
                pagina's hieronder.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {Object.entries(LEGAL_DOCS).map(([s, d]) => (
                  <Link
                    key={s}
                    href={`/legal/${s}`}
                    className="rounded-lg border border-[rgba(59,130,246,0.3)] px-4 py-2 text-sm text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors"
                  >
                    {d.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
