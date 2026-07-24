import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Agent, InsertAgent, Task, InsertTask, Message, InsertMessage, UserProfile, InsertUserProfile, Loop, InsertLoop, LoopRun, InsertLoopRun, AgentMemory, InsertMemory, AgentPersona } from "@shared/schema";

// Databasepad is configureerbaar via DB_PATH zodat je op Railway (of elders) een
// persistent volume kunt mounten — bv. DB_PATH=/data/dreamteam.db. Zonder een
// volume is SQLite vluchtig: loops, runs en state overleven een redeploy niet.
const DB_PATH = process.env.DB_PATH || "data.db";
// Zorg dat de map bestaat (bv. een net gemount /data-volume met subdir).
try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch { /* map bestaat al of is cwd */ }

// ─── Opstartregel: waar landt de database? ────────────────────────────────────
// Zonder DB_PATH schrijft SQLite naar de containermap en is alles vluchtig. Dat
// gaat vandaag stíl mis: build, healthcheck en seed slagen alle drie, en pas na
// een redeploy blijkt dat agents, loops, runs, herinneringen en profielen weg
// zijn. Eén regel bij het opstarten maakt dat meteen zichtbaar in de logs.
export interface DbPathNotice {
  level: "log" | "warn";
  message: string;
}

/** Puur en testbaar: welke opstartregel hoort bij dit pad en deze omgeving? */
export function describeDbPath(path: string, explicit: boolean, nodeEnv?: string): DbPathNotice | null {
  if (path === ":memory:") return null; // tests — geen ruis
  if (explicit) {
    return { level: "log", message: `[storage] SQLite: ${path} (pad uit DB_PATH)` };
  }
  if (nodeEnv === "production") {
    return {
      level: "warn",
      message:
        `[storage] SQLite: ${path} — VLUCHTIG. DB_PATH is niet gezet, dus de database staat in de ` +
        `containermap en verdwijnt bij elke redeploy of restart (agents, loops, runs, herinneringen ` +
        `en profielen). Mount een volume op /data en zet DB_PATH=/data/dreamteam.db — zie docs/deployment.md §2.`,
    };
  }
  return { level: "log", message: `[storage] SQLite: ${path} (lokaal — DB_PATH niet gezet)` };
}

const dbNotice = describeDbPath(DB_PATH, Boolean(process.env.DB_PATH), process.env.NODE_ENV);
if (dbNotice) console[dbNotice.level](dbNotice.message);

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });

// Enable WAL mode for performance
sqlite.pragma("journal_mode = WAL");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    avatar_icon TEXT NOT NULL,
    specialty TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter',
    notifications_email INTEGER NOT NULL DEFAULT 1,
    notifications_push INTEGER NOT NULL DEFAULT 1,
    notifications_weekly INTEGER NOT NULL DEFAULT 0,
    language TEXT NOT NULL DEFAULT 'nl'
  );

  CREATE TABLE IF NOT EXISTS loops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    objective TEXT NOT NULL,
    cadence TEXT NOT NULL DEFAULT 'manual',
    level TEXT NOT NULL DEFAULT 'L1',
    enabled INTEGER NOT NULL DEFAULT 0,
    state TEXT NOT NULL DEFAULT '',
    last_score INTEGER,
    last_verdict TEXT,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loop_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loop_id INTEGER NOT NULL,
    maker_output TEXT NOT NULL DEFAULT '',
    verdict TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    critique TEXT NOT NULL DEFAULT '',
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    layer TEXT NOT NULL DEFAULT 'L1',
    kind TEXT NOT NULL DEFAULT 'fact',
    content TEXT NOT NULL,
    keywords TEXT NOT NULL DEFAULT '',
    salience INTEGER NOT NULL DEFAULT 50,
    source_message_id INTEGER,
    use_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_used_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON agent_memories (agent_id);

  CREATE TABLE IF NOT EXISTS agent_personas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    profile TEXT NOT NULL DEFAULT '',
    memory_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_personas_agent ON agent_personas (agent_id);

