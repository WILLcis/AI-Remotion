#!/usr/bin/env bash
# Wait for YesONO cool v2, then render deepdog A/B v3 HQ cinematic.
set -euo pipefail
source /home/cornerstone/miniforge3/etc/profile.d/conda.sh
conda activate ai-remotion-comfy-h3
cd /home/cornerstone/ComfyUI-H3

YESONO_ID=yesono_promo_cool_v2_6x6
YESONO_OUT="output/stitched/${YESONO_ID}.mp4"
LOG=logs/h3-pipeline-yesono-then-deepdog-ab.log

ensure_comfy() {
  if curl -sf http://127.0.0.1:8188/system_stats >/dev/null; then return 0; fi
  export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
  nohup python main.py --listen 0.0.0.0 --port 8188 --cache-lru 1 >> logs/comfyui.log 2>&1 &
  for i in $(seq 1 60); do
    curl -sf http://127.0.0.1:8188/system_stats >/dev/null && return 0
    sleep 2
  done
  echo "ComfyUI failed to start" >&2
  exit 1
}

echo "=== PIPELINE START $(date) ===" | tee -a "$LOG"

# If yesono cool renderer still running, wait for stitch file.
if [ ! -f "$YESONO_OUT" ]; then
  echo "Waiting for YesONO cool: $YESONO_OUT" | tee -a "$LOG"
  # If no render process, kick it
  if ! pgrep -f "yesono_promo_cool_v2.json" >/dev/null; then
    echo "Restarting YesONO cool render" | tee -a "$LOG"
    ensure_comfy
    nohup python scripts/h3_segmented_render.py jobs/yesono_promo_cool_v2.json >> logs/h3-yesono-cool-v2.log 2>&1 &
  fi
  while [ ! -f "$YESONO_OUT" ]; do
    sleep 30
    echo "$(date) still waiting YesONO… segs=$(ls output/segments/${YESONO_ID} 2>/dev/null | wc -l)" | tee -a "$LOG"
  done
fi
echo "YesONO cool ready: $YESONO_OUT" | tee -a "$LOG"

ensure_comfy
echo "=== START deepdog A v3 $(date) ===" | tee -a "$LOG"
python scripts/h3_segmented_render.py jobs/deepdog_promo_A_v3.json 2>&1 | tee -a "$LOG"
echo "=== START deepdog B v3 $(date) ===" | tee -a "$LOG"
python scripts/h3_segmented_render.py jobs/deepdog_promo_B_v3.json 2>&1 | tee -a "$LOG"
echo "=== PIPELINE ALL DONE $(date) ===" | tee -a "$LOG"
