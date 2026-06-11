import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { getLucideIcon } from "@/lib/icons";
import { useLanguage } from "@/lib/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, Agent } from "@shared/schema";

interface TaskWithAgent extends Task { agent?: Agent; }

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Tasks() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [form, setForm] = useState({ agentId: "", title: "", description: "", priority: "medium" as "low" | "medium" | "high" });

  const COLUMNS = [
    { status: "pending",     labelKey: "col_pending" as const,     color: "text-yellow-400", border: "border-yellow-400/20", bg: "bg-yellow-400/5" },
    { status: "in_progress", labelKey: "col_in_progress" as const,  color: "text-blue-400",   border: "border-blue-400/20",   bg: "bg-blue-400/5"   },
    { status: "completed",   labelKey: "col_completed" as const,    color: "text-green-400",  border: "border-green-400/20", bg: "bg-green-400/5"  },
  ] as const;

  const { data: tasks, isLoading: tasksLoading } = useQuery<TaskWithAgent[]>({ queryKey: ["/api/tasks"] });
  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tasks", {
        agentId: parseInt(form.agentId), title: form.title, description: form.description, priority: form.priority, status: "pending",
      });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/tasks"] }); setOpen(false); setForm({ agentId: "", title: "", description: "", priority: "medium" }); },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { status });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

  const filtered = tasks?.filter((t) => filterAgent === "all" || String(t.agentId) === filterAgent) ?? [];

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-64 h-64 top-10 right-10 opacity-20" />
      <div className="orb-purple w-48 h-48 bottom-20 left-20 opacity-15" />

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("tasks_title")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t("tasks_subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-40 h-9 text-xs bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-filter-agent">
                <SelectValue placeholder={t("filter_all_agents")} />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                <SelectItem value="all">{t("filter_all_agents")}</SelectItem>
                {agents?.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-new-task">
                  <Plus className="w-4 h-4" />
                  {t("new_task")}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)] text-foreground">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("dialog_title")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{t("label_agent")}</Label>
                    <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                      <SelectTrigger className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-task-agent">
                        <SelectValue placeholder={t("placeholder_agent")} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                        {agents?.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name} — {a.role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{t("label_title")}</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder={t("placeholder_title")} className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-task-title" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{t("label_desc")}</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder={t("placeholder_desc")} className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-task-description" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{t("label_priority")}</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as "low" | "medium" | "high" })}>
                      <SelectTrigger className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                        <SelectItem value="low">{t("priority_low")}</SelectItem>
                        <SelectItem value="medium">{t("priority_medium")}</SelectItem>
                        <SelectItem value="high">{t("priority_high")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => createMutation.mutate()} disabled={!form.agentId || !form.title || createMutation.isPending}
                    className="w-full text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-create-task">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("create_task")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Kanban board */}
        {tasksLoading ? (
          <div className="grid grid-cols-3 gap-5">
            {COLUMNS.map((col) => <div key={col.status} className="glass-card rounded-xl p-4 h-64 shimmer" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map(({ status, labelKey, color, border, bg }) => {
              const colTasks = filtered.filter((t) => t.status === status);
              return (
                <div key={status} className={cn("rounded-xl border p-4", border, bg)} data-testid={`column-${status}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-semibold text-sm", color)} style={{ fontFamily: "'Clash Display', sans-serif" }}>{t(labelKey)}</span>
                      <span className={cn("w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold", color, bg.replace("/5", "/20"))}>{colTasks.length}</span>
                    </div>
                  </div>
                  <div className="space-y-3 min-h-[100px]">
                    {colTasks.length === 0 ? (
                      <div className="flex items-center justify-center h-16 text-xs text-muted-foreground border border-dashed border-[rgba(255,255,255,0.07)] rounded-lg">
                        {t("no_tasks")}
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <TaskCard key={task.id} task={task} onMove={(ns) => moveMutation.mutate({ id: task.id, status: ns })} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onMove }: { task: TaskWithAgent; onMove: (status: string) => void }) {
  const { t } = useLanguage();
  const PRIORITY_CONFIG = {
    low:    { labelKey: "priority_low" as const,    color: "text-green-400",  bg: "bg-green-400/10"  },
    medium: { labelKey: "priority_medium" as const, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    high:   { labelKey: "priority_high" as const,   color: "text-red-400",    bg: "bg-red-400/10"    },
  };
  const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
  const IconComponent = task.agent ? getLucideIcon(task.agent.avatarIcon) : null;
  const nextStatus = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : null;
  const nextLabel = nextStatus === "in_progress" ? t("move_start") : nextStatus === "completed" ? t("move_complete") : null;

  return (
    <div className="glass-card rounded-lg p-3.5 space-y-3 cursor-default hover:border-[rgba(59,130,246,0.3)] transition-all" data-testid={`task-card-${task.id}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0", priority.color, priority.bg)}>{t(priority.labelKey)}</span>
      </div>
      {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between">
        {task.agent && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: `${task.agent.avatarColor}25`, border: `1px solid ${task.agent.avatarColor}40` }}>
              {IconComponent && <IconComponent className="w-3 h-3" style={{ color: task.agent.avatarColor }} />}
            </div>
            <span className="text-xs text-muted-foreground">{task.agent.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{formatDate(task.createdAt)}</span>
        </div>
      </div>
      {nextStatus && (
        <button onClick={() => onMove(nextStatus)}
          className="w-full text-xs py-1.5 rounded-md border border-[rgba(59,130,246,0.2)] text-primary hover:bg-primary/10 transition-colors font-medium"
          data-testid={`button-move-task-${task.id}`}>
          → {nextLabel}
        </button>
      )}
    </div>
  );
}
