import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Loader2, Play, Trash2, ChevronDown, ChevronUp, ShieldCheck, ShieldAlert,
  Zap, Sparkles, CheckCircle2, Wrench, Search, ClipboardCheck,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Scan, Finding, Agent } from "@shared/schema";

interface ScanWithAgents extends Scan { agents?: Agent[]; }
interface ScanDetail extends ScanWithAgents { findings: Finding[]; }
interface Budget { used: number; limit: number; remaining: number; resetAt: string; }

// Severity-stijl — CVSS-achtig, kritiek → info (aflopende ernst).
const SEVERITY_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  kritiek: { label: "Kritiek", cls: "text-red-400 bg-red-400/10 border-red-400/20", dot: "bg-red-400" },
  hoog:    { label: "Hoog",    cls: "text-orange-400 bg-orange-400/10 border-orange-400/20", dot: "bg-orange-400" },
  middel:  { label: "Middel",  cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", dot: "bg-yellow-400" },
  laag:    { label: "Laag",    cls: "text-blue-300 bg-blue-400/10 border-blue-400/20", dot: "bg-blue-400" },
  info:    { label: "Info",    cls: "text-muted-foreground bg-white/5 border-white/10", dot: "bg-muted-foreground" },
  schoon:  { label: "Schoon",  cls: "text-green-400 bg-green-400/10 border-green-400/20", dot: "bg-green-400" },
};

