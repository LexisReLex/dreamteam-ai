import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertMessageSchema, insertUserProfileSchema, insertLoopSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";
import { anthropicClient, checkAndUpdateBudget, reconcileBudget, getBudgetStatus } from "./ai";
import { agentSystemPrompts } from "./prompts";
import { runLoop, computeNextRunAt, startScheduler } from "./loops";
import { accessGuard } from "./security";
import { publish, setupNotificationStream, notifyTokenGuard } from "./notifications";

// ─── Rate limiting (simple in-memory per IP) ──────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: "Te veel verzoeken. Probeer het over een minuut opnieuw." });
    }

    entry.count++;
    return next();
  };
}

// Clean up rate limit map every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of Array.from(rateLimitMap.entries())) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// Seed data
const SEED_AGENTS = [
  { name: "Nova", role: "Marketing Strateeg", description: "Nova is je go-to marketingexpert. Ze ontwikkelt gerichte campagnes, analyseert marktkansen en helpt je merk sterker te positioneren.", avatarColor: "#3b82f6", avatarIcon: "Megaphone", specialty: "Campagnestrategie & merkpositionering", status: "active" as const, tasksCompleted: 12, category: "marketing" },
  { name: "Rex", role: "Sales Coach", description: "Rex is een doorgewinterde salesstrateeg. Hij helpt je pipeline te optimaliseren, bezwaren te overwinnen en meer deals te sluiten.", avatarColor: "#8b5cf6", avatarIcon: "TrendingUp", specialty: "Pipeline optimalisatie & deal closing", status: "busy" as const, tasksCompleted: 8, category: "sales" },
  { name: "Mira", role: "Content Creator", description: "Mira maakt content die echt resoneert. Van blogs tot video-scripts, ze weet hoe ze jouw verhaal boeiend vertelt.", avatarColor: "#06b6d4", avatarIcon: "PenTool", specialty: "Storytelling & content strategie", status: "active" as const, tasksCompleted: 21, category: "content" },
  { name: "Kai", role: "SEO Specialist", description: "Kai zorgt ervoor dat je gevonden wordt. Met diepgaande keyword-analyses en technische SEO brengt hij organisch verkeer naar je website.", avatarColor: "#22c55e", avatarIcon: "Search", specialty: "Keyword research & technische SEO", status: "idle" as const, tasksCompleted: 5, category: "marketing" },
  { name: "Zara", role: "Klantenservice", description: "Zara zet klanten centraal. Ze bouwt klantenservice-systemen, schrijft FAQ's en zorgt voor een uitstekende klantbeleving.", avatarColor: "#f97316", avatarIcon: "Headphones", specialty: "Klanttevredenheid & support processen", status: "active" as const, tasksCompleted: 16, category: "support" },
  { name: "Finn", role: "Financieel Adviseur", description: "Finn houdt je financiën scherp. Van cashflowprognoses tot investeringsadvies, hij geeft je financieel inzicht en rust.", avatarColor: "#eab308", avatarIcon: "BarChart2", specialty: "Cashflow management & financiële strategie", status: "idle" as const, tasksCompleted: 3, category: "finance" },
  { name: "Luna", role: "Social Media Manager", description: "Luna beheerst de kunst van social media. Ze bouwt communities, creëert viral content en vergroot je online aanwezigheid.", avatarColor: "#ec4899", avatarIcon: "Share2", specialty: "Community building & social strategie", status: "busy" as const, tasksCompleted: 19, category: "content" },
  { name: "Atlas", role: "Data Analist", description: "Atlas transformeert data in beslissingen. Hij bouwt dashboards, analyseert trends en geeft je de inzichten die je nodig hebt om te groeien.", avatarColor: "#6366f1", avatarIcon: "Database", specialty: "Data visualisatie & business intelligence", status: "idle" as const, tasksCompleted: 7, category: "analytics" },
  { name: "Sage", role: "HR & Recruitment", description: "Sage helpt je het perfecte team samen te stellen. Van functieprofielen tot onboarding, ze maakt HR menselijk en effectief.", avatarColor: "#14b8a6", avatarIcon: "Users", specialty: "Talentacquisitie & organisatieontwikkeling", status: "active" as const, tasksCompleted: 4, category: "hr" },
  { name: "Orion", role: "Strategisch Adviseur", description: "Orion ziet het grote plaatje. Hij helpt je heldere strategische keuzes te maken, OKR's te formuleren en je bedrijf richting te geven.", avatarColor: "#f59e0b", avatarIcon: "Compass", specialty: "Strategisch planning & OKR framework", status: "idle" as const, tasksCompleted: 9, category: "strategy" },
];

