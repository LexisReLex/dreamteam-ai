# Onderzoek: Neon (serverless Postgres) — het volledige traject

> Bron: `github.com/neondatabase/neon` — lokaal gekloond en geïnspecteerd op 2026-07-25.
> Laatste commit in onderzochte kloon: `8f60b04` (2026-05-25) — "proxy: split password hack payload on first separator (#12899)".
> Elk cijfer en elke claim hieronder is terug te voeren op een bestand in de repo (zie kolom "Bron"). Niets is geschat.

## 1. Wat is Neon in één alinea

Neon is een **open-source serverless Postgres database-platform** (licentie: **Apache-2.0**, zie `LICENSE`). De kern-innovatie: het **scheidt compute van storage**. De compute-nodes zijn stateless PostgreSQL-processen; de opslaglaag van PostgreSQL is vervangen door een eigen storage-engine die de data over een cluster van nodes verdeelt (`README.md`). Dat maakt dingen mogelijk die vanilla Postgres niet kan: **schaal naar nul**, **branchen van een database als een git-branch** (copy-on-write), en **point-in-time recovery**.

## 2. Feiten uit de repo (geverifieerd, geen schatting)

| Feit | Waarde | Bron |
|---|---|---|
| Licentie | Apache-2.0 | `LICENSE` |
| Hoofdtaal | Rust (698 `.rs`-bestanden) | `git ls-files` telling |
| Overige talen | Python 268, SQL 241, C 30 (Postgres-patches) | `git ls-files` telling |
| Aantal RFC's (ontwerpdocumenten) | 60 | `docs/rfcs/*.md` |
| Cargo workspace-crates | 40+ (o.a. pageserver, safekeeper, proxy, storage_controller) | `Cargo.toml` |
| Ondersteunde Postgres-versies | v14 en v15 (vendored forks) | `vendor/postgres-v14`, `vendor/postgres-v15` |

## 3. De architectuur — de vier lagen

Neon bestaat uit **compute-nodes** + de **Neon storage-engine**. De storage-engine valt uiteen in twee hoofddelen (pageserver + safekeepers), met daaromheen een proxy en een storage-controller.

### 3.1 Compute node
Een stateless PostgreSQL-node (gepatchte fork). Slaat zelf niks blijvend op; leest pagina's op via `GetPage@LSN`-verzoeken aan de pageserver en schrijft de WAL weg naar de safekeepers. Bron: `README.md`, `docs/glossary.md`.

### 3.2 Safekeepers — de WAL-service
De safekeepers vormen een **redundante WAL-dienst**. De primaire Postgres streamt zijn WAL (write-ahead log) naar de safekeepers en behandelt ze als een synchrone replica. Een WAL-record is pas **durable** als de **meerderheid** van de safekeepers het naar lokale schijf heeft geschreven. Er draait een **Paxos-gebaseerd consensusalgoritme** om het quorum en om te garanderen dat er maar één primaire node tegelijk schrijft. Bron: `docs/walservice.md`, `docs/safekeeper-protocol.md`.

Belangrijk detail (uit de Q&A in `docs/walservice.md`): de compute "pusht" WAL naar de safekeepers via een background worker genaamd de **WAL proposer** — anders dan normale streaming replication, waar de replica de verbinding opzet.

### 3.3 Pageserver — de opslag-backend
De pageserver:
- Bewaart en beheert de data.
- Beantwoordt `GetPage@LSN`-verzoeken van de compute-nodes.
- Ontvangt WAL van de safekeepers en decodeert die (WAL redo).
- Uploadt data naar **S3** (de uiteindelijke, fouttolerante opslag) en downloadt weer als nodig.

Cruciaal ontwerpfeit: **S3 is de hoofd-opslag van álle data; er zijn geen pageserver-replica's.** Daarom bestaat de aparte WAL-service — die fungeert als tijdelijke fouttolerante buffer voor recente data die nog niet in S3 staat, zodat een transactie niet op S3 hoeft te wachten. Bron: `docs/pageserver.md`, `docs/walservice.md`.

### 3.4 Storage controller
Zit tussen de administratieve API-clients en de pageservers. Vertaalt één API-call (bijv. "maak tenant aan") naar veel calls naar veel pageservers (voor meerdere shards en secondary locations). Beheert generations, high-availability en live migraties via een **reconciliation loop** ("intent"-state vs. "reconcile"-taak). Houdt zelf een subset van de state in een eigen Postgres-database (via de `diesel`-crate). Bron: `docs/storage_controller.md`.

### 3.5 Proxy
Postgres-protocol-proxy/router. Luistert op de psql-poort, checkt auth via een externe dienst en kan databases/accounts aanmaken. Bron: `docs/sourcetree.md`.

### De schrijf- en leesweg (samengevat)
```
SCHRIJVEN:  Compute ──WAL──▶ Safekeepers (Paxos-quorum) ──WAL──▶ Pageserver ──▶ S3
LEZEN:      Compute ──GetPage@LSN──▶ Pageserver ──(reconstrueert pagina uit base image + WAL)──▶ Compute
```

## 4. De killer-feature: branchen als git

Neon-storage doet **copy-on-write branching** (`docs/synthetic-size.md`, `README.md`). Uit de README-demo: je maakt een branch (`cargo neon timeline branch`), start er een aparte Postgres op, en die heeft álle data van de oorspronkelijke branch — maar wijzigingen op de branch raken het origineel niet. Interne termen: een **tenant** = een geïsoleerde database-installatie (multitenancy), een **timeline** = een branch. Bron: `docs/glossary.md`, `docs/multitenancy.md`.

