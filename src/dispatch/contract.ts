import type { Contract } from "./types";

// Het delegatie-contract (Hamer 1) heeft labels: DOEL / GRENZEN / TERUGGAVE / BUDGET / GEHEUGEN.
// We herkennen ze als regels "LABEL : waarde" (spaties/dubbele punt-variaties toegestaan),
// ook binnen een ```-codeblok zoals in TEMPLATE-delegatie-contract.md.
const LABELS = ["DOEL", "GRENZEN", "TERUGGAVE", "BUDGET", "GEHEUGEN"] as const;

function matchLabel(line: string): { label: string; value: string } | null {
  const m = line.match(/^\s*([A-Z]{3,10})\s*:\s*(.*)$/);
  if (!m) return null;
  const label = m[1].toUpperCase();
  if (!LABELS.includes(label as (typeof LABELS)[number])) return null;
  return { label, value: m[2].trim() };
}

// Lees een tokenbudget uit de BUDGET-regel, bv. "60k tokens, 10 tool-calls" → 60000.
function parseBudgetTokens(value: string): number | undefined {
  const m = value.match(/([\d.]+)\s*(k|m)?\s*tokens?/i);
  if (!m) return undefined;
  let n = parseFloat(m[1].replace(/\.(?=\d{3}\b)/g, "")); // "60.000" → 60000
  if (Number.isNaN(n)) return undefined;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit === "k") n *= 1_000;
  else if (unit === "m") n *= 1_000_000;
  return Math.round(n);
}

// Splits taaktekst in (contract, vrije taaktekst). Als er geen contract-labels in staan,
// is alles gewoon de taak en blijft het contract leeg.
export function parseContract(text: string): { contract: Contract; prompt: string } {
  const lines = text.split(/\r?\n/);
  const contract: Contract = {};
  const promptLines: string[] = [];
  let found = false;
  let current: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "```" || trimmed.startsWith("```")) {
      // codeblok-hekjes negeren — labels staan vaak binnen ```...```
      continue;
    }
    const hit = matchLabel(line);
    if (hit) {
      found = true;
      current = hit.label;
      assign(contract, hit.label, hit.value);
      continue;
    }
    // Vervolgregel van een meerregelig contract-veld?
    if (current && line.startsWith("  ") && trimmed.length > 0) {
      appendTo(contract, current, trimmed);
      continue;
    }
    current = null;
    promptLines.push(line);
  }

  if (found) {
    contract.raw = LABELS.filter((l) => fieldOf(contract, l))
      .map((l) => `${l.padEnd(10)}: ${fieldOf(contract, l)}`)
      .join("\n");
    contract.budgetTokens = contract.budgetTokens; // al gezet via assign
  }

  const prompt = promptLines.join("\n").trim();
  return { contract, prompt: prompt || text.trim() };
}

function assign(c: Contract, label: string, value: string): void {
  switch (label) {
    case "DOEL":
      c.doel = value;
      break;
    case "GRENZEN":
      c.grenzen = value;
      break;
    case "TERUGGAVE":
      c.teruggave = value;
      break;
    case "BUDGET":
      c.budgetTokens = parseBudgetTokens(value);
      (c as Contract & { _budgetRaw?: string })._budgetRaw = value;
      break;
    // GEHEUGEN: niet relevant voor dispatch-uitvoering, overslaan
  }
}

function appendTo(c: Contract, label: string, extra: string): void {
  switch (label) {
    case "DOEL":
      c.doel = (c.doel ? c.doel + " " : "") + extra;
      break;
    case "GRENZEN":
      c.grenzen = (c.grenzen ? c.grenzen + " " : "") + extra;
      break;
    case "TERUGGAVE":
      c.teruggave = (c.teruggave ? c.teruggave + " " : "") + extra;
      break;
  }
}

function fieldOf(c: Contract, label: string): string | undefined {
  switch (label) {
    case "DOEL":
      return c.doel;
    case "GRENZEN":
      return c.grenzen;
    case "TERUGGAVE":
      return c.teruggave;
    case "BUDGET":
      return (c as Contract & { _budgetRaw?: string })._budgetRaw;
    default:
      return undefined;
  }
}

// Vouw het contract als systeem-/instructieblok vóór de taak.
export function buildSystemBlock(contract: Contract): string {
  if (!contract.doel && !contract.grenzen && !contract.teruggave) {
    // Geen expliciet contract → neutrale, strakke instructie.
    return (
      "Je bent een vakkundige assistent. Voer de gevraagde taak nauwkeurig uit. " +
      "Verzin geen feiten, prijzen of cijfers; markeer wat je niet zeker weet als \"onbekend\"."
    );
  }
  const parts: string[] = [
    "Je voert een gedelegeerde taak uit onder een strikt contract. Houd je exact aan:",
  ];
  if (contract.doel) parts.push(`DOEL: ${contract.doel}`);
  if (contract.grenzen) parts.push(`GRENZEN (niet overtreden): ${contract.grenzen}`);
  if (contract.teruggave)
    parts.push(`TERUGGAVE (lever exact in dit format): ${contract.teruggave}`);
  parts.push(
    "Verzin geen feiten of cijfers. Blijf binnen de grenzen. Lever uitsluitend het gevraagde teruggave-format."
  );
  return parts.join("\n");
}