function seedDatabase() {
  const existingAgents = storage.getAgents();
  if (existingAgents.length > 0) return;

  console.log("Seeding database...");

  const createdAgents: number[] = [];
  for (const agent of SEED_AGENTS) {
    const created = storage.createAgent(agent);
    createdAgents.push(created.id);
  }

  storage.createProfile({
    name: "Lex",
    company: "DreamTeam",
    plan: "pro",
    notificationsEmail: true,
    notificationsPush: true,
    notificationsWeekly: false,
  });

  const sampleTasks = [
    { agentId: createdAgents[0], title: "Zomercampagne 2025 plannen", description: "Strategie voor Q3 marketingcampagne", status: "in_progress" as const, priority: "high" as const },
    { agentId: createdAgents[1], title: "Sales playbook bijwerken", description: "Nieuwe bezwaar-afhandeling technieken", status: "completed" as const, priority: "medium" as const },
    { agentId: createdAgents[2], title: "10 blogartikelen schrijven", description: "SEO-geoptimaliseerde content voor de website", status: "pending" as const, priority: "medium" as const },
    { agentId: createdAgents[3], title: "Keyword analyse Q3", description: "Top 50 keywords identificeren voor organische groei", status: "in_progress" as const, priority: "high" as const },
    { agentId: createdAgents[6], title: "Instagram content kalender", description: "30 dagen content planning voor Instagram", status: "completed" as const, priority: "low" as const },
    { agentId: createdAgents[7], title: "Verkoopdashboard bouwen", description: "KPI dashboard met conversies en omzet", status: "pending" as const, priority: "high" as const },
    { agentId: createdAgents[4], title: "FAQ database opzetten", description: "Top 20 klantvragen met antwoorden", status: "completed" as const, priority: "medium" as const },
    { agentId: createdAgents[9], title: "Q3 strategie presentatie", description: "Strategisch plan voor het komende kwartaal", status: "pending" as const, priority: "high" as const },
  ];

  for (const task of sampleTasks) {
    storage.createTask(task);
  }

  console.log("Database seeded successfully.");
}

// ─── Validated message schema with content length limit ───────────────────────
const validatedMessageSchema = insertMessageSchema.extend({
  content: z.string().min(1).max(4000, "Bericht mag maximaal 4000 tekens bevatten"),
});

