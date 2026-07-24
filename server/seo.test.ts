import { describe, it, expect } from "vitest";
import {
  classifyIp,
  checkUrlSyntax,
  countWords,
  extractSignals,
  analyze,
  visibleText,
  parseRobots,
  parseSitemap,
  type SiteSignals,
} from "./seo";

describe("classifyIp (SSRF-classificatie)", () => {
  it("markeert loopback, private en link-local/metadata als private", () => {
    expect(classifyIp("127.0.0.1")).toBe("private");
    expect(classifyIp("10.0.0.5")).toBe("private");
    expect(classifyIp("172.16.0.1")).toBe("private");
    expect(classifyIp("172.31.255.255")).toBe("private");
    expect(classifyIp("192.168.1.1")).toBe("private");
    expect(classifyIp("169.254.169.254")).toBe("private"); // cloud-metadata
    expect(classifyIp("0.0.0.0")).toBe("private");
    expect(classifyIp("100.64.0.1")).toBe("private"); // CGNAT
    expect(classifyIp("::1")).toBe("private");
    expect(classifyIp("fd00::1")).toBe("private");
  });

  it("markeert echte publieke adressen als public", () => {
    expect(classifyIp("8.8.8.8")).toBe("public");
    expect(classifyIp("172.15.0.1")).toBe("public"); // net buiten 172.16/12
    expect(classifyIp("172.32.0.1")).toBe("public");
    expect(classifyIp("2606:4700:4700::1111")).toBe("public");
  });

  it("markeert onzin als invalid", () => {
    expect(classifyIp("geen-ip")).toBe("invalid");
    expect(classifyIp("999.1.1.1")).toBe("invalid");
  });
});

describe("checkUrlSyntax", () => {
  it("weigert niet-http(s)-protocollen", () => {
    expect(checkUrlSyntax("ftp://voorbeeld.nl")).toMatchObject({ ok: false });
    expect(checkUrlSyntax("file:///etc/passwd")).toMatchObject({ ok: false });
    expect(checkUrlSyntax("geen url")).toMatchObject({ ok: false });
  });

  it("weigert interne hostnamen en private literal IP's", () => {
    expect(checkUrlSyntax("http://localhost/")).toMatchObject({ ok: false });
    expect(checkUrlSyntax("http://foo.local/")).toMatchObject({ ok: false });
    expect(checkUrlSyntax("http://127.0.0.1/")).toMatchObject({ ok: false });
    expect(checkUrlSyntax("http://169.254.169.254/latest/meta-data/")).toMatchObject({ ok: false });
    expect(checkUrlSyntax("http://192.168.0.1/")).toMatchObject({ ok: false });
  });

  it("accepteert een normale publieke https-URL", () => {
    const res = checkUrlSyntax("https://voorbeeld.nl/pagina");
    expect(res.ok).toBe(true);
  });
});

describe("visibleText / countWords", () => {
  it("negeert scripts, styles en tags", () => {
    const html = `<html><head><style>.a{color:red}</style><script>var x=1</script></head>
      <body><h1>Hallo wereld</h1><p>Dit is een test met woorden.</p></body></html>`;
    expect(visibleText(html)).toBe("Hallo wereld Dit is een test met woorden.");
    expect(countWords(html)).toBe(8);
  });
});

// Volledig geoptimaliseerde pagina — moet hoog scoren en weinig findings geven.
const GOOD_HTML = `<!doctype html><html lang="nl"><head>
<title>Beste wandelschoenen 2026 — koopgids en reviews</title>
<meta name="description" content="Onze onafhankelijke koopgids voor de beste wandelschoenen van 2026, met vergelijkingen, pasvorm-tips en concrete aanbevelingen voor elk terrein en budget.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://voorbeeld.nl/wandelschoenen">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Beste wandelschoenen"}</script>
</head><body>
<h1>Beste wandelschoenen van 2026</h1>
<h2>Waar let je op?</h2>
<p>${"Wandelschoenen kiezen doe je op pasvorm, grip en waterdichtheid. ".repeat(20)}</p>
<h2>Onze top 5</h2>
<p>${"Elk model bespreken we op prijs en prestaties in het veld. ".repeat(20)}</p>
<img src="a.jpg" alt="wandelschoen op bergpad">
</body></html>`;

