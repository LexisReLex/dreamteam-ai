import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, CheckCircle, Clock, AlertCircle, Loader2, Zap, Brain, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { getLucideIcon } from "@/lib/icons";
import type { Agent, Message, Task, AgentMemory, AgentPersona } from "@shared/schema";
import { useLanguage } from "@/lib/LanguageContext";

interface TaskWithAgent extends Task {
  agent?: Agent;
}

interface MemoryResponse {
  persona: AgentPersona | null;
  memories: AgentMemory[];
  count: number;
}

// Vertaalsleutel per soort herinnering — het label zelf komt uit t(), zodat het
// geheugenblok dezelfde taal spreekt als de rest van de pagina.
const MEMORY_KIND_KEY = {
  fact: "memory_kind_fact",
  preference: "memory_kind_preference",
  goal: "memory_kind_goal",
  context: "memory_kind_context",
} as const;

const MEMORY_KIND_COLOR: Record<string, string> = {
  fact: "text-blue-300 bg-blue-400/10 border-blue-400/20",
  preference: "text-purple-300 bg-purple-400/10 border-purple-400/20",
  goal: "text-green-300 bg-green-400/10 border-green-400/20",
  context: "text-yellow-300 bg-yellow-400/10 border-yellow-400/20",
};

const STATUS_CFG = {
  pending:     { icon: Clock,        color: "text-yellow-400", bg: "bg-yellow-400/10" },
  in_progress: { icon: Loader2,      color: "text-blue-400",   bg: "bg-blue-400/10"   },
  completed:   { icon: CheckCircle,  color: "text-green-400",  bg: "bg-green-400/10"  },
  failed:      { icon: AlertCircle,  color: "text-red-400",    bg: "bg-red-400/10"    },
};

// capabilities resolved via i18n inside component

