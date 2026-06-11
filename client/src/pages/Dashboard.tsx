import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, CheckCircle, Clock, Zap, ArrowRight, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import type { UserProfile, Agent } from "@shared/schema";

interface Stats {
  activeAgents: number;
  tasksCompleted: number;
  tasksInProgress: number;
  teamScore: number;
}

interface ActivityTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  agentName: string;
  agentColor: string;
  createdAt: string;
}

const QUICK_AGENTS = [
  { id: 1, name: "Nova", roleKey: "Marketing Strateeg", color: "#3b82f6", icon: "📢" },
  { id: 3, name: "Mira", roleKey: "Content Creator",   color: "#06b6d4", icon: "✍️" },
  { id: 10, name: "Orion", roleKey: "Strategisch Adviseur", color: "#f59e0b", icon: "🧭" },
];

const statusColorMap: Record<string, string> = {
  pending:     "text-yellow-400 bg-yellow-400/10",
  in_progress: "text-blue-400 bg-blue-400/10",
  completed:   "text-green-400 bg-green-400/10",
  failed:      "text-red-400 bg-red-400/10",
};

const priorityColorMap: Record<string, string> = {
  low: "text-green-400", medium: "text-yellow-400", high: "text-red-400",
};

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: profile } = useQuery<UserProfile>({ queryKey: ["/api/profile"] });
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({ queryKey: ["/api/stats"] });
  const { data: activity, isLoading: activityLoading } = useQuery<ActivityTask[]>({ queryKey: ["/api/activity"] });
  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return t("greeting_morning");
    if (h < 18) return t("greeting_afternoon");
    return t("greeting_evening");
  }

  const statCards = [
    { labelKey: "stat_active_agents" as const, value: stats?.activeAgents ?? 0, icon: Users, color: "blue", changeKey: "stat_change_week" as const },
    { labelKey: "stat_tasks_done" as const, value: stats?.tasksCompleted ?? 0, icon: CheckCircle, color: "green", changeKey: "stat_change_today" as const },
    { labelKey: "stat_in_progress" as const, value: stats?.tasksInProgress ?? 0, icon: Clock, color: "purple", changeKey: "stat_change_urgent" as const },
    { labelKey: "stat_team_score" as const, value: `${stats?.teamScore ?? 0}%`, icon: TrendingUp, color: "amber", changeKey: "stat_change_score" as const },
  ];

  const statusLabelMap: Record<string, string> = {
    pending: t("status_pending"), in_progress: t("status_in_progress"),
    completed: t("status_completed"), failed: t("status_failed"),
  };

  // Resolve quick agent roles dynamically
  const quickAgentData = QUICK_AGENTS.map((qa) => {
    const found = agents?.find((a) => a.id === qa.id);
    return { ...qa, role: found?.role ?? qa.roleKey };
  });

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-96 h-96 top-0 right-0 opacity-30" />
      <div className="orb-purple w-80 h-80 bottom-1/4 left-1/4 opacity-20" />

      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-8">
        {/* Hero greeting */}
        <div className="pt-2 pb-4" data-testid="dashboard-greeting">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] text-xs text-primary mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary status-active" />
            {t("team_online")}
          </div>
          <h1 className="text-3xl font-bold mb-1 gradient-text glow-text-blue pb-1" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            {getGreeting()}, {profile?.name || "Lex"}.
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("dashboard_subtitle", { count: stats?.activeAgents ?? 0 })}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ labelKey, value, icon: Icon, color, changeKey }) => (
            <div key={labelKey} className="glass-card rounded-xl p-5 relative overflow-hidden"
              data-testid={`stat-card-${labelKey}`}>
              <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-6 translate-x-6 opacity-20",
                color === "blue" && "bg-blue-500", color === "green" && "bg-green-500",
                color === "purple" && "bg-purple-500", color === "amber" && "bg-amber-500")} />
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3",
                color === "blue" && "bg-blue-500/15 text-blue-400", color === "green" && "bg-green-500/15 text-green-400",
                color === "purple" && "bg-purple-500/15 text-purple-400", color === "amber" && "bg-amber-500/15 text-amber-400")}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                {statsLoading ? <div className="w-8 h-6 shimmer rounded" /> : value}
              </div>
              <div className="text-xs text-muted-foreground font-medium mb-1">{t(labelKey)}</div>
              <div className="text-xs text-primary/70">{t(changeKey)}</div>
            </div>
          ))}
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-3 glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("recent_activity")}</h2>
              </div>
              <Link href="/tasks" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1" data-testid="link-all-tasks">
                {t("all_tasks")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {activityLoading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3 p-3 rounded-lg shimmer h-12" />)
              ) : activity?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">{t("no_activity")}</p>
              ) : (
                activity?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(59,130,246,0.05)] transition-colors"
                    data-testid={`activity-item-${item.id}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${item.agentColor}, ${item.agentColor}99)` }}>
                      {item.agentName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.agentName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColorMap[item.status])}>
                        {statusLabelMap[item.status] ?? item.status}
                      </span>
                      <span className={cn("text-xs font-medium", priorityColorMap[item.priority])}>
                        {item.priority === "high" ? "!" : "·"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Start */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h2 className="font-semibold text-sm" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("quick_start")}</h2>
              </div>
              <div className="space-y-3">
                {quickAgentData.map((agent) => (
                  <Link key={agent.id} href={`/agent/${agent.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(59,130,246,0.08)] border border-transparent hover:border-[rgba(59,130,246,0.2)] transition-all group"
                    data-testid={`quick-start-${agent.name.toLowerCase()}`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: `${agent.color}22`, border: `1px solid ${agent.color}44` }}>
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
              <Link href="/agents"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 border border-[rgba(59,130,246,0.2)] hover:border-primary/40 transition-all"
                data-testid="link-view-all-agents">
                {t("view_all_agents")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Plan badge */}
            <div className="rounded-xl p-4 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))", border: "1px solid rgba(139,92,246,0.2)" }}>
              <div className="relative z-10">
                <div className="text-xs text-purple-400 font-medium mb-1">{t("pro_plan_label")}</div>
                <p className="text-sm font-semibold mb-1">Pro Plan — {t("nav_myteam")}</p>
                <p className="text-xs text-muted-foreground">{t("pro_plan_desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
