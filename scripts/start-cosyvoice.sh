#!/usr/bin/env bash
# LEGACY: local CosyVoice-300M-SFT FastAPI (default :8000).
# Prefer CosyVoice 3 on cornerstone: scripts/start-cosyvoice3-cornerstone.sh
# and AI_REMOTION_TTS_BASE_URL=http://100.125.33.44:8000 with cosyvoice-clone.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COSY_ROOT="${COSYVOICE_ROOT:-/Users/kksthinkpad/res/code/py/CosyVoice}"
PORT="${COSYVOICE_PORT:-8000}"
LOG_DIR="${COSYVOICE_LOG_DIR:-$ROOT/videos/yesono-3-hf-v3/logs}"
PYTHON="${COSY_ROOT}/.conda/bin/python"

mkdir -p "$LOG_DIR"

if [[ ! -x "$PYTHON" ]]; then
  echo "CosyVoice conda python missing: $PYTHON" >&2
  exit 1
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT in use — stopping previous listener(s)"
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t | xargs -n1 kill 2>/dev/null || true
  sleep 1
fi

export COSYVOICE_ROOT="$COSY_ROOT"
export COSYVOICE_PORT="$PORT"
export COSYVOICE_MODEL_DIR="${COSYVOICE_MODEL_DIR:-pretrained_models/CosyVoice-300M-SFT}"
export WETEXT_DIR="${WETEXT_DIR:-$HOME/.cache/modelscope/hub/pengzhendong/wetext}"
export PYTHONUNBUFFERED=1

nohup "$PYTHON" "$ROOT/scripts/start_cosyvoice_server.py" \
  >"$LOG_DIR/cosyvoice-server.log" 2>&1 &
PID=$!
echo "started pid=$PID log=$LOG_DIR/cosyvoice-server.log"

for i in $(seq 1 90); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "server exited early" >&2
    tail -50 "$LOG_DIR/cosyvoice-server.log" >&2
    exit 1
  fi
  if curl -sf -o /tmp/cosy_probe.pcm --max-time 90 \
    -X POST "http://127.0.0.1:${PORT}/inference_sft" \
    --data-urlencode "spk_id=中文男" \
    --data-urlencode "tts_text=测试" \
    && [[ -s /tmp/cosy_probe.pcm ]]; then
    BYTES=$(wc -c </tmp/cosy_probe.pcm | tr -d ' ')
    echo "READY port=$PORT probe_bytes=$BYTES"
    exit 0
  fi
  sleep 2
done

echo "timeout waiting for CosyVoice" >&2
tail -50 "$LOG_DIR/cosyvoice-server.log" >&2
exit 1
