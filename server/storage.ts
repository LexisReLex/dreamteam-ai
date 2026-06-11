import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Agent, InsertAgent, Task, InsertTask, Message, InsertMessage, UserProfile, InsertUserProfile } from "@shared/schema";

const sqlite = new Database("data.db");
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