// ─── Validated profile update schema (partial — only safe fields) ─────────────
const profileUpdateSchema = insertUserProfileSchema.pick({
  name: true,
  company: true,
  language: true,
  notificationsEmail: true,
  notificationsPush: true,
  notificationsWeekly: true,
}).partial();

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  seedDatabase();

  // Toegangsbescherming voor de dure (betaalde) endpoints. Standaard permissief;
  // wordt streng zodra ALLOWED_ORIGINS en/of API_ACCESS_TOKEN gezet zijn.
  const guard = accessGuard();

  // GET /api/agents
  app.get("/api/agents", (req, res) => {
    const agents = storage.getAgents();
    res.json(agents);
  });

  // GET /api/agents/:id
  app.get("/api/agents/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig agent ID" });
    const agent = storage.getAgent(id);
    if (!agent) return res.status(404).json({ error: "Agent niet gevonden" });
    res.json(agent);
  });

  // GET /api/tasks
  app.get("/api/tasks", (req, res) => {
    const tasks = storage.getTasks();
    const agents = storage.getAgents();
    const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
    const tasksWithAgent = tasks.map(t => ({ ...t, agent: agentMap[t.agentId] || null }));
    res.json(tasksWithAgent);
  });

  // POST /api/tasks
  app.post("/api/tasks", (req, res) => {
    const result = insertTaskSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });
    const task = storage.createTask(result.data);
    res.status(201).json(task);
  });

  // PATCH /api/tasks/:id
  app.patch("/api/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig taak ID" });
    const { status } = req.body;
    const validStatuses = ["pending", "in_progress", "completed", "failed"];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: "Ongeldige status" });
    const task = storage.updateTaskStatus(id, status);
    if (!task) return res.status(404).json({ error: "Taak niet gevonden" });
    res.json(task);
  });

  // GET /api/messages/:agentId
  app.get("/api/messages/:agentId", (req, res) => {
    const agentId = parseInt(req.params.agentId);
    if (isNaN(agentId)) return res.status(400).json({ error: "Ongeldig agent ID" });
    const msgs = storage.getMessages(agentId);
    res.json(msgs);
  });

  // POST /api/messages — rate limited: 20 per minute per IP
  app.post("/api/messages", guard, rateLimit(20, 60 * 1000), async (req, res) => {
    const result = validatedMessageSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    const { agentId, content } = result.data;

    // Validate agent exists
    const agent = storage.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: "Agent niet gevonden" });

    // Save user message
    const userMsg = storage.createMessage({ agentId, role: "user", content });

    // Get conversation history for context (last 10 messages)
    const history = storage.getMessages(agentId).slice(-10);
    const conversationHistory = history
      .filter(m => m.id !== userMsg.id)
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Add current message
    conversationHistory.push({ role: "user", content });

    // Schat tokens: ~4 chars per token, plus systeem-prompt overhead
    const estimatedTokens = Math.ceil(content.length / 4) + 500;
    if (!checkAndUpdateBudget(estimatedTokens)) {
      const assistantMsg = storage.createMessage({ 
        agentId, 
        role: "assistant", 
        content: "Het dagelijkse gebruik-limiet is bereikt. Probeer het morgen opnieuw of neem contact op via info@dreamteam.nl." 
      });
      return res.json([userMsg, assistantMsg]);
    }

    // Call Claude API
    let assistantContent = "Ik ben momenteel niet beschikbaar. Probeer het later opnieuw.";
    try {
      const systemPrompt = agentSystemPrompts[agentId] || `Je bent een behulpzame AI-assistent voor ondernemers.`;

      const response = await anthropicClient.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationHistory,
      });

      assistantContent = response.content[0].type === "text"
        ? response.content[0].text
        : assistantContent;

      // Update teller met werkelijke tokens als beschikbaar
      if (response.usage) {
        const actual = response.usage.input_tokens + response.usage.output_tokens;
        reconcileBudget(actual, estimatedTokens); // correctie
      }
    } catch (err: any) {
      console.error("Anthropic API error:", err?.message || err);
      assistantContent = "Er is een fout opgetreden. Probeer het later opnieuw.";
    }

    const assistantMsg = storage.createMessage({ agentId, role: "assistant", content: assistantContent });
    return res.json([userMsg, assistantMsg]);
  });

  // GET /api/profile
  app.get("/api/profile", (req, res) => {
    const profile = storage.getProfile();
    if (!profile) return res.status(404).json({ error: "Profiel niet gevonden" });
    res.json(profile);
  });

  // PATCH /api/profile — validated with explicit field allowlist
  app.patch("/api/profile", (req, res) => {
    const profile = storage.getProfile();
    if (!profile) return res.status(404).json({ error: "Profiel niet gevonden" });
    const result = profileUpdateSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });
    const updated = storage.updateProfile(profile.id, result.data);
    res.json(updated);
  });

  // ─── Agent Loops (loop engineering) ─────────────────────────────────────────

  function loopWithAgent(loop: ReturnType<typeof storage.getLoop>) {
    if (!loop) return loop;
    const agent = storage.getAgent(loop.agentId);
    return { ...loop, agent: agent || null };
  }

  // GET /api/loops
  app.get("/api/loops", (req, res) => {
    const loops = storage.getLoops();
    res.json(loops.map((l) => loopWithAgent(l)));
  });

  // GET /api/loops/:id  (met laatste runs)
  app.get("/api/loops/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig loop ID" });
    const loop = storage.getLoop(id);
    if (!loop) return res.status(404).json({ error: "Loop niet gevonden" });
    res.json({ ...loopWithAgent(loop), runs: storage.getLoopRuns(id, 20) });
  });

  // POST /api/loops
  app.post("/api/loops", (req, res) => {
    const result = insertLoopSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });
    if (!storage.getAgent(result.data.agentId)) return res.status(400).json({ error: "Agent niet gevonden" });

    const enabled = result.data.enabled ?? false;
    const cadence = result.data.cadence ?? "manual";
    const nextRunAt = enabled && cadence !== "manual" ? computeNextRunAt(cadence) : null;
    const loop = storage.createLoop(result.data);
    const updated = storage.updateLoop(loop.id, { nextRunAt });
    res.status(201).json(loopWithAgent(updated));
  });

  // PATCH /api/loops/:id  (naam, objective, cadence, level, enabled)
  const loopUpdateSchema = insertLoopSchema.partial().omit({ agentId: true });
  app.patch("/api/loops/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig loop ID" });
    const loop = storage.getLoop(id);
    if (!loop) return res.status(404).json({ error: "Loop niet gevonden" });

    const result = loopUpdateSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    const next = { ...loop, ...result.data };
    // Herbereken planning als cadans of enabled verandert.
    const nextRunAt =
      next.enabled && next.cadence !== "manual"
        ? loop.nextRunAt && loop.cadence === next.cadence && loop.enabled
          ? loop.nextRunAt
          : computeNextRunAt(next.cadence)
        : null;

    const updated = storage.updateLoop(id, { ...result.data, nextRunAt });
    res.json(loopWithAgent(updated));
  });

  // DELETE /api/loops/:id
  app.delete("/api/loops/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig loop ID" });
    if (!storage.getLoop(id)) return res.status(404).json({ error: "Loop niet gevonden" });
    storage.deleteLoop(id);
    res.status(204).end();
  });

  // POST /api/loops/:id/run — draai nu (rate limited: 10/min per IP)
  app.post("/api/loops/:id/run", guard, rateLimit(10, 60 * 1000), async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig loop ID" });
    const loop = storage.getLoop(id);
    if (!loop) return res.status(404).json({ error: "Loop niet gevonden" });

    const run = await runLoop(loop);
    if (!run) return res.status(409).json({ error: "Deze loop draait al. Wacht tot de huidige run klaar is." });
    res.json({ run, loop: loopWithAgent(storage.getLoop(id)) });
  });

  // GET /api/loops/:id/runs
  app.get("/api/loops/:id/runs", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig loop ID" });
    if (!storage.getLoop(id)) return res.status(404).json({ error: "Loop niet gevonden" });
    res.json(storage.getLoopRuns(id, 20));
  });

  // GET /api/budget — huidige token-budgetstatus (governance)
  app.get("/api/budget", (req, res) => {
    res.json(getBudgetStatus());
  });

  // ─── Notifications (gotify-geïnspireerd) ────────────────────────────────────
  // GET /api/notifications — lijst + ongelezen-teller (gotify: GET /message)
  app.get("/api/notifications", (req, res) => {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50")) || 50, 1), 200);
    res.json({
      notifications: storage.getNotifications(limit),
      unread: storage.getUnreadCount(),
    });
  });

  // POST /api/message — gotify-achtige ingest: externe bron stuurt een melding.
  // Beschermd met de app-token gate (NOTIFY_TOKEN) én de origin/API-guard.
  app.post("/api/message", guard, notifyTokenGuard, rateLimit(60, 60 * 1000), (req, res) => {
    const result = insertNotificationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Ongeldige melding", details: result.error.flatten() });
    }
    const notification = publish(result.data);
    res.status(201).json(notification);
  });

  // PATCH /api/notifications/:id/read — markeer als gelezen
  app.patch("/api/notifications/:id/read", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig melding-ID" });
    const updated = storage.markNotificationRead(id);
    if (!updated) return res.status(404).json({ error: "Melding niet gevonden" });
    res.json(updated);
  });

  // POST /api/notifications/read-all — markeer alles als gelezen
  app.post("/api/notifications/read-all", (req, res) => {
    const marked = storage.markAllNotificationsRead();
    res.json({ marked });
  });

  // DELETE /api/notifications/:id — verwijder één melding
  app.delete("/api/notifications/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Ongeldig melding-ID" });
    storage.deleteNotification(id);
    res.status(204).end();
  });

  // DELETE /api/notifications — wis alles
  app.delete("/api/notifications", (req, res) => {
    storage.clearNotifications();
    res.status(204).end();
  });

  // Realtime WebSocket-stream (gotify /stream) opzetten op /api/stream.
  setupNotificationStream(httpServer);

  // Start de in-proces loop-scheduler.
  startScheduler();

  // GET /api/stats
  app.get("/api/stats", (req, res) => {
    const stats = storage.getStats();
    res.json(stats);
  });

  // GET /api/activity
  app.get("/api/activity", (req, res) => {
    const tasks = storage.getTasks();
    const agents = storage.getAgents();
    const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

    const recent = tasks
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map(t => ({
        ...t,
        agentName: agentMap[t.agentId]?.name || "Onbekend",
        agentColor: agentMap[t.agentId]?.avatarColor || "#3b82f6",
      }));

    res.json(recent);
  });

  return httpServer;
}
