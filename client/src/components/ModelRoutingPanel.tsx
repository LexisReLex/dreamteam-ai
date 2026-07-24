import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Cpu, Gift, ArrowUpRight, ShieldAlert, ExternalLink } from "lucide-react";

interface Candidate {
  providerId: string;
  provider: string;
  model: string;
  tier: "gratis" | "proeftegoed";
  rationale: string;
}

interface Routing {
  paidDefault: { provider: string; model: string };
  profile: string;
  profileLabel: string;
  needs: string;
  primary: Candidate;
  alternatives: Candidate[];
  escalation: string;
}

export default function ModelRoutingPanel({ agentId }: { agentId: number }) {
  const { data, isLoading } = useQuery<Routing>({
    queryKey: [`/api/agents/${agentId}/routing`],
  });

  if (isLoading) {
    return <div className="glass-card rounded-xl h-40 shimmer" />;
  }
  if (!data) return null;

  return (
    <div className="glass-card rounded-xl p-4" data-testid="model-routing-panel">
      <div className="flex items-center gap-1.5 mb-1">
        <Cpu className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold">Slimme model-routing</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)] text-primary">
          {data.profileLabel}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{data.needs}</p>

      {/* Primaire aanbeveling */}
      <div className="rounded-lg border border-green-400/20 bg-green-400/5 p-3 mb-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Gift className="w-3 h-3 text-green-400" />
          <span className="text-xs font-semibold text-green-300">Aanbevolen — {data.primary.provider}</span>
          <span className="text-[10px] px-1 py-0.5 rounded bg-green-400/10 text-green-300 border border-green-400/20">
            {data.primary.tier}
          </span>
        </div>
        <p className="text-xs font-medium">{data.primary.model}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{data.primary.rationale}</p>
      </div>

      {/* Alternatieven */}
      {data.alternatives.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {data.alternatives.map((alt) => (
            <div key={alt.providerId + alt.model} className="flex items-start gap-1.5 text-[11px]">
              <ArrowUpRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                <span className="text-foreground/80 font-medium">{alt.provider}</span> · {alt.model} — {alt.rationale}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Oranje licht: escalatie naar betaald model */}
      <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-2.5 mt-2">
        <div className="flex items-start gap-1.5">
          <ShieldAlert className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-yellow-200/90">
            {data.escalation}{" "}
            <span className="text-muted-foreground">
              (standaard: {data.paidDefault.provider} {data.paidDefault.model})
            </span>
          </p>
        </div>
      </div>

      <Link
        href="/free-llm"
        className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary"
      >
        <ExternalLink className="w-3 h-3" /> Bekijk de volledige provider-catalogus
      </Link>
    </div>
  );
}
