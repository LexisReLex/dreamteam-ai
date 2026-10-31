import { describe, it, expect } from "vitest";
import { extractBrandDna, buildAdMatrix, buildReport, campaignPlan, extractColors, detectTone, fit, pick, sentences, LIMITS } from "./brandDna";

const SALON = `<!doctype html><html lang="nl"><head>
<title>Salon Lotte | Kapper in Utrecht</title>
<meta name="description" content="Kapsalon in Utrecht: knippen, kleuren en föhnen. Online je afspraak boeken in 30 seconden.">
<meta property="og:site_name" content="Salon Lotte">
<meta property="og:image" content="/img/salon.jpg">
<meta name="theme-color" content="#e8505b">
<link rel="icon" href="/favicon.png">
<style>.btn{background:#e8505b;color:#ffffff}.accent{color:#2a9d8f}.x{color:#e8505b}</style>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"HairSalon","name":"Salon Lotte",
 "logo":"https://salonlotte.nl/logo.png","makesOffer":[{"@type":"Offer","itemOffered":{"@type":"Service","name":"Knippen dames"}}]}</script>
</head><body>
<h1>Je nieuwe kapsel, zonder wachten</h1>
<h2>Knippen</h2><h2>Kleuren</h2>
<p>Knippen vanaf €32,50. Kleuren vanaf 55 euro. Jij kiest de tijd, wij doen de rest!</p>
<a href="/boeken" class="btn">Boek nu</a> <button>Plan je afspraak</button>
<a href="https://instagram.com/salonlotte">Instagram</a>
<a href="tel:0301234567">Bel ons</a>
</body></html>`;

describe("extractBrandDna", () => {
  const dna = extractBrandDna(SALON, "https://salonlotte.nl/");

  it("haalt naam, belofte, taal en niche op", () => {
    expect(dna.name).toBe("Salon Lotte");
    expect(dna.promise).toContain("Online je afspraak boeken");
    expect(dna.headline).toBe("Je nieuwe kapsel, zonder wachten");
    expect(dna.language).toBe("nl");
    expect(dna.niche).toBe("kapper");
    expect(dna.businessTypes).toContain("HairSalon");
  });

  it("vindt aanbod, prijzen, CTA's, socials en contact", () => {
    expect(dna.offerings).toContain("Knippen dames");
    expect(dna.prices).toEqual(expect.arrayContaining(["€32,50", "55 euro"]));
    expect(dna.ctas).toEqual(expect.arrayContaining(["Boek nu", "Plan je afspraak"]));
    expect(dna.socials.instagram).toContain("instagram.com/salonlotte");
    expect(dna.hasPhone).toBe(true);
    expect(dna.hasEmail).toBe(false);
  });

  it("maakt logo en afbeelding absoluut en pakt merkkleuren (geen wit)", () => {
    expect(dna.logo).toBe("https://salonlotte.nl/logo.png");
    expect(dna.image).toBe("https://salonlotte.nl/img/salon.jpg");
    expect(dna.colors[0]).toBe("#e8505b");
    expect(dna.colors).toContain("#2a9d8f");
    expect(dna.colors).not.toContain("#ffffff");
  });

  it("scoort volledigheid en benoemt de gaten", () => {
    expect(dna.completeness).toBe(100);
    expect(dna.gaps).toEqual([]);
    const thin = extractBrandDna("<html><body><p>hallo</p></body></html>", "https://x.nl/");
    expect(thin.completeness).toBeLessThan(30);
    expect(thin.gaps.length).toBeGreaterThan(5);
  });

  it("negeert ongeldige JSON-LD zonder te crashen", () => {
    const d = extractBrandDna(`<script type="application/ld+json">{kapot</script><title>Test</title>`, "https://t.nl/");
    expect(d.name).toBe("Test");
  });
});