const LEVEL_INFO: Record<string, { label: string; desc: string; color: string }> = {
  L1: { label: "L1 · Rapporteren", desc: "Alleen rapporteren, geen automatische actie", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  L2: { label: "L2 · Assisteren", desc: "Stelt fixes voor, mens keurt goed", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  L3: { label: "L3 · Autonoom", desc: "Handelt zelfstandig binnen budget", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Nog niet gedraaid",
  running: "Bezig…",
  completed: "Voltooid",
  failed: "Mislukt",
};

// Snelstart-templates — kant-en-klare team-scans (welke agents + welk doel).
const TEMPLATES = [
  {
    name: "Website & funnel-scan", agentNames: ["Nova", "Kai", "Mira"],
    target: "Beoordeel de website, boodschap en conversie-funnel van mijn bedrijf op zwakke plekken en gemiste kansen.",
    scope: "Marketing, SEO en content — geen techniek/security.",
  },
  {
    name: "Financiële gezondheidscheck", agentNames: ["Finn", "Atlas", "Orion"],
    target: "Signaleer financiële risico's, marge-lekken en KPI's die aandacht vereisen op basis van mijn bedrijfssituatie.",
    scope: "Cashflow, marges, financiële KPI's en strategische risico's.",
  },
  {
    name: "Go-to-market-scan", agentNames: ["Nova", "Rex", "Luna"],
    target: "Onderzoek mijn go-to-market: positionering, salesproces en social presence op zwaktes die groei remmen.",
    scope: "Marketing, sales en social media.",
  },
];

function riskColor(band: string | null, score: number | null) {
  if (band && SEVERITY_STYLE[band]) return SEVERITY_STYLE[band].cls.split(" ")[0];
  if (score == null) return "text-muted-foreground";
  if (score >= 60) return "text-red-400";
  if (score >= 25) return "text-yellow-400";
  if (score > 0) return "text-blue-300";
  return "text-green-400";
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.info;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold border", s.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} /> {s.label}
    </span>
  );
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Scans() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; target: string; scope: string; agentIds: number[]; level: string }>({
    name: "", target: "", scope: "", agentIds: [], level: "L1",
  });

  const { data: scans, isLoading } = useQuery<ScanWithAgents[]>({ queryKey: ["/api/scans"] });
  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });
  const { data: budget } = useQuery<Budget>({ queryKey: ["/api/budget"] });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/scans"] });
    qc.invalidateQueries({ queryKey: ["/api/budget"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scans", {
        name: form.name, target: form.target, scope: form.scope,
        agentIds: form.agentIds, level: form.level,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ name: "", target: "", scope: "", agentIds: [], level: "L1" });
    },
  });

  const runMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/scans/${id}/run`, {});
      return res.json();
    },
    onSuccess: (_d, id) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["/api/scans", String(id)] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/scans/${id}`); },
    onSuccess: () => invalidate(),
  });

  const toggleAgent = (id: number) =>
    setForm((f) => ({
      ...f,
      agentIds: f.agentIds.includes(id) ? f.agentIds.filter((x) => x !== id) : [...f.agentIds, id],
    }));

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    const ids = tpl.agentNames
      .map((n) => agents?.find((a) => a.name.toLowerCase() === n.toLowerCase())?.id)
      .filter((x): x is number => typeof x === "number");
    setForm({ name: tpl.name, target: tpl.target, scope: tpl.scope, agentIds: ids, level: "L1" });
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
              {t("nav_scans")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 max-w-xl">
              Een team van agents scant je bedrijf (graph of agents). Elke bevinding wordt door een
              onafhankelijke validator bevestigd of als false positive verworpen — je krijgt alleen
              gevalideerde bevindingen, met severity en een concrete fix.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-new-scan">
                <Plus className="w-4 h-4" /> Nieuwe Scan
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)] text-foreground max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "'Clash Display', sans-serif" }}>Nieuwe Team Scan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Naam</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="bv. Kwartaal-scan Q3" maxLength={80}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-scan-name" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Doel van de scan (het target)</Label>
                  <Textarea value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
                    placeholder="Wat moet het team onderzoeken? bv. 'Beoordeel mijn webshop op risico's en gemiste kansen in marketing, SEO en financiën.'"
                    maxLength={2000} rows={3}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary resize-none" data-testid="input-scan-target" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Afbakening (scope) — optioneel</Label>
                  <Input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}
                    placeholder="bv. alleen marketing en sales"
                    maxLength={1000}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-scan-scope" />
                </div>

                {/* Agent-selectie (de graph of agents) */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Team (de verkenners) — {form.agentIds.length} geselecteerd
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {agents?.map((a) => {
                      const Icon = getLucideIcon(a.avatarIcon);
                      const active = form.agentIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleAgent(a.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all",
                            active
                              ? "border-[rgba(59,130,246,0.5)] bg-[rgba(59,130,246,0.1)]"
                              : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(59,130,246,0.25)]",
                          )}
                          data-testid={`scan-agent-toggle-${a.id}`}
                        >
                          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: `${a.avatarColor}20`, border: `1px solid ${a.avatarColor}40` }}>
                            {Icon && <Icon className="w-3 h-3" style={{ color: a.avatarColor }} />}
                          </div>
                          <span className="text-xs font-medium truncate flex-1 min-w-0">{a.name}</span>
                          {active && <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Kies 1–6 agents. Elke agent verkent zijn eigen vakgebied.</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Niveau</Label>
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                    <SelectTrigger className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-scan-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                      <SelectItem value="L1">L1 · Rapporteren</SelectItem>
                      <SelectItem value="L2">L2 · Assisteren</SelectItem>
                      <SelectItem value="L3">L3 · Autonoom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => createMutation.mutate()}
                  disabled={!form.name || !form.target || form.agentIds.length === 0 || form.agentIds.length > 6 || createMutation.isPending}
                  className="w-full text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-create-scan">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan aanmaken"}
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
          </div>
        )}

        {/* Snelstart-templates */}
        {agents && agents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Snelstart-templates</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => applyTemplate(tpl)}
                  className="text-left glass-card rounded-xl p-3 hover:border-[rgba(59,130,246,0.35)] transition-all group"
                  data-testid={`scan-template-${tpl.name.split(" ")[0].toLowerCase()}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{tpl.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{tpl.target}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary/80 group-hover:text-primary">
                    <Plus className="w-2.5 h-2.5" /> {tpl.agentNames.join(", ")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scan list */}
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => <div key={i} className="glass-card rounded-xl h-28 shimmer" />)}
          </div>
        ) : !scans || scans.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nog geen scans. Maak je eerste team-scan aan.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <ScanCard
                key={scan.id}
                scan={scan}
                expanded={expandedId === scan.id}
                onToggleExpand={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
                onRun={() => runMutation.mutate(scan.id)}
                running={runMutation.isPending && runMutation.variables === scan.id}
                onDelete={() => deleteMutation.mutate(scan.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScanCard({
  scan, expanded, onToggleExpand, onRun, running, onDelete,
}: {
  scan: ScanWithAgents;
  expanded: boolean;
  onToggleExpand: () => void;
  onRun: () => void;
  running: boolean;
  onDelete: () => void;
}) {
  const level = LEVEL_INFO[scan.level] ?? LEVEL_INFO.L1;
  const band = scan.riskBand ?? (scan.status === "completed" ? "schoon" : null);
  const isBusy = running || scan.status === "running";

  const { data: detail } = useQuery<ScanDetail>({
    queryKey: ["/api/scans", String(scan.id)],
    enabled: expanded,
  });

  return (
    <div className="glass-card rounded-xl p-4 hover:border-[rgba(59,130,246,0.3)] transition-all" data-testid={`scan-card-${scan.id}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.25)]">
          {band && band !== "schoon" ? <ShieldAlert className="w-4 h-4 text-orange-400" /> : <ShieldCheck className="w-4 h-4 text-primary" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{scan.name}</h3>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold border", level.color)} title={level.desc}>{level.label}</span>
            {band && <SeverityBadge severity={band} />}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scan.target}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {scan.agents?.map((a) => {
              const Icon = getLucideIcon(a.avatarIcon);
              return (
                <span key={a.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-white/5" title={a.role}>
                  {Icon && <Icon className="w-2.5 h-2.5" style={{ color: a.avatarColor }} />} {a.name}
                </span>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-1.5">
            {STATUS_LABEL[scan.status] ?? scan.status}
            {scan.completedAt ? ` · ${formatWhen(scan.completedAt)}` : ""}
            {scan.status === "completed" ? ` · ${scan.confirmedCount} bevinding(en) · ${scan.rejectedCount} false positives gefilterd` : ""}
          </p>
        </div>

        {/* Risicoscore */}
        <div className="flex flex-col items-center flex-shrink-0 px-2">
          <span className={cn("text-lg font-bold leading-none", riskColor(scan.riskBand, scan.riskScore))} data-testid={`scan-risk-${scan.id}`}>
            {scan.riskScore ?? "—"}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">risico</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
        <Button size="sm" variant="outline" onClick={onRun} disabled={isBusy}
          className="h-7 gap-1.5 text-xs border-[rgba(59,130,246,0.25)] text-primary hover:bg-primary/10" data-testid={`button-run-scan-${scan.id}`}>
          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {isBusy ? "Scant…" : scan.status === "pending" ? "Start scan" : "Opnieuw scannen"}
        </Button>

        <button onClick={onToggleExpand}
          className="h-7 px-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors"
          data-testid={`button-expand-scan-${scan.id}`}>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Verberg" : "Rapport"}
        </button>

        <div className="ml-auto">
          <button onClick={onDelete}
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            data-testid={`button-delete-scan-${scan.id}`} aria-label="Verwijder scan">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded: rapport (samenvatting + bevindingen) */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)] space-y-4">
          {scan.summary && (
            <div className="flex items-start gap-2 rounded-lg bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] p-3">
              <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80">{scan.summary}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Gevalideerde bevindingen
            </h4>
            {!detail ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Laden…</div>
            ) : detail.findings.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {scan.status === "completed"
                  ? "Geen bevestigde bevindingen — de validator vond niets dat de scope raakt."
                  : "Nog geen bevindingen. Start de scan om het rapport te genereren."}
              </p>
            ) : (
              <div className="space-y-2">
                {[...detail.findings]
                  .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
                  .map((f) => {
                    const agent = detail.agents?.find((a) => a.id === f.agentId);
                    return (
                      <div key={f.id} className="rounded-lg border border-[rgba(255,255,255,0.06)] p-2.5 bg-[rgba(255,255,255,0.02)]" data-testid={`finding-${f.id}`}>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <SeverityBadge severity={f.severity} />
                          <span className="text-xs font-semibold flex-1 min-w-0">{f.title}</span>
                          {agent && <span className="text-[10px] text-muted-foreground">{agent.name}{f.category ? ` · ${f.category}` : ""}</span>}
                        </div>
                        {f.evidence && <p className="text-[11px] text-muted-foreground mb-1"><span className="text-foreground/60 font-medium">Bewijs:</span> {f.evidence}</p>}
                        {f.impact && <p className="text-[11px] text-muted-foreground mb-1"><span className="text-foreground/60 font-medium">Impact:</span> {f.impact}</p>}
                        {f.remediation && (
                          <p className="text-[11px] text-green-300/90 flex items-start gap-1">
                            <Wrench className="w-3 h-3 mt-0.5 flex-shrink-0" /> {f.remediation}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function severityRank(severity: string): number {
  return ["kritiek", "hoog", "middel", "laag", "info"].indexOf(severity);
}
