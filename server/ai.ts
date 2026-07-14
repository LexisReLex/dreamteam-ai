import Anthropic from "@anthropic-ai/sdk";

// Set up HTTPS proxy for Anthropic API calls using undici's ProxyAgent.
// Node.js fetch doesn't respect HTTPS_PROXY natively. Guarded: if undici is
// unavailable we simply skip proxy setup rather than crashing the server.
if (process.env.HTTPS_PROXY) {
  try {
    const { ProxyAgent, setGlobalDispatcher } = require("undici");
    setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY));
  } catch (err: any) {
    console.warn("[ai] undici niet beschikbaar — proxy-setup overgeslagen:", err?.message || err);
  }
}

// Shared Anthropic client — used by both the chat routes and the loop engine.
export const anthropicClient = new Anthropic({
  apiKey: process.env.CUSTOM_CRED_API_ANTHROPIC_COM_TOKEN || process.env.ANTHROPIC_API_KEY || "placeholder",
});

// ─── Gedeeld dagelijks kosten-budget (governance) ─────────────────────────────
// Beschermt tegen onverwachte API-kosten. Eén gedeeld plafond over chat én loops.
// Reset elke 24 uur. Instelbaar via DAILY_TOKEN_LIMIT env var (default 100.000).
const DAILY_TOKEN_LIMIT = parseInt(process.env.DAILY_TOKEN_LIMIT || "100000");
let dailyTokensUsed = 0;
let budgetResetAt = Date.now() + 24 * 60 * 60 * 1000;

function maybeResetBudget() {
  if (Date.now() > budgetResetAt) {
    dailyTokensUsed = 0;
    budgetResetAt = Date.now() + 24 * 60 * 60 * 1000;
    console.log("[budget] Dagelijks token-limiet gereset.");
  }
}

/** Reserveert `estimatedTokens` uit het budget. Geeft false als het plafond bereikt is. */
export function checkAndUpdateBudget(estimatedTokens: number): boolean {
  maybeResetBudget();
  if (dailyTokensUsed + estimatedTokens > DAILY_TOKEN_LIMIT) {
    console.warn(`[budget] Dagelijks limiet bereikt: ${dailyTokensUsed}/${DAILY_TOKEN_LIMIT} tokens`);
    return false;
  }
  dailyTokensUsed += estimatedTokens;
  return true;
}

/** Corrigeert de teller met het werkelijke tokengebruik na een API-call. */
export function reconcileBudget(actualTokens: number, estimatedTokens: number) {
  dailyTokensUsed += actualTokens - estimatedTokens;
}

export function getBudgetStatus() {
  maybeResetBudget();
  return {
    used: dailyTokensUsed,
    limit: DAILY_TOKEN_LIMIT,
    remaining: Math.max(0, DAILY_TOKEN_LIMIT - dailyTokensUsed),
    resetAt: new Date(budgetResetAt).toISOString(),
  };
}
