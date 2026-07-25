import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzleNeon, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Agent, InsertAgent, Task, InsertTask, Message, InsertMessage, UserProfile, InsertUserProfile, Loop, InsertLoop, LoopRun, InsertLoopRun, AgentMemory, InsertMemory, AgentPersona } from "@shared/schema";

// ─── Serverless Postgres (Neon) met een lokale PGlite-fallback ────────────────
// Productie draait op Neon: zet DATABASE_URL naar je Neon-connectionstring en de
// data leeft durable in de cloud (geen vluchtig containerbestand meer). Zonder
// DATABASE_URL valt de app terug op PGlite — een embedded Postgres — zodat lokaal
// ontwikkelen en de testsuite dezelfde Postgres-semantiek gebruiken zonder een
// draaiende server of externe database nodig te hebben.
//
// Beide drivers zijn ASYNC (netwerk resp. WASM), dus de hele storage-laag is
// async. `initStorage()` moet één keer bij het opstarten worden aangeroepen
// vóórdat er queries lopen (zie server/index.ts en de test-setup).

type DB = PgliteDatabase<typeof schema> | NeonDatabase<typeof schema>;

let db: DB;
let initPromise: Promise<void> | null = null;

// ─── Opstartregel: waar landt de database? ────────────────────────────────────
// Zonder DATABASE_URL draait de app op een lokale/vluchtige PGlite. In productie
// gaat dat stíl mis: build, healthcheck en seed slagen alle drie, en pas na een
// redeploy blijkt dat agents, loops, runs, herinneringen en profielen weg zijn.
// Eén regel bij het opstarten maakt dat meteen zichtbaar in de logs.
export interface DbModeNotice {
  level: "log" | "warn";
  message: string;
}

/** Puur en testbaar: welke opstartregel hoort bij deze databasemodus en omgeving? */
export function describeDbMode(hasDatabaseUrl: boolean, dbPath: string, nodeEnv?: string): DbModeNotice | null {
  if (!hasDatabaseUrl && dbPath === ":memory:") return null; // tests — geen ruis
  if (hasDatabaseUrl) {
    return { level: "log", message: `[storage] Neon/Postgres via DATABASE_URL (durable).` };
  }
  if (nodeEnv === "production") {
    return {
      level: "warn",
      message:
        `[storage] PGlite lokaal (${dbPath}) — VLUCHTIG. DATABASE_URL is niet gezet, dus de database ` +
        `staat in de containermap en verdwijnt bij elke redeploy of restart (agents, loops, runs, ` +
        `herinneringen en profielen). Zet DATABASE_URL naar je Neon-connectionstring — zie docs/deployment.md §2.`,
    };
  }
  return { level: "log", message: `[storage] PGlite lokaal (${dbPath}) — DATABASE_URL niet gezet.` };
}

