import type { Knowledge } from "@shared/schema";

// ─── Knowledge Vault retrieval (keyword-gebaseerd, geen externe embeddings) ─────
// Bewust simpel: tokeniseer de vraag, scoor elke kennisbron op term-overlap
// (titel telt zwaarder dan inhoud/tags) en geef de best scorende terug. Genoeg
// voor een RAG-MVP bovenop SQLite; later te vervangen door echte embeddings.

const STOPWORDS = new Set([
  "de", "het", "een", "en", "van", "voor", "met", "aan", "op", "in", "is", "zijn",
  "dat", "die", "we", "ons", "onze", "je", "jouw", "the", "and", "for", "with", "our",
]);

export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    // Houd letters (incl. Latijnse accenten voor NL), cijfers en spaties over.
    .replace(/[^a-z0-9à-ÿ\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// Score = som van term-treffers, met titel ×3 en tags ×2 zwaarder dan de inhoud.
export function scoreEntry(queryTokens: string[], entry: Knowledge): number {
  if (queryTokens.length === 0) return 0;
  const title = ` ${tokenize(entry.title).join(" ")} `;
  const tags = ` ${tokenize(entry.tags).join(" ")} `;
  const content = ` ${tokenize(entry.content).join(" ")} `;
  let score = 0;
  for (const term of Array.from(new Set(queryTokens))) {
    const t = ` ${term} `;
    if (title.includes(t)) score += 3;
    if (tags.includes(t)) score += 2;
    if (content.includes(t)) score += 1;
  }
  return score;
}

// Geeft de best scorende kennisbronnen terug (score > 0), gesorteerd, gecapt op limit.
export function rankKnowledge(query: string, entries: Knowledge[], limit = 4): Knowledge[] {
  const q = tokenize(query);
  return entries
    .map((e) => ({ e, score: scoreEntry(q, e) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.e.id - a.e.id)
    .slice(0, limit)
    .map((x) => x.e);
}

// Bouwt een compact contextblok voor injectie in de prompts (inhoud gecapt).
export function buildKnowledgeContext(entries: Knowledge[], perEntryChars = 700): string {
  if (entries.length === 0) return "";
  const blocks = entries
    .map((e) => {
      const body = e.content.trim().slice(0, perEntryChars);
      return `### ${e.title}\n${body}`;
    })
    .join("\n\n");
  return `Relevante kennis uit de Knowledge Vault (gebruik dit waar het helpt, verzin niets bij):\n${blocks}`;
}
