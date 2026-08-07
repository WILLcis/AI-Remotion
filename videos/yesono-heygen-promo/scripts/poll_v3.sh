#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
set -a
# shellcheck disable=SC1091
source /Users/kksthinkpad/res/code/js/AI-Remotion/.env.local
set +a
export HTTPS_PROXY=http://127.0.0.1:7897
export HTTP_PROXY=http://127.0.0.1:7897
export ALL_PROXY=http://127.0.0.1:7897

SESSION=b86aa42a2b7c4adabe9756bd51cd46c0
VIDEO=d4b73f13212b4b2889113bb365dd4f65
OUTDIR=/Users/kksthinkpad/res/code/js/AI-Remotion/videos/yesono-heygen-promo
mkdir -p "$OUTDIR/renders"

for i in $(seq 1 90); do
  heygen video get "$VIDEO" >"$OUTDIR/submit_v3_status.json" 2>"$OUTDIR/submit_v3_status.err" || true
  STATUS=$(python3 - <<'PY'
import json
from pathlib import Path
p = Path("/Users/kksthinkpad/res/code/js/AI-Remotion/videos/yesono-heygen-promo/submit_v3_status.json")
d = json.loads(p.read_text())
data = d.get("data") or d
status = str(data.get("status") or data.get("video_status") or "")
url = data.get("video_url") or data.get("url") or ""
if isinstance(data.get("video"), dict):
    url = url or data["video"].get("url") or data["video"].get("video_url") or ""
Path("/Users/kksthinkpad/res/code/js/AI-Remotion/videos/yesono-heygen-promo/submit_v3_url.txt").write_text(url or "")
print(status)
PY
)
  echo "$(date '+%H:%M:%S') status=$STATUS"
  case "$STATUS" in
    completed|success|succeeded)
      URL=$(cat "$OUTDIR/submit_v3_url.txt")
      echo "url=$URL"
      if [[ -n "$URL" ]]; then
        curl -fsSL "$URL" -o "$OUTDIR/renders/yesono-3-heygen-v3-final.mp4"
        ffprobe -v error -show_entries format=duration,size -of default=nw=1:nk=1 "$OUTDIR/renders/yesono-3-heygen-v3-final.mp4"
      fi
      python3 - <<PY
import json, time
from pathlib import Path
log = Path("/Users/kksthinkpad/res/code/js/AI-Remotion/heygen-video-log.jsonl")
entry = {
  "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "project": "yesono-3-heygen-v3",
  "session_id": "$SESSION",
  "video_id": "$VIDEO",
  "voice": "James Gao",
  "style": "Bloomberg",
  "orientation": "landscape",
  "notes": "YesONO 3.0 from minimax script; CRITICAL ON-SCREEN TEXT; spoken Yes or No 3.0",
}
with log.open("a") as f:
    f.write(json.dumps(entry, ensure_ascii=False) + "\n")
print("logged")
PY
      exit 0
      ;;
    failed|error)
      echo FAILED
      cat "$OUTDIR/submit_v3_status.json"
      exit 1
      ;;
  esac
  sleep 30
done
echo TIMEOUT
exit 1