// Slechte pagina — geen title, geen H1, http, dun, geen schema.
const BAD_HTML = `<html><head></head><body><p>Kort.</p><img src="x.jpg"></body></html>`;

describe("analyze — goede pagina", () => {
  const report = analyze(GOOD_HTML, {
    url: "https://voorbeeld.nl/wandelschoenen",
    finalUrl: "https://voorbeeld.nl/wandelschoenen",
    statusCode: 200,
    https: true,
    headers: {
      "strict-transport-security": "max-age=63072000",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'self'",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin",
    },
  });

  it("extraheert de kern-signalen correct", () => {
    expect(report.signals.title).toContain("wandelschoenen");
    expect(report.signals.h1Count).toBe(1);
    expect(report.signals.h2Count).toBe(2);
    expect(report.signals.canonical).toBe("https://voorbeeld.nl/wandelschoenen");
    expect(report.signals.viewport).toBe(true);
    expect(report.signals.jsonLd.types).toContain("Article");
    expect(report.signals.jsonLd.invalid).toBe(0);
    expect(report.signals.images).toEqual({ total: 1, missingAlt: 0 });
    expect(report.signals.wordCount).toBeGreaterThan(300);
  });

  it("geeft een hoge health score en geen kritieke findings", () => {
    expect(report.healthScore).toBeGreaterThanOrEqual(90);
    expect(report.findings.some((f) => f.severity === "critical")).toBe(false);
  });
});

