import { describe, it, expect, afterEach, vi } from "vitest";
import {
  selfReviewEnabled,
  maxRevisions,
  minScore,
  llmCriticEnabled,
  isSystemFallback,
  looksDutch,
  looksEnglish,
  looksTruncated,
  evaluateAnswer,
  buildRevisionNote,
  reviewAndMaybeRevise,
  reviewInfo,
  type AnswerEvaluation,
} from "./selfReview";

afterEach(() => {
  delete process.env.SELF_REVIEW;
  delete process.env.SELF_REVIEW_MAX_REVISIONS;
  delete process.env.SELF_REVIEW_MIN_SCORE;
  delete process.env.SELF_REVIEW_LLM;
});

describe("configuratie", () => {
  it("selfReviewEnabled staat standaard AAN en gaat uit bij off/0/false/no", () => {
    expect(selfReviewEnabled()).toBe(true);
    for (const v of ["off", "0", "false", "no", "OFF", "False"]) {
      process.env.SELF_REVIEW = v;
      expect(selfReviewEnabled()).toBe(false);
    }
    process.env.SELF_REVIEW = "on";
    expect(selfReviewEnabled()).toBe(true);
  });

  it("maxRevisions is default 1 en wordt geklemd op 1..3", () => {
    expect(maxRevisions()).toBe(1);
    process.env.SELF_REVIEW_MAX_REVISIONS = "3";
    expect(maxRevisions()).toBe(3);
    process.env.SELF_REVIEW_MAX_REVISIONS = "9"; // boven cap
    expect(maxRevisions()).toBe(3);
    process.env.SELF_REVIEW_MAX_REVISIONS = "0"; // onder cap
    expect(maxRevisions()).toBe(1);
    process.env.SELF_REVIEW_MAX_REVISIONS = "abc"; // onzin
    expect(maxRevisions()).toBe(1);
  });

  it("minScore is default 0.5 en valt terug op default bij onzin/buiten bereik", () => {
    expect(minScore()).toBeCloseTo(0.5);
    process.env.SELF_REVIEW_MIN_SCORE = "0.7";
    expect(minScore()).toBeCloseTo(0.7);
    for (const v of ["", "abc", "0", "1", "-1", "2"]) {
      process.env.SELF_REVIEW_MIN_SCORE = v;
      expect(minScore()).toBeCloseTo(0.5);
    }
  });

  it("llmCriticEnabled staat standaard UIT en gaat aan bij on/1/true/yes", () => {
    expect(llmCriticEnabled()).toBe(false);
    for (const v of ["on", "1", "true", "yes", "ON"]) {
      process.env.SELF_REVIEW_LLM = v;
      expect(llmCriticEnabled()).toBe(true);
    }
    process.env.SELF_REVIEW_LLM = "off";
    expect(llmCriticEnabled()).toBe(false);
  });
});

describe("isSystemFallback", () => {
  it("herkent de bekende systeem-fallbacks", () => {
    expect(isSystemFallback("Ik ben momenteel niet beschikbaar. Probeer het later opnieuw.")).toBe(true);
    expect(isSystemFallback("Het dagelijkse gebruik-limiet is bereikt.")).toBe(true);
    expect(isSystemFallback("Er is een fout opgetreden. Probeer het later opnieuw.")).toBe(true);
  });
  it("markeert een normaal antwoord niet als fallback", () => {
    expect(isSystemFallback("Hier zijn drie concrete stappen voor je campagne.")).toBe(false);
  });
});

describe("taaldetectie", () => {
  it("herkent overwegend Nederlandse tekst", () => {
    expect(looksDutch("Kun je mij helpen met een concreet plan voor mijn webshop?")).toBe(true);
    expect(looksDutch("Please help me with my shop")).toBe(false);
  });
  it("herkent overwegend Engelse tekst", () => {
    expect(looksEnglish("Here is a complete answer with the steps you should take for your shop.")).toBe(true);
    expect(looksEnglish("Hier is een volledig antwoord met de stappen die je moet nemen.")).toBe(false);
  });
});

describe("looksTruncated", () => {
  it("false op een net afgesloten zin", () => {
    expect(looksTruncated("Hier is een concreet en volledig antwoord op je vraag.")).toBe(false);
    expect(looksTruncated('Je kunt starten met een A/B-test op je landingspagina!')).toBe(false);
  });
  it("false op korte/opzettelijke fragmenten", () => {
    expect(looksTruncated("Ja, dat kan")).toBe(false); // te kort om over te oordelen
    expect(looksTruncated("Stappenplan voor je campagne:")).toBe(false); // eindigt op ":"
  });
  it("true op een middenin afgebroken zin", () => {
    expect(
      looksTruncated("Om je cashflow te verbeteren raad ik aan om eerst je debiteuren scherper te"),
    ).toBe(true);
  });
});

