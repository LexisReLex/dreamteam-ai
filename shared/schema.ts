import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Agents table
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description").notNull(),
  avatarColor: text("avatar_color").notNull(),
  avatarIcon: text("avatar_icon").notNull(),
  specialty: text("specialty").notNull(),
  status: text("status", { enum: ["active", "idle", "busy"] }).notNull().default("idle"),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  category: text("category").notNull(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Tasks table
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["pending", "in_progress", "completed", "failed"] }).notNull().default("pending"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, completedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Messages table
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// User profile table
export const userProfile = sqliteTable("user_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  company: text("company").notNull(),
  plan: text("plan", { enum: ["starter", "pro", "team"] }).notNull().default("starter"),
  notificationsEmail: integer("notifications_email", { mode: "boolean" }).notNull().default(true),
  notificationsPush: integer("notifications_push", { mode: "boolean" }).notNull().default(true),
  notificationsWeekly: integer("notifications_weekly", { mode: "boolean" }).notNull().default(false),
  language: text("language").notNull().default("nl"),
});

export const insertUserProfileSchema = createInsertSchema(userProfile).omit({ id: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfile.$inferSelect;

// ─── Agent Loops (loop engineering) ───────────────────────────────────────────
// Een loop is een autonome, zelf-scorende cyclus bovenop een agent:
// scheduler → maker (de agent) → checker (verifier sub-agent) → state → score.
export const CADENCES = ["manual", "15m", "2h", "6h", "1d"] as const;
export const LOOP_LEVELS = ["L1", "L2", "L3"] as const;
export const LOOP_VERDICTS = ["APPROVE", "REJECT", "ESCALATE", "ERROR"] as const;

export const loops = sqliteTable("loops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  cadence: text("cadence", { enum: CADENCES }).notNull().default("manual"),
  level: text("level", { enum: LOOP_LEVELS }).notNull().default("L1"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  state: text("state").notNull().default(""),
  lastScore: integer("last_score"),
  lastVerdict: text("last_verdict", { enum: LOOP_VERDICTS }),
  lastRunAt: text("last_run_at"),
  nextRunAt: text("next_run_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertLoopSchema = createInsertSchema(loops)
  .omit({ id: true, state: true, lastScore: true, lastVerdict: true, lastRunAt: true, nextRunAt: true, createdAt: true })
  .extend({
    name: z.string().min(1).max(80),
    objective: z.string().min(1).max(1000),
  });
export type InsertLoop = z.infer<typeof insertLoopSchema>;
export type Loop = typeof loops.$inferSelect;

// Loop runs — het runlog (maker-output + checker-oordeel)
export const loopRuns = sqliteTable("loop_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loopId: integer("loop_id").notNull(),
  makerOutput: text("maker_output").notNull().default(""),
  verdict: text("verdict", { enum: LOOP_VERDICTS }).notNull(),
  score: integer("score").notNull().default(0),
  critique: text("critique").notNull().default(""),
  tokensUsed: integer("tokens_used").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertLoopRunSchema = createInsertSchema(loopRuns).omit({ id: true, createdAt: true });
export type InsertLoopRun = z.infer<typeof insertLoopRunSchema>;
export type LoopRun = typeof loopRuns.$inferSelect;

// ─── Team Scans (Strix — graph of agents) ─────────────────────────────────────
// Een scan is een assessment door meerdere agents tegelijk (de "graph of agents"):
// verkenning (elke agent zoekt bevindingen in zijn domein) → validatie (een
// onafhankelijke Validator bevestigt elke bevinding met bewijs of verwerpt hem als
// false positive) → rapport (bevestigde bevindingen, severity + risicoscore + fix).
export const SCAN_STATUSES = ["pending", "running", "completed", "failed"] as const;
// L1/L2/L3 gefaseerde uitrol — gedeeld met de loops (LOOP_LEVELS).
export const SEVERITIES = ["kritiek", "hoog", "middel", "laag", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const scans = sqliteTable("scans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  target: text("target").notNull(),
  scope: text("scope").notNull().default(""),
  // JSON-array van agent-id's (de "graph of agents" die meedoet aan deze scan).
  agentIds: text("agent_ids").notNull().default("[]"),
  level: text("level", { enum: LOOP_LEVELS }).notNull().default("L1"),
  status: text("status", { enum: SCAN_STATUSES }).notNull().default("pending"),
  riskScore: integer("risk_score"),
  riskBand: text("risk_band", { enum: [...SEVERITIES, "schoon"] as const }),
  summary: text("summary").notNull().default(""),
  confirmedCount: integer("confirmed_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  tokensUsed: integer("tokens_used").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

export const insertScanSchema = createInsertSchema(scans)
  .omit({
    id: true, status: true, riskScore: true, riskBand: true, summary: true,
    confirmedCount: true, rejectedCount: true, tokensUsed: true, createdAt: true, completedAt: true,
  })
  .extend({
    name: z.string().min(1).max(80),
    target: z.string().min(1).max(2000),
  });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;

// Bevindingen — het gevalideerde resultaat van een scan (alleen bevestigde,
// géén false positives). Elke bevinding draagt bewijs, impact en een aanbevolen fix.
export const findings = sqliteTable("findings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scanId: integer("scan_id").notNull(),
  agentId: integer("agent_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default(""),
  severity: text("severity", { enum: SEVERITIES }).notNull().default("info"),
  evidence: text("evidence").notNull().default(""),
  impact: text("impact").notNull().default(""),
  remediation: text("remediation").notNull().default(""),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertFindingSchema = createInsertSchema(findings).omit({ id: true, createdAt: true });
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findings.$inferSelect;
