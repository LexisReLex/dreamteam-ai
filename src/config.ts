import * as fs from "fs";
import * as path from "path";
import type { ModelSpec, BenchConfig, Role, Task } from "./types";

const ROOT = path.resolve(__dirname, "..");

export function loadModels(file = "models.json"): ModelSpec[] {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const models: ModelSpec[] = raw.models;
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error("models.json bevat geen modellen.");
  }
  for (const m of models) {
    if (typeof m.promptPer1M !== "number" || typeof m.completionPer1M !== "number") {
      throw new Error(`Model ${m.id} mist een geldige prijs (promptPer1M/completionPer1M).`);
    }
  }
  return models;
}

export function loadConfig(): BenchConfig {
  const cfg: BenchConfig = JSON.parse(fs.readFileSync(path.join(ROOT, "bench.config.json"), "utf8"));
  const w = cfg.weights;
  const sum = w.quality + w.cost + w.latency;
  if (Math.abs(sum - 1) > 0.001) {
    throw new Error(`Weging in bench.config.json telt op tot ${sum}, moet 1.0 zijn.`);
  }
  return cfg;
}

export function loadRoles(): Map<string, Role> {
  const dir = path.join(ROOT, "roles");
  const roles = new Map<string, Role>();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const slug = file.replace(/\.md$/, "");
    const systemPrompt = fs.readFileSync(path.join(dir, file), "utf8").trim();
    roles.set(slug, { slug, systemPrompt });
  }
  if (roles.size === 0) throw new Error("Geen rollen gevonden in roles/.");
  return roles;
}

export function loadTasks(): Task[] {
  const dir = path.join(ROOT, "tasks");
  const tasks: Task[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const task: Task = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    tasks.push(task);
  }
  if (tasks.length === 0) throw new Error("Geen taken gevonden in tasks/.");
  return tasks;
}

export { ROOT };
