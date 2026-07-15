import * as crypto from "crypto";

// Observability Niveau 2 — span-helpers. Privacy-veilig: we loggen NOOIT de ruwe
// taak- of modeltekst, alleen korte hashes zodat gelijke in/output herkenbaar is
// zonder de inhoud (klant/merk) te lekken. Eén bron van waarheid voor deze helpers.

function sha(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Keten-ID: knoopt meerdere dispatch-stappen van één job aan elkaar. De CLI/MCP
// maakt er één per job en geeft 'm mee; ontbreekt hij, dan krijgt elke call een eigen id.
export function newTraceId(): string {
  return "tr-" + crypto.randomUUID().slice(0, 12);
}

// Prompt-versie = content-hash van het effectieve systeemblok (contract + merkstem +
// neutrale instructie). Verandert de template of de stem, dan verandert de versie.
// Honest en deterministisch — geen verzonnen registry-nummer.
export function promptVersion(systemBlock: string): string {
  return "pv-" + sha(systemBlock).slice(0, 8);
}

// Privacy-veilige hashes van de feitelijke in-/uitvoer. Truncatie houdt de log klein;
// botsingskans is verwaarloosbaar voor het doel (gelijke input/uitvoer herkennen).
export function inputHash(prompt: string): string {
  return "in-" + sha(prompt).slice(0, 12);
}

export function outputHash(output: string | undefined | null): string | null {
  if (!output) return null;
  return "out-" + sha(output).slice(0, 12);
}
