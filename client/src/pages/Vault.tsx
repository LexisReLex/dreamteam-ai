import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Trash2, BookOpen, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Knowledge } from "@shared/schema";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function parseTags(tags: string): string[] {
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function Vault() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });

  const { data: entries, isLoading } = useQuery<Knowledge[]>({ queryKey: ["/api/knowledge"] });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/knowledge"] });
    qc.invalidateQueries({ queryKey: ["/api/orchestrator"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/knowledge", {
        title: form.title,
        content: form.content,
        tags: form.tags,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ title: "", content: "", tags: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/knowledge/${id}`); },
    onSuccess: () => invalidate(),
  });

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-64 h-64 top-10 right-10 opacity-20" />
      <div className="orb-purple w-48 h-48 bottom-20 left-20 opacity-15" />

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {t("nav_vault")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 max-w-xl">
              Duurzame kennisbronnen die de CEO/Orchestrator en de specialisten raadplegen (de "READS").
              Zet hier je bedrijfscontext, merkstem, aanbod en feiten neer — elke opdracht leest de meest
              relevante stukken automatisch mee.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-new-knowledge">
                <Plus className="w-4 h-4" /> Kennis toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)] text-foreground max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "'Clash Display', sans-serif" }}>Nieuwe kennisbron</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Titel</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="bv. Bedrijfsprofiel, Merkstem, Aanbod & prijzen" maxLength={120}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-knowledge-title" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Inhoud</Label>
                  <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="De feiten, context of richtlijnen die agents moeten kennen. Concreet en to-the-point."
                    maxLength={8000} rows={7}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary resize-none" data-testid="input-knowledge-content" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Labels (komma-gescheiden, optioneel)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="bv. merk, sales, doelgroep" maxLength={200}
                    className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-knowledge-tags" />
                </div>
                <Button onClick={() => createMutation.mutate()}
                  disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}
                  className="w-full text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-create-knowledge">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Opslaan in Vault"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="glass-card rounded-xl h-24 shimmer" />)}
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">De Vault is nog leeg. Voeg je eerste kennisbron toe.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((k) => (
              <div key={k.id} className="glass-card rounded-xl p-4 hover:border-[rgba(59,130,246,0.3)] transition-all" data-testid={`knowledge-${k.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)]">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{k.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{k.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {parseTags(k.tags).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium text-blue-300 bg-blue-400/10 border border-blue-400/20">
                          <Tag className="w-2.5 h-2.5" /> {tag}
                        </span>
                      ))}
                      <span className="text-[10px] text-muted-foreground/70 ml-auto">{formatWhen(k.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(k.id)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === k.id}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                    data-testid={`button-delete-knowledge-${k.id}`} aria-label="Verwijder kennisbron"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === k.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
