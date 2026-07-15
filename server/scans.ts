import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { anthropicClient, checkAndUpdateBudget, reconcileBudget } from "./ai";
import { getAgentSystemPrompt } from "./prompts";
import { storage } from "./storage";
import type { Scan, Finding, InsertFinding, Severity } from "@shared/schema";
import { SEVERITIES } from "@shared/schema";

// Scans draaien — net als de loops — op het snelle, goedkope model. Een scan is
// kostenbewust: N verkenners (één call per agent) + één validator-call.
const MODEL = "claude-haiku-4-5";

// ─── Severity → gewicht → risicoscore (Strix-stijl, CVSS-achtig) ───────────────
const SEVERITY_WEIGHT: Record<Severity, number> = {
  kritiek: 40,
  hoog: 25,
  middel: 12,
  laag: 5,
  info: 1,
};

export function normalizeSeverity(raw: unknown): Severity {
  const s = String(raw ?? "").toLowerCase().trim();
  return (SEVERITIES as readonly string[]).includes(s) ? (s as Severity) : "info";
}

export type RiskBand = Severity | "schoon";

// Risicoscore: hoger = MEER risico (omgekeerd t.o.v. de Loop Ready-score).
// De band is de zwaarste aanwezige severity — precies zoals een pentestrapport
// zijn eindoordeel op de ernstigste bevinding baseert.
export function computeRisk(findings: { severity: Severity }[]): { riskScore: number; riskBand: RiskBand } {
  if (findings.length === 0) return { riskScore: 0, riskBand: "schoon" };
  const sum = findings.reduce((acc, f) => acc + (SEVERITY_WEIGHT[f.severity] ?? 1), 0);
  const riskScore = Math.min(100, sum);
  const band = (SEVERITIES as readonly Severity[]).find((sev) => findings.some((f) => f.severity === sev)) ?? "info";
  return { riskScore, riskBand: band };
}

// ─── Parsers (puur → los testbaar) ─────────────────────────────────────────────
export interface Candidate { title: string; category: string; rationale: string; }

