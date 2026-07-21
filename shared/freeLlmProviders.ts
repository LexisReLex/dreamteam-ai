// ─────────────────────────────────────────────────────────────────────────────
// Gratis LLM API-providers — catalogus
//
// Deze dataset is een momentopname (snapshot) van de community-gemaintainde lijst
// "free-llm-api-resources" van cheahjs. De cijfers (rate limits, credits) komen
// RECHTSTREEKS uit de gegenereerde README van die repo — niets is hier verzonnen
// of geschat. Zie SOURCE_URL. Werk deze lijst bij door de bron opnieuw te lezen
// en SNAPSHOT_DATE aan te passen.
//
// Waarom dit in DreamTeam zit: de app draait nu op één betaalde provider
// (Anthropic). Deze catalogus is de kennisbasis waarmee de model-router later
// werk naar een geschikte gratis of goedkope provider kan routeren, in lijn met
// de kostenbewaking (token-budget) die al in server/ai.ts zit.
// ─────────────────────────────────────────────────────────────────────────────

export const SOURCE_URL = "https://github.com/cheahjs/free-llm-api-resources";
/** Datum waarop de cijfers uit de bron zijn overgenomen (YYYY-MM-DD). */
export const SNAPSHOT_DATE = "2026-07-21";

export type ProviderCategory = "free" | "trial";

export interface LlmModel {
  /** Weergavenaam van het model. */
  name: string;
  /** Model-specifieke limieten, letterlijk uit de bron (kan leeg zijn). */
  limits?: string;
}

export interface LlmProvider {
  /** Stabiele slug, bruikbaar als key en in de UI. */
  id: string;
  /** Weergavenaam van de provider. */
  name: string;
  /** Aanmeld-/documentatie-URL. */
  url: string;
  /** "free" = gratis tier, "trial" = eenmalige of tijdelijke tegoeden. */
  category: ProviderCategory;
  /** Account-brede limieten (voor gratis providers), letterlijk uit de bron. */
  limits?: string;
  /** Startkrediet (voor trial-providers), letterlijk uit de bron. */
  credits?: string;
  /** Voorwaarden, bv. telefoonverificatie of opt-in voor training. */
  requirements?: string;
  /** Korte toelichting uit de bron. */
  notes?: string;
  /** Beschikbare modellen (kan een enkele "diverse modellen"-regel zijn). */
  models: LlmModel[];
}

// ─── Gratis providers ─────────────────────────────────────────────────────────

