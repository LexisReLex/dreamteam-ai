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

// ─── Notifications (gotify-geïnspireerd) ──────────────────────────────────────
// Gotify-model vertaald naar DreamTeam:
//   application (bron van berichten) → `source` (bv. "loop:Nova", "system")
//   message (titel/tekst/priority)   → deze tabel
//   client (realtime ontvanger)      → de browser via WebSocket /api/stream
// Priority volgt de gotify-schaal 0–10 (zie server/notifications.ts voor de buckets).
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull().default("system"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: integer("priority").notNull().default(5),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  // gotify "extras" (client::notification click) → in-app route om heen te springen.
  link: text("link"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Ingest-schema voor de gotify-achtige POST /api/message endpoint.
export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, read: true, createdAt: true })
  .extend({
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    priority: z.number().int().min(0).max(10).optional(),
    source: z.string().min(1).max(80).optional(),
    link: z.string().max(500).nullish(),
  });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
