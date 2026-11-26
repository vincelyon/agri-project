#!/usr/bin/env bash
# Zero-sudo PostgreSQL for local development: a private cluster in ./.pgdata on port 54329.
# Usage: npm run db:local -- start | stop | status
# (Skip this and point DATABASE_URL at any PostgreSQL 14+ server if you prefer.)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA="$ROOT/.pgdata"
PORT="${PGPORT_LOCAL:-54329}"
SOCK="/tmp/agri-pgsock"   # unix socket dir must not contain spaces

# Locate the PostgreSQL binaries (Debian/Ubuntu layout, or already on PATH).
if ! command -v pg_ctl >/dev/null 2>&1; then
  BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  [ -n "$BIN" ] && export PATH="$BIN:$PATH"
fi
command -v pg_ctl >/dev/null 2>&1 || { echo "PostgreSQL binaries not found. Install PostgreSQL first."; exit 1; }

case "${1:-start}" in
  start)
    mkdir -p "$SOCK"
    if [ ! -d "$DATA" ]; then
      initdb -D "$DATA" -U agri --auth=trust -E UTF8 >/dev/null
      echo "Initialised cluster in $DATA"
    fi
    pg_ctl -D "$DATA" status >/dev/null 2>&1 || \
      pg_ctl -D "$DATA" -o "-p $PORT -k $SOCK -c listen_addresses=127.0.0.1" -l "$DATA/server.log" -w start
    for db in agri_stock agri_stock_test; do
      createdb -h 127.0.0.1 -p "$PORT" -U agri "$db" 2>/dev/null && echo "Created database $db" || true
    done
    echo "PostgreSQL ready: postgresql://agri@127.0.0.1:$PORT/agri_stock"
    ;;
  stop)   pg_ctl -D "$DATA" stop ;;
  status) pg_ctl -D "$DATA" status ;;
  *) echo "Usage: $0 start|stop|status"; exit 1 ;;
esac
