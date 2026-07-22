import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Loader2, Play, Trash2, ChevronDown, ChevronUp, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock, Gauge, Zap, Sparkles, Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { getLucideIcon } from "@/lib/icons";
import { useLanguage } from "@/lib/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Loop, LoopRun, Agent } from "@shared/schema";

interface LoopWithAgent extends Loop { agent?: Agent | null; }
interface LoopDetail extends LoopWithAgent { runs: LoopRun[]; }
interface Budget { used: number; limit: number; remaining: number; resetAt: string; }
interface Headroom { compressions: number; tokensBefore: number; tokensAfter: number; tokensSaved: number; savingsRatio: number; savingsPct: number; }

const CADENCE_OPTIONS = [
  { value: "manual", label: "Handmatig" },
  { value: "15m", label: "Elke 15 min" },
  { value: "2h", label: "Elke 2 uur" },
  { value: "6h", label: "Elke 6 uur" },
  { value: "1d", label: "Dagelijks" },
];

// Snelstart-templates — kant-en-klare loops per agent (pattern picker).
// De agent wordt op naam gematcht tegen de geladen agents, dus id-drift is geen probleem.
const TEMPLATES = [
  { agentName: "Nova", name: "Wekelijkse marketing-ideeën", cadence: "1d",
    objective: "Genereer 3 concrete, uitvoerbare marketing-ideeën voor deze week, afgestemd op Nederlandse ondernemers. Bouw voort op wat al in de STATE staat en herhaal niets." },
  { agentName: "Mira", name: "Content-kalender", cadence: "1d",
    objective: "Stel een korte contentkalender voor de komende 5 dagen voor: per dag een onderwerp, kanaal en pakkende haak. Geen herhaling van eerdere runs." },
  { agentName: "Luna", name: "Social posts van de week", cadence: "1d",
    objective: "Schrijf 3 kant-en-klare social-media-posts inclusief hashtags, rond actuele en relevante invalshoeken." },
  { agentName: "Kai", name: "SEO quick wins", cadence: "6h",
    objective: "Signaleer 3 concrete SEO-kansen of quick wins (keywords, technische checks, content-gaten) die deze week op te pakken zijn." },
  { agentName: "Orion", name: "Strategische signalen", cadence: "6h",
    objective: "Vat de belangrijkste strategische aandachtspunten en kansen samen die de ondernemer deze periode moet overwegen." },
  { agentName: "Finn", name: "Financiële check", cadence: "1d",
    objective: "Benoem de belangrijkste financiële aandachtspunten en KPI's om deze week in de gaten te houden, met een concreet cijfermatig voorbeeld." },
];

