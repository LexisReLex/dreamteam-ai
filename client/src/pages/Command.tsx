import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown, Send, Loader2, Network, Route as RouteIcon, Cpu, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, Sparkles, History, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { getLucideIcon } from "@/lib/icons";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, Orchestration, OrchestrationStep } from "@shared/schema";

interface StepWithAgent extends OrchestrationStep { agent?: Agent | null; }
interface OrchestrationDetail extends Orchestration { steps: StepWithAgent[]; }
interface OrchestratorMeta {
  orchestratorModel: string;
  specialistModel: string;
  totalOrchestrations: number;
  routes: number;
}

// Snelstart-opdrachten — één command die de CEO over meerdere specialisten verdeelt.
const EXAMPLES = [
  "Lanceer een najaarsactie voor onze webshop: strategie, content én een salesaanpak.",
  "Analyseer waarom onze omzet daalt en geef een concreet herstelplan.",
  "Bouw een complete contentweek op rond ons nieuwe product.",
  "Maak ons klaar voor een investeringsronde: cijfers, verhaal en strategie.",
];

function StatusPill({ running }: { running: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium border",
      running
        ? "text-yellow-300 bg-yellow-400/10 border-yellow-400/25"
        : "text-green-300 bg-green-400/10 border-green-400/25",
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", running ? "bg-yellow-400 animate-pulse" : "bg-green-400")} />
      {running ? "Agentic System Working" : "Agentic System Operational"}
    </span>
  );
}