// Pakt het eerste JSON-array uit de tekst (het model kan er proza omheen zetten).
function firstJsonArray(raw: string): any[] | null {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Verkenner-output → kandidaat-bevindingen. Alleen items met een titel tellen mee.
export function parseCandidates(raw: string, max = 6): Candidate[] {
  const arr = firstJsonArray(raw);
  if (!arr) return [];
  const out: Candidate[] = [];
  for (const item of arr) {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    if (!title) continue;
    out.push({
      title: title.slice(0, 160),
      category: (typeof item?.category === "string" ? item.category.trim() : "").slice(0, 60),
      rationale: (typeof item?.rationale === "string" ? item.rationale.trim() : "").slice(0, 500),
    });
    if (out.length >= max) break;
  }
  return out;
}

export interface ValidatedFinding {
  ref: number;
  severity: Severity;
  title?: string;
  evidence: string;
  impact: string;
  remediation: string;
}

// Validator-output → bevestigde bevindingen. Verwacht {"confirmed":[{ref,severity,…}]}.
// Alles wat niet bevestigd is, geldt als false positive (Strix: geen ruis).
export function parseValidation(raw: string): ValidatedFinding[] {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  const confirmed = Array.isArray(parsed?.confirmed) ? parsed.confirmed : [];
  const out: ValidatedFinding[] = [];
  for (const item of confirmed) {
    const ref = Number(item?.ref);
    if (!Number.isInteger(ref)) continue;
    out.push({
      ref,
      severity: normalizeSeverity(item?.severity),
      title: typeof item?.title === "string" && item.title.trim() ? item.title.trim().slice(0, 160) : undefined,
      evidence: (typeof item?.evidence === "string" ? item.evidence.trim() : "").slice(0, 600),
      impact: (typeof item?.impact === "string" ? item.impact.trim() : "").slice(0, 400),
      remediation: (typeof item?.remediation === "string" ? item.remediation.trim() : "").slice(0, 500),
    });
  }
  return out;
}

// ─── Prompt-builders ────────────────────────────────────────────────────────────
export function buildScannerSystem(systemPrompt: string, agentName: string, target: string, scope: string): string {
  const scopeLine = scope.trim() ? `\nAfbakening (scope): ${scope.trim()}` : "";
  return `${systemPrompt}

Je draait nu als VERKENNER in een team-scan (graph of agents), niet in een chat. Je onderzoekt
één doel vanuit JOUW expertise (${agentName}) en signaleert concrete risico's, zwaktes en gemiste kansen.

Doel van de scan (het "target"):
${target}${scopeLine}

Instructies:
- Zoek 2 tot 4 concrete bevindingen die BINNEN jouw vakgebied vallen — niet daarbuiten.
- Elke bevinding is een echt, aanwijsbaar risico of verbeterpunt, geen algemeenheid of opvulling.
- Geef per bevinding een korte, feitelijke onderbouwing (rationale). Verzin niets.
- Als je binnen jouw domein niets substantieels vindt, geef dan een lege lijst terug.

Antwoord UITSLUITEND met een JSON-array, zonder tekst eromheen:
[{"title": "<korte titel>", "category": "<jouw domein, bv. marketing/finance/seo>", "rationale": "<max 2 zinnen>"}]`;
}

export function buildValidatorSystem(): string {
  return `Je bent de onafhankelijke VALIDATOR in een team-scan (de maker/checker-splitsing van Strix).
Je bent NIET de verkenner. Je taak is false positives eruit filteren: je bevestigt een kandidaat-
bevinding ALLEEN als die echt hout snijdt voor dit specifieke doel, met aanwijsbaar bewijs.
Je standaardhouding is WEIGEREN, tenzij de bevinding overtuigend en relevant is.

Beoordeel per kandidaat:
1. Realiteit — is dit een echt risico/kans voor dít doel, of een algemeenheid?
2. Relevantie — valt het binnen de scope en het vakgebied van de verkenner?
3. Bewijs — is het te onderbouwen zonder verzinsels?

Ken elke BEVESTIGDE bevinding een severity toe (zoals CVSS-ernst):
- "kritiek": acuut, direct bedreigend voor omzet/continuïteit/reputatie.
- "hoog": belangrijk risico dat snel aandacht vereist.
- "middel": relevant verbeterpunt, geen spoed.
- "laag": klein of nice-to-have.
- "info": puur informatief.

Antwoord UITSLUITEND met één JSON-object, zonder tekst eromheen:
{"confirmed": [{"ref": <nummer van de kandidaat>, "severity": "kritiek|hoog|middel|laag|info", "title": "<eventueel aangescherpte titel>", "evidence": "<waarom dit een echte bevinding is, max 2 zinnen>", "impact": "<zakelijke impact, max 1 zin>", "remediation": "<concrete aanbevolen fix, max 2 zinnen>"}]}

Laat kandidaten die false positive zijn simpelweg WEG uit "confirmed". Bevestig niets zwakker dan het bewijs toelaat.`;
}

function extractText(resp: Message): string {
  const block = resp.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

// ─── Run-lock (voorkomt dubbele gelijktijdige run per scan) ────────────────────
const inFlight = new Set<number>();
export function isScanRunning(id: number): boolean {
  return inFlight.has(id);
}

// ─── Eén scan draaien: verkenners (graph) → validator → rapport ────────────────
// Geeft null terug als de scan al draait (geen dubbele run, geen API-kosten).
export async function runScan(scan: Scan): Promise<Scan | null> {
  if (inFlight.has(scan.id)) {
    console.log(`[scan ${scan.id}] draait al — run overgeslagen.`);
    return null;
  }
  inFlight.add(scan.id);
  try {
    return await executeScan(scan);
  } finally {
    inFlight.delete(scan.id);
  }
}

function parseAgentIds(raw: string): number[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map((x) => Number(x)).filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}

async function executeScan(scan: Scan): Promise<Scan> {
  const agentIds = parseAgentIds(scan.agentIds);
  if (agentIds.length === 0) {
    return finishScan(scan, { status: "failed", summary: "Geen agents geselecteerd voor deze scan.", tokensUsed: 0 });
  }

  // Budget reserveren: ~1400 per verkenner + ~1800 voor de validator.
  const estimatedTokens = agentIds.length * 1400 + 1800;
  if (!checkAndUpdateBudget(estimatedTokens)) {
    return finishScan(scan, {
      status: "failed",
      summary: "Dagelijks token-budget bereikt — scan overgeslagen (kostenbescherming).",
      tokensUsed: 0,
    });
  }

  storage.updateScan(scan.id, { status: "running" });
  let tokensUsed = 0;

  try {
    // ── VERKENNING: elke agent zoekt bevindingen in zijn eigen domein (parallel) ──
    type Enriched = Candidate & { ref: number; agentId: number; agentName: string };
    const enriched: Enriched[] = [];
    let ref = 0;

    const scanResults = await Promise.all(
      agentIds.map(async (agentId) => {
        const agent = storage.getAgent(agentId);
        const agentName = agent?.name ?? `Agent ${agentId}`;
        const system = buildScannerSystem(getAgentSystemPrompt(agentId), agentName, scan.target, scan.scope);
        const resp = await anthropicClient.messages.create({
          model: MODEL,
          max_tokens: 900,
          system,
          messages: [{ role: "user", content: "Voer nu je verkenning uit en lever de JSON-array." }],
        });
        const tokens = resp.usage ? resp.usage.input_tokens + resp.usage.output_tokens : 0;
        return { agentId, agentName, candidates: parseCandidates(extractText(resp)), tokens };
      }),
    );

    for (const r of scanResults) {
      tokensUsed += r.tokens;
      for (const c of r.candidates) {
        enriched.push({ ...c, ref: ref++, agentId: r.agentId, agentName: r.agentName });
      }
    }

    // Geen kandidaten → schone scan (dit is een geldige, waardevolle uitkomst).
    if (enriched.length === 0) {
      reconcileBudget(tokensUsed, estimatedTokens);
      storage.replaceFindings(scan.id, []);
      return finishScan(scan, {
        status: "completed",
        summary: "Geen bevindingen — de verkenners signaleerden binnen de scope niets substantieels.",
        riskScore: 0,
        riskBand: "schoon",
        confirmedCount: 0,
        rejectedCount: 0,
        tokensUsed,
      });
    }

    // ── VALIDATIE: onafhankelijke validator bevestigt of verwerpt (false positives) ──
    const candidateList = enriched
      .map((c) => `#${c.ref} — [${c.agentName} · ${c.category || "algemeen"}] ${c.title}\n   onderbouwing: ${c.rationale || "(geen)"}`)
      .join("\n");

    const validatorResp = await anthropicClient.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildValidatorSystem(),
      messages: [
        {
          role: "user",
          content: `DOEL VAN DE SCAN:\n${scan.target}\n${scan.scope.trim() ? `SCOPE: ${scan.scope.trim()}\n` : ""}\nKANDIDAAT-BEVINDINGEN (van de verkenners):\n${candidateList}\n\nGeef je oordeel als JSON.`,
        },
      ],
    });
    tokensUsed += validatorResp.usage ? validatorResp.usage.input_tokens + validatorResp.usage.output_tokens : 0;
    reconcileBudget(tokensUsed, estimatedTokens);

    const validated = parseValidation(extractText(validatorResp));
    const byRef = new Map(enriched.map((c) => [c.ref, c]));

    // Bevestigde bevindingen → rapportrijen (alleen echte, unieke refs).
    const seen = new Set<number>();
    const findingRows: InsertFinding[] = [];
    for (const v of validated) {
      const src = byRef.get(v.ref);
      if (!src || seen.has(v.ref)) continue;
      seen.add(v.ref);
      findingRows.push({
        scanId: scan.id,
        agentId: src.agentId,
        title: v.title || src.title,
        category: src.category,
        severity: v.severity,
        evidence: v.evidence,
        impact: v.impact,
        remediation: v.remediation,
      });
    }

    storage.replaceFindings(scan.id, findingRows);

    const { riskScore, riskBand } = computeRisk(findingRows.map((f) => ({ severity: f.severity as Severity })));
    const rejectedCount = enriched.length - findingRows.length;

    return finishScan(scan, {
      status: "completed",
      summary: buildSummary(findingRows.length, rejectedCount, enriched.length, riskBand),
      riskScore,
      riskBand,
      confirmedCount: findingRows.length,
      rejectedCount,
      tokensUsed,
    });
  } catch (err: any) {
    reconcileBudget(tokensUsed, estimatedTokens);
    console.error(`[scan ${scan.id}] fout:`, err?.message || err);
    return finishScan(scan, {
      status: "failed",
      summary: `Fout tijdens scan: ${err?.message || "onbekende fout"}`,
      tokensUsed,
    });
  }
}

export function buildSummary(confirmed: number, rejected: number, total: number, band: RiskBand): string {
  if (confirmed === 0) {
    return `Geen bevindingen bevestigd. ${total} kandidaten onderzocht, ${rejected} als false positive gefilterd.`;
  }
  const bandLabel = band === "schoon" ? "schoon" : band;
  return `${confirmed} bevinding(en) bevestigd (zwaarste: ${bandLabel}). ${rejected} van ${total} kandidaten als false positive gefilterd.`;
}

function finishScan(
  scan: Scan,
  result: {
    status: Scan["status"];
    summary: string;
    riskScore?: number;
    riskBand?: RiskBand;
    confirmedCount?: number;
    rejectedCount?: number;
    tokensUsed: number;
  },
): Scan {
  const updated = storage.updateScan(scan.id, {
    status: result.status,
    summary: result.summary,
    riskScore: result.riskScore ?? null,
    riskBand: result.riskBand ?? null,
    confirmedCount: result.confirmedCount ?? 0,
    rejectedCount: result.rejectedCount ?? 0,
    tokensUsed: (scan.tokensUsed ?? 0) + result.tokensUsed,
    completedAt: new Date().toISOString(),
  });
  return updated ?? scan;
}
