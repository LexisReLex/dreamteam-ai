import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Agent, InsertAgent, Task, InsertTask, Message, InsertMessage, UserProfile, InsertUserProfile, Loop, InsertLoop, LoopRun, InsertLoopRun, Scan, Finding, InsertFinding } from "@shared/schema";

// Databasepad is configureerbaar via DB_PATH zodat je op Railway (of elders) een
// persistent volume kunt mounten — bv. DB_PATH=/data/dreamteam.db. Zonder een
// volume is SQLite vluchtig: loops, runs en state overleven een redeploy niet.
const DB_PATH = process.env.DB_PATH || "data.db";
// Zorg dat de map bestaat (bv. een net gemount /data-volume met subdir).
try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch { /* map bestaat al of is cwd */ }

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

  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT '',
    agent_ids TEXT NOT NULL DEFAULT '[]',
    level TEXT NOT NULL DEFAULT 'L1',
    status TEXT NOT NULL DEFAULT 'pending',
    risk_score INTEGER,
    risk_band TEXT,
    summary TEXT NOT NULL DEFAULT '',
    confirmed_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'info',
    evidence TEXT NOT NULL DEFAULT '',
    impact TEXT NOT NULL DEFAULT '',
    remediation TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

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

  // Scans
  getScans(): Scan[];
  getScan(id: number): Scan | undefined;
  createScan(data: { name: string; target: string; scope: string; agentIds: string; level: Scan["level"] }): Scan;
  updateScan(id: number, data: Partial<Scan>): Scan | undefined;
  deleteScan(id: number): void;

  // Findings
  getFindings(scanId: number): Finding[];
  createFinding(data: InsertFinding): Finding;
  replaceFindings(scanId: number, findings: InsertFinding[]): void;

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

  // ─── Scans ──────────────────────────────────────────────────────────────────
  getScans(): Scan[] {
    return db.select().from(schema.scans).all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getScan(id: number): Scan | undefined {
    return db.select().from(schema.scans).where(eq(schema.scans.id, id)).get();
  }

  createScan(data: { name: string; target: string; scope: string; agentIds: string; level: Scan["level"] }): Scan {
    const now = new Date().toISOString();
    return db.insert(schema.scans).values({ ...data, createdAt: now }).returning().get();
  }

  updateScan(id: number, data: Partial<Scan>): Scan | undefined {
    const { id: _ignore, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      db.update(schema.scans).set(rest).where(eq(schema.scans.id, id)).run();
    }
    return this.getScan(id);
  }

  deleteScan(id: number): void {
    db.delete(schema.findings).where(eq(schema.findings.scanId, id)).run();
    db.delete(schema.scans).where(eq(schema.scans.id, id)).run();
  }

  // ─── Findings ───────────────────────────────────────────────────────────────
  getFindings(scanId: number): Finding[] {
    return db.select().from(schema.findings).where(eq(schema.findings.scanId, scanId)).all();
  }

  createFinding(data: InsertFinding): Finding {
    const now = new Date().toISOString();
    return db.insert(schema.findings).values({ ...data, createdAt: now }).returning().get();
  }

  // Vervangt alle bevindingen van een scan atomair (een scan-run herschrijft het rapport).
  replaceFindings(scanId: number, items: InsertFinding[]): void {
    const now = new Date().toISOString();
    db.transaction((tx) => {
      tx.delete(schema.findings).where(eq(schema.findings.scanId, scanId)).run();
      for (const row of items) {
        tx.insert(schema.findings).values({ ...row, createdAt: now }).run();
      }
    });
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
