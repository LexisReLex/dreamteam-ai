#!/usr/bin/env node
// Route 2 — zet de "Dispatch — prijs-signaal" HTTP-node in de echte n8n-workflow
// via de public API. Idempotent (bestaat de node al, dan vervangen). Standaard
// DRY-RUN: toont de geplande node + connectie, schrijft niets. Pas met --apply
// gaat de PUT eruit.
//
// Secrets komen uit env, NOOIT uit de repo:
//   N8N_BASE       bv. https://lexdegroot.app.n8n.cloud
//   N8N_API_KEY    sessie-only public-API-token (X-N8N-API-KEY)
//   N8N_CRED_ID    id van de "Header Auth" credential met x-dispatch-token
//   WORKFLOW_ID    default Mr4j7huAH2vu1SrA
//   DISPATCH_URL   default https://lxy-dispatch.dev/dispatch
//
// Gebruik:  node deploy/set-dispatch-node.mjs           # dry-run
//           node deploy/set-dispatch-node.mjs --apply   # echt zetten

const BASE = process.env.N8N_BASE?.replace(/\/$/, "");
const KEY = process.env.N8N_API_KEY;
const CRED_ID = process.env.N8N_CRED_ID;
const WF_ID = process.env.WORKFLOW_ID || "Mr4j7huAH2vu1SrA";
const DISPATCH_URL = process.env.DISPATCH_URL || "https://lxy-dispatch.dev/dispatch";
const APPLY = process.argv.includes("--apply");

const EXTRACT = "Extract & dedupe concurrenten";
const NODE_NAME = "Dispatch — prijs-signaal";

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
if (!BASE || !KEY) die("N8N_BASE en N8N_API_KEY vereist (env).");
if (APPLY && !CRED_ID) die("N8N_CRED_ID vereist bij --apply (Header Auth credential-id).");

const headers = { "X-N8N-API-KEY": KEY, "content-type": "application/json" };

// Body als n8n-expressie: bouwt {seat,voice,task} en serialiseert de dagrijen.
const jsonBody =
  "={{ JSON.stringify({ seat: 'research', voice: 'degroot', task: " +
  "'DOEL: Vat de concurrent-rijen van vandaag samen tot één kort NL signaal voor " +
  "Lexxy (fashion-dames DE): opvallendste bewegingen, tiers, en 1 concrete actie-suggestie.\\n' + " +
  "'GRENZEN: alleen aangeleverde rijen; geen verzonnen cijfers; onzekerheid = \\\"onbekend\\\"; geen klantdata.\\n' + " +
  "'TERUGGAVE: NL signaal, max ~180 woorden: (1) duiding top-concurrenten, (2) opvallendste signaal, (3) één actie.\\n' + " +
  "'BUDGET: 4000 tokens\\n\\nConcurrent-rijen (vandaag):\\n' + " +
  "$('" + EXTRACT + "').all().map(i => " +
  "`${i.json['STORE NAAM']} | ${i.json['TIER']} | ${i.json['ACTIEVE ADS']} ads | " +
  "score ${i.json['SCORE']} | ${i.json['STORE URL']||'—'} | ${i.json['NOTE']||''}`" +
  ").join('\\n') }) }}";

function buildNode(position) {
  return {
    parameters: {
      method: "POST",
      url: DISPATCH_URL,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "content-type", value: "application/json" }] },
      sendBody: true,
      specifyBody: "json",
      jsonBody,
      options: { response: { response: { responseFormat: "json" } }, timeout: 60000 },
    },
    name: NODE_NAME,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    executeOnce: true,
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 2000,
    credentials: { httpHeaderAuth: { id: CRED_ID || "<CRED_ID>", name: "dispatch-mac-token" } },
  };
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) die(`${method} ${path} → ${res.status} ${res.statusText}\n${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const wf = await api("GET", `/workflows/${WF_ID}`);
const extract = wf.nodes.find((n) => n.name === EXTRACT);
if (!extract) die(`Extract-node "${EXTRACT}" niet gevonden in workflow ${WF_ID}.`);

// Nieuwe node rechts-onder van Extract plaatsen (aftakking, botst niet met Sheet).
const pos = [extract.position[0] + 220, extract.position[1] + 180];
const node = buildNode(pos);

// Idempotent: verwijder bestaande gelijknamige node vóór toevoegen.
const nodes = wf.nodes.filter((n) => n.name !== NODE_NAME).concat(node);

// Connectie: Extract main[0] fan-out — bestaande targets behouden, Dispatch erbij.
const connections = structuredClone(wf.connections);
connections[EXTRACT] = connections[EXTRACT] || { main: [[]] };
connections[EXTRACT].main[0] = connections[EXTRACT].main[0] || [];
const already = connections[EXTRACT].main[0].some((c) => c.node === NODE_NAME);
if (!already) {
  connections[EXTRACT].main[0].push({ node: NODE_NAME, type: "main", index: 0 });
}

console.log(`Workflow      : ${wf.name} (${WF_ID})`);
console.log(`Nieuwe node   : "${NODE_NAME}" @ [${pos}]  executeOnce=true`);
console.log(`Connectie     : "${EXTRACT}" → "${NODE_NAME}" (fan-out; Sheet-tak blijft)`);
console.log(`Bestaande targets van Extract:`, connections[EXTRACT].main[0].map((c) => c.node).join(", "));

if (!APPLY) {
  console.log("\n— DRY-RUN — niets geschreven. Draai met --apply om te zetten.");
  console.log("\nNode-object:\n" + JSON.stringify(node, null, 2));
  process.exit(0);
}

await api("PUT", `/workflows/${WF_ID}`, {
  name: wf.name,
  nodes,
  connections,
  settings: wf.settings ?? {},
});
console.log(`\n✓ Node gezet in ${WF_ID}. Verifieer in n8n + doe de e2e-testrun.`);
