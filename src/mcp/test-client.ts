// Verificatie-client voor de MCP-server (fase 2b). Spawnt de server via stdio,
// roept de 3 tools aan en print de resultaten. Alleen voor de geen-blinde-vlekken-check.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..", "..");

function show(label: string, res: unknown): void {
  const r = res as { content?: Array<{ text?: string }> };
  const text = r.content?.map((c) => c.text ?? "").join("\n") ?? "";
  console.log(`\n===== ${label} =====\n${text}`);
}

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/mcp/server.ts"],
    cwd: ROOT,
  });
  const client = new Client({ name: "verify-client", version: "1.0.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("Tools:", tools.tools.map((t) => t.name).join(", "));

  // 2) dispatch_seats — moet 3 seats + modellen tonen
  show("dispatch_seats", await client.callTool({ name: "dispatch_seats", arguments: {} }));

  // (extra) dispatch_estimate research — dry-run, geen call
  show(
    "dispatch_estimate research",
    await client.callTool({
      name: "dispatch_estimate",
      arguments: { seat: "research", task: "./examples-dispatch/voorbeeld-research-concurrenten.md" },
    })
  );

  // 4) dispatch_run copywriter ZONDER confirm_premium → moet stoppen (raming + gate), geen call
  show(
    "dispatch_run copywriter (zonder confirm_premium)",
    await client.callTool({
      name: "dispatch_run",
      arguments: { seat: "copywriter", task: "./examples-dispatch/voorbeeld-copywriter-haakjes.md" },
    })
  );

  // 3) dispatch_run research (cheap) → echte call + echte kosten + logregel
  show(
    "dispatch_run research (cheap, echte call)",
    await client.callTool({
      name: "dispatch_run",
      arguments: { seat: "research", task: "./examples-dispatch/voorbeeld-research-markt.md" },
    })
  );

  await client.close();
}

main().catch((err) => {
  console.error("test-client fout:", err);
  process.exit(1);
});
