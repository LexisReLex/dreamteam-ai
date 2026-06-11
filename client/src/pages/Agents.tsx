import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MessageCircle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLucideIcon } from "@/lib/icons";
import { useLanguage } from "@/lib/LanguageContext";
import type { Agent } from "@shared/schema";

const statusKeys = {
  active: { labelKey: "agent_status_active" as const, color: "bg-green-400", textColor: "text-green-400", animate: true },
  idle:   { labelKey: "agent_status_idle" as const,   color: "bg-yellow-400", textColor: "text-yellow-400", animate: false },
  busy:   { labelKey: "agent_status_busy" as const,   color: "bg-blue-400",   textColor: "text-blue-400",   animate: false },
};

export default function Agents() {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState("all");

  const CATEGORIES = [
    { value: "all",       labelKey: "filter_all" as const },
    { value: "marketing", labelKey: "filter_marketing" as const },
    { value: "sales",     labelKey: "filter_sales" as const },
    { value: "content",   labelKey: "filter_content" as const },
    { value: "analytics", labelKey: "filter_analytics" as const },
    { value: "support",   labelKey: "filter_support" as const },
    { value: "finance",   labelKey: "filter_finance" as const },
    { value: "hr",        labelKey: "filter_hr" as const },
    { value: "strategy",  labelKey: "filter_strategy" as const },
  ];

  const { data: agents, isLoading } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });

  const filtered = agents?.filter(
    (a) => activeFilter === "all" || a.category === activeFilter
  ) ?? [];

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-80 h-80 top-0 right-1/4 opacity-20" />
      <div className="orb-purple w-64 h-64 bottom-1/4 right-0 opacity-15" />

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {t("agents_title")}
            </h1>
            {agents && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/25">
                {t("agents_count", { count: agents.length })}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{t("agents_subtitle")}</p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6" data-testid="agent-filters">
          {CATEGORIES.map(({ value, labelKey }) => (
            <button key={value} onClick={() => setActiveFilter(value)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                activeFilter === value
                  ? "bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                  : "bg-[rgba(255,255,255,0.04)] text-muted-foreground hover:text-foreground hover:bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.1)]")}
              data-testid={`filter-${value}`}>
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Agent grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5 h-52 shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p>{t("no_agents_found")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const { t } = useLanguage();
  const statusCfg = statusKeys[agent.status as keyof typeof statusKeys];
  const IconComponent = getLucideIcon(agent.avatarIcon);

  return (
    <div className="glass-card rounded-xl p-5 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform duration-200"
      style={{ "--agent-color": agent.avatarColor } as React.CSSProperties}
      data-testid={`agent-card-${agent.id}`}>
      <div className="flex items-start gap-4">
        <div className="agent-avatar-glow w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${agent.avatarColor}30, ${agent.avatarColor}15)`, border: `1px solid ${agent.avatarColor}50`, boxShadow: `0 0 16px ${agent.avatarColor}25` }}>
          {IconComponent && <IconComponent className="w-5 h-5" style={{ color: agent.avatarColor }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={cn("w-2 h-2 rounded-full", statusCfg.color, statusCfg.animate && "status-active")} />
              <span className={cn("text-[11px] font-medium", statusCfg.textColor)}>{t(statusCfg.labelKey)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{agent.role}</p>
        </div>
      </div>

      <div className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
        {agent.specialty}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          <span>{t("tasks_completed", { count: agent.tasksCompleted })}</span>
        </div>
        <Link href={`/agent/${agent.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
          style={{ background: `linear-gradient(135deg, ${agent.avatarColor}, ${agent.avatarColor}bb)`, boxShadow: `0 0 12px ${agent.avatarColor}30` }}
          data-testid={`button-start-chat-${agent.id}`}>
          <MessageCircle className="w-3.5 h-3.5" />
          {t("start_chat")}
        </Link>
      </div>
    </div>
  );
}
