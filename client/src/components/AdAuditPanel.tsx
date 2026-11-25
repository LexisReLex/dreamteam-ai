import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Megaphone, Loader2, AlertCircle } from "lucide-react";

type Status = "ok" | "let_op" | "probleem" | "onbekend" | "niet_van_toepassing" | "te_weinig_data";

interface Advice {
  evidence: string;
  mechanism: string;
  nextStep: string;
  measureWindow: string;
  rollback: string;
}
interface Control {
  id: string;
  sourceId: string;
  title: string;
  status: Status;
  detail: string;
  advice?: Advice;
}
interface AdRank {
  ad: string;
  adset?: string;
  spend: number;
  impressions: number;
  ctr?: number;
  costPerResult?: number;
  resultType?: string;
  judged: boolean;
}
interface Report {
  rowsRead: number;
  coverage: number;
  totals: { spend: number; impressions: number; clicks?: number };
  controls: Control[];
  ads: AdRank[];
  notes: string[];
}

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  probleem: { label: "Probleem", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  let_op: { label: "Let op", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
  ok: { label: "In orde", color: "text-green-400", bg: "bg-green-400/10 border-green-400/20" },
  te_weinig_data: { label: "Te weinig data", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  onbekend: { label: "Onbekend", color: "text-muted-foreground", bg: "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]" },
  niet_van_toepassing: { label: "N.v.t.", color: "text-muted-foreground", bg: "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]" },
};

const ORDER: Status[] = ["probleem", "let_op", "te_weinig_data", "ok", "onbekend", "niet_van_toepassing"];
const eur = (x: number) => `€${x.toFixed(2).replace(".", ",")}`;

export default function AdAuditPanel() {
  const [csv, setCsv] = useState("");

  const audit = useMutation<Report, Error, string>({
    mutationFn: async (body: string) => {
      const res = await fetch("/api/ad-audit/meta", { method: "POST", headers: { "Content-Type": "text/csv" }, body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      return res.json();
    },
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setCsv(await file.text());
  };

  const report = audit.data;
  const controls = report ? [...report.controls].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)) : [];

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Megaphone className="w-3.5 h-3.5 text-pink-400" />
        <span className="text-xs font-semibold">Advertentiecontrole (Meta)</span>
      </div>

      <div className="glass-card rounded-xl p-2 space-y-2">
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="Plak hier de export uit Advertentiebeheer (CSV), of kies een bestand."
          rows={4}
          className="w-full bg-transparent text-[11px] font-mono text-foreground placeholder:text-muted-foreground outline-none px-1 resize-y"
          data-testid="input-ad-csv"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="flex-1 min-w-0 text-[11px] text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-[rgba(255,255,255,0.06)] file:px-2 file:py-1 file:text-[11px] file:text-foreground"
            data-testid="input-ad-file"
          />
          <button
            onClick={() => csv.trim() && !audit.isPending && audit.mutate(csv)}
            disabled={!csv.trim() || audit.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #ec4899, #db2777)" }}
            data-testid="button-ad-audit"
          >
            {audit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Controleer"}
          </button>
        </div>
      </div>

      {audit.isError && (
        <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{audit.error.message}</span>
        </div>
      )}

      {report && (
        <div className="mt-3 space-y-3" data-testid="ad-report">
          <div className="glass-card rounded-xl p-3 text-xs">
            <p className="font-semibold">
              {report.rowsRead} rijen · {eur(report.totals.spend)} · {report.totals.impressions.toLocaleString("nl-NL")} vertoningen
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Dekking: {Math.round(report.coverage * 100)}% van de controles kon beoordeeld worden. Geen totaalscore, met opzet.
            </p>
          </div>

          <div className="space-y-2">
            {controls.map((c) => {
              const cfg = STATUS_CFG[c.status];
              return (
                <div key={c.id} className={`p-2.5 rounded-lg border text-xs ${cfg.bg}`} data-testid={`ad-control-${c.id}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground">· {c.sourceId}</span>
                  </div>
                  <p className="font-medium text-foreground">{c.title}</p>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed [overflow-wrap:anywhere]">{c.detail}</p>
                  {c.advice && (
                    <div className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed [overflow-wrap:anywhere]">
                      <p><span className="text-foreground">Waarom:</span> <span className="text-muted-foreground">{c.advice.mechanism}</span></p>
                      <p><span className="text-foreground">Volgende stap:</span> <span className="text-muted-foreground">{c.advice.nextStep}</span></p>
                      <p><span className="text-foreground">Meten:</span> <span className="text-muted-foreground">{c.advice.measureWindow}</span></p>
                      <p><span className="text-foreground">Terugdraaien als:</span> <span className="text-muted-foreground">{c.advice.rollback}</span></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {report.ads.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold">Advertenties</p>
              {report.ads.slice(0, 12).map((a) => (
                <div key={a.ad} className={`flex items-center gap-2 text-[11px] ${a.judged ? "" : "opacity-50"}`}>
                  <span className="flex-1 truncate">{a.ad}</span>
                  <span className="text-muted-foreground">{a.impressions.toLocaleString("nl-NL")} vert.</span>
                  {a.ctr !== undefined && <span className="text-muted-foreground">CTR {(a.ctr * 100).toFixed(2).replace(".", ",")}%</span>}
                  {a.costPerResult !== undefined && <span>{eur(a.costPerResult)}/{a.resultType ?? "resultaat"}</span>}
                  {!a.judged && <span className="text-blue-400">nog niet beoordelen</span>}
                </div>
              ))}
            </div>
          )}

          <ul className="text-[10px] text-muted-foreground leading-relaxed italic list-disc pl-4 space-y-0.5">
            {report.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