// Idempotente Postgres-DDL. Per statement uitgevoerd zodat beide drivers (Neon
// en PGlite) het identiek verwerken. `CREATE TABLE IF NOT EXISTS` maakt het veilig
// om bij elke start te draaien.
const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    avatar_icon TEXT NOT NULL,
    specialty TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_profile (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter',
    notifications_email BOOLEAN NOT NULL DEFAULT TRUE,
    notifications_push BOOLEAN NOT NULL DEFAULT TRUE,
    notifications_weekly BOOLEAN NOT NULL DEFAULT FALSE,
    language TEXT NOT NULL DEFAULT 'nl'
  )`,
  `CREATE TABLE IF NOT EXISTS loops (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    objective TEXT NOT NULL,
    cadence TEXT NOT NULL DEFAULT 'manual',
    level TEXT NOT NULL DEFAULT 'L1',
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    state TEXT NOT NULL DEFAULT '',
    last_score INTEGER,
    last_verdict TEXT,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS loop_runs (
    id SERIAL PRIMARY KEY,
    loop_id INTEGER NOT NULL,
    maker_output TEXT NOT NULL DEFAULT '',
    verdict TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    critique TEXT NOT NULL DEFAULT '',
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS agent_memories (
    id SERIAL PRIMARY KEY,
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON agent_memories (agent_id)`,
  `CREATE TABLE IF NOT EXISTS agent_personas (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    profile TEXT NOT NULL DEFAULT '',
    memory_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_personas_agent ON agent_personas (agent_id)`,
  // Veilige kolom-migratie voor databases die 'language' nog niet hebben.
  `ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'nl'`,
];

/**
 * Verbindt met de database (Neon als DATABASE_URL gezet is, anders PGlite) en
 * maakt de tabellen aan. Idempotent: een tweede aanroep hergebruikt dezelfde
 * verbinding. Moet vóór het eerste storage-gebruik zijn afgerond.
 */
export function initStorage(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const databaseUrl = process.env.DATABASE_URL;
    const dbPath = process.env.DB_PATH || "data.db";

    const notice = describeDbMode(Boolean(databaseUrl), dbPath, process.env.NODE_ENV);
    if (notice) console[notice.level](notice.message);

    let runDDL: (sql: string) => Promise<unknown>;

    if (databaseUrl) {
      // Productie: serverless Postgres (Neon) over WebSocket. `ws` levert de
      // WebSocket-constructor die de driver in Node nodig heeft.
      const { Pool, neonConfig } = await import("@neondatabase/serverless");
      const ws = (await import("ws")).default;
      neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
      const pool = new Pool({ connectionString: databaseUrl });
      db = drizzleNeon(pool, { schema });
      runDDL = (sql) => pool.query(sql);
    } else {
      // Lokaal/tests: embedded Postgres (PGlite). ":memory:" → vluchtige DB.
      const { PGlite } = await import("@electric-sql/pglite");
      const client = dbPath === ":memory:" ? new PGlite() : new PGlite(`${dbPath}-pg`);
      db = drizzlePglite(client, { schema });
      runDDL = (sql) => client.exec(sql);
    }

    for (const stmt of DDL_STATEMENTS) {
      await runDDL(stmt);
    }
  })();
  return initPromise;
}

export interface IStorage {
  // Agents
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(data: InsertAgent): Promise<Agent>;
  updateAgentStatus(id: number, status: Agent["status"]): Promise<void>;

  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksByAgent(agentId: number): Promise<Task[]>;
  createTask(data: InsertTask): Promise<Task>;
  updateTaskStatus(id: number, status: Task["status"]): Promise<Task | undefined>;

  // Messages
  getMessages(agentId: number): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;

  // Profile
  getProfile(): Promise<UserProfile | undefined>;
  createProfile(data: InsertUserProfile): Promise<UserProfile>;
  updateProfile(id: number, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;

  // Loops
  getLoops(): Promise<Loop[]>;
  getLoop(id: number): Promise<Loop | undefined>;
  getDueLoops(nowIso: string): Promise<Loop[]>;
  createLoop(data: InsertLoop): Promise<Loop>;
  updateLoop(id: number, data: Partial<Loop>): Promise<Loop | undefined>;
  deleteLoop(id: number): Promise<void>;

  // Loop runs
  getLoopRuns(loopId: number, limit?: number): Promise<LoopRun[]>;
  createLoopRun(data: InsertLoopRun): Promise<LoopRun>;

  // Agent memory (L1 atoms)
  getMemories(agentId: number): Promise<AgentMemory[]>;
  getMemory(id: number): Promise<AgentMemory | undefined>;
  createMemory(data: InsertMemory): Promise<AgentMemory>;
  updateMemory(id: number, data: Partial<AgentMemory>): Promise<AgentMemory | undefined>;
  deleteMemory(id: number): Promise<void>;
  deleteMemoriesByAgent(agentId: number): Promise<void>;
  lastProcessedMessageId(agentId: number): Promise<number>;

  // Agent persona (L3)
  getPersona(agentId: number): Promise<AgentPersona | undefined>;
  upsertPersona(agentId: number, profile: string, memoryCount: number): Promise<AgentPersona>;
  deletePersona(agentId: number): Promise<void>;

  // Stats
  getStats(): Promise<{ activeAgents: number; tasksCompleted: number; tasksInProgress: number; teamScore: number }>;
}

export class Storage implements IStorage {
  async getAgents(): Promise<Agent[]> {
    return db.select().from(schema.agents);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const rows = await db.select().from(schema.agents).where(eq(schema.agents.id, id));
    return rows[0];
  }

  async createAgent(data: InsertAgent): Promise<Agent> {
    const rows = await db.insert(schema.agents).values(data).returning();
    return rows[0];
  }

  async updateAgentStatus(id: number, status: Agent["status"]): Promise<void> {
    await db.update(schema.agents).set({ status }).where(eq(schema.agents.id, id));
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(schema.tasks);
  }

  async getTasksByAgent(agentId: number): Promise<Task[]> {
    return db.select().from(schema.tasks).where(eq(schema.tasks.agentId, agentId));
  }

  async createTask(data: InsertTask): Promise<Task> {
    const now = new Date().toISOString();
    const rows = await db.insert(schema.tasks).values({ ...data, createdAt: now }).returning();
    return rows[0];
  }

  async updateTaskStatus(id: number, status: Task["status"]): Promise<Task | undefined> {
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    await db.update(schema.tasks).set({ status, completedAt }).where(eq(schema.tasks.id, id));
    // Also update agent tasks_completed count
    const task = (await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)))[0];
    if (task && status === "completed") {
      const agent = (await db.select().from(schema.agents).where(eq(schema.agents.id, task.agentId)))[0];
      if (agent) {
        await db.update(schema.agents)
          .set({ tasksCompleted: agent.tasksCompleted + 1 })
          .where(eq(schema.agents.id, agent.id));
      }
    }
    return task;
  }

  async getMessages(agentId: number): Promise<Message[]> {
    return db.select().from(schema.messages).where(eq(schema.messages.agentId, agentId));
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const now = new Date().toISOString();
    const rows = await db.insert(schema.messages).values({ ...data, createdAt: now }).returning();
    return rows[0];
  }

  async getProfile(): Promise<UserProfile | undefined> {
    const rows = await db.select().from(schema.userProfile);
    return rows[0];
  }

  async createProfile(data: InsertUserProfile): Promise<UserProfile> {
    const rows = await db.insert(schema.userProfile).values(data).returning();
    return rows[0];
  }

  async updateProfile(id: number, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    await db.update(schema.userProfile).set(data).where(eq(schema.userProfile.id, id));
    return (await db.select().from(schema.userProfile).where(eq(schema.userProfile.id, id)))[0];
  }

  // ─── Loops ──────────────────────────────────────────────────────────────────
  async getLoops(): Promise<Loop[]> {
    return db.select().from(schema.loops);
  }

  async getLoop(id: number): Promise<Loop | undefined> {
    const rows = await db.select().from(schema.loops).where(eq(schema.loops.id, id));
    return rows[0];
  }

  async getDueLoops(nowIso: string): Promise<Loop[]> {
    const all = await this.getLoops();
    return all.filter(
      (l) => l.enabled && l.cadence !== "manual" && l.nextRunAt != null && l.nextRunAt <= nowIso,
    );
  }

  async createLoop(data: InsertLoop): Promise<Loop> {
    const now = new Date().toISOString();
    const rows = await db.insert(schema.loops).values({ ...data, createdAt: now }).returning();
    return rows[0];
  }

  async updateLoop(id: number, data: Partial<Loop>): Promise<Loop | undefined> {
    const { id: _ignore, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      await db.update(schema.loops).set(rest).where(eq(schema.loops.id, id));
    }
    return this.getLoop(id);
  }

  async deleteLoop(id: number): Promise<void> {
    await db.delete(schema.loopRuns).where(eq(schema.loopRuns.loopId, id));
    await db.delete(schema.loops).where(eq(schema.loops.id, id));
  }

  // ─── Loop runs ──────────────────────────────────────────────────────────────
  async getLoopRuns(loopId: number, limit = 20): Promise<LoopRun[]> {
    const rows = await db.select().from(schema.loopRuns).where(eq(schema.loopRuns.loopId, loopId));
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async createLoopRun(data: InsertLoopRun): Promise<LoopRun> {
    const now = new Date().toISOString();
    const rows = await db.insert(schema.loopRuns).values({ ...data, createdAt: now }).returning();
    return rows[0];
  }

  // ─── Agent memory (L1 atoms) ─────────────────────────────────────────────────
  async getMemories(agentId: number): Promise<AgentMemory[]> {
    return db.select().from(schema.agentMemories).where(eq(schema.agentMemories.agentId, agentId));
  }

  async getMemory(id: number): Promise<AgentMemory | undefined> {
    const rows = await db.select().from(schema.agentMemories).where(eq(schema.agentMemories.id, id));
    return rows[0];
  }

  async createMemory(data: InsertMemory): Promise<AgentMemory> {
    const now = new Date().toISOString();
    const rows = await db
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
      .returning();
    return rows[0];
  }

  async updateMemory(id: number, data: Partial<AgentMemory>): Promise<AgentMemory | undefined> {
    const { id: _ignore, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      await db.update(schema.agentMemories).set(rest).where(eq(schema.agentMemories.id, id));
    }
    return this.getMemory(id);
  }

  async deleteMemory(id: number): Promise<void> {
    await db.delete(schema.agentMemories).where(eq(schema.agentMemories.id, id));
  }

  async deleteMemoriesByAgent(agentId: number): Promise<void> {
    await db.delete(schema.agentMemories).where(eq(schema.agentMemories.agentId, agentId));
    await db.delete(schema.agentPersonas).where(eq(schema.agentPersonas.agentId, agentId));
  }

  /** Hoogste message-id dat al in een extractie is verwerkt (0 als er niets is). */
  async lastProcessedMessageId(agentId: number): Promise<number> {
    const mems = await this.getMemories(agentId);
    let max = 0;
    for (const m of mems) {
      if (m.sourceMessageId != null && m.sourceMessageId > max) max = m.sourceMessageId;
    }
    return max;
  }

  // ─── Agent persona (L3) ──────────────────────────────────────────────────────
  async getPersona(agentId: number): Promise<AgentPersona | undefined> {
    const rows = await db.select().from(schema.agentPersonas).where(eq(schema.agentPersonas.agentId, agentId));
    return rows[0];
  }

  async upsertPersona(agentId: number, profile: string, memoryCount: number): Promise<AgentPersona> {
    const now = new Date().toISOString();
    const existing = await this.getPersona(agentId);
    if (existing) {
      await db.update(schema.agentPersonas)
        .set({ profile, memoryCount, updatedAt: now })
        .where(eq(schema.agentPersonas.agentId, agentId));
      return (await this.getPersona(agentId))!;
    }
    const rows = await db
      .insert(schema.agentPersonas)
      .values({ agentId, profile, memoryCount, updatedAt: now })
      .returning();
    return rows[0];
  }

  async deletePersona(agentId: number): Promise<void> {
    await db.delete(schema.agentPersonas).where(eq(schema.agentPersonas.agentId, agentId));
  }

  async getStats(): Promise<{ activeAgents: number; tasksCompleted: number; tasksInProgress: number; teamScore: number }> {
    const allAgents = await this.getAgents();
    const allTasks = await this.getTasks();
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
