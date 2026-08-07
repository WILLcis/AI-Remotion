# Cornerstone CosyVoice 3 交接包

更新日期：2026-08-07

## 已锁定组合

| 项目 | 值 |
| --- | --- |
| 模型 | `Fun-CosyVoice3-0.5B-2512` |
| 模型路径 | `/home/cornerstone/models/Fun-CosyVoice3-0.5B-2512` |
| 源码 | `/home/cornerstone/services/CosyVoice` |
| Conda env | `ai-remotion-cosyvoice` |
| Adapter | `/home/cornerstone/services/CosyVoice/ai_remotion_server.py`（同源 `services/cosyvoice/zero_shot_server.py`） |
| Bind | `100.125.33.44:8000`（Tailscale only） |
| 契约 | `GET /health`, `GET /model-info`, `POST /inference_zero_shot` |

## 启动

在 cornerstone 上：

```bash
bash /home/cornerstone/services/CosyVoice/start-cosyvoice3.sh
```

或从本仓：

```bash
scp scripts/start-cosyvoice3-cornerstone.sh services/cosyvoice/zero_shot_server.py \
  cornerstone@100.125.33.44:/home/cornerstone/services/CosyVoice/
ssh cornerstone@100.125.33.44 \
  'mv /home/cornerstone/services/CosyVoice/zero_shot_server.py \
      /home/cornerstone/services/CosyVoice/ai_remotion_server.py 2>/dev/null || true; \
   bash /home/cornerstone/services/CosyVoice/start-cosyvoice3.sh'
```

本仓同步适配器时请把 `zero_shot_server.py` 内容写到远端 `ai_remotion_server.py`。

## 客户端配置

```bash
AI_REMOTION_TTS_PROVIDER=cosyvoice-clone
AI_REMOTION_TTS_BASE_URL=http://100.125.33.44:8000
```

默认零样本参考音色：

- `assets/tts/cosyvoice3-zh-male-ref.wav`
- `assets/tts/cosyvoice3-zh-male-ref.txt`

Promo 脚本通过 `scripts/cosyvoice3-client.mjs` 调用 `/inference_zero_shot`；缺少 `AI_REMOTION_TTS_BASE_URL` 时会失败。

## 探活

```bash
curl -sf http://100.125.33.44:8000/health
curl -sf http://100.125.33.44:8000/model-info
```

零样本冒烟（本机）：

```bash
curl -sf -X POST http://100.125.33.44:8000/inference_zero_shot \
  -F "tts_text=你好，这是 CosyVoice 三测试。" \
  -F "prompt_text=$(cat assets/tts/cosyvoice3-zh-male-ref.txt)" \
  -F "prompt_wav=@assets/tts/cosyvoice3-zh-male-ref.wav" \
  -o /tmp/cosy3_probe.pcm
ffprobe -v error -f s16le -ar 24000 -ac 1 -i /tmp/cosy3_probe.pcm -show_entries format=duration -of default=nw=1:nk=1
```

## 注意

- 不要把服务绑到公网；只走 Tailscale。
- 不要覆盖 LongCat 环境的 flash-attn。
- Legacy 本地 300M-SFT：`scripts/start-cosyvoice.sh`（仅本机调试）。
- GPU 与 LongCat（`:8006`）共用 5090；CosyVoice 适配器内有推理锁，避免并发打爆。
