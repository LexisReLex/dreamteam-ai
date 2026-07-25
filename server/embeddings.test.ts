import { describe, it, expect, afterEach } from "vitest";
import { cosineSim, embeddingsEnabled, embed, _clearEmbeddingCache } from "./embeddings";

afterEach(() => {
  delete process.env.EMBEDDINGS_API_KEY;
  _clearEmbeddingCache();
});

describe("cosineSim", () => {
  it("geeft 1 voor identieke richting", () => {
    expect(cosineSim([1, 0, 0], [2, 0, 0])).toBeCloseTo(1);
  });

  it("geeft 0 voor orthogonale vectoren", () => {
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("geeft -1 voor tegengestelde richting", () => {
    expect(cosineSim([1, 1], [-1, -1])).toBeCloseTo(-1);
  });

  it("is veilig bij lege of nul-vectoren", () => {
    expect(cosineSim([], [1, 2])).toBe(0);
    expect(cosineSim([0, 0], [1, 2])).toBe(0);
  });

  it("rangschikt een verwante vector hoger dan een niet-verwante", () => {
    const query = [1, 1, 0];
    const verwant = [1, 0.9, 0.1];
    const nietVerwant = [0, 0, 1];
    expect(cosineSim(query, verwant)).toBeGreaterThan(cosineSim(query, nietVerwant));
  });
});

describe("embeddingsEnabled", () => {
  it("is uit zonder key (default) — geen regressie, geen netwerk", () => {
    expect(embeddingsEnabled()).toBe(false);
  });

  it("is uit bij een lege/whitespace key", () => {
    process.env.EMBEDDINGS_API_KEY = "   ";
    expect(embeddingsEnabled()).toBe(false);
  });

  it("is aan zodra er een echte key staat", () => {
    process.env.EMBEDDINGS_API_KEY = "sk-test-123";
    expect(embeddingsEnabled()).toBe(true);
  });
});

describe("embed", () => {
  it("geeft null als embeddings uitstaan (geen key)", async () => {
    expect(await embed(["hallo"])).toBeNull();
  });

  it("geeft null voor een lege inputlijst", async () => {
    process.env.EMBEDDINGS_API_KEY = "sk-test-123";
    expect(await embed([])).toBeNull();
  });
});
