import * as http from "http";
import * as dotenv from "dotenv";
import { runOne } from "./service";
import type { Mode } from "./types";

dotenv.config();

// Thin HTTP-endpoint rond de dispatch-core (fase 3 DEEL B).
// Reden voor HTTP i.p.v. een n8n Execute Command-node: n8n draait in de cloud
// (lexdegroot.app.n8n.cloud), de dispatch-CLI + OpenRouter-key staan lokaal op de Mac.
// Een Execute Command-node in n8n's container bereikt die niet. Een HTTP Request-node
// in n8n → dit endpoint (via Cloudflare-tunnel naar de Mac) wél. De oranje-licht-gate
// en de kostenlog (out/dispatch/log.jsonl) blijven hergebruikt via runOne — één adres.

const PORT = Number(process.env.DISPATCH_HTTP_PORT ?? 8787);

// Fail-closed: zonder gedeeld geheim start het endpoint niet. Voorkomt dat een
// publieke tunnel-URL je OpenRouter-credits laat opmaken door willekeurige callers.
const TOKEN = process.env.DISPATCH_HTTP_TOKEN;
if (!TOKEN) {
  console.error(
    "✗ DISPATCH_HTTP_TOKEN ontbreekt. Zet een geheim in .env (DISPATCH_HTTP_TOKEN=...) — endpoint start niet zonder."
  );
  process.exit(1);
}

interface DispatchBody {
  seat?: string;
  model?: string;
  mode?: Mode;
  task?: string; // inline taaktekst (incl. contract-labels) of bestandspad
  voice?: string; // merkstem-laag (B): lexxy|degroot|klanttijd|persoonlijk — leeg = geen stem
  dryRun?: boolean;
  confirmPremium?: boolean;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let tooBig = false;
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 256_000) {
        tooBig = true;
        req.destroy();
      }
    });
    req.on("end", () => (tooBig ? reject(new Error("body te groot")) : resolve(data)));
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, obj: unknown): void {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  // Healthcheck — geen token nodig, geen call.
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { ok: true, service: "dispatch-http" });
  }

  if (req.method !== "POST" || req.url !== "/dispatch") {
    return sendJson(res, 404, { error: "Gebruik POST /dispatch of GET /health." });
  }

  if (req.headers["x-dispatch-token"] !== TOKEN) {
    return sendJson(res, 401, { error: "Ongeldig of ontbrekend x-dispatch-token." });
  }

  let body: DispatchBody;
  try {
    body = JSON.parse(await readBody(req)) as DispatchBody;
  } catch (err) {
    return sendJson(res, 400, { error: `Body geen geldige JSON: ${err instanceof Error ? err.message : String(err)}` });
  }

  if (!body.task) {
    return sendJson(res, 400, { error: 'Veld "task" verplicht (inline taaktekst of bestandspad).' });
  }
  if (!body.seat && !body.model) {
    return sendJson(res, 400, { error: 'Geef "seat" (research|copywriter|klantenservice) of "model".' });
  }

  try {
    const { outcome, logFile } = await runOne({
      seat: body.seat,
      model: body.model,
      mode: body.mode,
      task: body.task,
      voice: body.voice,
      dryRun: body.dryRun === true,
      confirmPremium: body.confirmPremium === true,
    });
    return sendJson(res, 200, {
      executed: outcome.executed,
      gate: outcome.gate,
      blockedReason: outcome.blockedReason ?? null,
      model: outcome.modelId,
      tier: outcome.tier,
      voice: outcome.voice ?? null,
      traceId: outcome.traceId,
      evalScore: outcome.eval?.score ?? null,
      output: outcome.output ?? null,
      costUsd: outcome.costUsd ?? null,
      estCostUsd: outcome.estimate.estCostUsd,
      promptTokens: outcome.promptTokens ?? null,
      completionTokens: outcome.completionTokens ?? null,
      logFile,
    });
  } catch (err) {
    return sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`dispatch-http luistert op http://127.0.0.1:${PORT} (POST /dispatch, GET /health)`);
});
