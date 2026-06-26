import OpenAI from "openai";

export function makeClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY ontbreekt. Kopieer .env.example naar .env en vul je sleutel in."
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_APP_URL ?? "https://lexxy.local",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "DreamTeam-Benchmark",
    },
  });
}

// Variant voor de 3-armen-benchmark: per-arm base_url + key (arm C = lokale OpenFugu
// op localhost). Default blijft OpenRouter, dus bestaande aanroepen veranderen niet.
export function makeClientFor(opts: { baseURL?: string; apiKey: string }): OpenAI {
  return new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseURL ?? "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_APP_URL ?? "https://lexxy.local",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "DreamTeam-Benchmark",
    },
  });
}

// Begrensde parallel-uitvoering zonder externe dependency.
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
