// ─── Semantische recall — key-gated embeddings (MemPalace, geleend) ────────────
//
// MemPalace (github.com/MemPalace/mempalace) haalt zijn hoge recall uit
// SEMANTISCH zoeken: het vindt relevante herinneringen ook zonder exacte
// woord-overlap (synoniemen, andere taal, herformuleringen). Onze Agent Memory
// deed puur lexicaal zoeken; dit bestand voegt de semantische leg toe.
//
// Ontwerp — spiegelt het Groq-pad:
//   • UIT-STANDAARD. Zonder EMBEDDINGS_API_KEY gebeurt hier niets en draait de
//     recall byte-identiek als voorheen (geen regressie, geen netwerk).
//   • MET een (gratis) key wordt de query semantisch vergeleken met de
//     herinneringen en fuseren we dat als derde ranglijst in de bestaande RRF.
//   • Faalt of hangt het endpoint, dan valt recall terug op puur lexicaal —
//     de chat blokkeert nooit (timeout-bescherming, vgl. de 5s-recall uit het
//     oorspronkelijke Agent-Memory-ontwerp).
//
// Provider-agnostisch via een OpenAI-compatibel /embeddings-endpoint, zodat je
// elke gratis aanbieder kunt gebruiken (OpenAI, Jina, Together, Voyage, …)
// zonder codewijziging — alleen env's.

const TIMEOUT_MS = parseInt(process.env.EMBEDDINGS_TIMEOUT_MS || "4000");
const MAX_CACHE = 2000;

function apiKey(): string | undefined {
  const k = process.env.EMBEDDINGS_API_KEY;
  return k && k.trim() ? k.trim() : undefined;
}

/** Semantische recall is alleen actief als er een embeddings-key gezet is. */
export function embeddingsEnabled(): boolean {
  return !!apiKey();
}

function baseUrl(): string {
  return (process.env.EMBEDDINGS_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function model(): string {
  return process.env.EMBEDDINGS_MODEL || "text-embedding-3-small";
}

// In-memory cache: herinneringen zijn stabiel, dus dezelfde tekst hoeft maar één
// keer geëmbed te worden. Sleutel bevat het model zodat een modelwissel niet
// oude vectoren hergebruikt. Simpele FIFO-eviction — de sets per agent zijn klein.
const cache = new Map<string, number[]>();

function cacheKey(text: string): string {
  return `${model()}::${text}`;
}

function cacheGet(text: string): number[] | undefined {
  return cache.get(cacheKey(text));
}

function cacheSet(text: string, vec: number[]): void {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(cacheKey(text), vec);
}

/**
 * Cosine-similariteit tussen twee vectoren (puur, testbaar).
 * Bereik [-1, 1]; 1 = identieke richting. 0 als een vector leeg/nul is.
 */
export function cosineSim(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Embed een lijst teksten via het OpenAI-compatibele /embeddings-endpoint.
 * Retourneert de vectoren in dezelfde volgorde als de input, of `null` bij
 * disabled/fout/timeout — de aanroeper valt dan terug op lexicale recall.
 * Reeds gecachte teksten worden niet opnieuw opgevraagd.
 */
export async function embed(texts: string[]): Promise<number[][] | null> {
  const key = apiKey();
  if (!key || texts.length === 0) return null;

  // Splits in cache-hits en nog-op-te-halen teksten (met behoud van volgorde).
  const result: (number[] | null)[] = texts.map((t) => cacheGet(t) ?? null);
  const missingIdx: number[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (result[i] === null) missingIdx.push(i);
  }

  if (missingIdx.length > 0) {
    const input = missingIdx.map((i) => texts[i]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(`${baseUrl()}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ model: model(), input }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        console.warn(`[embeddings] endpoint gaf status ${resp.status} — val terug op lexicale recall.`);
        return null;
      }
      const json: any = await resp.json();
      const data = json?.data;
      if (!Array.isArray(data) || data.length !== input.length) {
        console.warn("[embeddings] onverwacht antwoordformaat — val terug op lexicale recall.");
        return null;
      }
      for (let j = 0; j < missingIdx.length; j++) {
        const vec = data[j]?.embedding;
        if (!Array.isArray(vec)) return null;
        const numeric = vec.map(Number);
        cacheSet(texts[missingIdx[j]], numeric);
        result[missingIdx[j]] = numeric;
      }
    } catch (err: any) {
      const reason = err?.name === "AbortError" ? `timeout na ${TIMEOUT_MS}ms` : err?.message || err;
      console.warn(`[embeddings] ophalen faalde (${reason}) — val terug op lexicale recall.`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Op dit punt zou alles gevuld moeten zijn; guard voor de zekerheid.
  if (result.some((r) => r === null)) return null;
  return result as number[][];
}

/** Test-hulp: leegt de embeddings-cache. */
export function _clearEmbeddingCache(): void {
  cache.clear();
}
