import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Gotify-geïnspireerde meldingen: één query voor de lijst + een realtime
// WebSocket (gotify /stream) die nieuwe meldingen binnenduwt. Bij binnenkomst
// verversen we de query en tonen we een toast (behalve bij low-priority ruis).

export interface Notification {
  id: number;
  source: string;
  title: string;
  message: string;
  priority: number;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unread: number;
}

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60_000, // vangnet als de WebSocket wegvalt
  });
}

// Opent de realtime stream. Eén keer mounten (bv. in App). Herverbindt met
// exponentiële backoff als de verbinding wegvalt.
export function useNotificationStream() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closedRef.current) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const base = API_BASE || `${proto}//${window.location.host}`;
      const url = base.startsWith("http")
        ? base.replace(/^http/, "ws") + "/api/stream"
        : `${proto}//${window.location.host}/api/stream`;

      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => { retryRef.current = 0; };

      ws.onmessage = (event) => {
        let payload: any;
        try { payload = JSON.parse(event.data); } catch { return; }
        if (payload?.type !== "notification" || !payload.data) return;

        const n: Notification = payload.data;
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

        // Alleen normal/high (priority >= 4) verdient een pop-toast; low is ruis.
        if (n.priority >= 4) {
          toast({
            title: n.title,
            description: n.message,
            variant: n.priority >= 8 ? "destructive" : "default",
          });
        }
      };

      ws.onclose = () => scheduleReconnect();
      ws.onerror = () => { try { ws?.close(); } catch { /* noop */ } };
    };

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
      retryRef.current += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      closedRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws?.close(); } catch { /* noop */ }
    };
  }, [queryClient, toast]);
}
