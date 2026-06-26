export interface ModelSpec {
  id: string;            // OpenRouter slug
  label: string;         // leesbare naam in rapport
  promptPer1M: number;   // USD per 1M prompt-tokens
  completionPer1M: number; // USD per 1M completion-tokens
}

export interface Weights {
  quality: number;
  cost: number;
  latency: number;
}

export interface BenchConfig {
  weights: Weights;
  judgeModel: string;
  judgePromptPer1M: number;
  judgeCompletionPer1M: number;
  concurrency: number;
  maxTokens: number;
  temperature: number;
}

export interface Role {
  slug: string;
  systemPrompt: string;
}

export interface Task {
  example: boolean;
  id: string;
  role: string;   // role slug
  title: string;
  prompt: string;
  rubric?: string; // beoordelingscriteria; alleen de jury ziet dit, niet de kandidaat (anti-gaming)
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
}

export interface RunResult {
  taskId: string;
  role: string;
  modelId: string;
  modelLabel: string;
  output: string;
  latencyMs: number;
  usage: Usage;
  costUsd: number;
  error?: string;
}

export interface JudgeScore {
  taakvervulling: number;   // 0-10
  correctheid: number;      // 0-10
  instructieNaleving: number; // 0-10
  bondigheid: number;       // 0-10
  overall: number;          // 0-10
  motivatie: string;
}

export interface ScoredResult extends RunResult {
  judge: JudgeScore;
  qualityScore: number;   // 0-1
  costScore: number;      // 0-1 (goedkoper = hoger)
  latencyScore: number;   // 0-1 (sneller = hoger)
  total: number;          // 0-1 gewogen
}
