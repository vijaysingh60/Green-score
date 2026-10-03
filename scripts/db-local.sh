#!/usr/bin/env bash
# Starts a local MongoDB (Homebrew `mongod`) for development, no Docker needed.
# Data lives in .data/mongo (gitignored). Stop it with Ctrl+C.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DBPATH="${MONGO_DBPATH:-$ROOT/.data/mongo}"
PORT="${MONGO_PORT:-27017}"

command -v mongod >/dev/null || {
  echo "mongod not found. Install it with: brew tap mongodb/brew && brew install mongodb-community"
  echo "Or run MongoDB with Docker: docker compose up -d mongo"
  exit 1
}

mkdir -p "$DBPATH"
echo "MongoDB on mongodb://127.0.0.1:$PORT  (data: $DBPATH)"
exec mongod --dbpath "$DBPATH" --port "$PORT" --bind_ip 127.0.0.1