describe("evaluateAnswer — goede antwoorden passeren (geen vals-positief)", () => {
  // Echte, correcte agent-antwoorden. Deze mogen NOOIT een tekortkoming krijgen,
  // want elke onterechte markering triggert een (mogelijk betaalde) revisie.
  const good: Array<[string, string]> = [
    ["Hoe verhoog ik mijn omzet?", "Om je omzet te verhogen adviseer ik drie stappen: verhoog je gemiddelde orderwaarde met bundels, activeer je bestaande klanten met e-mail, en test een upsell bij de checkout."],
    ["Schrijf een korte LinkedIn-post over onze nieuwe dienst.", "Trots om onze nieuwe dienst te lanceren! Vanaf vandaag helpen we ondernemers sneller groeien. Nieuwsgierig? Stuur ons een bericht."],
    ["Welke btw-regels gelden voor diensten binnen de EU?", "Voor B2B-diensten binnen de EU verlegt u doorgaans de btw naar de afnemer (reverse charge). Vermeld het btw-nummer van de klant op de factuur en rapporteer de dienst in uw ICP-opgave."],
    ["Can you help me in English?", "Of course. Here are three concrete steps you can take this week to improve your conversion rate."],
  ];
  it("markeert geen enkel goed antwoord", () => {
    for (const [q, a] of good) {
      const ev = evaluateAnswer(q, a);
      expect(ev.issues, `onterechte issue bij: ${a}`).toEqual([]);
      expect(ev.ok).toBe(true);
      expect(ev.score).toBe(1);
    }
  });
});

describe("evaluateAnswer — detecteert echte defecten", () => {
  it("leeg antwoord", () => {
    const ev = evaluateAnswer("Hoe verbeter ik mijn SEO?", "");
    expect(ev.ok).toBe(false);
    expect(ev.score).toBe(0);
  });

  it("te kort/inhoudsloos voor een echte vraag", () => {
    const ev = evaluateAnswer("Kun je een uitgebreid marketingplan maken voor mijn webshop?", "Nee.");
    expect(ev.ok).toBe(false);
  });

  it("afgekapt antwoord", () => {
    const ev = evaluateAnswer(
      "Hoe verbeter ik mijn cashflow?",
      "Om je cashflow te verbeteren raad ik aan om eerst je debiteurenbeheer strakker te",
    );
    expect(ev.ok).toBe(false);
    expect(ev.issues.join(" ")).toMatch(/afgekapt/i);
  });

  it("taal-mismatch: Nederlandse vraag, Engels antwoord", () => {
    const ev = evaluateAnswer(
      "Kun je mij helpen met een plan voor mijn webshop in Nederland?",
      "Sure, here is a complete plan for your shop with the steps you should take and the tools you can use.",
    );
    expect(ev.ok).toBe(false);
    expect(ev.issues.join(" ")).toMatch(/Engels/i);
  });

  it("uitwijk-/weigerantwoord op een substantiële vraag", () => {
    const ev = evaluateAnswer(
      "Kun je een vacaturetekst voor een verkoper schrijven?",
      "Ik kan je daar niet mee helpen.",
    );
    expect(ev.ok).toBe(false);
  });

  it("AI-boilerplate in plaats van inhoud", () => {
    const ev = evaluateAnswer(
      "Geef me drie marketingtips.",
      "Als een AI-taalmodel heb ik geen persoonlijke mening hierover.",
    );
    expect(ev.ok).toBe(false);
  });

  it("achtergebleven placeholder", () => {
    const ev = evaluateAnswer(
      "Schrijf een welkomstmail.",
      "Beste [naam], welkom bij ons bedrijf. We kijken ernaar uit om met u samen te werken en helpen u graag verder.",
    );
    expect(ev.ok).toBe(false);
    expect(ev.issues.join(" ")).toMatch(/placeholder/i);
  });
});

describe("buildRevisionNote", () => {
  it("benoemt de tekortkomingen en instrueert een volledige herschrijving", () => {
    const note = buildRevisionNote(["Antwoord is in het Engels terwijl de vraag Nederlands is."]);
    expect(note).toMatch(/ZELF-REVISIE/);
    expect(note).toMatch(/Engels/);
    expect(note.toLowerCase()).toMatch(/herschrijf/);
  });
});

