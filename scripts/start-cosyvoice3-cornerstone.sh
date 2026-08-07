#!/usr/bin/env bash
# Start CosyVoice 3 (Fun-CosyVoice3-0.5B-2512) zero-shot FastAPI on cornerstone.
# Intended to run ON the server (or via: ssh cornerstone 'bash -s' < this-script).
set -euo pipefail

COSY_ROOT="${COSYVOICE_ROOT:-/home/cornerstone/services/CosyVoice}"
MODEL_DIR="${COSYVOICE_MODEL_DIR:-/home/cornerstone/models/Fun-CosyVoice3-0.5B-2512}"
PYTHON="${COSYVOICE_PYTHON:-/home/cornerstone/miniforge3/envs/ai-remotion-cosyvoice/bin/python}"
HOST="${COSYVOICE_HOST:-100.125.33.44}"
PORT="${COSYVOICE_PORT:-8000}"
LOG_DIR="${COSYVOICE_LOG_DIR:-/home/cornerstone/services/CosyVoice/logs}"
ADAPTER="${COSYVOICE_ADAPTER:-$COSY_ROOT/ai_remotion_server.py}"

mkdir -p "$LOG_DIR"

if [[ ! -x "$PYTHON" ]]; then
  echo "CosyVoice python missing: $PYTHON" >&2
  exit 1
fi
if [[ ! -f "$ADAPTER" ]]; then
  echo "Adapter missing: $ADAPTER" >&2
  exit 1
fi
if [[ ! -d "$MODEL_DIR" ]]; then
  echo "Model dir missing: $MODEL_DIR" >&2
  exit 1
fi

if ss -lntp 2>/dev/null | grep -q ":${PORT} "; then
  echo "Port $PORT in use — stopping previous listener(s)"
  # Prefer fuser when available; fall back to ss+kill.
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  else
    ss -lntp "sport = :${PORT}" | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u | xargs -r kill 2>/dev/null || true
  fi
  sleep 2
fi

export COSYVOICE_MODEL_DIR="$MODEL_DIR"
export PYTHONPATH="$COSY_ROOT:${COSY_ROOT}/third_party/Matcha-TTS${PYTHONPATH:+:$PYTHONPATH}"
export PYTHONUNBUFFERED=1

cd "$COSY_ROOT"
nohup "$PYTHON" -m uvicorn ai_remotion_server:app \
  --host "$HOST" \
  --port "$PORT" \
  --app-dir "$COSY_ROOT" \
  >"$LOG_DIR/cosyvoice3-server.log" 2>&1 &
PID=$!
echo "started pid=$PID host=$HOST port=$PORT log=$LOG_DIR/cosyvoice3-server.log"

for i in $(seq 1 120); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "server exited early" >&2
    tail -80 "$LOG_DIR/cosyvoice3-server.log" >&2
    exit 1
  fi
  if curl -sf --max-time 5 "http://${HOST}:${PORT}/health" >/dev/null; then
    curl -sf --max-time 5 "http://${HOST}:${PORT}/model-info" || true
    echo
    echo "READY http://${HOST}:${PORT}"
    exit 0
  fi
  sleep 3
done

echo "timeout waiting for CosyVoice 3" >&2
tail -80 "$LOG_DIR/cosyvoice3-server.log" >&2
exit 1
