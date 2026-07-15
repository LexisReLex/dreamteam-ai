#!/bin/bash
# dispatch-window.sh — opent het dagelijkse dispatch-venster: start de thin
# HTTP-endpoint (src/dispatch/http.ts) + de named Cloudflare-tunnel, houdt ze
# WINDOW_SECONDS open (30 min, ruimte voor de run + retries) en stopt beide
# netjes. Wordt éénmalig per dag gestart door launchd, net vóór het run-moment.
#
# Ontworpen om via launchd te draaien met een kale PATH: alle binaries absoluut
# of via de geëxporteerde PATH hieronder. Repo-pad wordt uit de scriptlocatie
# afgeleid, dus geen hardgecodeerde paden met spaties.
set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

PORT="${DISPATCH_HTTP_PORT:-8787}"
WINDOW_SECONDS="${WINDOW_SECONDS:-1800}"        # 30 min
TUNNEL_NAME="${TUNNEL_NAME:-dispatch-mac}"
CF_CONFIG="$REPO/deploy/cloudflared/config.yml"

# Optioneel token voor een dashboard-managed tunnel (route B, cert-loos).
# Leg CF_TUNNEL_TOKEN=... in deploy/tunnel.env (gitignored) als je die route kiest.
[ -f "$REPO/deploy/tunnel.env" ] && . "$REPO/deploy/tunnel.env"
LOG_DIR="$REPO/out/dispatch"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/window.log"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*" | tee -a "$LOG"; }

SERVE_PID=""
TUNNEL_PID=""

cleanup() {
  log "venster sluit — endpoint + tunnel stoppen"
  for pid in "$SERVE_PID" "$TUNNEL_PID"; do
    [ -n "$pid" ] || continue
    if kill -0 "$pid" 2>/dev/null; then
      pkill -TERM -P "$pid" 2>/dev/null || true   # kinderen eerst
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  sleep 5
  for pid in "$SERVE_PID" "$TUNNEL_PID"; do
    [ -n "$pid" ] || continue
    kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
  done
  log "venster dicht"
}
trap cleanup EXIT INT TERM

log "venster open — endpoint starten op 127.0.0.1:$PORT"
# tsx-bin direct = één node-proces (geen npm-wrapper die orphans achterlaat).
"$REPO/node_modules/.bin/tsx" src/dispatch/http.ts >>"$LOG" 2>&1 &
SERVE_PID=$!

# Wacht tot /health groen is (max ~15s) vóór de tunnel omhoog gaat.
for i in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    log "endpoint gezond (pid $SERVE_PID)"
    break
  fi
  sleep 1
  if [ "$i" -eq 15 ]; then
    log "FOUT: endpoint werd niet gezond binnen 15s — venster afbreken"
    exit 1
  fi
done

if [ -n "${CF_TUNNEL_TOKEN:-}" ]; then
  log "tunnel starten via dashboard-token (route B, cert-loos)"
  cloudflared tunnel run --token "$CF_TUNNEL_TOKEN" >>"$LOG" 2>&1 &
else
  log "tunnel '$TUNNEL_NAME' starten via config.yml (route A, cert-based)"
  cloudflared tunnel --config "$CF_CONFIG" run "$TUNNEL_NAME" >>"$LOG" 2>&1 &
fi
TUNNEL_PID=$!
log "tunnel gestart (pid $TUNNEL_PID) — venster $WINDOW_SECONDS s open"

sleep "$WINDOW_SECONDS"
# trap cleanup regelt het stoppen bij normale afloop.
