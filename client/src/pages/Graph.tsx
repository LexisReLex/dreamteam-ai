import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Loader2, Trash2, Network, ArrowLeft, Zap, Sparkles, Search,
  GitBranch, FileText, Route as RouteIcon, X,
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
import type { Agent, Graph, GraphNode, GraphEdge } from "@shared/schema";

interface GraphListItem extends Omit<Graph, "nodesJson" | "edgesJson" | "report" | "source"> { agent?: Agent | null; }
interface GraphDetail extends Omit<Graph, "nodesJson" | "edgesJson"> { agent?: Agent | null; nodes: GraphNode[]; edges: GraphEdge[]; }
interface Budget { used: number; limit: number; remaining: number; resetAt: string; }

// Kleurenpalet per cluster (community) — sluit aan op de agent-avatar-tinten.
const COMMUNITY_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#22c55e", "#f97316",
  "#ec4899", "#eab308", "#14b8a6", "#6366f1", "#f43f5e",
];
const colorFor = (community: number) => COMMUNITY_COLORS[community % COMMUNITY_COLORS.length];

// Startsjablonen — kant-en-klare bronteksten om meteen een graaf te bouwen.
const TEMPLATES = [
  {
    agentName: "Atlas", title: "Groeiplan Q3",
    source:
      "Ons doel dit kwartaal is 20% meer omzet. De belangrijkste hefboom is de zomercampagne die zich richt op MKB-ondernemers. De campagne gebruikt LinkedIn-advertenties en e-mailmarketing. E-mailmarketing hangt af van onze nieuwsbrief-lijst, die de afgelopen maanden gegroeid is dankzij een gratis whitepaper. De whitepaper trekt vooral leads uit de retail-sector. Sales volgt de leads op via een nieuw CRM. Het CRM moet gekoppeld worden aan onze facturatie. Finn waarschuwt dat de advertentiebudgetten de cashflow onder druk zetten.",
  },
  {
    agentName: "Nova", title: "Merkstrategie",
    source:
      "Ons merk staat voor betrouwbaarheid en innovatie. De doelgroep bestaat uit ambitieuze ondernemers tussen 30 en 50. Onze kernboodschap is 'groei zonder gedoe'. Content marketing ondersteunt de boodschap via blogs en video. De blogs verbeteren onze SEO. SEO leidt tot meer organisch verkeer. Organisch verkeer voedt de sales-pipeline. Social media versterkt het merk op LinkedIn en Instagram.",
  },
  {
    agentName: "Orion", title: "Jaardoelen (OKR)",
    source:
      "Onze visie is marktleider worden in Nederland. Doel 1: klanttevredenheid naar 90% (NPS). Doel 2: 500 nieuwe klanten. Doel 3: een tweede product lanceren. Het tweede product bouwt voort op onze bestaande data-infrastructuur. Klanttevredenheid hangt samen met de kwaliteit van support. Support wordt geschaald met een nieuw team. Het nieuwe team vereist recruitment. Recruitment kost budget dat concurreert met productontwikkeling.",
  },
];

