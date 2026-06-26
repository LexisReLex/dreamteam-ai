import type OpenAI from "openai";
import type { ModelSpec, BenchConfig, Role, Task, RunResult } from "./types";
import { costFromUsage } from "./cost";

export interface Combo {
  role: Role;
  task: Task;
  model: ModelSpec;
}

export function buildCombos(roles: Map<string, Role>, tasks: Task[], models: ModelSpec[]): Combo[] {
  const combos: Combo[] = [];
  for (const task of tasks) {
    const role = roles.get(task.role);
    if (!role) {
      throw new Error(`Taak ${task.id} verwijst naar onbekende rol "${task.role}".`);
    }
    for (const model of models) {
      combos.push({ role, task, model });
    }
  }
  return combos;
}

export async function runCombo(
  client: OpenAI,
  combo: Combo,
  cfg: BenchConfig
): Promise<RunResult> {
  const { role, task, model } = combo;
  const base: RunResult = {
    taskId: task.id,
    role: role.slug,
    modelId: model.id,
    modelLabel: model.label,
    output: "",
    latencyMs: 0,
    usage: { promptTokens: 0, completionTokens: 0 },
    costUsd: 0,
  };

  const started = Date.now();
  try {
    const resp = await client.chat.completions.create({
      model: model.id,
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
      messages: [
        { role: "system", content: role.systemPrompt },
        { role: "user", content: task.prompt },
      ],
    });
    const latencyMs = Date.now() - started;
    const usage = {
      promptTokens: resp.usage?.prompt_tokens ?? 0,
      completionTokens: resp.usage?.completion_tokens ?? 0,
    };
    const msg = resp.choices[0]?.message as { content?: string; reasoning?: string } | undefined;
    // Sommige reasoning-modellen leveren lege content met de tekst in een apart reasoning-veld.
    const output = msg?.content?.trim() ? msg.content : msg?.reasoning ?? "";
    return {
      ...base,
      output,
      latencyMs,
      usage,
      costUsd: costFromUsage(usage, model),
    };
  } catch (err) {
    return {
      ...base,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
