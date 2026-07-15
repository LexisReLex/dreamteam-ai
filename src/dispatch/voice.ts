import * as fs from "fs";
import * as path from "path";
import type { DispatchTask } from "./types";

// De merkstem-laag (187N stap 1). Eén niche = één stem. De juiste stem wordt als
// gedeelde context vóór het systeemblok geplakt, zodat elke rol per niche merkbaar
// anders schrijft. Eén bron van waarheid voor de stem-namen: hier.
export const VOICES = ["lexxy", "degroot", "klanttijd", "persoonlijk"] as const;
export type Voice = (typeof VOICES)[number];

const ROOT = path.resolve(__dirname, "..", "..");
const VOICES_DIR = path.join(ROOT, "brand-voices");

export function isVoice(v: string): v is Voice {
  return (VOICES as readonly string[]).includes(v);
}

// Geeft een nieuwe taak terug met de merkstem vóór het systeemblok. Zonder voice
// blijft de taak ongewijzigd (immutable). Onbekende of ontbrekende stem = harde fout.
export function applyVoice(task: DispatchTask, voice?: string): DispatchTask {
  if (!voice) return task;
  if (!isVoice(voice)) {
    throw new Error(`Onbekende --voice: ${voice}. Kies: ${VOICES.join(" | ")}.`);
  }
  const file = path.join(VOICES_DIR, `${voice}.md`);
  if (!fs.existsSync(file)) {
    throw new Error(`Merkstem-bestand ontbreekt: ${file}`);
  }
  const voiceText = fs.readFileSync(file, "utf8").trim();
  const block = `─── MERKSTEM: ${voice} ───\n${voiceText}`;
  const systemBlock = task.systemBlock ? `${block}\n\n${task.systemBlock}` : block;
  return { ...task, systemBlock };
}