export default function GraphPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ agentId: "", title: "", source: "" });

  const { data: graphs, isLoading } = useQuery<GraphListItem[]>({ queryKey: ["/api/graphs"] });
  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });
  const { data: budget } = useQuery<Budget>({ queryKey: ["/api/budget"] });

  // Standaard-mapper: Atlas (Data Analist) past het best bij grafiek-werk.
  useEffect(() => {
    if (!form.agentId && agents?.length) {
      const atlas = agents.find((a) => a.name.toLowerCase() === "atlas");
      setForm((f) => ({ ...f, agentId: String(atlas?.id ?? agents[0].id) }));
    }
  }, [agents]); // eslint-disable-line

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/graphs"] });
    qc.invalidateQueries({ queryKey: ["/api/budget"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/graphs", {
        agentId: parseInt(form.agentId),
        title: form.title,
        source: form.source,
      });
      return res.json();
    },
    onSuccess: (graph: GraphDetail) => {
      invalidate();
      setOpen(false);
      setForm((f) => ({ ...f, title: "", source: "" }));
      if (graph?.id) setSelectedId(graph.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/graphs/${id}`); },
    onSuccess: (_d, id) => { invalidate(); if (selectedId === id) setSelectedId(null); },
  });

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    const agent = agents?.find((a) => a.name.toLowerCase() === tpl.agentName.toLowerCase());
    setForm({ agentId: agent ? String(agent.id) : form.agentId, title: tpl.title, source: tpl.source });
    setOpen(true);
  };

  const budgetPct = budget ? Math.min(100, Math.round((budget.used / budget.limit) * 100)) : 0;

  // ── Detailweergave van één graaf ──
  if (selectedId != null) {
    return <GraphDetailView id={selectedId} onBack={() => setSelectedId(null)} onDelete={() => deleteMutation.mutate(selectedId)} />;
  }

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-64 h-64 top-10 right-10 opacity-20" />
      <div className="orb-purple w-48 h-48 bottom-20 left-20 opacity-15" />

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {t("nav_graph")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 max-w-xl">
              Zet je notities, plannen of documenten om in een <span className="text-primary">bevraagbare kennisgraaf</span> in
              plaats van te zoeken door platte tekst. Een agent brengt de concepten in kaart, elk verband krijgt een
              vertrouwenslabel (EXTRACTED · INFERRED · AMBIGUOUS).
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-new-graph">
                <Plus className="w-4 h-4" /> Nieuwe graaf
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)] text-foreground max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "'Clash Display', sans-serif" }}>Nieuwe kennisgraaf</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Mapper-agent</Label>
                  <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                    <SelectTrigger className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-graph-agent">
                      <SelectValue placeholder="Kies een agent" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                      {agents?.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name} — {a.role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Titel</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="bv. Groeiplan Q3" maxLength={120}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-graph-title" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Brontekst (notities, plan, document)</Label>
                  <Textarea value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="Plak hier je tekst. De agent haalt de concepten en verbanden eruit…"
                    maxLength={8000} rows={8}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary resize-none" data-testid="input-graph-source" />
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">{form.source.length} / 8000</p>
                </div>
                <Button onClick={() => createMutation.mutate()}
                  disabled={!form.agentId || !form.title || form.source.trim().length < 20 || createMutation.isPending}
                  className="w-full text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-create-graph">
                  {createMutation.isPending
                    ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Graaf bouwen…</span>
                    : "Bouw kennisgraaf"}
                </Button>
                {createMutation.isError && (
                  <p className="text-xs text-red-400">Bouwen mislukt. Mogelijk is het dagbudget bereikt — probeer het later opnieuw.</p>
                )}
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

        {/* Startsjablonen */}
        {agents && agents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Startsjablonen</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TEMPLATES.map((tpl) => {
                const agent = agents.find((a) => a.name.toLowerCase() === tpl.agentName.toLowerCase());
                const Icon = agent ? getLucideIcon(agent.avatarIcon) : null;
                const color = agent?.avatarColor ?? "#3b82f6";
                return (
                  <button key={tpl.title} onClick={() => applyTemplate(tpl)}
                    className="text-left glass-card rounded-xl p-3 hover:border-[rgba(59,130,246,0.35)] transition-all group"
                    data-testid={`template-${tpl.title}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                        {Icon && <Icon className="w-3 h-3" style={{ color }} />}
                      </div>
                      <span className="text-sm font-medium flex-1 min-w-0 truncate">{tpl.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{tpl.source}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary/80 group-hover:text-primary">
                      <Plus className="w-2.5 h-2.5" /> {tpl.agentName} · gebruik sjabloon
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Graaf-lijst */}
        {isLoading ? (
          <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="glass-card rounded-xl h-20 shimmer" />)}</div>
        ) : !graphs || graphs.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <Network className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nog geen grafen. Bouw je eerste kennisgraaf uit een tekst.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {graphs.map((g) => {
              const Icon = g.agent ? getLucideIcon(g.agent.avatarIcon) : null;
              const color = g.agent?.avatarColor ?? "#3b82f6";
              return (
                <div key={g.id} className="glass-card rounded-xl p-4 hover:border-[rgba(59,130,246,0.3)] transition-all flex items-center gap-3" data-testid={`graph-card-${g.id}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                    {Icon ? <Icon className="w-4 h-4" style={{ color }} /> : <Network className="w-4 h-4" style={{ color }} />}
                  </div>
                  <button className="flex-1 min-w-0 text-left" onClick={() => setSelectedId(g.id)} data-testid={`button-open-graph-${g.id}`}>
                    <h3 className="text-sm font-semibold truncate">{g.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {g.nodeCount} concepten · {g.edgeCount} verbanden · {g.communityCount} clusters · door {g.agent?.name ?? "agent"}
                    </p>
                  </button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(g.id)}
                    className="h-7 gap-1.5 text-xs border-[rgba(59,130,246,0.25)] text-primary hover:bg-primary/10" data-testid={`button-view-graph-${g.id}`}>
                    <Network className="w-3 h-3" /> Bekijk
                  </Button>
                  <button onClick={() => deleteMutation.mutate(g.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    data-testid={`button-delete-graph-${g.id}`} aria-label="Verwijder graaf">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detailweergave ────────────────────────────────────────────────────────────
function GraphDetailView({ id, onBack, onDelete }: { id: number; onBack: () => void; onDelete: () => void }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [pathFrom, setPathFrom] = useState("");
  const [pathTo, setPathTo] = useState("");
  const [pathIds, setPathIds] = useState<string[] | null>(null);
  const [pathLabels, setPathLabels] = useState<string[] | null>(null);

  const { data: graph, isLoading } = useQuery<GraphDetail>({ queryKey: ["/api/graphs", String(id)] });

  const pathMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/graphs/${id}/path`, { from: pathFrom, to: pathTo });
      return res.json();
    },
    onSuccess: (d: { path: string[] | null; labels: string[] | null }) => {
      setPathIds(d.path);
      setPathLabels(d.labels);
      setSelectedNode(null);
    },
  });

  if (isLoading || !graph) {
    return (
      <div className="relative min-h-full mesh-bg grid-pattern">
        <div className="relative z-10 p-6 max-w-5xl mx-auto">
          <Button size="sm" variant="ghost" onClick={onBack} className="mb-4 gap-1.5 text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Terug</Button>
          <div className="glass-card rounded-xl h-96 shimmer" />
        </div>
      </div>
    );
  }

  const explain = selectedNode
    ? {
        node: graph.nodes.find((n) => n.id === selectedNode),
        connections: graph.edges
          .filter((e) => e.source === selectedNode || e.target === selectedNode)
          .map((e) => {
            const outward = e.source === selectedNode;
            const otherId = outward ? e.target : e.source;
            return {
              otherId,
              otherLabel: graph.nodes.find((n) => n.id === otherId)?.label ?? otherId,
              relation: e.relation,
              confidence: e.confidence,
              direction: outward ? ("out" as const) : ("in" as const),
            };
          }),
      }
    : null;

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-64 h-64 top-10 right-10 opacity-20" />
      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Button size="sm" variant="ghost" onClick={onBack} className="gap-1.5 text-muted-foreground" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" /> Terug
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold gradient-text truncate" style={{ fontFamily: "'Clash Display', sans-serif" }}>{graph.title}</h1>
              <p className="text-[11px] text-muted-foreground">
                {graph.nodeCount} concepten · {graph.edgeCount} verbanden · {graph.communityCount} clusters
              </p>
            </div>
          </div>
          <button onClick={onDelete}
            className="p-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors" aria-label="Verwijder graaf" data-testid="button-delete-detail">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {graph.nodes.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <Network className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Deze graaf bevat geen concepten. De brontekst was mogelijk te kort of te vaag.</p>
          </div>
        ) : (
          <>
            {/* Canvas + legenda */}
            <div className="glass-card rounded-xl p-2 mb-4 relative overflow-hidden">
              <GraphCanvas nodes={graph.nodes} edges={graph.edges} selectedNode={selectedNode} pathIds={pathIds} onSelectNode={(nid) => { setSelectedNode(nid); setPathIds(null); setPathLabels(null); }} />
              <Legend communityCount={graph.communityCount} />
            </div>

            {/* Tools + rapport */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                {/* Kortste pad */}
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RouteIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Kortste pad</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <NodeSelect nodes={graph.nodes} value={pathFrom} onChange={setPathFrom} placeholder="Van…" testid="select-path-from" />
                    <NodeSelect nodes={graph.nodes} value={pathTo} onChange={setPathTo} placeholder="Naar…" testid="select-path-to" />
                  </div>
                  <Button size="sm" onClick={() => pathMutation.mutate()} disabled={!pathFrom || !pathTo || pathFrom === pathTo || pathMutation.isPending}
                    className="w-full h-8 text-xs text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-trace-path">
                    {pathMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><GitBranch className="w-3 h-3 mr-1" /> Traceer verbinding</>}
                  </Button>
                  {pathMutation.isSuccess && (
                    <div className="mt-3 text-xs" data-testid="path-result">
                      {pathLabels && pathLabels.length ? (
                        <p className="text-foreground/90">
                          {pathLabels.map((l, i) => (
                            <span key={i}>
                              <span className="font-medium text-primary">{l}</span>
                              {i < pathLabels.length - 1 && <span className="text-muted-foreground"> → </span>}
                            </span>
                          ))}
                          <span className="block text-[10px] text-muted-foreground mt-1">{pathLabels.length - 1} stap(pen)</span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Geen verbinding tussen deze concepten — ze zitten in losse clusters.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Node uitleg (explain) */}
                {explain?.node && (
                  <div className="glass-card rounded-xl p-4" data-testid="explain-panel">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colorFor(explain.node.community) }} />
                        <h3 className="text-sm font-semibold truncate">{explain.node.label}</h3>
                      </div>
                      <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Cluster {explain.node.community + 1} · {explain.connections.length} verbinding{explain.connections.length === 1 ? "" : "en"}
                    </p>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {explain.connections.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">{c.direction === "out" ? "→" : "←"}</span>
                          <button className="font-medium text-primary hover:underline truncate" onClick={() => setSelectedNode(c.otherId)}>{c.otherLabel}</button>
                          <span className="text-muted-foreground truncate">{c.relation}</span>
                          <ConfidenceTag confidence={c.confidence} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!explain && (
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Search className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-[11px] text-muted-foreground">Klik op een concept in de graaf om de verbindingen te bekijken.</p>
                  </div>
                )}
              </div>

              {/* Rapport */}
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Rapport</h3>
                </div>
                <div className="max-h-[28rem] overflow-y-auto pr-1">
                  <ReportView markdown={graph.report} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Force-directed SVG canvas ─────────────────────────────────────────────────
const W = 800;
const H = 460;

function GraphCanvas({ nodes, edges, selectedNode, pathIds, onSelectNode }: {
  nodes: GraphNode[]; edges: GraphEdge[]; selectedNode: string | null; pathIds: string[] | null;
  onSelectNode: (id: string) => void;
}) {
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const posRef = useRef<Record<string, { x: number; y: number; vx: number; vy: number }>>({});

  useEffect(() => {
    // Init: nodes op een cirkel met een lichte, deterministische spreiding.
    const N = nodes.length || 1;
    const p: Record<string, { x: number; y: number; vx: number; vy: number }> = {};
    nodes.forEach((n, i) => {
      const angle = (i / N) * 2 * Math.PI;
      const r = Math.min(W, H) * 0.32 * (0.6 + 0.4 * ((i * 37) % 100) / 100);
      p[n.id] = { x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r, vx: 0, vy: 0 };
    });
    posRef.current = p;

    const idList = nodes.map((n) => n.id);
    let raf = 0;
    let ticks = 0;
    const REPULSION = 2600;
    const SPRING_LEN = 78;
    const SPRING_K = 0.02;
    const CENTER_K = 0.008;
    const DAMP = 0.86;

    const step = () => {
      const cur = posRef.current;
      // Afstoting tussen alle paren.
      for (let i = 0; i < idList.length; i++) {
        const a = cur[idList[i]];
        for (let j = i + 1; j < idList.length; j++) {
          const b = cur[idList[j]];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 0.01;
          const f = REPULSION / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        }
      }
      // Aantrekking langs edges (veren).
      for (const e of edges) {
        const a = cur[e.source], b = cur[e.target];
        if (!a || !b) continue;
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - SPRING_LEN) * SPRING_K;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
      // Centreren + integreren + dempen + binnen de rand houden.
      for (const id of idList) {
        const n = cur[id];
        n.vx += (W / 2 - n.x) * CENTER_K;
        n.vy += (H / 2 - n.y) * CENTER_K;
        n.vx *= DAMP; n.vy *= DAMP;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(24, Math.min(W - 24, n.x));
        n.y = Math.max(24, Math.min(H - 24, n.y));
      }
      const snap: Record<string, { x: number; y: number }> = {};
      for (const id of idList) snap[id] = { x: cur[id].x, y: cur[id].y };
      setPos(snap);

      ticks++;
      if (ticks < 260) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges]);

  const pathSet = useMemo(() => new Set(pathIds ?? []), [pathIds]);
  const pathEdgeKey = useMemo(() => {
    const s = new Set<string>();
    if (pathIds) for (let i = 0; i < pathIds.length - 1; i++) { s.add(`${pathIds[i]}|${pathIds[i + 1]}`); s.add(`${pathIds[i + 1]}|${pathIds[i]}`); }
    return s;
  }, [pathIds]);

  const ready = Object.keys(pos).length === nodes.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" style={{ maxHeight: "60vh" }} data-testid="graph-canvas">
      {!ready && <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-muted-foreground" fontSize="13">Graaf uitlijnen…</text>}
      {ready && (
        <>
          {/* Edges */}
          {edges.map((e, i) => {
            const a = pos[e.source], b = pos[e.target];
            if (!a || !b) return null;
            const onPath = pathEdgeKey.has(`${e.source}|${e.target}`);
            const dash = e.confidence === "EXTRACTED" ? undefined : e.confidence === "INFERRED" ? "5 4" : "2 4";
            const stroke = onPath ? "#f0abfc" : e.confidence === "AMBIGUOUS" ? "#eab308" : "rgba(148,163,184,0.35)";
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={onPath ? 2.5 : 1.2} strokeDasharray={dash} />;
          })}
          {/* Nodes */}
          {nodes.map((n) => {
            const p = pos[n.id];
            if (!p) return null;
            const r = Math.max(6, Math.min(20, 6 + n.degree * 2));
            const isSel = selectedNode === n.id;
            const onPath = pathSet.has(n.id);
            const color = colorFor(n.community);
            return (
              <g key={n.id} onClick={() => onSelectNode(n.id)} style={{ cursor: "pointer" }} data-testid={`graph-node-${n.id}`}>
                {(isSel || onPath) && <circle cx={p.x} cy={p.y} r={r + 4} fill="none" stroke={onPath ? "#f0abfc" : "#fff"} strokeWidth={1.5} opacity={0.9} />}
                <circle cx={p.x} cy={p.y} r={r} fill={color} fillOpacity={0.9} stroke={color} strokeWidth={1.5} />
                <text x={p.x} y={p.y - r - 4} textAnchor="middle" fontSize={r >= 12 ? 11 : 9}
                  className="fill-foreground" style={{ paintOrder: "stroke", stroke: "#060b18", strokeWidth: 3, strokeLinejoin: "round" }}>
                  {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
                </text>
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
}

function Legend({ communityCount }: { communityCount: number }) {
  return (
    <div className="absolute bottom-2 left-2 flex flex-col gap-1 bg-[rgba(6,11,24,0.75)] rounded-lg px-2.5 py-2 border border-[rgba(255,255,255,0.06)] backdrop-blur-sm">
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="rgba(148,163,184,0.7)" strokeWidth="1.5" /></svg>EXTRACTED</span>
        <span className="flex items-center gap-1"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="rgba(148,163,184,0.7)" strokeWidth="1.5" strokeDasharray="5 4" /></svg>INFERRED</span>
        <span className="flex items-center gap-1"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#eab308" strokeWidth="1.5" strokeDasharray="2 4" /></svg>AMBIGUOUS</span>
      </div>
      <span className="text-[9px] text-muted-foreground/70">{communityCount} cluster{communityCount === 1 ? "" : "s"} · groottes = aantal verbindingen</span>
    </div>
  );
}

function NodeSelect({ nodes, value, onChange, placeholder, testid }: {
  nodes: GraphNode[]; value: string; onChange: (v: string) => void; placeholder: string; testid: string;
}) {
  const sorted = useMemo(() => [...nodes].sort((a, b) => a.label.localeCompare(b.label)), [nodes]);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid={testid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)] max-h-64">
        {sorted.map((n) => <SelectItem key={n.id} value={n.id} className="text-xs">{n.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ConfidenceTag({ confidence }: { confidence: GraphEdge["confidence"] }) {
  const map: Record<string, string> = {
    EXTRACTED: "text-green-400 bg-green-400/10 border-green-400/20",
    INFERRED: "text-blue-300 bg-blue-400/10 border-blue-400/20",
    AMBIGUOUS: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  };
  return <span className={cn("ml-auto text-[8px] px-1 py-0.5 rounded font-semibold border flex-shrink-0", map[confidence])}>{confidence}</span>;
}

// Minimalistische markdown-render voor het rapport (#, ##, - , **bold**).
function ReportView({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>,
    );
  };
  return (
    <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h2 key={i} className="text-base font-bold gradient-text mt-1" style={{ fontFamily: "'Clash Display', sans-serif" }}>{line.slice(2)}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="text-xs font-semibold text-foreground uppercase tracking-wide mt-3">{line.slice(3)}</h3>;
        if (line.startsWith("- ")) return <div key={i} className="flex gap-1.5 pl-1"><span className="text-primary">•</span><span>{renderInline(line.slice(2))}</span></div>;
        if (line.trim() === "") return <div key={i} className="h-0.5" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