export default function AgentDetail() {
  const { t, tArr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const agentId = parseInt(id || "0");
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: agent, isLoading: agentLoading } = useQuery<Agent>({
    queryKey: ["/api/agents", agentId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${agentId}`);
      return res.json();
    },
  });

  const { data: messages, isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", agentId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/messages/${agentId}`);
      return res.json();
    },
  });

  const { data: allTasks } = useQuery<TaskWithAgent[]>({ queryKey: ["/api/tasks"] });
  const agentTasks = allTasks?.filter((t) => t.agentId === agentId) ?? [];

  // ─── Agent Memory (gelaagd geheugen) ─────────────────────────────────────────
  const { data: memory } = useQuery<MemoryResponse>({
    queryKey: ["/api/agents", agentId, "memory"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${agentId}/memory`);
      return res.json();
    },
  });
  const invalidateMemory = () => qc.invalidateQueries({ queryKey: ["/api/agents", agentId, "memory"] });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", { agentId, role: "user", content });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/messages", agentId] });
      // Geheugen kan op de achtergrond bijgewerkt zijn — ververs even later.
      setTimeout(invalidateMemory, 1500);
    },
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/agents/${agentId}/memory/extract`, {});
      return res.json();
    },
    onSuccess: invalidateMemory,
  });

  const forgetMutation = useMutation({
    mutationFn: async (memId: number) => {
      await apiRequest("DELETE", `/api/agents/${agentId}/memory/${memId}`);
    },
    onSuccess: invalidateMemory,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const IconComponent = agent ? getLucideIcon(agent.avatarIcon) : null;
  const capKeyMap: Record<string, string> = { marketing:"cap_marketing", sales:"cap_sales", content:"cap_content", support:"cap_support", finance:"cap_finance", analytics:"cap_analytics", hr:"cap_hr", strategy:"cap_strategy" };
  const capKey = agent ? (capKeyMap[agent.category] || "cap_marketing") : "cap_marketing";

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">{t("agent_not_found")}</p>
        <Link href="/agents" className="text-primary hover:underline">{t("back_to_agents_link")}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden mesh-bg grid-pattern">
      {/* Left panel */}
      <div className="w-full md:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r border-[rgba(59,130,246,0.1)] flex flex-col overflow-y-auto p-5 gap-5 bg-[rgba(6,11,24,0.6)] md:max-h-full max-h-[45vh]">
        <Link href="/agents" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground" data-testid="link-back-agents">
          <ArrowLeft className="w-3.5 h-3.5" />
          Terug naar team
        </Link>

        {/* Agent info */}
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${agent.avatarColor}40, ${agent.avatarColor}20)`,
              border: `2px solid ${agent.avatarColor}60`,
              boxShadow: `0 0 24px ${agent.avatarColor}30`,
            }}
            data-testid="agent-avatar"
          >
            {IconComponent && <IconComponent className="w-7 h-7" style={{ color: agent.avatarColor }} />}
          </div>
          <div>
            <h2 className="font-bold text-base" style={{ fontFamily: "'Clash Display', sans-serif" }}>{agent.name}</h2>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <div
                className={cn("w-1.5 h-1.5 rounded-full",
                  agent.status === "active" ? "bg-green-400 status-active" :
                  agent.status === "busy" ? "bg-blue-400" : "bg-yellow-400"
                )}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {agent.status === "active" ? t("agent_status_active") : agent.status === "busy" ? t("agent_status_busy") : t("agent_status_idle")}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="glass-card rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
          {agent.description}
        </div>

        {/* Capabilities */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold">Specialiteiten</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tArr(capKey as any).map((cap) => (
              <span
                key={cap}
                className="px-2 py-1 rounded-md text-xs text-muted-foreground bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Task history */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-semibold">Recente taken</span>
          </div>
          {agentTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nog geen taken</p>
          ) : (
            <div className="space-y-2">
              {agentTasks.slice(0, 4).map((task) => {
                const sc = STATUS_CFG[task.status as keyof typeof STATUS_CFG];
                const StatusIcon = sc.icon;
                const statusLabelMap: Record<string, string> = { pending: t("status_pending"), in_progress: t("status_in_progress"), completed: t("status_completed"), failed: t("status_failed") };
                return (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)]" data-testid={`task-item-${task.id}`}>
                    <StatusIcon className={cn("w-3.5 h-3.5 flex-shrink-0", sc.color, task.status === "in_progress" && "animate-spin")} />
                    <span className="text-xs truncate">{task.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent memory — gelaagd geheugen (persona L3 + herinneringen L1) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold">{t("memory_title")}</span>
              {memory && memory.count > 0 && (
                <span className="text-[10px] text-muted-foreground">({memory.count})</span>
              )}
            </div>
            <button
              onClick={() => extractMutation.mutate()}
              disabled={extractMutation.isPending}
              className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
              title={t("memory_extract_now")}
              data-testid="button-extract-memory"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", extractMutation.isPending && "animate-spin")} />
            </button>
          </div>

          {/* Persona-profiel (L3) */}
          {memory?.persona?.profile?.trim() && (
            <div className="glass-card rounded-xl p-3 mb-3 text-xs text-muted-foreground leading-relaxed" data-testid="memory-persona">
              <span className="text-[10px] uppercase tracking-wide text-primary/80 font-semibold">{t("memory_profile")}</span>
              <p className="mt-1">{memory.persona.profile}</p>
            </div>
          )}

          {/* Atomaire herinneringen (L1) */}
          {!memory || memory.count === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("memory_empty", { name: agent.name })}
            </p>
          ) : (
            <div className="space-y-2">
              {memory.memories.slice(0, 8).map((m) => (
                <div
                  key={m.id}
                  className="group flex items-start gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)]"
                  data-testid={`memory-item-${m.id}`}
                >
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] border flex-shrink-0 mt-0.5", MEMORY_KIND_COLOR[m.kind] || MEMORY_KIND_COLOR.fact)}>
                    {t(MEMORY_KIND_KEY[m.kind] ?? "memory_kind_fact")}
                  </span>
                  <span className="text-xs text-muted-foreground flex-1 leading-snug">{m.content}</span>
                  <button
                    onClick={() => forgetMutation.mutate(m.id)}
                    className="text-muted-foreground/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title={t("memory_forget")}
                    data-testid={`button-forget-${m.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 p-4 border-b border-[rgba(59,130,246,0.1)] bg-[rgba(6,11,24,0.4)]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${agent.avatarColor}25`, border: `1px solid ${agent.avatarColor}40` }}
          >
            {IconComponent && <IconComponent className="w-4 h-4" style={{ color: agent.avatarColor }} />}
          </div>
          <div>
            <p className="text-sm font-semibold">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
          {msgsLoading ? (
            <div className="flex justify-center pt-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `${agent.avatarColor}20`, border: `1px solid ${agent.avatarColor}40` }}
              >
                {IconComponent && <IconComponent className="w-6 h-6" style={{ color: agent.avatarColor }} />}
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">{t("start_chat_with", { name: agent.name })}</p>
                <p className="text-xs text-muted-foreground">{t("start_chat_hint")}</p>
              </div>
            </div>
          ) : (
            messages?.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}
                data-testid={`message-${msg.id}`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={msg.role === "assistant"
                    ? { background: `${agent.avatarColor}25`, border: `1px solid ${agent.avatarColor}40`, color: agent.avatarColor }
                    : { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "white" }
                  }
                >
                  {msg.role === "assistant" ? agent.name[0] : "L"}
                </div>
                <div
                  className={cn(
                    "max-w-[70%] px-4 py-2.5 rounded-xl text-sm leading-relaxed",
                    msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {sendMutation.isPending && (
            <div className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: `${agent.avatarColor}25`, border: `1px solid ${agent.avatarColor}40`, color: agent.avatarColor }}
              >
                {agent.name[0]}
              </div>
              <div className="px-4 py-2.5 rounded-xl chat-bubble-assistant flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[rgba(59,130,246,0.1)] bg-[rgba(6,11,24,0.4)]">
          <div className="flex gap-3 items-end glass-card rounded-xl p-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${t("type_message", { name: agent.name })}`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[20px] max-h-32"
              rows={1}
              data-testid="input-message"
              style={{ lineHeight: "1.5" }}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, #3b82f6, #8b5cf6)` }}
              data-testid="button-send-message"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 ml-1">{t("send_hint")}</p>
        </div>
      </div>
    </div>
  );
}