const LEVEL_INFO: Record<string, { label: string; desc: string; color: string }> = {
  L1: { label: "L1 · Rapporteren", desc: "Alleen rapporteren, geen automatische actie", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  L2: { label: "L2 · Assisteren", desc: "Stelt fixes voor, mens keurt goed", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  L3: { label: "L3 · Autonoom", desc: "Handelt zelfstandig binnen budget", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
};

function scoreColor(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  const map: Record<string, { icon: any; cls: string }> = {
    APPROVE: { icon: CheckCircle2, cls: "text-green-400 bg-green-400/10 border-green-400/20" },
    REJECT: { icon: XCircle, cls: "text-red-400 bg-red-400/10 border-red-400/20" },
    ESCALATE: { icon: AlertTriangle, cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    ERROR: { icon: XCircle, cls: "text-red-500 bg-red-500/10 border-red-500/20" },
  };
  const cfg = map[verdict] ?? map.ESCALATE;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold border", cfg.cls)}>
      <Icon className="w-3 h-3" /> {verdict}
    </span>
  );
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Loops() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    agentId: "", name: "", objective: "",
    cadence: "manual", level: "L1", enabled: false,
  });

  const { data: loops, isLoading } = useQuery<LoopWithAgent[]>({ queryKey: ["/api/loops"] });
  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });
  const { data: budget } = useQuery<Budget>({ queryKey: ["/api/budget"] });
  const { data: headroom } = useQuery<Headroom>({ queryKey: ["/api/headroom"] });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/loops"] });
    qc.invalidateQueries({ queryKey: ["/api/budget"] });
    qc.invalidateQueries({ queryKey: ["/api/headroom"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/loops", {
        agentId: parseInt(form.agentId),
        name: form.name,
        objective: form.objective,
        cadence: form.cadence,
        level: form.level,
        enabled: form.enabled,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ agentId: "", name: "", objective: "", cadence: "manual", level: "L1", enabled: false });
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Loop> }) => {
      const res = await apiRequest("PATCH", `/api/loops/${id}`, data);
      return res.json();
    },
    onSuccess: () => invalidate(),
  });

  const runMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/loops/${id}/run`, {});
      return res.json();
    },
    onSuccess: (_d, id) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["/api/loops", String(id)] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/loops/${id}`); },
    onSuccess: () => invalidate(),
  });

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    const agent = agents?.find((a) => a.name.toLowerCase() === tpl.agentName.toLowerCase());
    setForm({
      agentId: agent ? String(agent.id) : "",
      name: tpl.name,
      objective: tpl.objective,
      cadence: tpl.cadence,
      level: "L1",
      enabled: false,
    });
    setOpen(true);
  };

  const budgetPct = budget ? Math.min(100, Math.round((budget.used / budget.limit) * 100)) : 0;

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-64 h-64 top-10 right-10 opacity-20" />
      <div className="orb-purple w-48 h-48 bottom-20 left-20 opacity-15" />

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {t("nav_loops")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 max-w-xl">
              Stop met losse prompts. Ontwerp een loop en krijg een score. Elke loop draait op een cadans,
              produceert output (maker) en laat een onafhankelijke verifier (checker) die beoordelen.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-new-loop">
                <Plus className="w-4 h-4" /> Nieuwe Loop
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)] text-foreground max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "'Clash Display', sans-serif" }}>Nieuwe Agent Loop</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Agent (de maker)</Label>
                  <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                    <SelectTrigger className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-loop-agent">
                      <SelectValue placeholder="Kies een agent" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                      {agents?.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name} — {a.role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Naam</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="bv. Dagelijkse content-ideeën" maxLength={80}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-loop-name" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Doel van de loop (objective)</Label>
                  <Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}
                    placeholder="Wat moet de agent elke run doen? bv. 'Genereer 3 concrete social-media-ideeën voor deze week op basis van actuele trends.'"
                    maxLength={1000} rows={3}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary resize-none" data-testid="input-loop-objective" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Cadans</Label>
                    <Select value={form.cadence} onValueChange={(v) => setForm({ ...form, cadence: v })}>
                      <SelectTrigger className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-loop-cadence">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                        {CADENCE_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Niveau</Label>
                    <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                      <SelectTrigger className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-loop-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                        <SelectItem value="L1">L1 · Rapporteren</SelectItem>
                        <SelectItem value="L2">L2 · Assisteren</SelectItem>
                        <SelectItem value="L3">L3 · Autonoom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[rgba(59,130,246,0.15)] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Ingeschakeld</p>
                    <p className="text-xs text-muted-foreground">Draait automatisch op de cadans (uit = alleen handmatig)</p>
                  </div>
                  <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} data-testid="switch-loop-enabled" />
                </div>
                <Button onClick={() => createMutation.mutate()}
                  disabled={!form.agentId || !form.name || !form.objective || createMutation.isPending}
                  className="w-full text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-create-loop">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Loop aanmaken"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget bar */}
        {budget && (
          <div className="glass-card rounded-xl p-3.5 mb-6 flex items-center gap-3" data-testid="budget-bar">
            <Zap className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Dagelijks token-budget (gedeeld)</span>
                <span className="text-xs font-medium">{budget.used.toLocaleString()} / {budget.limit.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", budgetPct >= 90 ? "bg-red-400" : budgetPct >= 70 ? "bg-yellow-400" : "bg-primary")}
                  style={{ width: `${budgetPct}%` }} />
              </div>
            </div>
            {/* Headroom — bespaarde tokens door de context-compressielaag */}
            {headroom && headroom.tokensSaved > 0 && (
              <div className="flex items-center gap-1.5 flex-shrink-0 pl-3 border-l border-[rgba(255,255,255,0.08)]" data-testid="headroom-savings" title={`Headroom comprimeerde context ${headroom.compressions}× — ${headroom.tokensBefore.toLocaleString()} → ${headroom.tokensAfter.toLocaleString()} tokens`}>
                <Minimize2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-medium text-green-400">−{headroom.tokensSaved.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">bespaard ({headroom.savingsPct}%)</span>
              </div>
            )}
          </div>
        )}

        {/* Snelstart-templates (pattern picker) */}
        {agents && agents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Snelstart-templates</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {TEMPLATES.map((tpl) => {
                const agent = agents.find((a) => a.name.toLowerCase() === tpl.agentName.toLowerCase());
                const Icon = agent ? getLucideIcon(agent.avatarIcon) : null;
                const color = agent?.avatarColor ?? "#3b82f6";
                const cadenceLabel = CADENCE_OPTIONS.find((c) => c.value === tpl.cadence)?.label ?? tpl.cadence;
                return (
                  <button
                    key={tpl.name}
                    onClick={() => applyTemplate(tpl)}
                    className="text-left glass-card rounded-xl p-3 hover:border-[rgba(59,130,246,0.35)] transition-all group"
                    data-testid={`template-${tpl.agentName.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                        {Icon && <Icon className="w-3 h-3" style={{ color }} />}
                      </div>
                      <span className="text-sm font-medium flex-1 min-w-0 truncate">{tpl.name}</span>
                      <span className="inline-flex items-center gap-1 text-[9px] px-1 py-0.5 rounded font-medium text-blue-300 bg-blue-400/10 border border-blue-400/20 flex-shrink-0">
                        <Clock className="w-2.5 h-2.5" /> {cadenceLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{tpl.objective}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary/80 group-hover:text-primary">
                      <Plus className="w-2.5 h-2.5" /> {tpl.agentName} · gebruik template
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loop list */}
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => <div key={i} className="glass-card rounded-xl h-28 shimmer" />)}
          </div>
        ) : !loops || loops.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nog geen loops. Maak je eerste autonome loop aan.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {loops.map((loop) => (
              <LoopCard
                key={loop.id}
                loop={loop}
                expanded={expandedId === loop.id}
                onToggleExpand={() => setExpandedId(expandedId === loop.id ? null : loop.id)}
                onRun={() => runMutation.mutate(loop.id)}
                running={runMutation.isPending && runMutation.variables === loop.id}
                onToggleEnabled={(enabled) => patchMutation.mutate({ id: loop.id, data: { enabled } })}
                onDelete={() => deleteMutation.mutate(loop.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoopCard({
  loop, expanded, onToggleExpand, onRun, running, onToggleEnabled, onDelete,
}: {
  loop: LoopWithAgent;
  expanded: boolean;
  onToggleExpand: () => void;
  onRun: () => void;
  running: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const AgentIcon = loop.agent ? getLucideIcon(loop.agent.avatarIcon) : null;
  const level = LEVEL_INFO[loop.level] ?? LEVEL_INFO.L1;
  const cadenceLabel = CADENCE_OPTIONS.find((c) => c.value === loop.cadence)?.label ?? loop.cadence;

  const { data: detail } = useQuery<LoopDetail>({
    queryKey: ["/api/loops", String(loop.id)],
    enabled: expanded,
  });

  return (
    <div className="glass-card rounded-xl p-4 hover:border-[rgba(59,130,246,0.3)] transition-all" data-testid={`loop-card-${loop.id}`}>
      <div className="flex items-start gap-3">
        {/* Agent avatar */}
        {loop.agent && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${loop.agent.avatarColor}20`, border: `1px solid ${loop.agent.avatarColor}40` }}>
            {AgentIcon && <AgentIcon className="w-4 h-4" style={{ color: loop.agent.avatarColor }} />}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{loop.name}</h3>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold border", level.color)} title={level.desc}>{level.label}</span>
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium text-blue-300 bg-blue-400/10 border border-blue-400/20">
              <Clock className="w-3 h-3" /> {cadenceLabel}
            </span>
            <VerdictBadge verdict={loop.lastVerdict} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{loop.objective}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {loop.agent?.name ?? "Agent"} · laatste run {formatWhen(loop.lastRunAt)}
            {loop.enabled && loop.nextRunAt ? ` · volgende ${formatWhen(loop.nextRunAt)}` : ""}
          </p>
        </div>

        {/* Loop Ready score */}
        <div className="flex flex-col items-center flex-shrink-0 px-2">
          <div className="flex items-center gap-1">
            <Gauge className={cn("w-3.5 h-3.5", scoreColor(loop.lastScore))} />
            <span className={cn("text-lg font-bold leading-none", scoreColor(loop.lastScore))} data-testid={`loop-score-${loop.id}`}>
              {loop.lastScore ?? "—"}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">score</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
        <Button size="sm" variant="outline" onClick={onRun} disabled={running}
          className="h-7 gap-1.5 text-xs border-[rgba(59,130,246,0.25)] text-primary hover:bg-primary/10" data-testid={`button-run-loop-${loop.id}`}>
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {running ? "Draait…" : "Draai nu"}
        </Button>

        <button onClick={onToggleExpand}
          className="h-7 px-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors"
          data-testid={`button-expand-loop-${loop.id}`}>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Verberg" : "Details"}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] text-muted-foreground">{loop.enabled ? "Actief" : "Uit"}</span>
          <Switch checked={loop.enabled} onCheckedChange={onToggleEnabled} data-testid={`switch-enabled-${loop.id}`} />
          <button onClick={onDelete}
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            data-testid={`button-delete-loop-${loop.id}`} aria-label="Verwijder loop">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail: STATE spine + run history */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)] space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">State (geheugen-ruggengraat)</h4>
            <pre className="text-[11px] whitespace-pre-wrap font-mono bg-[rgba(0,0,0,0.25)] rounded-lg p-3 max-h-52 overflow-y-auto text-muted-foreground border border-[rgba(255,255,255,0.05)]">
              {loop.state?.trim() || "(nog leeg — draai de loop om de eerste run te maken)"}
            </pre>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Runs (maker → checker)</h4>
            {!detail ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Laden…</div>
            ) : detail.runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nog geen runs.</p>
            ) : (
              <div className="space-y-2">
                {detail.runs.map((run) => (
                  <div key={run.id} className="rounded-lg border border-[rgba(255,255,255,0.06)] p-2.5 bg-[rgba(255,255,255,0.02)]" data-testid={`loop-run-${run.id}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <VerdictBadge verdict={run.verdict} />
                      <span className={cn("text-xs font-bold", scoreColor(run.score))}>score {run.score}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{formatWhen(run.createdAt)} · {run.tokensUsed.toLocaleString()} tokens</span>
                    </div>
                    {run.critique && <p className="text-[11px] text-muted-foreground italic mb-1.5">Checker: {run.critique}</p>}
                    {run.makerOutput && (
                      <pre className="text-[11px] whitespace-pre-wrap bg-[rgba(0,0,0,0.2)] rounded p-2 max-h-40 overflow-y-auto text-foreground/80">
                        {run.makerOutput}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