describe("analyze — slechte pagina", () => {
  const report = analyze(BAD_HTML, {
    url: "http://voorbeeld.nl",
    finalUrl: "http://voorbeeld.nl",
    statusCode: 200,
    https: false,
    headers: {},
  });

  it("detecteert de belangrijkste problemen", () => {
    const titles = report.findings.map((f) => f.title);
    expect(titles).toContain("Geen <title>");
    expect(titles).toContain("Geen H1");
    expect(titles).toContain("Geen HTTPS");
    expect(titles).toContain("Geen structured data");
    expect(report.findings.some((f) => f.title === "Ontbrekende alt-teksten")).toBe(true);
  });

  it("geeft een lage health score en minstens één kritieke finding", () => {
    expect(report.healthScore).toBeLessThan(60);
    expect(report.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("sorteert findings op ernst (critical eerst)", () => {
    expect(report.findings[0].severity).toBe("critical");
  });

  it("bevat een eerlijke heuristiek-disclaimer", () => {
    expect(report.disclaimer.toLowerCase()).toContain("heuristisch");
  });
});

describe("analyze — ongeldige en verouderde JSON-LD", () => {
  it("detecteert onparseerbare JSON-LD", () => {
    const html = `<html lang="nl"><head><title>x met een nette lengte hier</title>
      <script type="application/ld+json">{ kapot json </script></head><body><h1>t</h1></body></html>`;
    const report = analyze(html, { url: "https://a.nl", finalUrl: "https://a.nl", statusCode: 200, https: true, headers: {} });
    expect(report.signals.jsonLd.invalid).toBe(1);
    expect(report.findings.some((f) => f.title === "Ongeldige JSON-LD")).toBe(true);
  });

  it("markeert verouderde schema-typen (bv. HowTo)", () => {
    const html = `<html lang="nl"><head><title>x met een nette lengte hier ok</title>
      <script type="application/ld+json">{"@type":"HowTo","name":"doe dit"}</script></head><body><h1>t</h1></body></html>`;
    const report = analyze(html, { url: "https://a.nl", finalUrl: "https://a.nl", statusCode: 200, https: true, headers: {} });
    expect(report.findings.some((f) => f.title === "Verouderde schema-typen")).toBe(true);
  });
});

describe("parseRobots", () => {
  it("detecteert een blanket Disallow voor alle crawlers", () => {
    const r = parseRobots("User-agent: *\nDisallow: /");
    expect(r.blanketDisallowAll).toBe(true);
  });

  it("blokkeert niet blanket bij een specifieke Disallow", () => {
    const r = parseRobots("User-agent: *\nDisallow: /admin/\nDisallow: /cart");
    expect(r.blanketDisallowAll).toBe(false);
  });

  it("leest Sitemap-directives (hoofdletterongevoelig)", () => {
    const r = parseRobots("User-agent: *\nAllow: /\nsitemap: https://voorbeeld.nl/sitemap.xml");
    expect(r.sitemaps).toContain("https://voorbeeld.nl/sitemap.xml");
  });

  it("detecteert geblokkeerde AI-crawlers zonder de site blanket te blokkeren", () => {
    const r = parseRobots("User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private/");
    expect(r.blockedAiCrawlers).toContain("GPTBot");
    expect(r.blanketDisallowAll).toBe(false);
  });

  it("negeert commentaar en lege regels", () => {
    const r = parseRobots("# comment\n\nUser-agent: *\nDisallow: /  # blok alles");
    expect(r.blanketDisallowAll).toBe(true);
  });
});

describe("parseSitemap", () => {
  it("telt <loc>-entries in een urlset", () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://a.nl/</loc></url><url><loc>https://a.nl/x</loc></url></urlset>`;
    const r = parseSitemap(xml);
    expect(r).toMatchObject({ valid: true, isIndex: false, urlCount: 2 });
  });

  it("herkent een sitemapindex", () => {
    const xml = `<sitemapindex><sitemap><loc>https://a.nl/sm1.xml</loc></sitemap></sitemapindex>`;
    expect(parseSitemap(xml).isIndex).toBe(true);
  });

  it("markeert onzin als ongeldig", () => {
    expect(parseSitemap("<html>geen sitemap</html>").valid).toBe(false);
  });
});

describe("analyze — site-signalen (robots + sitemap)", () => {
  const baseHtml = `<html lang="nl"><head><title>Een nette titel voor de test hier</title>
    <meta name="description" content="Een beschrijving van gepaste lengte voor deze testpagina zodat On-Page niet strandt.">
    <link rel="canonical" href="https://a.nl/"><meta name="viewport" content="width=device-width">
    <script type="application/ld+json">{"@type":"Organization","name":"A"}</script></head>
    <body><h1>Titel</h1><h2>Sub</h2><p>${"Voldoende tekst voor de content-vloer hier. ".repeat(20)}</p></body></html>`;
  const ctx = { url: "https://a.nl/", finalUrl: "https://a.nl/", statusCode: 200, https: true, headers: {} };

  const goodSite: SiteSignals = {
    robotsFound: true, blanketDisallowAll: false, blockedAiCrawlers: [],
    sitemapDeclared: true, sitemapUrl: "https://a.nl/sitemap.xml", sitemapFound: true, sitemapUrlCount: 42,
  };

  it("geeft geen site-findings bij een gezonde robots + sitemap", () => {
    const report = analyze(baseHtml, { ...ctx, site: goodSite });
    const titles = report.findings.map((f) => f.title);
    expect(titles).not.toContain("robots.txt blokkeert alle crawlers");
    expect(titles).not.toContain("Geen XML-sitemap gevonden");
    expect(titles).not.toContain("AI-crawlers geblokkeerd");
  });

  it("meldt een blanket robots-blokkade als kritiek", () => {
    const report = analyze(baseHtml, { ...ctx, site: { ...goodSite, blanketDisallowAll: true } });
    const f = report.findings.find((x) => x.title === "robots.txt blokkeert alle crawlers");
    expect(f?.severity).toBe("critical");
  });

  it("meldt een ontbrekende sitemap", () => {
    const report = analyze(baseHtml, { ...ctx, site: { ...goodSite, sitemapFound: false } });
    expect(report.findings.some((f) => f.title === "Geen XML-sitemap gevonden")).toBe(true);
  });

  it("meldt geblokkeerde AI-crawlers", () => {
    const report = analyze(baseHtml, { ...ctx, site: { ...goodSite, blockedAiCrawlers: ["GPTBot", "ClaudeBot"] } });
    expect(report.findings.some((f) => f.title === "AI-crawlers geblokkeerd")).toBe(true);
  });

  it("werkt ook zonder site-signalen (backwards compatible)", () => {
    const report = analyze(baseHtml, ctx);
    expect(report.signals.site).toBeNull();
    expect(report.findings.some((f) => f.category === "Technical" && f.title.includes("sitemap"))).toBe(false);
  });
});