function statusLabel(s: string): { label: string; cls: string } {
  switch (s) {
    case "planning": return { label: "plannen", cls: "text-blue-300 bg-blue-400/10 border-blue-400/20" };
    case "dispatching": return { label: "routeren", cls: "text-yellow-300 bg-yellow-400/10 border-yellow-400/20" };
    case "synthesizing": return { label: "bundelen", cls: "text-purple-300 bg-purple-400/10 border-purple-400/20" };
    case "done": return { label: "klaar", cls: "text-green-300 bg-green-400/10 border-green-400/20" };
    case "error": return { label: "fout", cls: "text-red-300 bg-red-400/10 border-red-400/20" };
    default: return { label: s, cls: "text-muted-foreground bg-white/5 border-white/10" };
  }
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Command() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [command, setCommand] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });
  const { data: meta } = useQuery<OrchestratorMeta>({ queryKey: ["/api/orchestrator"] });
  const { data: history } = useQuery<Orchestration[]>({ queryKey: ["/api/orchestrations"] });

  // Detail-query pollt terwijl de run nog bezig is (planning → dispatching →
  // synthesizing) en stopt zodra hij done/error is. Zo zie je de specialisten
  // live oplichten.
  const { data: detail } = useQuery<OrchestrationDetail>({
    queryKey: ["/api/orchestrations", String(selectedId)],
    enabled: selectedId != null,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s && (s === "done" || s === "error") ? false : 1200;
    },
  });

  const orchestrate = useMutation({
    mutationFn: async (cmd: string) => {
      const res = await apiRequest("POST", "/api/orchestrate", { command: cmd });
      return res.json() as Promise<OrchestrationDetail>;
    },
    onSuccess: (data) => {
      // De POST geeft de "planning"-rij terug; toon 'm meteen en laat de query pollen.
      setSelectedId(data.id);
      qc.setQueryData(["/api/orchestrations", String(data.id)], data);
      qc.invalidateQueries({ queryKey: ["/api/orchestrations"] });
    },
  });

  const liveStatus = selectedId != null ? detail?.status : undefined;
  const isLive = liveStatus != null && liveStatus !== "done" && liveStatus !== "error";
  const running = orchestrate.isPending || isLive;

  // Zodra een run klaar is: ververs de command-laag-stats, geschiedenis en budget.
  useEffect(() => {
    if (liveStatus === "done" || liveStatus === "error") {
      qc.invalidateQueries({ queryKey: ["/api/orchestrator"] });
      qc.invalidateQueries({ queryKey: ["/api/orchestrations"] });
      qc.invalidateQueries({ queryKey: ["/api/budget"] });
    }
  }, [liveStatus, qc]);

  // Live network-status, afgeleid van de echte run-status:
  //  - CEO werkt tijdens plannen én bundelen (en direct na versturen).
  //  - de specialist in detail.currentAgentId werkt nú; afgeronde stappen = done.
  const doneAgentIds = new Set((detail?.steps ?? []).map((s) => s.agentId));
  const currentAgentId = isLive ? detail?.currentAgentId ?? null : null;
  const ceoWorking =
    orchestrate.isPending || liveStatus === "planning" || liveStatus === "synthesizing";

  const submit = () => {
    const cmd = command.trim();
    if (!cmd || running) return;
    orchestrate.mutate(cmd);
  };

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-72 h-72 top-10 right-10 opacity-20" />
      <div className="orb-purple w-56 h-56 bottom-24 left-16 opacity-15" />

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {t("nav_command")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 max-w-2xl">
              Eén commando-brein dat vijf-plus specialisten aanstuurt. De CEO/Orchestrator plant het werk,
              routeert deelopdrachten naar de specialisten en levert je één operator-debrief.
            </p>
          </div>
          <StatusPill running={running} />
        </div>

        {/* ── Agent Network ── */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agent Network</h2>
          </div>

          {/* CEO / Orchestrator */}
          <div className="flex justify-center">
            <div className={cn(
              "relative w-full max-w-xl rounded-xl border p-4 transition-all",
              ceoWorking
                ? "border-[rgba(139,92,246,0.5)] bg-[rgba(139,92,246,0.08)] glow-blue"
                : "border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.05)]",
            )}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">CEO / Orchestrator</h3>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium border",
                      ceoWorking ? "text-yellow-300 bg-yellow-400/10 border-yellow-400/25" : "text-green-300 bg-green-400/10 border-green-400/25",
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", ceoWorking ? "bg-yellow-400 animate-pulse" : "bg-green-400")} />
                      {ceoWorking ? "working" : "idle"}
                    </span>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-primary/70 font-semibold mt-0.5">Command Layer</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Routeert werk, plant context, stuurt specialisten aan en levert de operator-debrief.
                  </p>
                </div>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground"><RouteIcon className="w-2.5 h-2.5" /> Routes</div>
                  <div className="text-sm font-bold" data-testid="stat-routes">{meta?.routes ?? 0}</div>
                </div>
                <div className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground"><Sparkles className="w-2.5 h-2.5" /> Opdrachten</div>
                  <div className="text-sm font-bold" data-testid="stat-orchestrations">{meta?.totalOrchestrations ?? 0}</div>
                </div>
                <div className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground"><Cpu className="w-2.5 h-2.5" /> Model</div>
                  <div className="text-[11px] font-bold font-mono truncate" title={meta?.orchestratorModel}>{meta?.orchestratorModel ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Connector */}
          <div className="flex justify-center my-3">
            <div className="w-px h-5 bg-gradient-to-b from-[rgba(139,92,246,0.5)] to-transparent" />
          </div>

          {/* Specialists */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {(agents ?? []).map((a) => {
              const Icon = getLucideIcon(a.avatarIcon);
              const isWorking = currentAgentId === a.id;
              const isActive = isWorking || doneAgentIds.has(a.id);
              return (
                <div
                  key={a.id}
                  data-testid={`network-agent-${a.id}`}
                  className={cn(
                    "rounded-xl border p-3 transition-all duration-300",
                    isActive
                      ? "border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.08)]"
                      : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `${a.avatarColor}20`, border: `1px solid ${a.avatarColor}40` }}>
                      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: a.avatarColor }} />}
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[8px] px-1 py-0.5 rounded-full font-medium border ml-auto",
                      isWorking ? "text-yellow-300 bg-yellow-400/10 border-yellow-400/25"
                        : isActive ? "text-green-300 bg-green-400/10 border-green-400/25"
                        : "text-muted-foreground bg-white/5 border-white/10",
                    )}>
                      <span className={cn("w-1 h-1 rounded-full", isWorking ? "bg-yellow-400 animate-pulse" : isActive ? "bg-green-400" : "bg-muted-foreground/50")} />
                      {isWorking ? "working" : isActive ? "done" : "idle"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold truncate">{a.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium truncate">{a.role}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Command bar ── */}
        <div className="glass-card rounded-2xl p-4 mb-6">
          <label className="text-xs text-muted-foreground mb-2 block font-medium">Geef de CEO één opdracht</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
              placeholder="bv. 'Lanceer een najaarscampagne: strategie, content en salesaanpak.'"
              maxLength={1000}
              rows={2}
              disabled={running}
              className="flex-1 bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary resize-none"
              data-testid="input-command"
            />
            <Button
              onClick={submit}
              disabled={!command.trim() || running}
              className="sm:w-40 gap-2 text-white self-stretch sm:self-auto"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
              data-testid="button-orchestrate"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {running ? "Bezig…" : "Verstuur naar CEO"}
            </Button>
          </div>
          {/* Voorbeelden */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => !running && setCommand(ex)}
                disabled={running}
                className="text-[11px] px-2 py-1 rounded-full border border-[rgba(59,130,246,0.2)] text-muted-foreground hover:text-primary hover:border-[rgba(59,130,246,0.4)] transition-colors disabled:opacity-40"
                data-testid="example-command"
              >
                {ex.length > 48 ? ex.slice(0, 46) + "…" : ex}
              </button>
            ))}
          </div>
        </div>

        {/* ── Result: plan → steps → debrief ── */}
        {running && !detail && (
          <div className="glass-card rounded-2xl p-8 text-center mb-6">
            <Loader2 className="w-7 h-7 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">De CEO plant het werk en stuurt de specialisten aan…</p>
          </div>
        )}

        {detail && (
          <div className="glass-card rounded-2xl p-5 mb-6" data-testid="orchestration-result">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <h2 className="text-sm font-semibold">Operator-debrief</h2>
              {(() => { const s = statusLabel(detail.status); return (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold border", s.cls)}>{s.label}</span>
              ); })()}
              <span className="text-[11px] text-muted-foreground ml-auto">
                {formatWhen(detail.createdAt)} · {detail.tokensUsed.toLocaleString()} tokens
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              <span className="text-foreground/80 font-medium">Opdracht:</span> {detail.command}
            </p>

            {detail.plan && (
              <div className="rounded-lg border border-[rgba(59,130,246,0.15)] bg-[rgba(59,130,246,0.04)] p-3 mb-4">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1">
                  <RouteIcon className="w-3 h-3" /> Routing van de CEO
                </div>
                <p className="text-xs text-foreground/85">{detail.plan}</p>
              </div>
            )}

            {/* Debrief */}
            <div className="rounded-lg border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.05)] p-4 mb-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-purple-300/80 font-semibold mb-2">
                <Crown className="w-3 h-3" /> Debrief
              </div>
              {detail.status === "error" ? (
                <div className="flex items-start gap-2 text-sm text-red-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {detail.debrief}
                </div>
              ) : detail.debrief ? (
                <pre className="text-[13px] whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed">{detail.debrief}</pre>
              ) : isLive ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {detail.status === "planning" ? "De CEO plant het werk…"
                    : detail.status === "synthesizing" ? "De CEO bundelt de bijdragen tot een debrief…"
                    : "Specialisten aan het werk…"}
                </div>
              ) : (
                <pre className="text-[13px] whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed">—</pre>
              )}
            </div>

            {/* Steps per specialist */}
            {detail.steps.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  <Network className="w-3 h-3" /> Bijdragen van specialisten ({detail.steps.length})
                </div>
                <div className="space-y-2">
                  {detail.steps.map((step) => {
                    const Icon = step.agent ? getLucideIcon(step.agent.avatarIcon) : null;
                    const color = step.agent?.avatarColor ?? "#3b82f6";
                    const isOpen = expandedStep === step.id;
                    return (
                      <div key={step.id} className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]" data-testid={`orchestration-step-${step.id}`}>
                        <button
                          onClick={() => setExpandedStep(isOpen ? null : step.id)}
                          className="w-full flex items-center gap-2.5 p-2.5 text-left"
                        >
                          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                            {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">{step.agent?.name ?? "Specialist"} <span className="text-muted-foreground font-normal">· {step.agent?.role}</span></p>
                            <p className="text-[11px] text-muted-foreground truncate">{step.task}</p>
                          </div>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                        {isOpen && (
                          <div className="px-2.5 pb-2.5">
                            <pre className="text-[12px] whitespace-pre-wrap font-sans bg-[rgba(0,0,0,0.2)] rounded p-2.5 text-foreground/85 leading-relaxed">{step.output}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── History ── */}
        {history && history.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <History className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recente opdrachten</h2>
            </div>
            <div className="space-y-2">
              {history.map((o) => {
                const s = statusLabel(o.status);
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className={cn(
                      "w-full text-left glass-card rounded-xl p-3 flex items-center gap-3 hover:border-[rgba(59,130,246,0.3)] transition-all",
                      selectedId === o.id ? "border-[rgba(59,130,246,0.35)]" : "",
                    )}
                    data-testid={`history-${o.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{o.command}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatWhen(o.createdAt)} · {o.tokensUsed.toLocaleString()} tokens</p>
                    </div>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold border flex-shrink-0", s.cls)}>{s.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