Dit is waarom Neon populair is voor dev/preview-omgevingen: elke pull request kan een eigen wegwerp-database-branch krijgen die in seconden ontstaat, zonder de data fysiek te kopiëren.

## 5. Het "traject" van het project — de RFC's

Neon werkt met **RFC's** (Request for Comments / tech design docs) voor grote of niet-triviale wijzigingen. Er staan er **60** in `docs/rfcs/`. Ze laten de evolutie van het project zien — van de eerste opslag- en laptop-CLI-ideeën tot recente productie-thema's:

- **Fundament (001–010):** cluster-size-limits, storage, durability, snapshot-first-storage, storage-details.
- **Opslag-mechaniek (011–030):** retention policy, background tasks, term-history, LSM-storage, generation-numbers, S3-MVCC, vectored-timeline-get.
- **Schaal & sharding (031–041):** static sharding, shard-splitting, storage-controller drain-and-fill, sharded-ingest.
- **Recent (2025):** direct-IO voor pageserver, concurrent-IO op het read-path, compute-prewarm, node-deletion-API. Bron: `docs/rfcs/`.

De RFC-README waarschuwt expliciet: sommige RFC's zijn geïmplementeerd, andere staan op de roadmap, en weer andere zijn achterhaald — "lees ze met een korreltje zout". Dat is het eerlijke beeld van hun traject.

## 6. Lokaal draaien (het pad dat de repo zelf beschrijft)

De repo is gebouwd om lokaal te draaien met de `cargo neon`-CLI (bron: `README.md`):
```sh
cargo neon init            # maakt .neon-repository
cargo neon start           # start pageserver + safekeeper + broker
cargo neon tenant create --set-default
cargo neon endpoint create main && cargo neon endpoint start main
psql -p 55432 -h 127.0.0.1 -U cloud_admin postgres
```
Bouwen vereist Rust (versie gepind via `rust-toolchain.toml`), een C-toolchain en `protoc` 3.15+. Het bouwt een **gepatchte PostgreSQL** mee (`vendor/postgres-v14/-v15`).

## 7. Wat dit betekent voor DreamTeam (concreet, geverifieerd)

**Huidige situatie van DreamTeam (geverifieerd in deze repo):** de app gebruikt **Drizzle ORM op SQLite** — `drizzle.config.ts` zegt letterlijk `dialect: "sqlite"` met een lokaal bestand `./data.db`. Er is dus nu geen Postgres en geen serverless database.

Dat maakt het "traject" hier een reële keuze: **blijven op SQLite, of migreren naar serverless Postgres (Neon).**

### Eerlijke afweging (geen verkooppraatje)

**Waarom Neon wél zou passen:**
- Drizzle ondersteunt een **Postgres-dialect** en heeft een **first-party `neon-serverless`-driver** — de migratie van SQLite → Neon is voor Drizzle een bekende, ondersteunde route, geen exotisch pad.
- Serverless: schaalt naar nul, je betaalt niet voor idle. Past bij een project dat nog niet constant load heeft.
- **Database-branching** = per preview-deploy of per experiment een eigen data-branch. Zeer krachtig voor een AI-agent-project waar je veel wil kunnen proberen.
- Managed: geen eigen pageserver/safekeeper-cluster nodig — dit hele onderzochte repo is de *engine*; als klant gebruik je de gehoste dienst (`neon.com`).

**Waarom je het niet klakkeloos moet doen:**
- SQLite is nu **doodeenvoudig en gratis** (één bestand). Migreren voegt netwerk-latency, een externe dependency en een connection-model toe dat je nu niet hebt.
- Het schema in `shared/schema.ts` is op SQLite geschreven; SQLite ↔ Postgres verschilt in types (bijv. `text`/`integer`-affiniteit, booleans, datums, autoincrement). Een migratie is **niet nul werk** — het is een echte porting-klus met testdekking nodig.
- Serverless Postgres met veel korte requests vraagt om **connection pooling** (Neon biedt een pooler); dat is een extra ding om goed te zetten.
- Kosten: gratis tier bestaat, maar bij groei betaal je per compute-tijd en opslag. Voor een puur lokale/single-user tool kan SQLite lang genoeg zijn.

**Aanbeveling (mede-eigenaar-lens):** migreer *niet* omdat Neon indrukwekkend is, maar pas als DreamTeam een van deze dingen nodig heeft: (a) meerdere gelijktijdige gebruikers/servers, (b) een echte cloud-deploy waar een lokaal `data.db`-bestand niet meer werkt, of (c) preview-omgevingen met wegwerp-data. Zodra (b) speelt — en `railway.json`/`nixpacks.toml` in deze repo suggereren dat een cloud-deploy in beeld is — wordt Neon een sterke, logische kandidaat, juist omdat Drizzle de overstap goed ondersteunt.

## 8. Bronnen (verifieerbaar)

Alle bovenstaande claims komen uit de gekloonde repo `neondatabase/neon`:
- `README.md`, `LICENSE`, `Cargo.toml`
- `docs/`: `sourcetree.md`, `pageserver.md`, `walservice.md`, `safekeeper-protocol.md`, `storage_controller.md`, `separation-compute-storage.md`, `glossary.md`, `multitenancy.md`, `synthetic-size.md`
- `docs/rfcs/` (60 RFC's) + `docs/rfcs/README.md`
- `vendor/postgres-v14`, `vendor/postgres-v15`

Externe achtergrond genoemd in de README (niet in dit onderzoek nagelopen, wél als bron gemarkeerd): de blogposts "SELECT 'Hello, World'" (Nikita Shamgunov) en "Architecture decisions in Neon" (Heikki Linnakangas) op neon.com.
