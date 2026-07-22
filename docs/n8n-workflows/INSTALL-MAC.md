# Installatie op je Mac — n8n-workflows zoekmachine

> Deze route is **exact zoals ik 'm op de sandbox heb getest en werkend geverifieerd**. Op je Mac werkt het identiek (macOS heeft Python 3 standaard). Volg de stappen één voor één — kopieer telkens één blok.

**Wat je krijgt:** een lokale web-interface op `http://localhost:8000` waarmee je ~2.000 n8n-workflows doorzoekt en downloadt.
**Tijd:** ± 5 minuten. **Kosten:** €0. **Nodig:** Terminal + internet.

---

## Stap 0 — check dat Python er is

Plak dit in Terminal:

```bash
python3 --version
```

Zie je `Python 3.9` of hoger? ✅ Ga door. Zie je niets/een foutmelding, installeer eerst Python via <https://www.python.org/downloads/> en begin opnieuw.

---

## Stap 1 — repo binnenhalen

```bash
cd ~/Documents && git clone https://github.com/Zie619/n8n-workflows.git && cd n8n-workflows
```

*(Staat 'ie liever ergens anders? Vervang `~/Documents` door je eigen map.)*

---

## Stap 2 — schone Python-omgeving + dependencies

```bash
python3 -m venv .venv && source .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt
```

Dit maakt een geïsoleerde `.venv` (raakt je systeem-Python niet) en installeert FastAPI, Uvicorn e.d. Wacht tot de prompt terugkomt.

---

## Stap 3 — de zoekindex bouwen

```bash
python workflow_db.py --index
```

Je hoort 'm goed als er staat: `✅ Indexing complete: ~2061 processed, 0 skipped, 0 errors`.

---

## Stap 4 — server starten

```bash
python run.py
```

Laat dit Terminal-venster **open staan** (de server draait zolang dit venster leeft). Je ziet een banner en dat 'ie op poort 8000 luistert.

---

## Stap 5 — openen in je browser

Open: **<http://localhost:8000>**

Klaar. Zoek op `shopify`, `telegram`, `google sheets`, `competitor` — download de JSON's die je aanspreken.

---

## Elke volgende keer (korte herstart)

De install hoef je maar één keer te doen. Daarna:

```bash
cd ~/Documents/n8n-workflows && source .venv/bin/activate && python run.py
```

## Stoppen

In het Terminal-venster van de server: `Ctrl + C`.

---

## Een workflow gebruiken in n8n

1. In de web-interface: open een workflow → **Download** de JSON.
2. In n8n: **Workflows → Import from File** → kies de JSON.
3. Open elke node met een slotje/credential → koppel **jouw eigen** API-keys (Shopify, Telegram, Google, …).
4. Test met één run vóór je 'm live/actief zet.

> Belangrijk: importeren zet de *structuur* neer, niet je credentials. Stap 3 hierboven is waar jouw echte koppeling gebeurt.

---

## Als er iets misgaat

| Symptoom | Oorzaak / fix |
|---|---|
| `command not found: python3` | Python niet geïnstalleerd → python.org |
| `pip install` faalt | Eerst `source .venv/bin/activate` gedaan? Prompt moet met `(.venv)` beginnen |
| Poort 8000 bezet | Start met een andere poort: `python run.py --port 8010` → open `localhost:8010` |
| Pagina laadt niet | Draait het server-venster nog? Staat er een foutmelding in? |
| Docker-liefhebber? | Alternatief zónder Python: `docker run -p 8000:8000 zie619/n8n-workflows:latest` |
