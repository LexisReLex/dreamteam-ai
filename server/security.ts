import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

// ─── Toegangsbescherming (defense-in-depth) ───────────────────────────────────
// Dit is GEEN volwaardige gebruikers-auth — een publieke browser-SPA kan geen
// geheim veilig bewaren. Dit beperkt drive-by misbruik van de dure (betaalde)
// endpoints via een origin-allowlist en, voor afgeschermde/interne deploys, een
// optionele API-token. Beide staan standaard uit zodat niets breekt.

/** Origin toegestaan? Lege allowlist = alles toestaan. Ontbrekende Origin
 * (same-origin of niet-browser) wordt toegestaan; cross-site browser-calls
 * sturen wél een Origin en worden zo geweigerd als die niet op de lijst staat. */
export function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  if (!origin) return true;
  return allowed.includes(origin);
}

/** Token geldig? Lege verwachte token = gate uit (alles toestaan). Vergelijkt in
 * constante tijd om timing-aanvallen te voorkomen. */
export function isTokenValid(provided: string, expected: string): boolean {
  if (!expected) return true;
  if (!provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function parseList(value: string | undefined): string[] {
  return (value || "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Express-middleware voor de dure endpoints. Leest de config één keer bij
 * aanmaken (ALLOWED_ORIGINS, API_ACCESS_TOKEN). */
export function accessGuard() {
  const allowedOrigins = parseList(process.env.ALLOWED_ORIGINS);
  const token = process.env.API_ACCESS_TOKEN || "";
  if (allowedOrigins.length > 0) console.log(`[security] origin-allowlist actief (${allowedOrigins.length} origins).`);
  if (token) console.log("[security] API-token-gate actief op dure endpoints.");

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get("origin") || "";
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return res.status(403).json({ error: "Origin niet toegestaan." });
    }
    if (token && !isTokenValid(req.get("x-api-token") || "", token)) {
      return res.status(401).json({ error: "Ongeldige of ontbrekende API-token." });
    }
    return next();
  };
}
