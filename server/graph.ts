import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { anthropicClient, checkAndUpdateBudget, reconcileBudget } from "./ai";
import { getAgentSystemPrompt } from "./prompts";
import { storage } from "./storage";
import type { Graph, GraphNode, GraphEdge, EdgeConfidence } from "@shared/schema";

// Kennisgraaf-engine (graphify voor DreamTeam).
//
// De splitsing is bewust, precies zoals in Graphify:
//   • De AGENT doet de semantische extractie (tekst → nodes + edges).
//   • De SERVER doet de deterministische grafiek-analyse (graad, communities,
//     kortste pad, rapport). Die laag is puur en zonder API — en dus testbaar.
//
// Draait op het snelle, goedkope model — kostenbewust, net als de loops.
const MODEL = "claude-haiku-4-5";
const MAX_NODES = 60; // graaf leesbaar + bevraagbaar houden
const MAX_EDGES = 240;
const MAX_LABEL = 80;
const MAX_RELATION = 40;

// ─── Sanitisatie (conform graphify/security: labels opschonen) ─────────────────
export function sanitizeLabel(raw: unknown, cap = MAX_LABEL): string {
  return String(raw ?? "")
    // strip control chars (incl. het einde-van-regel bereik)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, cap);
}

// Node-id normaliseren tot een stabiele slug zodat edges betrouwbaar resolven.
export function slugifyId(raw: unknown): string {
  return sanitizeLabel(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function normalizeConfidence(raw: unknown): EdgeConfidence {
  const v = String(raw ?? "").toUpperCase();
  if (v === "EXTRACTED" || v === "INFERRED" || v === "AMBIGUOUS") return v;
  return "INFERRED"; // veilige middenweg als het model iets onverwachts teruggeeft
}

// ─── Extractie van het model parsen naar een schone {nodes, edges} ─────────────
// Robuust: pakt het eerste JSON-object uit proza, saneert labels, resolvet edges
// op id én op label (case-insensitive), en gooit ongeldige/dubbele edges weg.
export function parseExtraction(raw: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { nodes: [], edges: [] };

  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { nodes: [], edges: [] };
  }

  // ── Nodes ──
  const byId = new Map<string, GraphNode>();
  const labelToId = new Map<string, string>(); // lowercased label → id, voor edge-resolutie
  const rawNodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
  for (const n of rawNodes) {
    if (byId.size >= MAX_NODES) break;
    const label = sanitizeLabel(n?.label ?? n?.id ?? n?.name);
    if (!label) continue;
    const id = slugifyId(n?.id ?? label) || slugifyId(label);
    if (!id || byId.has(id)) {
      // dubbele id: registreer het label wel zodat edges nog resolven
      if (id && !labelToId.has(label.toLowerCase())) labelToId.set(label.toLowerCase(), id);
      continue;
    }
    byId.set(id, { id, label, community: 0, degree: 0 });
    labelToId.set(label.toLowerCase(), id);
  }

  // ── Edges ──
  const resolve = (ref: unknown): string | null => {
    const slug = slugifyId(ref);
    if (slug && byId.has(slug)) return slug;
    const byLabel = labelToId.get(sanitizeLabel(ref).toLowerCase());
    return byLabel && byId.has(byLabel) ? byLabel : null;
  };

  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  const rawEdges = Array.isArray(parsed?.edges) ? parsed.edges : [];
  for (const e of rawEdges) {
    if (edges.length >= MAX_EDGES) break;
    const source = resolve(e?.source);
    const target = resolve(e?.target);
    if (!source || !target || source === target) continue; // geen self-loops of dode verwijzingen
    const relation = sanitizeLabel(e?.relation ?? "hangt samen met", MAX_RELATION) || "hangt samen met";
    const confidence = normalizeConfidence(e?.confidence);
    const key = `${source}→${target}`;
    if (seen.has(key)) continue; // dedup op richting-paar (eerste wint)
    seen.add(key);
    edges.push({ source, target, relation, confidence });
  }

  return { nodes: Array.from(byId.values()), edges };
}

// ─── Deterministische analyse ──────────────────────────────────────────────────

/** Undirected graad per node. */
export function computeDegrees(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const deg = new Map<string, number>();
  for (const n of nodes) deg.set(n.id, 0);
  for (const e of edges) {
    if (deg.has(e.source)) deg.set(e.source, (deg.get(e.source) || 0) + 1);
    if (deg.has(e.target)) deg.set(e.target, (deg.get(e.target) || 0) + 1);
  }
  return deg;
}

function adjacency(nodes: GraphNode[], edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }
  return adj;
}

