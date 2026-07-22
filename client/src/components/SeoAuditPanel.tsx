import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type Severity = "critical" | "high" | "medium" | "low";

interface Finding {
  category: string;
  severity: Severity;
  title: string;
  detail: string;
  recommendation: string;
}
interface CategoryScore {
  key: string;
  label: string;
  weight: number;
  score: number;
}
interface SeoReport {
  finalUrl: string;
  statusCode: number;
  healthScore: number;
  categories: CategoryScore[];
  findings: Finding[];
  disclaimer: string;
}

const SEVERITY_CFG: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: "Kritiek", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  high: { label: "Hoog", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
  medium: { label: "Middel", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  low: { label: "Laag", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

export default function SeoAuditPanel() {
  const [url, setUrl] = useState("");

  const audit = useMutation<SeoReport, Error, string>({
    mutationFn: async (target: string) => {
      const res = await apiRequest("POST", "/api/seo/analyze", { url: target });
      return res.json();
    },
  });

  const run = () => {
    const trimmed = url.trim();
    if (!trimmed || audit.isPending) return;
    audit.mutate(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  };

  const report = audit.data;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Search className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs font-semibold">SEO-audit</span>
      </div>

      <div className="flex gap-2 items-center glass-card rounded-xl p-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="voorbeeld.nl"
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none px-1"
          data-testid="input-seo-url"
        />
        <button
          onClick={run}
          disabled={!url.trim() || audit.isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
          data-testid="button-seo-scan"
        >
          {audit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Scan"}
        </button>
      </div>

      {audit.isError && (
        <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{audit.error.message.replace(/^\d+:\s*/, "")}</span>
        </div>
      )}

      {report && (
        <div className="mt-3 space-y-3" data-testid="seo-report">
          {/* Health score */}
          <div className="glass-card rounded-xl p-3 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                color: scoreColor(report.healthScore),
                border: `2px solid ${scoreColor(report.healthScore)}`,
                boxShadow: `0 0 16px ${scoreColor(report.healthScore)}40`,
              }}
              data-testid="seo-health-score"
            >
              {report.healthScore}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">SEO Health Score</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {report.finalUrl} · HTTP {report.statusCode}
              </p>
            </div>
          </div>

          {/* Category bars */}
          <div className="space-y-1.5">
            {report.categories.map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">{c.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.score}%`, background: scoreColor(c.score) }}
                  />
                </div>
                <span className="text-[11px] font-medium w-6 text-right" style={{ color: scoreColor(c.score) }}>
                  {c.score}
                </span>
              </div>
            ))}
          </div>

          {/* Findings */}
          {report.findings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Bevindingen ({report.findings.length})</p>
              {report.findings.slice(0, 8).map((f, i) => {
                const cfg = SEVERITY_CFG[f.severity];
                return (
                  <div key={i} className={`p-2.5 rounded-lg border text-xs ${cfg.bg}`} data-testid={`seo-finding-${i}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground">· {f.category}</span>
                    </div>
                    <p className="font-medium text-foreground">{f.title}</p>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{f.recommendation}</p>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed italic">{report.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
