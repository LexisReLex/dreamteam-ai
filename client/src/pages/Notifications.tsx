import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";

// Gotify-buckets voor de priority-schaal 0–10.
function bucket(priority: number): "min" | "low" | "normal" | "high" {
  if (priority <= 1) return "min";
  if (priority <= 3) return "low";
  if (priority <= 7) return "normal";
  return "high";
}

const BUCKET_STYLE: Record<string, { label: string; className: string }> = {
  high:   { label: "Hoog",     className: "bg-red-500/15 text-red-300 border-red-500/30" },
  normal: { label: "Normaal",  className: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  low:    { label: "Laag",     className: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  min:    { label: "Minimaal", className: "bg-slate-600/10 text-slate-400 border-slate-600/20" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} uur geleden`;
  return `${Math.floor(hrs / 24)} dagen geleden`;
}

export default function Notifications() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useNotifications();
  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

  const markRead = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: invalidate,
  });
  const clearAll = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/notifications"),
    onSuccess: invalidate,
  });

  const openNotification = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meldingen</h1>
              <p className="text-sm text-muted-foreground">
                {unread > 0 ? `${unread} ongelezen` : "Alles gelezen"} · realtime via WebSocket
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={unread === 0 || markAllRead.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-1.5" /> Alles gelezen
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => clearAll.mutate()}
              disabled={notifications.length === 0 || clearAll.isPending}
              data-testid="button-clear-all"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Wissen
            </Button>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Laden…</p>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nog geen meldingen.</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
              Loops sturen hier een melding zodra ze klaar zijn — een ESCALATE komt
              als hoge prioriteit binnen (de "Human gate").
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const b = bucket(n.priority);
              const style = BUCKET_STYLE[b];
              const Icon = b === "high" ? AlertTriangle : Info;
              return (
                <div
                  key={n.id}
                  data-testid={`notification-${n.id}`}
                  className={cn(
                    "group flex items-start gap-3 p-4 rounded-xl border transition-colors",
                    n.read
                      ? "bg-[#0b1220] border-[rgba(59,130,246,0.08)]"
                      : "bg-[rgba(59,130,246,0.06)] border-[rgba(59,130,246,0.2)]",
                  )}
                >
                  <div className={cn("mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border", style.className)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => openNotification(n)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      <span className="font-semibold text-foreground text-sm">{n.title}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", style.className)}>{style.label}</span>
                      {n.link && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 break-words">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/70">
                      <span className="font-mono">{n.source}</span>
                      <span>·</span>
                      <span>{timeAgo(n.createdAt)}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button
                        title="Markeer als gelezen"
                        onClick={() => markRead.mutate(n.id)}
                        className="p-1.5 rounded-md hover:bg-[rgba(59,130,246,0.12)] text-muted-foreground hover:text-primary"
                        data-testid={`button-read-${n.id}`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      title="Verwijderen"
                      onClick={() => remove.mutate(n.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                      data-testid={`button-delete-${n.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
