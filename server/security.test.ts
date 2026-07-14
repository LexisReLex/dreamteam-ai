import { describe, it, expect } from "vitest";
import { isOriginAllowed, isTokenValid } from "./security";

describe("isOriginAllowed", () => {
  it("staat alles toe bij een lege allowlist (default)", () => {
    expect(isOriginAllowed("https://kwaadaardig.nl", [])).toBe(true);
    expect(isOriginAllowed("", [])).toBe(true);
  });

  it("staat een origin op de lijst toe en weigert de rest", () => {
    const allowed = ["https://dreamteam.nl", "https://app.dreamteam.nl"];
    expect(isOriginAllowed("https://dreamteam.nl", allowed)).toBe(true);
    expect(isOriginAllowed("https://app.dreamteam.nl", allowed)).toBe(true);
    expect(isOriginAllowed("https://kwaadaardig.nl", allowed)).toBe(false);
  });

  it("staat een ontbrekende Origin toe (same-origin / niet-browser)", () => {
    expect(isOriginAllowed("", ["https://dreamteam.nl"])).toBe(true);
  });
});

describe("isTokenValid", () => {
  it("staat alles toe als er geen token is geconfigureerd (gate uit)", () => {
    expect(isTokenValid("", "")).toBe(true);
    expect(isTokenValid("wat-dan-ook", "")).toBe(true);
  });

  it("accepteert de juiste token en weigert een verkeerde", () => {
    expect(isTokenValid("geheim123", "geheim123")).toBe(true);
    expect(isTokenValid("fout", "geheim123")).toBe(false);
    expect(isTokenValid("", "geheim123")).toBe(false);
  });

  it("weigert bij afwijkende lengte zonder te crashen", () => {
    expect(isTokenValid("kort", "veel-langer-geheim")).toBe(false);
  });
});
