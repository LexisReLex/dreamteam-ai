import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "node:http";
import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { storage } from "./storage";
import type { Loop, LoopRun, Notification, InsertNotification } from "@shared/schema";

// ─── Gotify-geïnspireerde meldingslaag ────────────────────────────────────────
// Gotify = "een simpele server om berichten te versturen en (realtime via
// WebSocket) te ontvangen". We nemen die kern over binnen DreamTeam:
//   • Applications (bron) → `source`, bv. "loop:Nova" of "system".
//   • Messages (titel + tekst + priority) → tabel `notifications`.
//   • Clients (realtime ontvangers) → de browser via WebSocket /api/stream.
//   • Priority 0–10 → dezelfde schaal als gotify, met dezelfde buckets.
// De directe aanleiding: loop engineering had een "Human gate", maar niets
// bereikte de mens. Een ESCALATE verdween in het runlog. Deze laag dicht dat gat.

// ─── Prioriteit (gotify-schaal 0–10) ──────────────────────────────────────────
// Gotify-buckets (zoals de Android-client ze interpreteert):
//   0–1  = min     (geen melding / stil)
//   2–3  = low      (zichtbaar, geen geluid)
//   4–7  = normal   (standaardmelding)
//   8–10 = high     (nadrukkelijk; doorbreekt "niet storen")
export type PriorityBucket = "min" | "low" | "normal" | "high";

export function priorityBucket(priority: number): PriorityBucket {
  const p = Math.max(0, Math.min(10, Math.round(priority)));
  if (p <= 1) return "min";
  if (p <= 3) return "low";
  if (p <= 7) return "normal";
  return "high";
}

// Vertaalt een loop-verdict naar een gotify-prioriteit. ESCALATE en ERROR moeten
// de mens echt bereiken (de "gate"); REJECT is normaal; APPROVE is low-signaal.
export function priorityForVerdict(verdict: string): number {
  switch (verdict) {
    case "ESCALATE": return 8; // high — vereist menselijk oordeel
    case "ERROR":    return 7; // normaal-hoog — er ging iets mis
    case "REJECT":   return 5; // normaal — maker faalde de check
    case "APPROVE":  return 2; // low — ging goed, alleen ter info
    default:         return 5;
  }
}

// Pure builder: bouwt de melding-payload voor een afgeronde loop-run. Los van
// opslag/WebSocket zodat het geïsoleerd te testen is (net als loops.ts).
export function buildLoopNotification(
  loop: Pick<Loop, "id" | "name">,
  run: Pick<LoopRun, "verdict" | "score" | "critique">,
  agentName = "Agent",
): InsertNotification {
  const emoji: Record<string, string> = {
    ESCALATE: "⚠️", ERROR: "🚫", REJECT: "✋", APPROVE: "✅",
  };
  const icon = emoji[run.verdict] ?? "🔔";
  const crit = (run.critique || "").trim();
  const body = crit
    ? `${crit} (score ${run.score})`
    : `Run afgerond met score ${run.score}.`;
  return {
    source: `loop:${agentName}`,
    title: `${icon} ${loop.name} — ${run.verdict}`,
    message: body,
    priority: priorityForVerdict(run.verdict),
    link: `/loops`,
  };
}

// ─── WebSocket-hub (gotify /stream) ───────────────────────────────────────────
// Één hub met alle verbonden clients. Broadcast stuurt elke nieuwe melding direct
// naar alle open sockets. `noServer: true` zodat we de HTTP-upgrade zélf routeren
// en niet botsen met de Vite-HMR-WebSocket (die op /vite-hmr zit).
class NotificationHub {
  private wss = new WebSocketServer({ noServer: true });
  private clients = new Set<WebSocket>();

  register(ws: WebSocket) {
    this.clients.add(ws);
    ws.on("close", () => this.clients.delete(ws));
    ws.on("error", () => this.clients.delete(ws));
  }

  broadcast(notification: Notification) {
    const payload = JSON.stringify({ type: "notification", data: notification });
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  get server() {
    return this.wss;
  }

  get size() {
    return this.clients.size;
  }
}

const hub = new NotificationHub();

/** Aantal verbonden realtime-clients (voor diagnostiek/tests). */
export function connectedClients(): number {
  return hub.size;
}

// ─── Publiceren: opslaan + realtime uitzenden ─────────────────────────────────
// Dé centrale ingang. Persisteert de melding en pusht 'm naar alle clients.
export function publish(data: InsertNotification): Notification {
  const notification = storage.createNotification(data);
  hub.broadcast(notification);
  return notification;
}

/** Publiceert een melding voor een afgeronde loop-run (gebruikt door loops.ts). */
export function notifyLoopRun(
  loop: Pick<Loop, "id" | "name">,
  run: Pick<LoopRun, "verdict" | "score" | "critique">,
  agentName?: string,
): Notification {
  return publish(buildLoopNotification(loop, run, agentName));
}

// ─── App-token gate (gotify application token) ────────────────────────────────
// Gotify laat externe applicaties berichten POSTen met een app-token (query
// `?token=` of header `X-Gotify-Key`). Wij spiegelen dat met NOTIFY_TOKEN: is die
// leeg, dan staat de ingest open (consistent met security.ts' "default uit").
export function isNotifyTokenValid(provided: string, expected: string): boolean {
  if (!expected) return true;
  if (!provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function notifyTokenGuard(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.NOTIFY_TOKEN || "";
  const provided = (req.get("x-gotify-key") || (req.query.token as string) || "").toString();
  if (!isNotifyTokenValid(provided, expected)) {
    return res.status(401).json({ error: "Ongeldige of ontbrekende meld-token." });
  }
  return next();
}

// ─── HTTP-upgrade routeren naar de hub ────────────────────────────────────────
// Alleen /api/stream wordt door ons afgehandeld; al het andere (o.a. Vite-HMR)
// laten we met rust zodat beide WebSockets naast elkaar leven.
export function setupNotificationStream(httpServer: Server) {
  httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
    let pathname: string;
    try {
      pathname = new URL(req.url || "", "http://localhost").pathname;
    } catch {
      return;
    }
    if (pathname !== "/api/stream") return; // niet van ons — laat Vite-HMR e.d. door

    hub.server.handleUpgrade(req, socket as any, head, (ws) => {
      hub.register(ws);
      // Stuur direct een kleine "hello" met het huidige aantal ongelezen meldingen.
      ws.send(JSON.stringify({ type: "hello", unread: storage.getUnreadCount() }));
    });
  });
  console.log("[notifications] realtime-stream actief op WebSocket /api/stream.");
}
