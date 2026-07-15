import type OpenAI from "openai";
import type { BenchConfig, Role, Task, RunResult, JudgeScore } from "./types";
import { deriveOverall } from "./score";

const RUBRIC = `Je bent een strenge, eerlijke jury die het antwoord van een AI-model beoordeelt.
Je krijgt: (1) de rol-systeemprompt, (2) de taak, (3) het antwoord van het model.
Scoor op vier assen, elk 0-10 (10 = uitmuntend). Beoordeel de inhoudelijke kwaliteit; als het antwoord
afgekapt eindigt, straf dat in bondigheid/instructieNaleving — maar laat sterke assen niet kunstmatig zakken.
- taakvervulling: lost het de gevraagde opgave echt op en levert het wat de rol vraagt?
- correctheid: is de inhoud technisch juist, zonder fouten of verzinsels?
- instructieNaleving: volgt het de rol-systeemprompt en het gevraagde formaat?
- bondigheid: to-the-point zonder onnodige opvulling?
HARDE REGEL (geen-verzonnen-data): verzonnen feiten, cijfers, bedragen, specs of beleid die niet uit de taak
volgen, geven FORSE aftrek op correctheid (richtlijn: elk verzinsel −3 of meer). Eerlijk "onbekend" markeren is beter dan gokken.
Als de taak een specifieke beoordelingsrubriek meegeeft, weeg die rubriek expliciet mee in je oordeel.
Antwoord UITSLUITEND met geldige JSON, geen markdown, exact deze vorm:
{"taakvervulling":0,"correctheid":0,"instructieNaleving":0,"bondigheid":0,"motivatie":"één zin"}
De motivatie is max 15 woorden, platte tekst, GEEN code, GEEN aanhalingstekens.`;

function clamp(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

export function parseScore(raw: string): JudgeScore {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Jury gaf geen JSON terug.");
  const p = JSON.parse(match[0]);
  const sub = {
    taakvervulling: clamp(p.taakvervulling),
    correctheid: clamp(p.correctheid),
    instructieNaleving: clamp(p.instructieNaleving),
    bondigheid: clamp(p.bondigheid),
  };
  return {
    ...sub,
    overall: deriveOverall(sub), // zelf berekend, niet van de jury
    motivatie: typeof p.motivatie === "string" ? p.motivatie : "",
  };
}

// Herbruikbare judge-kern: één json_object-call + parse, met één retry bij parse-fout.
// Gedeeld door de benchmark-judge (hieronder) én de online-eval-hook (dispatch/eval.ts),
// zodat de jury-logica niet gedupliceerd wordt. rubric = systeemprompt, userMsg = de casus.
export async function judgeWithRubric(
  client: OpenAI,
  model: string,
  rubric: string,
  userMsg: string,
  maxTokens = 600
): Promise<JudgeScore> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const resp = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }, // dwingt geldige JSON af (geen fences/quote-breuk)
      messages: [
        { role: "system", content: rubric },
        { role: "user", content: userMsg },
      ],
    });
    try {
      return parseScore(resp.choices[0]?.message?.content ?? "");
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function judge(
  client: OpenAI,
  cfg: BenchConfig,
  role: Role,
  task: Task,
  result: RunResult
): Promise<JudgeScore> {
  if (result.error || !result.output) {
    return {
      taakvervulling: 0,
      correctheid: 0,
      instructieNaleving: 0,
      bondigheid: 0,
      overall: 0,
      motivatie: result.error ? `Run faalde: ${result.error}` : "Leeg antwoord.",
    };
  }

  const rubricBlock = task.rubric ? `\n\n## BEOORDELINGSRUBRIEK (verplicht meewegen)\n${task.rubric}` : "";
  const userMsg = `## ROL-SYSTEEMPROMPT\n${role.systemPrompt}\n\n## TAAK\n${task.prompt}${rubricBlock}\n\n## ANTWOORD VAN HET MODEL\n${result.output}`;
  return judgeWithRubric(client, cfg.judgeModel, RUBRIC, userMsg);
}
