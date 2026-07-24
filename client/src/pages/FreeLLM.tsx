import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Search, ExternalLink, Gift, CreditCard, Cpu, Info, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LlmProvider } from "@shared/freeLlmProviders";

interface ProviderSummary {
  total: number;
  free: number;
  trial: number;
  models: number;
  source: string;
  snapshotDate: string;
}

interface ProvidersResponse {
  summary: ProviderSummary;
  providers: LlmProvider[];
}

type Filter = "all" | "free" | "trial";

export default function FreeLLM() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery<ProvidersResponse>({
    queryKey: ["/api/free-llm-providers"],
  });

  const providers = useMemo(() => {
    const list = data?.providers ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((p) => {
      if (filter !== "all" && p.category !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.models.some((m) => m.name.toLowerCase().includes(q))
      );
    });
  }, [data, filter, query]);

  const summary = data?.summary;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Alles" },
    { key: "free", label: "Gratis tier" },
    { key: "trial", label: "Proeftegoed" },
  ];

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-64 h-64 top-10 right-10 opacity-20" />
      <div className="orb-purple w-48 h-48 bottom-20 left-20 opacity-15" />

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Gratis LLM API's
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 max-w-2xl">
            Providers die gratis toegang of tegoeden bieden voor API-gebruik van taalmodellen.
            De kennisbasis waarmee DreamTeam werk naar een geschikte, goedkopere provider kan routeren —
            binnen dezelfde kostenbewaking als de agent-loops.
          </p>
        </div>

        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
            <StatTile icon={Cpu} label="Providers" value={summary.total} />
            <StatTile icon={Gift} label="Gratis tier" value={summary.free} />
            <StatTile icon={CreditCard} label="Proeftegoed" value={summary.trial} />
            <StatTile icon={Sparkles} label="Modellen (regels)" value={summary.models} />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="inline-flex rounded-lg border border-[rgba(59,130,246,0.2)] overflow-hidden">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                data-testid={`filter-${f.key}`}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f.key
                    ? "bg-[rgba(59,130,246,0.15)] text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-[rgba(59,130,246,0.06)]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek provider of model…"
              data-testid="input-search-provider"
              className="w-full h-8 pl-8 pr-3 text-sm rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(59,130,246,0.2)] focus:border-primary outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="glass-card rounded-xl h-40 shimmer" />)}
          </div>
        ) : providers.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Geen providers gevonden voor deze filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
          </div>
        )}

        {/* Source footer */}
        {summary && (
          <div className="mt-6 flex items-start gap-2 text-[11px] text-muted-foreground/80">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>
              Cijfers zijn een geverifieerde momentopname (
              <span className="text-foreground/80">{summary.snapshotDate}</span>) uit{" "}
              <a href={summary.source} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                cheahjs/free-llm-api-resources
              </a>
              . Limieten en modellen bij de bronnen kunnen wijzigen — controleer altijd bij de provider zelf.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="glass-card rounded-xl p-3 flex items-center gap-3" data-testid={`stat-${label}`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)]">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function ProviderCard({ provider: p }: { provider: LlmProvider }) {
  const isFree = p.category === "free";
  return (
    <div className="glass-card rounded-xl p-4 hover:border-[rgba(59,130,246,0.3)] transition-all flex flex-col" data-testid={`provider-card-${p.id}`}>
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{p.name}</h3>
            <span className={cn(
              "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-semibold border",
              isFree
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
            )}>
              {isFree ? <Gift className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
              {isFree ? "Gratis" : "Proeftegoed"}
            </span>
          </div>
        </div>
        <a
          href={p.url}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-[rgba(59,130,246,0.08)] transition-colors flex-shrink-0"
          data-testid={`link-provider-${p.id}`}
          aria-label={`Open ${p.name}`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Limits / credits */}
      {(p.limits || p.credits) && (
        <div className="flex items-start gap-1.5 mb-2 text-[11px] text-blue-200/90">
          <Zap className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary" />
          <span>{isFree ? p.limits : p.credits}</span>
        </div>
      )}

      {p.requirements && (
        <p className="text-[11px] text-yellow-300/80 mb-1">⚠ {p.requirements}</p>
      )}
      {p.notes && (
        <p className="text-[11px] text-muted-foreground mb-2">{p.notes}</p>
      )}

      {/* Models */}
      <div className="mt-auto pt-2 border-t border-[rgba(255,255,255,0.05)]">
        <div className="flex flex-wrap gap-1">
          {p.models.map((m, i) => (
            <span
              key={i}
              title={m.limits || undefined}
              className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-foreground/80"
            >
              {m.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
