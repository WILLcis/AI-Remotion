# YesONO 3.0 · MiniMax 11×15s 宣传片工程

来源脚本：`episodes/res/doc/yesono-3-26-b2b-minimax-script.md`

## 产物约定

- `clips.json` — 11 条旁白（字幕 / 口播）、分镜提示词
- `prompts/clip_XX.txt` — **已粘贴全局风格前缀**的可复制提示词
- `audio/cosyvoice/` — CosyVoice 中文男声（口播把 YesONO 3.0 读成 **Yes or No 3.0**）
- `captions.ass` / `audio/cosyvoice/captions.srt` — 与语速对齐的字幕
- `segments/clip_XX.mp4` — MiniMax-H3 画面段
- `renders/yesono-3-minimax-final.mp4` — 成片（画面 + VO + 烧录字幕）

## 命令

```bash
# 1) 展开提示词 + Comfy job
node videos/yesono-3-minimax-promo/scripts/expand-prompts.mjs

# 2) 本地 CosyVoice 配音 + 字幕
set -a && source .env.local && set +a
node videos/yesono-3-minimax-promo/scripts/generate-cosyvoice.mjs

# 3a) MiniMax 在线 API 出画面（需要 MINIMAX_API_KEY）
export MINIMAX_API_KEY=...
# optional: export MINIMAX_API_BASE=https://api.minimaxi.com
# optional: export MINIMAX_RESOLUTION=768P   # or 2K
node videos/yesono-3-minimax-promo/scripts/submit-minimax.mjs

# 3b) cornerstone ComfyUI-H3（最高清晰度）
# H3 Base 原生上限：1344×768 + steps=24
# 15s 整段会爆显存，已拆成 33×5s（11 条逻辑 clip），成片仍是 11×15s
ssh cornerstone@100.125.33.44 '
  cd /home/cornerstone/ComfyUI-H3
  source /home/cornerstone/miniforge3/etc/profile.d/conda.sh
  conda activate ai-remotion-comfy-h3
  nohup python scripts/h3_segmented_render.py jobs/yesono_promo_11x15_minimax_hq.json \
    > logs/h3-yesono-11x15-hq.log 2>&1 &
  echo started pid=$!
'
# 监控：tail -f logs/h3-yesono-11x15-hq.log
# 拉取：
# scp -r cornerstone@100.125.33.44:/home/cornerstone/ComfyUI-H3/output/segments/yesono_promo_11x15_minimax_hq \
#   /tmp/yesono-h3-segs
# H3_SEGMENTS_DIR=/tmp/yesono-h3-segs node videos/yesono-3-minimax-promo/scripts/assemble.mjs

# 4) 拼片 + 配音 + 烧字幕
node videos/yesono-3-minimax-promo/scripts/assemble.mjs
```

## 口播规则

- 品牌字幕保留 `YesONO` / `YesONO 3.0`
- 配音连续读作 `Yes or No` / `Yes or No 3.0`
- 语速默认 `1.22×`，单条超 15s 会自动再加速压进时段
