#!/usr/bin/env bash
# Runs the Python ML service (apps/ml). Creates a virtualenv and installs deps on first use.
#   npm run ml:setup   -> only create the venv and install
#   npm run dev:ml     -> start the service with auto-reload
# Set ML_VENV to keep the virtualenv outside the repo (e.g. when the repo lives in a synced folder).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ML_DIR="$ROOT/apps/ml"
VENV="${ML_VENV:-$ML_DIR/.venv}"

if [ -f "$ROOT/.env" ]; then set -a; . "$ROOT/.env"; set +a; fi
PORT="${ML_PORT:-8001}"

if [ ! -x "$VENV/bin/python" ]; then
  echo "Creating virtualenv at $VENV"
  python3 -m venv "$VENV"
fi
if ! "$VENV/bin/python" -c "import fastapi, sklearn, pandas" 2>/dev/null; then
  echo "Installing ML dependencies"
  "$VENV/bin/pip" install --quiet -r "$ML_DIR/requirements.txt"
fi

[ "${1:-}" = "--setup-only" ] && { echo "ML environment ready."; exit 0; }

cd "$ML_DIR"
# Watch only app/. Without --reload-dir uvicorn watches the whole folder, including a .venv
# inside it, and restarts endlessly as Python packages are touched.
exec "$VENV/bin/python" -m uvicorn app.main:app --reload --reload-dir app --port "$PORT"