describe("reviewAndMaybeRevise — de begrensde loop-back", () => {
  const goodAnswer = "Hier zijn drie concrete, uitgewerkte stappen die je deze week kunt zetten om je omzet te verhogen.";

  it("no-op als de guard uitstaat (0 regenerate-calls)", async () => {
    process.env.SELF_REVIEW = "off";
    const regenerate = vi.fn(async () => goodAnswer);
    const out = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", "", { regenerate });
    expect(out.revised).toBe(false);
    expect(out.content).toBe("");
    expect(regenerate).not.toHaveBeenCalled();
  });

  it("no-op op een systeem-fallback (niet herzien)", async () => {
    const regenerate = vi.fn(async () => goodAnswer);
    const out = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", "Er is een fout opgetreden. Probeer het later opnieuw.", { regenerate });
    expect(out.revised).toBe(false);
    expect(regenerate).not.toHaveBeenCalled();
  });

  it("no-op op een goed antwoord (0 regenerate-calls — gewone geval is gratis)", async () => {
    const regenerate = vi.fn(async () => goodAnswer);
    const out = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", goodAnswer, { regenerate });
    expect(out.revised).toBe(false);
    expect(out.content).toBe(goodAnswer);
    expect(regenerate).not.toHaveBeenCalled();
  });

  it("herziet een leeg antwoord en houdt het betere resultaat", async () => {
    const regenerate = vi.fn(async () => goodAnswer);
    const out = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", "", { regenerate });
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(out.revised).toBe(true);
    expect(out.content).toBe(goodAnswer);
    expect(out.finalScore).toBe(1);
  });

  it("houdt het origineel als de revisie niet beter is", async () => {
    const original = "Ik kan je daar niet mee helpen."; // 1 defect (refusal)
    const worse = ""; // leeg → slechter
    const regenerate = vi.fn(async () => worse);
    const out = await reviewAndMaybeRevise("Schrijf een vacaturetekst voor een verkoper.", original, { regenerate });
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(out.content).toBe(original); // nooit een regressie doorlaten
    expect(out.revised).toBe(false);
  });

  it("houdt het origineel als de revisie faalt (null) — chat breekt nooit", async () => {
    const original = "";
    const regenerate = vi.fn(async () => null);
    const out = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", original, { regenerate });
    expect(out.content).toBe(original);
    expect(out.revised).toBe(false);
  });

  it("respecteert de revisie-cap (blijft itereren tot cap als het niet strikt beter wordt)", async () => {
    process.env.SELF_REVIEW_MAX_REVISIONS = "3";
    // Origineel: NL-weigering (1 defect, score 0.65). Elke revisie is bruikbaar maar
    // Engels op een NL-vraag (óók 1 defect, score 0.65) → nooit STRIKT beter, nooit ok.
    const original = "Ik kan je daar niet mee helpen met dit verzoek.";
    const stillBad = "Sure, here is the full answer with all the steps you should take for your shop.";
    const regenerate = vi.fn(async () => stillBad);
    const out = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet in mijn webshop?", original, { regenerate });
    expect(regenerate).toHaveBeenCalledTimes(3);
    expect(out.revisions).toBe(3);
    expect(out.revised).toBe(false);
    expect(out.content).toBe(original); // nooit een regressie doorlaten
  });

  it("stopt zodra de lat gehaald is (geen extra calls)", async () => {
    process.env.SELF_REVIEW_MAX_REVISIONS = "3";
    const regenerate = vi.fn(async () => goodAnswer);
    const out = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", "", { regenerate });
    expect(regenerate).toHaveBeenCalledTimes(1); // eerste revisie is al goed → stop
    expect(out.revised).toBe(true);
  });

  it("gebruikt de Tier-2 LLM-critic alleen als die aanstaat", async () => {
    const regenerate = vi.fn(async () => goodAnswer);
    const llmCritique = vi.fn(async (): Promise<AnswerEvaluation> => ({ ok: false, score: 0.1, issues: ["Antwoord mist onderbouwing."] }));

    // Uit: critic wordt niet aangeroepen; goed antwoord blijft ongemoeid.
    const out1 = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", goodAnswer, { regenerate, llmCritique });
    expect(llmCritique).not.toHaveBeenCalled();
    expect(out1.revised).toBe(false);

    // Aan: critic keurt het (heuristisch schone) antwoord alsnog af → revisie volgt.
    process.env.SELF_REVIEW_LLM = "on";
    const regenerate2 = vi.fn(async () => goodAnswer);
    const llmGood = vi.fn(async (_q: string, a: string): Promise<AnswerEvaluation> =>
      a === goodAnswer && llmGood.mock.calls.length > 1
        ? { ok: true, score: 0.9, issues: [] }
        : { ok: false, score: 0.1, issues: ["Antwoord mist onderbouwing."] },
    );
    const out2 = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", "Kort antwoord dat heuristisch schoon is maar door de critic wordt afgekeurd.", { regenerate: regenerate2, llmCritique: llmGood });
    expect(llmGood).toHaveBeenCalled();
    expect(regenerate2).toHaveBeenCalled();
  });

  it("degradeert netjes als de LLM-critic gooit (heuristiek-only)", async () => {
    process.env.SELF_REVIEW_LLM = "on";
    const regenerate = vi.fn(async () => goodAnswer);
    const llmCritique = vi.fn(async (): Promise<AnswerEvaluation | null> => {
      throw new Error("critic down");
    });
    // Heuristisch schoon antwoord + critic faalt → geen revisie, geen crash.
    const out = await reviewAndMaybeRevise("Hoe verhoog ik mijn omzet?", goodAnswer, { regenerate, llmCritique });
    expect(out.revised).toBe(false);
    expect(out.content).toBe(goodAnswer);
  });
});

describe("reviewInfo", () => {
  it("rapporteert status zonder geheimen", () => {
    expect(reviewInfo()).toEqual({ enabled: true, maxRevisions: 1, minScore: 0.5, llmCritic: false });
    process.env.SELF_REVIEW = "off";
    expect(reviewInfo().enabled).toBe(false);
  });
});