const FREE_PROVIDERS: LlmProvider[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    url: "https://openrouter.ai",
    category: "free",
    limits: "20 requests/minuut · 50 requests/dag · tot 1000 requests/dag met $10 eenmalige topup",
    notes: "Modellen delen een gemeenschappelijk quotum.",
    models: [
      { name: "Hermes 3 Llama 3.1 405B" },
      { name: "Llama 3.2 3B Instruct" },
      { name: "Llama 3.3 70B Instruct" },
      { name: "Dolphin Mistral 24B Venice Edition" },
      { name: "Gemma 4 26B / 31B" },
      { name: "NVIDIA Nemotron 3 (nano/super/ultra) reeks" },
      { name: "OpenAI gpt-oss-20b" },
      { name: "Qwen3 Coder / Qwen3 Next 80B" },
    ],
  },
  {
    id: "google-ai-studio",
    name: "Google AI Studio",
    url: "https://aistudio.google.com",
    category: "free",
    requirements: "Data wordt gebruikt voor training bij gebruik buiten UK/CH/EEA/EU.",
    notes: "Genereuze token-limieten; ideaal voor Gemini Flash en Gemma.",
    models: [
      { name: "Gemini 3.5 Flash", limits: "250.000 tokens/min · 20 requests/dag · 5 requests/min" },
      { name: "Gemini 3 Flash", limits: "250.000 tokens/min · 20 requests/dag · 5 requests/min" },
      { name: "Gemini 3.1 Flash-Lite", limits: "250.000 tokens/min · 500 requests/dag · 15 requests/min" },
      { name: "Gemini 2.5 Flash", limits: "250.000 tokens/min · 20 requests/dag · 5 requests/min" },
      { name: "Gemini 2.5 Flash-Lite", limits: "250.000 tokens/min · 20 requests/dag · 10 requests/min" },
      { name: "Gemma 3 27B / 12B / 4B / 1B Instruct", limits: "15.000 tokens/min · 14.400 requests/dag · 30 requests/min" },
    ],
  },
  {
    id: "nvidia-nim",
    name: "NVIDIA NIM",
    url: "https://build.nvidia.com/explore/discover",
    category: "free",
    limits: "40 requests/minuut",
    requirements: "Telefoonverificatie vereist.",
    notes: "Modellen zijn vaak beperkt in contextvenster.",
    models: [{ name: "Diverse open modellen" }],
  },
  {
    id: "mistral-la-plateforme",
    name: "Mistral (La Plateforme)",
    url: "https://console.mistral.ai/",
    category: "free",
    limits: "Per model: 1 request/seconde · 500.000 tokens/min · 1.000.000.000 tokens/maand",
    requirements: "Gratis tier (Experiment plan) vereist opt-in voor data-training + telefoonverificatie.",
    models: [{ name: "Open en proprietary Mistral-modellen" }],
  },
  {
    id: "mistral-codestral",
    name: "Mistral (Codestral)",
    url: "https://codestral.mistral.ai/",
    category: "free",
    limits: "30 requests/minuut · 2.000 requests/dag",
    requirements: "Momenteel gratis (maandelijks abonnement) · telefoonverificatie vereist.",
    models: [{ name: "Codestral" }],
  },
  {
    id: "huggingface",
    name: "HuggingFace Inference Providers",
    url: "https://huggingface.co/docs/inference-providers/en/index",
    category: "free",
    limits: "$0,10/maand aan credits",
    notes: "Serverless inference beperkt tot modellen kleiner dan 10GB (populaire uitzonderingen).",
    models: [{ name: "Diverse open modellen via ondersteunde providers" }],
  },
  {
    id: "vercel-ai-gateway",
    name: "Vercel AI Gateway",
    url: "https://vercel.com/docs/ai-gateway",
    category: "free",
    limits: "$5/maand",
    notes: "Routeert naar diverse ondersteunde providers.",
    models: [{ name: "Diverse modellen via ondersteunde providers" }],
  },
  {
    id: "opencode-zen",
    name: "OpenCode Zen",
    url: "https://opencode.ai/docs/zen/",
    category: "free",
    notes: "AI-gateway met samengestelde modellen. Gratis modellen gebruiken data mogelijk voor verbetering.",
    models: [
      { name: "Big Pickle Stealth" },
      { name: "Nemotron 3 Super Free" },
      { name: "DeepSeek V4 Flash Free" },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    url: "https://cloud.cerebras.ai/",
    category: "free",
    notes: "Zeer snelle inference.",
    models: [
      { name: "gpt-oss-120b", limits: "30 req/min · 60.000 tokens/min · 14.400 req/dag · 1.000.000 tokens/dag" },
      { name: "Llama 3.1 8B", limits: "30 req/min · 60.000 tokens/min · 14.400 req/dag · 1.000.000 tokens/dag" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    url: "https://console.groq.com",
    category: "free",
    notes: "Zeer snelle inference; genereuze dag-limieten.",
    models: [
      { name: "Llama 3.1 8B", limits: "14.400 requests/dag · 6.000 tokens/min" },
      { name: "Llama 3.3 70B", limits: "1.000 requests/dag · 12.000 tokens/min" },
      { name: "OpenAI gpt-oss-120b / gpt-oss-20b", limits: "1.000 requests/dag · 8.000 tokens/min" },
      { name: "Qwen3.6 27B", limits: "1.000 requests/dag · 8.000 tokens/min" },
      { name: "Whisper Large v3 / v3 Turbo", limits: "2.000 requests/dag" },
      { name: "groq/compound (+mini)", limits: "250 requests/dag · 70.000 tokens/min" },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    url: "https://cohere.com",
    category: "free",
    limits: "20 requests/minuut · 1.000 requests/maand",
    notes: "Modellen delen een gemeenschappelijk maandelijks quotum.",
    models: [
      { name: "command-a-03-2025" },
      { name: "command-a-reasoning-08-2025" },
      { name: "command-a-vision-07-2025" },
      { name: "command-r-08-2024 / command-r-plus-08-2024" },
      { name: "command-r7b-12-2024" },
      { name: "c4ai-aya-expanse-32b / aya-vision-32b" },
    ],
  },
  {
    id: "github-models",
    name: "GitHub Models",
    url: "https://github.com/marketplace/models",
    category: "free",
    limits: "Afhankelijk van Copilot-abonnement (Free/Pro/Pro+/Business/Enterprise)",
    notes: "Zeer restrictieve input/output token-limieten.",
    models: [
      { name: "OpenAI gpt-5 / gpt-5-mini / gpt-5-nano" },
      { name: "OpenAI GPT-4.1 / GPT-4o (+mini)" },
      { name: "OpenAI o1 / o3 / o4-mini reeks" },
      { name: "DeepSeek-R1 / DeepSeek-V3-0324" },
      { name: "Llama 4 Maverick / Scout · Llama 3.3 70B" },
      { name: "Mistral Medium 3 / Small 3.1 · Ministral 3B" },
      { name: "Phi-4 reeks" },
    ],
  },
  {
    id: "cloudflare-workers-ai",
    name: "Cloudflare Workers AI",
    url: "https://developers.cloudflare.com/workers-ai",
    category: "free",
    limits: "10.000 neurons/dag",
    models: [
      { name: "Llama 3.3 70B Instruct (FP8) · Llama 3.1 8B Instruct" },
      { name: "Llama 4 Scout Instruct · Llama 3.2 (1B/3B/11B Vision)" },
      { name: "OpenAI gpt-oss-120b / gpt-oss-20b" },
      { name: "Qwen 2.5 Coder 32B · Qwen QwQ 32B · Qwen3 30B" },
      { name: "Mistral Small 3.1 24B · Gemma 4 26B" },
      { name: "DeepSeek R1 Distill Qwen 32B" },
    ],
  },
];

// ─── Providers met proeftegoed (trial credits) ────────────────────────────────

const TRIAL_PROVIDERS: LlmProvider[] = [
  {
    id: "fireworks",
    name: "Fireworks",
    url: "https://fireworks.ai/",
    category: "trial",
    credits: "$1",
    models: [{ name: "Diverse open modellen" }],
  },
  {
    id: "baseten",
    name: "Baseten",
    url: "https://app.baseten.co/",
    category: "trial",
    credits: "$30",
    models: [{ name: "Elk ondersteund model — betalen per compute-tijd" }],
  },
  {
    id: "nebius",
    name: "Nebius",
    url: "https://tokenfactory.nebius.com/",
    category: "trial",
    credits: "$1",
    models: [{ name: "Diverse open modellen" }],
  },
  {
    id: "novita",
    name: "Novita",
    url: "https://novita.ai/",
    category: "trial",
    credits: "$0,50 voor 1 jaar",
    models: [{ name: "Diverse open modellen" }],
  },
  {
    id: "ai21",
    name: "AI21",
    url: "https://studio.ai21.com/",
    category: "trial",
    credits: "$10 voor 3 maanden",
    models: [{ name: "Jamba-modellenfamilie" }],
  },
  {
    id: "upstage",
    name: "Upstage",
    url: "https://console.upstage.ai/",
    category: "trial",
    credits: "$10 voor 3 maanden",
    models: [{ name: "Solar Pro / Mini" }],
  },
  {
    id: "nlpcloud",
    name: "NLP Cloud",
    url: "https://nlpcloud.com/home",
    category: "trial",
    credits: "$15",
    requirements: "Telefoonverificatie vereist.",
    models: [{ name: "Diverse open modellen" }],
  },
  {
    id: "alibaba-model-studio",
    name: "Alibaba Cloud Model Studio",
    url: "https://bailian.console.alibabacloud.com/",
    category: "trial",
    credits: "1 miljoen tokens per model",
    models: [{ name: "Diverse open en proprietary Qwen-modellen" }],
  },
  {
    id: "modal",
    name: "Modal",
    url: "https://modal.com",
    category: "trial",
    credits: "$5/maand bij aanmelden · $30/maand met betaalmethode",
    models: [{ name: "Elk ondersteund model — betalen per compute-tijd" }],
  },
  {
    id: "inference-net",
    name: "Inference.net",
    url: "https://inference.net",
    category: "trial",
    credits: "$1 · $25 bij invullen e-mailenquête",
    models: [{ name: "Diverse open modellen" }],
  },
  {
    id: "hyperbolic",
    name: "Hyperbolic",
    url: "https://app.hyperbolic.ai/",
    category: "trial",
    credits: "$1",
    models: [
      { name: "DeepSeek V3 0324 · DeepSeek R1 0528" },
      { name: "Llama 3.3 70B Instruct" },
      { name: "Qwen3 Coder 480B" },
    ],
  },
  {
    id: "sambanova",
    name: "SambaNova Cloud",
    url: "https://cloud.sambanova.ai/",
    category: "trial",
    credits: "$5 voor 3 maanden",
    models: [
      { name: "DeepSeek V3.1 / V3.2" },
      { name: "Llama 3.3 70B Instruct · Gemma 4 31B" },
      { name: "gpt-oss-120b · MiniMax M2.7" },
    ],
  },
  {
    id: "scaleway",
    name: "Scaleway Generative APIs",
    url: "https://console.scaleway.com/generative-api/models",
    category: "trial",
    credits: "1.000.000 gratis tokens",
    models: [
      { name: "Llama 3.3 70B Instruct · Gemma 3 27B" },
      { name: "Mistral Medium 3.5 · Small 3.2 24B · Devstral 2" },
      { name: "Qwen3 235B / Coder 30B · GLM 5.2 · gpt-oss-120b" },
      { name: "Whisper Large v3 · Voxtral Small 24B · Pixtral 12B" },
    ],
  },
];

/** Volledige catalogus: gratis providers eerst, dan trial-providers. */
export const LLM_PROVIDERS: LlmProvider[] = [...FREE_PROVIDERS, ...TRIAL_PROVIDERS];

export function getFreeProviders(): LlmProvider[] {
  return LLM_PROVIDERS.filter((p) => p.category === "free");
}

export function getTrialProviders(): LlmProvider[] {
  return LLM_PROVIDERS.filter((p) => p.category === "trial");
}

export function getProviderById(id: string): LlmProvider | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}

/** Samenvattende tellingen voor de UI-header en het API-antwoord. */
export function getProviderSummary() {
  const free = getFreeProviders();
  const trial = getTrialProviders();
  return {
    total: LLM_PROVIDERS.length,
    free: free.length,
    trial: trial.length,
    models: LLM_PROVIDERS.reduce((n, p) => n + p.models.length, 0),
    source: SOURCE_URL,
    snapshotDate: SNAPSHOT_DATE,
  };
}