`);

// Safe migration: add language column if not exists
try { sqlite.exec("ALTER TABLE user_profile ADD COLUMN language TEXT NOT NULL DEFAULT 'nl'"); } catch (_) { /* column already exists */ }

export interface IStorage {
  // Agents
  getAgents(): Agent[];
  getAgent(id: number): Agent | undefined;
  createAgent(data: InsertAgent): Agent;
  updateAgentStatus(id: number, status: Agent["status"]): void;

  // Tasks
  getTasks(): Task[];
  getTasksByAgent(agentId: number): Task[];
  createTask(data: InsertTask): Task;
  updateTaskStatus(id: number, status: Task["status"]): Task | undefined;

  // Messages
  getMessages(agentId: number): Message[];
  createMessage(data: InsertMessage): Message;

  // Profile
  getProfile(): UserProfile | undefined;
  createProfile(data: InsertUserProfile): UserProfile;
  updateProfile(id: number, data: Partial<InsertUserProfile>): UserProfile | undefined;

  // Loops
  getLoops(): Loop[];
  getLoop(id: number): Loop | undefined;
  getDueLoops(nowIso: string): Loop[];
  createLoop(data: InsertLoop): Loop;
  updateLoop(id: number, data: Partial<Loop>): Loop | undefined;
  deleteLoop(id: number): void;

  // Loop runs
  getLoopRuns(loopId: number, limit?: number): LoopRun[];
  createLoopRun(data: InsertLoopRun): LoopRun;

  // Agent memory (L1 atoms)
  getMemories(agentId: number): AgentMemory[];
  getMemory(id: number): AgentMemory | undefined;
  createMemory(data: InsertMemory): AgentMemory;
  updateMemory(id: number, data: Partial<AgentMemory>): AgentMemory | undefined;
  deleteMemory(id: number): void;
  deleteMemoriesByAgent(agentId: number): void;
  lastProcessedMessageId(agentId: number): number;

  // Agent persona (L3)
  getPersona(agentId: number): AgentPersona | undefined;
  upsertPersona(agentId: number, profile: string, memoryCount: number): AgentPersona;
  deletePersona(agentId: number): void;

  // Stats
  getStats(): { activeAgents: number; tasksCompleted: number; tasksInProgress: number; teamScore: number };
}

export class Storage implements IStorage {
  getAgents(): Agent[] {
    return db.select().from(schema.agents).all();
  }

  getAgent(id: number): Agent | undefined {
    return db.select().from(schema.agents).where(eq(schema.agents.id, id)).get();
  }

  createAgent(data: InsertAgent): Agent {
    return db.insert(schema.agents).values(data).returning().get();
  }

  updateAgentStatus(id: number, status: Agent["status"]): void {
    db.update(schema.agents).set({ status }).where(eq(schema.agents.id, id)).run();
  }

  getTasks(): Task[] {
    return db.select().from(schema.tasks).all();
  }

  getTasksByAgent(agentId: number): Task[] {
    return db.select().from(schema.tasks).where(eq(schema.tasks.agentId, agentId)).all();
  }

  createTask(data: InsertTask): Task {
    const now = new Date().toISOString();
    return db.insert(schema.tasks).values({ ...data, createdAt: now }).returning().get();
  }

  updateTaskStatus(id: number, status: Task["status"]): Task | undefined {
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    db.update(schema.tasks).set({ status, completedAt }).where(eq(schema.tasks.id, id)).run();
    // Also update agent tasks_completed count
    const task = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    if (task && status === "completed") {
      const agent = db.select().from(schema.agents).where(eq(schema.agents.id, task.agentId)).get();
      if (agent) {
        db.update(schema.agents)
          .set({ tasksCompleted: agent.tasksCompleted + 1 })
          .where(eq(schema.agents.id, agent.id))
          .run();
      }
    }
    return task;
  }

  getMessages(agentId: number): Message[] {
    return db.select().from(schema.messages).where(eq(schema.messages.agentId, agentId)).all();
  }

  createMessage(data: InsertMessage): Message {
    const now = new Date().toISOString();
    return db.insert(schema.messages).values({ ...data, createdAt: now }).returning().get();
  }

  getProfile(): UserProfile | undefined {
    return db.select().from(schema.userProfile).get();
  }

  createProfile(data: InsertUserProfile): UserProfile {
    return db.insert(schema.userProfile).values(data).returning().get();
  }

  updateProfile(id: number, data: Partial<InsertUserProfile>): UserProfile | undefined {
    db.update(schema.userProfile).set(data).where(eq(schema.userProfile.id, id)).run();
    return db.select().from(schema.userProfile).where(eq(schema.userProfile.id, id)).get();
  }

  // ─── Loops ──────────────────────────────────────────────────────────────────
  getLoops(): Loop[] {
    return db.select().from(schema.loops).all();
  }

  getLoop(id: number): Loop | undefined {
    return db.select().from(schema.loops).where(eq(schema.loops.id, id)).get();
  }

  getDueLoops(nowIso: string): Loop[] {
    return this.getLoops().filter(
      (l) => l.enabled && l.cadence !== "manual" && l.nextRunAt != null && l.nextRunAt <= nowIso,
    );
  }

  createLoop(data: InsertLoop): Loop {
    const now = new Date().toISOString();
    return db.insert(schema.loops).values({ ...data, createdAt: now }).returning().get();
  }

  updateLoop(id: number, data: Partial<Loop>): Loop | undefined {
    const { id: _ignore, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      db.update(schema.loops).set(rest).where(eq(schema.loops.id, id)).run();
    }
    return this.getLoop(id);
  }

  deleteLoop(id: number): void {
    db.delete(schema.loopRuns).where(eq(schema.loopRuns.loopId, id)).run();
    db.delete(schema.loops).where(eq(schema.loops.id, id)).run();
  }

  // ─── Loop runs ──────────────────────────────────────────────────────────────
  getLoopRuns(loopId: number, limit = 20): LoopRun[] {
    return db
      .select()
      .from(schema.loopRuns)
      .where(eq(schema.loopRuns.loopId, loopId))
      .all()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  createLoopRun(data: InsertLoopRun): LoopRun {
    const now = new Date().toISOString();
    return db.insert(schema.loopRuns).values({ ...data, createdAt: now }).returning().get();
  }

  // ─── Agent memory (L1 atoms) ─────────────────────────────────────────────────
  getMemories(agentId: number): AgentMemory[] {
    return db
      .select()
      .from(schema.agentMemories)
      .where(eq(schema.agentMemories.agentId, agentId))
      .all();
  }

  getMemory(id: number): AgentMemory | undefined {
    return db.select().from(schema.agentMemories).where(eq(schema.agentMemories.id, id)).get();
  }

  createMemory(data: InsertMemory): AgentMemory {
    const now = new Date().toISOString();
    return db
      .insert(schema.agentMemories)
      .values({
        agentId: data.agentId,
        layer: data.layer ?? "L1",
        kind: data.kind ?? "fact",
        content: data.content,
        keywords: data.keywords ?? "",
        salience: data.salience ?? 50,
        sourceMessageId: data.sourceMessageId ?? null,
        createdAt: now,
      })
      .returning()
      .get();
  }

  updateMemory(id: number, data: Partial<AgentMemory>): AgentMemory | undefined {
    const { id: _ignore, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      db.update(schema.agentMemories).set(rest).where(eq(schema.agentMemories.id, id)).run();
    }
    return this.getMemory(id);
  }

  deleteMemory(id: number): void {
    db.delete(schema.agentMemories).where(eq(schema.agentMemories.id, id)).run();
  }

  deleteMemoriesByAgent(agentId: number): void {
    db.delete(schema.agentMemories).where(eq(schema.agentMemories.agentId, agentId)).run();
    db.delete(schema.agentPersonas).where(eq(schema.agentPersonas.agentId, agentId)).run();
  }

  /** Hoogste message-id dat al in een extractie is verwerkt (0 als er niets is). */
  lastProcessedMessageId(agentId: number): number {
    const mems = this.getMemories(agentId);
    let max = 0;
    for (const m of mems) {
      if (m.sourceMessageId != null && m.sourceMessageId > max) max = m.sourceMessageId;
    }
    return max;
  }

  // ─── Agent persona (L3) ──────────────────────────────────────────────────────
  getPersona(agentId: number): AgentPersona | undefined {
    return db.select().from(schema.agentPersonas).where(eq(schema.agentPersonas.agentId, agentId)).get();
  }

  upsertPersona(agentId: number, profile: string, memoryCount: number): AgentPersona {
    const now = new Date().toISOString();
    const existing = this.getPersona(agentId);
    if (existing) {
      db.update(schema.agentPersonas)
        .set({ profile, memoryCount, updatedAt: now })
        .where(eq(schema.agentPersonas.agentId, agentId))
        .run();
      return this.getPersona(agentId)!;
    }
    return db
      .insert(schema.agentPersonas)
      .values({ agentId, profile, memoryCount, updatedAt: now })
      .returning()
      .get();
  }

  deletePersona(agentId: number): void {
    db.delete(schema.agentPersonas).where(eq(schema.agentPersonas.agentId, agentId)).run();
  }

  getStats(): { activeAgents: number; tasksCompleted: number; tasksInProgress: number; teamScore: number } {
    const allAgents = this.getAgents();
    const allTasks = this.getTasks();
    const activeAgents = allAgents.filter(a => a.status === "active" || a.status === "busy").length;
    const tasksCompleted = allTasks.filter(t => t.status === "completed").length;
    const tasksInProgress = allTasks.filter(t => t.status === "in_progress").length;
    // Team score: a meaningful metric from 0-100 based on tasks done and active agents
    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 60 : 0;
    const activeRate = allAgents.length > 0 ? (activeAgents / allAgents.length) * 40 : 0;
    const teamScore = Math.round(completionRate + activeRate);
    return { activeAgents, tasksCompleted, tasksInProgress, teamScore };
  }
}

export const storage = new Storage();
