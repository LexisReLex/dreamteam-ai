import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runOne, estimateText, listSeats } from "../dispatch/service";
import { VOICES } from "../dispatch/voice";
import type { Mode } from "../dispatch/types";

// Fase 2b — MCP-wrapper rond de fase 2 dispatch-core.
// Zelfde core (src/dispatch/service.ts), andere schil. Oranje licht blijft gelden:
// premium/dure run callt alleen met confirm_premium:true.

const server = new McpServer({ name: "model-router-dispatch", version: "1.0.0" });

// De generieke registerTool-inferentie van de SDK + zod loopt onder strict in TS2589
// (excessively deep). We registreren via een losgekoppelde referentie; de handler-args
// typen we expliciet zodat we de typeveiligheid in de handlers zelf behouden.
type ToolConfig = {
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};
type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };
const registerTool = (
  name: string,
  config: ToolConfig,
  cb: (args: Record<string, unknown>) => Promise<ToolResult>
): void => {
  (server.registerTool as unknown as (n: string, c: ToolConfig, h: typeof cb) => void)(
    name,
    config,
    cb
  );
};

const seatEnum = z.enum(["copywriter", "klantenservice", "research"]);
const modeEnum = z.enum(["default", "draft", "quality"]);
const voiceEnum = z.enum(VOICES);

function eur(usd: number): string {
  return (usd * 0.92).toFixed(4);
}

function textResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

// ---- dispatch_run -----------------------------------------------------------
registerTool(
  "dispatch_run",
  {
    title: "Dispatch een taak via het juiste model (oranje licht)",
    description:
      "Draait één taak via het routing-model voor de seat (of een expliciet model) over OpenRouter. " +
      "Cheap tier draait automatisch. Premium tier (of boven de kostendrempel) draait ALLEEN met confirm_premium:true; " +
      "anders krijg je de kostenraming + gate-melding terug zonder te callen. Geeft output, échte kosten, latency en logpad terug.",
    inputSchema: {
      seat: seatEnum.optional().describe("copywriter | klantenservice | research"),
      model: z.string().optional().describe("expliciete model-slug; omzeilt de seat-keuze"),
      mode: modeEnum.optional().describe("default | draft | quality (default = default)"),
      task: z.string().describe("taaktekst (inline) of pad naar een taakbestand (.md/.json/.txt)"),
      voice: voiceEnum.optional().describe("merkstem-laag: lexxy | degroot | klanttijd | persoonlijk (optioneel)"),
      confirm_premium: z
        .boolean()
        .optional()
        .describe("zet op true om het oranje licht te passeren voor premium/dure runs"),
    },
  },
  async (args) => {
    const { seat, model, mode, task, voice, confirm_premium } = args as {
      seat?: string;
      model?: string;
      mode?: string;
      task: string;
      voice?: string;
      confirm_premium?: boolean;
    };
    try {
      const { outcome, resultFile, logFile } = await runOne({
        seat,
        model,
        mode: mode as Mode | undefined,
        task,
        voice,
        confirmPremium: confirm_premium === true,
      });

      const head =
        `model: ${outcome.modelLabel} [${outcome.modelId}] · tier ${outcome.tier} · gate ${outcome.gate}\n` +
        `raming: ~$${outcome.estimate.estCostUsd.toFixed(6)} (~€${eur(outcome.estimate.estCostUsd)})`;

      if (outcome.error) {
        return textResult(`✗ FOUT bij call: ${outcome.error}\n${head}`, true);
      }
      if (!outcome.executed) {
        // Oranje licht: niet gecalld.
        return textResult(
          `⏸ NIET uitgevoerd — ${outcome.blockedReason}.\n${head}\n` +
            `Dit is het oranje licht: premium/dure run. Bevestig met confirm_premium:true om te callen.`,
          false
        );
      }
      return textResult(
        `✓ KLAAR via ${outcome.modelLabel}.\n${head}\n` +
          `tokens: ${outcome.promptTokens} in / ${outcome.completionTokens} out · latency ${outcome.latencyMs} ms\n` +
          `ECHTE kosten: $${(outcome.costUsd ?? 0).toFixed(6)} (~€${eur(outcome.costUsd ?? 0)})\n` +
          `resultaat → ${resultFile}\nlogregel → ${logFile}\n\n--- OUTPUT ---\n${outcome.output ?? ""}`
      );
    } catch (err) {
      return textResult(`✗ ${err instanceof Error ? err.message : String(err)}`, true);
    }
  }
);

// ---- dispatch_estimate ------------------------------------------------------
registerTool(
  "dispatch_estimate",
  {
    title: "Raam een dispatch zonder te callen (dry-run)",
    description:
      "Spiegelt --dry-run: kiest het model voor de seat/mode (of expliciet model) en geeft de kostenraming + gate terug. " +
      "Doet NOOIT een echte call.",
    inputSchema: {
      seat: seatEnum.optional(),
      model: z.string().optional(),
      mode: modeEnum.optional(),
      task: z.string().describe("taaktekst (inline) of pad naar een taakbestand"),
      voice: voiceEnum.optional().describe("merkstem-laag: lexxy | degroot | klanttijd | persoonlijk (optioneel)"),
    },
  },
  async (args) => {
    const { seat, model, mode, task, voice } = args as {
      seat?: string;
      model?: string;
      mode?: string;
      task: string;
      voice?: string;
    };
    try {
      const { res, estimate, gate } = estimateText({
        seat,
        model,
        mode: mode as Mode | undefined,
        task,
        voice,
      });
      return textResult(
        `DRY-RUN (geen call)\n` +
          `model: ${res.model.label} [${res.modelId}] · tier ${res.model.tier} · gate ${gate}\n` +
          `reden: ${res.reason}\n` +
          `raming: ~${estimate.estPromptTokens} in + ~${estimate.estCompletionTokens} out tokens\n` +
          `kosten: ~$${estimate.estCostUsd.toFixed(6)} (~€${eur(estimate.estCostUsd)}) — bron: prijs uit routing-JSON`
      );
    } catch (err) {
      return textResult(`✗ ${err instanceof Error ? err.message : String(err)}`, true);
    }
  }
);

// ---- dispatch_seats ---------------------------------------------------------
registerTool(
  "dispatch_seats",
  {
    title: "Toon de huidige seats + modellen + gates",
    description:
      "Geeft de seats, hun gekozen modellen per mode en de gate (auto/oranje) terug, live uit models-routing.json. " +
      "Zo ziet de aanroeper wat de routing-regels nu zijn.",
    inputSchema: {},
  },
  async () => {
    try {
      const info: ReturnType<typeof listSeats> = listSeats();
      const lines: string[] = [
        `Routing-bron: ${info.routingPath} (v${info.version}) · oranje-drempel $${info.thresholdUsd.toFixed(2)}/call`,
        "",
      ];
      for (const s of info.seats) {
        lines.push(`▸ ${s.seat}${s.strategy ? ` — ${s.strategy}` : ""}`);
        for (const m of s.modes) {
          lines.push(`    ${m.mode.padEnd(8)} → ${m.modelLabel} [${m.modelId}] · ${m.tier} · gate ${m.gate}`);
        }
      }
      return textResult(lines.join("\n"));
    } catch (err) {
      return textResult(`✗ ${err instanceof Error ? err.message : String(err)}`, true);
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stderr — stdout is gereserveerd voor het MCP-protocol.
  console.error("model-router-dispatch MCP-server gestart (stdio). Tools: dispatch_run, dispatch_estimate, dispatch_seats.");
}

main().catch((err) => {
  console.error(`MCP-server fout: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