describe("toon en kleuren", () => {
  it("herkent formeel vs informeel aanspreken", () => {
    expect(detectTone("Wij helpen u graag met uw afspraak").address).toBe("formeel");
    expect(detectTone("Wij helpen je graag, jij kiest").address).toBe("informeel");
    expect(detectTone("Kapsalon Utrecht").address).toBe("onbekend");
  });
  it("breidt korte hex uit en filtert grijs", () => {
    expect(extractColors(`<style>a{color:#f00}b{color:#888}</style>`)).toEqual(["#ff0000"]);
  });
});

describe("fit", () => {
  it("kort af op woordgrens met … en laat korte tekst intact", () => {
    expect(fit("kort", 10)).toBe("kort");
    const out = fit("Dit is een veel te lange kop voor Google Search", 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("pick + sentences", () => {
  it("kiest de eerste kandidaat die past, zonder afkappen", () => {
    expect(pick(["Een veel te lange kop voor dit vak", "Korte kop"], 20)).toBe("Korte kop");
    expect(pick([null, "", "Past"], 10)).toBe("Past");
  });
  it("vult met hele zinnen tot de limiet", () => {
    expect(sentences("Eerste zin. Tweede zin. Derde zin die te lang is.", 25)).toBe("Eerste zin. Tweede zin.");
  });
  it("herkent emoji in de toon", () => {
    expect(detectTone("Boek nu 💇‍♀️").usesEmoji).toBe(true);
    expect(detectTone("Boek nu").usesEmoji).toBe(false);
  });
});

describe("buildAdMatrix", () => {
  const dna = extractBrandDna(SALON, "https://salonlotte.nl/");
  const matrix = buildAdMatrix(dna, new Date("2026-11-08T10:00:00Z"));

  it("maakt 4 invalshoeken × 3 platformen = 12 unieke briefs", () => {
    expect(matrix).toHaveLength(12);
    expect(new Set(matrix.map((b) => b.adName)).size).toBe(12);
    expect(new Set(matrix.map((b) => b.angle))).toEqual(new Set(["pijn", "resultaat", "bewijs", "gratis_tip"]));
  });

  it("houdt zich aan de tekenlimieten per platform", () => {
    for (const b of matrix) {
      expect(b.headline.length).toBeLessThanOrEqual(LIMITS[b.platform].headline);
      expect(b.primaryText.length).toBeLessThanOrEqual(LIMITS[b.platform].primaryText);
    }
  });

  it("zet geen afgekapte koppen (…) in de advertenties bij een complete DNA", () => {
    for (const b of matrix) expect(b.headline.endsWith("…")).toBe(false);
  });

  it("volgt de naamgeving en UTM-conventie, en gebruikt merkdata", () => {
    const b = matrix.find((x) => x.angle === "gratis_tip" && x.platform === "meta_reels")!;
    expect(b.adName).toBe("salon-lotte | gratis_tip | meta_reels | 08.11 | v1");
    expect(b.utm).toMatchObject({ utm_source: "meta", utm_medium: "paidsocial", utm_campaign: "salon-lotte-gratis_tip" });
    expect(b.cta).toBe("Boek nu");
    expect(b.visualBrief).toContain("#e8505b");
    const g = matrix.find((x) => x.platform === "google_search")!;
    expect(g.utm.utm_source).toBe("google");
  });

  it("schrijft Engels voor Engelstalige sites", () => {
    const en = extractBrandDna(`<html lang="en"><title>Acme</title><meta name="description" content="Fast invoices for freelancers."></html>`, "https://acme.io/");
    expect(buildAdMatrix(en)[0].hook).toBe("Sound familiar?");
  });
});

describe("campaignPlan + buildReport", () => {
  it("segmenteert per niche en levert alles in één rapport", () => {
    const r = buildReport(SALON, "https://salonlotte.nl/");
    expect(r.matrix).toHaveLength(12);
    expect(r.campaign.structure.join(" ")).toContain("kapper");
    expect(campaignPlan(r.dna).namingConvention).toContain("utm_campaign");
    expect(r.disclaimer).toMatch(/heuristiek/i);
  });
});