/**
 * Communities via asynchrone label-propagatie (graphify's cluster-stap).
 * Deterministisch: stabiele node-volgorde, tie-break op kleinste community-id,
 * daarna hernummerd naar 0..k-1 op volgorde van eerste voorkomen.
 */
export function detectCommunities(nodes: GraphNode[], edges: GraphEdge[]): { labels: Map<string, number>; count: number } {
  const order = nodes.map((n) => n.id);
  const adj = adjacency(nodes, edges);
  const label = new Map<string, number>();
  order.forEach((id, i) => label.set(id, i)); // start: iedereen eigen community

  for (let round = 0; round < 20; round++) {
    let changed = false;
    for (const id of order) {
      const neighbors = adj.get(id);
      if (!neighbors || neighbors.size === 0) continue;
      // tel labels onder de buren
      const counts = new Map<number, number>();
      for (const nb of Array.from(neighbors)) {
        const l = label.get(nb)!;
        counts.set(l, (counts.get(l) || 0) + 1);
      }
      // kies meest voorkomende; tie-break: kleinste label-id
      let best = label.get(id)!;
      let bestCount = -1;
      for (const [l, c] of Array.from(counts)) {
        if (c > bestCount || (c === bestCount && l < best)) {
          best = l;
          bestCount = c;
        }
      }
      if (best !== label.get(id)) {
        label.set(id, best);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // hernummeren naar compacte 0..k-1
  const remap = new Map<number, number>();
  const labels = new Map<string, number>();
  for (const id of order) {
    const raw = label.get(id)!;
    if (!remap.has(raw)) remap.set(raw, remap.size);
    labels.set(id, remap.get(raw)!);
  }
  return { labels, count: remap.size };
}

/** Kent graad + community toe aan de nodes (nieuwe array, input blijft ongemoeid). */
export function annotate(nodes: GraphNode[], edges: GraphEdge[]): { nodes: GraphNode[]; communityCount: number } {
  const deg = computeDegrees(nodes, edges);
  const { labels, count } = detectCommunities(nodes, edges);
  const annotated = nodes.map((n) => ({
    ...n,
    degree: deg.get(n.id) || 0,
    community: labels.get(n.id) ?? 0,
  }));
  return { nodes: annotated, communityCount: count };
}

/** "God nodes": de best verbonden concepten, aflopend op graad (tie-break op label). */
export function godNodes(nodes: GraphNode[], limit = 5): GraphNode[] {
  return [...nodes]
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/** Kortste pad (BFS, undirected). Geeft de node- id's terug, of null als er geen pad is. */
export function shortestPath(nodes: GraphNode[], edges: GraphEdge[], from: string, to: string): string[] | null {
  if (from === to) return nodes.some((n) => n.id === from) ? [from] : null;
  const adj = adjacency(nodes, edges);
  if (!adj.has(from) || !adj.has(to)) return null;
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const nb of Array.from(adj.get(cur) ?? [])) {
      if (!prev.has(nb)) {
        prev.set(nb, cur);
        queue.push(nb);
      }
    }
  }
  if (!prev.has(to)) return null;
  const path: string[] = [];
  let step: string | null = to;
  while (step != null) {
    path.unshift(step);
    step = prev.get(step) ?? null;
  }
  return path;
}

export interface Connection {
  otherId: string;
  otherLabel: string;
  relation: string;
  confidence: EdgeConfidence;
  direction: "out" | "in";
}

/** Alle verbindingen van één node (graphify's `explain`). */
export function explainNode(nodes: GraphNode[], edges: GraphEdge[], id: string): { node: GraphNode; connections: Connection[] } | null {
  const node = nodes.find((n) => n.id === id);
  if (!node) return null;
  const labelOf = (nid: string) => nodes.find((n) => n.id === nid)?.label ?? nid;
  const connections: Connection[] = [];
  for (const e of edges) {
    if (e.source === id) connections.push({ otherId: e.target, otherLabel: labelOf(e.target), relation: e.relation, confidence: e.confidence, direction: "out" });
    else if (e.target === id) connections.push({ otherId: e.source, otherLabel: labelOf(e.source), relation: e.relation, confidence: e.confidence, direction: "in" });
  }
  return { node, connections };
}

// ─── Rapport (graphify's GRAPH_REPORT.md) ──────────────────────────────────────
// Sleutelconcepten, communities, onzekere verbanden en voorgestelde vragen.
export function buildReport(title: string, nodes: GraphNode[], edges: GraphEdge[], communityCount: number): string {
  if (nodes.length === 0) {
    return `# ${title}\n\nGeen concepten gevonden in de bron. Voeg meer tekst toe en probeer opnieuw.`;
  }

  const gods = godNodes(nodes, 5);
  const extracted = edges.filter((e) => e.confidence === "EXTRACTED").length;
  const inferred = edges.filter((e) => e.confidence === "INFERRED").length;
  const ambiguous = edges.filter((e) => e.confidence === "AMBIGUOUS");

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(
    `**${nodes.length}** concepten · **${edges.length}** verbanden · **${communityCount}** clusters` +
      ` — ${extracted} expliciet (EXTRACTED), ${inferred} afgeleid (INFERRED), ${ambiguous.length} onzeker (AMBIGUOUS).`,
  );
  lines.push("");

  lines.push("## Sleutelconcepten");
  lines.push("De best verbonden concepten — waarschijnlijk de kern van dit materiaal:");
  for (const g of gods) {
    lines.push(`- **${g.label}** — ${g.degree} verbinding${g.degree === 1 ? "" : "en"} (cluster ${g.community + 1})`);
  }
  lines.push("");

  // Clusters kort samenvatten met hun grootste concept.
  if (communityCount > 1) {
    lines.push("## Clusters");
    for (let c = 0; c < communityCount; c++) {
      const members = nodes.filter((n) => n.community === c).sort((a, b) => b.degree - a.degree);
      if (members.length === 0) continue;
      const head = members.slice(0, 4).map((m) => m.label).join(", ");
      lines.push(`- **Cluster ${c + 1}** (${members.length}): ${head}${members.length > 4 ? " …" : ""}`);
    }
    lines.push("");
  }

  if (ambiguous.length > 0) {
    const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
    lines.push("## Onzekere verbanden (controleer zelf)");
    for (const e of ambiguous.slice(0, 8)) {
      lines.push(`- ${labelOf(e.source)} → ${labelOf(e.target)} (${e.relation})`);
    }
    lines.push("");
  }

  lines.push("## Voorgestelde vragen");
  for (const q of suggestQuestions(nodes, edges)) lines.push(`- ${q}`);
  lines.push("");

  return lines.join("\n");
}

/** Deterministische startvragen op basis van god-nodes en cross-cluster-verbanden. */
export function suggestQuestions(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const gods = godNodes(nodes, 3);
  const questions: string[] = [];
  if (gods[0]) questions.push(`Waar draait "${gods[0].label}" allemaal om in dit materiaal?`);
  if (gods[0] && gods[1]) questions.push(`Hoe hangt "${gods[0].label}" samen met "${gods[1].label}"?`);

  // Zoek een edge die twee clusters overbrugt — vaak het interessantst.
  const commOf = new Map(nodes.map((n) => [n.id, n.community]));
  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
  const bridge = edges.find((e) => commOf.get(e.source) !== commOf.get(e.target));
  if (bridge) questions.push(`Wat verbindt "${labelOf(bridge.source)}" met "${labelOf(bridge.target)}"?`);

  if (gods[2]) questions.push(`Welke rol speelt "${gods[2].label}" in het geheel?`);
  return questions.slice(0, 4);
}

// ─── Extractie-prompt (de agent als semantische mapper) ────────────────────────
export function buildExtractorSystem(systemPrompt: string): string {
  return `${systemPrompt}

Je werkt nu als KENNISGRAAF-MAPPER (graphify). Je krijgt tekst van een ondernemer
(notities, een plan, een document) en zet die om in een kennisgraaf: concepten (nodes)
en de verbanden ertussen (edges). Je grep niet door tekst — je maakt een graaf die je kunt bevragen.

Regels:
- Haal de belangrijkste concepten eruit: entiteiten, thema's, doelen, kanalen, mensen, producten. Maximaal ${MAX_NODES}.
- Geef elke node een korte, unieke "id" (slug, bv. "zomercampagne") en een leesbaar "label".
- Leg verbanden met een korte relatie ("gebruikt", "leidt tot", "hoort bij", "richt zich op", …).
- Label elk verband met "confidence":
  • "EXTRACTED" — expliciet in de tekst gezegd.
  • "INFERRED" — een redelijke afleiding, niet letterlijk genoemd.
  • "AMBIGUOUS" — onzeker; markeer voor controle in plaats van te gokken.
- Verzin geen concepten die er niet zijn. Liever minder, maar juist.

Antwoord UITSLUITEND met één JSON-object, zonder tekst eromheen:
{"nodes":[{"id":"...","label":"..."}],"edges":[{"source":"id","target":"id","relation":"...","confidence":"EXTRACTED|INFERRED|AMBIGUOUS"}]}`;
}

function extractText(resp: Message): string {
  const block = resp.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

// ─── Graaf bouwen: agent-extractie → deterministische analyse → opslaan ─────────
export type BuildResult =
  | { ok: true; graph: Graph }
  | { ok: false; code: "BUDGET" | "ERROR"; error: string };

export async function buildGraph(agentId: number, title: string, source: string): Promise<BuildResult> {
  // Budget reserveren: input ~source/4 tokens + ruime output voor de graaf-JSON.
  const estimatedTokens = Math.ceil(source.length / 4) + 2500;
  if (!checkAndUpdateBudget(estimatedTokens)) {
    return { ok: false, code: "BUDGET", error: "Dagelijks token-budget bereikt — probeer het later opnieuw (kostenbescherming)." };
  }

  let tokensUsed = 0;
  try {
    const system = buildExtractorSystem(getAgentSystemPrompt(agentId));
    const resp = await anthropicClient.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: `Bouw de kennisgraaf uit deze tekst:\n\n${source}` }],
    });
    if (resp.usage) tokensUsed = resp.usage.input_tokens + resp.usage.output_tokens;
    reconcileBudget(tokensUsed, estimatedTokens);

    const parsed = parseExtraction(extractText(resp));
    const { nodes, communityCount } = annotate(parsed.nodes, parsed.edges);
    const report = buildReport(title, nodes, parsed.edges, communityCount);

    const graph = storage.createGraph({
      agentId,
      title,
      source,
      nodesJson: JSON.stringify(nodes),
      edgesJson: JSON.stringify(parsed.edges),
      report,
      nodeCount: nodes.length,
      edgeCount: parsed.edges.length,
      communityCount,
      tokensUsed,
    });
    return { ok: true, graph };
  } catch (err: any) {
    reconcileBudget(tokensUsed, estimatedTokens);
    console.error(`[graph] fout tijdens bouwen:`, err?.message || err);
    return { ok: false, code: "ERROR", error: `Fout tijdens bouwen: ${err?.message || "onbekende fout"}` };
  }
}

// Helper voor routes: parse de opgeslagen JSON terug naar nodes/edges.
export function parseStored(graph: Graph): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const safe = <T>(json: string, fallback: T): T => {
    try {
      return JSON.parse(json) as T;
    } catch {
      return fallback;
    }
  };
  return {
    nodes: safe<GraphNode[]>(graph.nodesJson, []),
    edges: safe<GraphEdge[]>(graph.edgesJson, []),
  };
}
