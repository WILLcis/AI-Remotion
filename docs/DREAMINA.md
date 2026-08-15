# 即梦 / Dreamina CLI

即梦（Dreamina）通过本机 `dreamina` CLI 接入。  
当 Video Job 选择 `generation.service: dreamina` 时：**整条最终成片只走即梦**，不以 Remotion / HyperFrames / HeyGen / 火山 Seedance API 重做主片。

## 独占规则

1. 最终 MP4 = `dreamina` 下载结果（`text2video` / `image2video` / `multimodal2video` 等）。
2. **TTS**：默认即梦侧音频（`tts_policy: dreamina-native`）。不调用项目 CosyVoice，除非用户明确说「用 CosyVoice 换轨」。
3. **无审稿门**：用户选定 `generation.service: dreamina` 即视为同意扣积分、立即生成、并随后发布。Agent **不得**再要「批准 storyboard / 批准付费 / 批准发布」。
4. 出片后立即 `video:publish --platform all --generation-service dreamina`（抖音走官方 API，flag 关则跳过；视频号/小红书写 Pack，含即梦 `text2image` 封面）。
5. 脚本/分镜仍可本地起草，但出片与音画以即梦为准。
6. 火山方舟 Seedance HTTP API（`src/avatar/seedance.ts`）仅兼容保留，默认关闭；新任务不要用。
7. 运维 kill switch 仍在：`FLAG_dreamina_media`、`FLAG_video_publish*` 默认关；这是开关不是人工审稿。

## 安装与登录

```bash
curl -fsSL https://jimeng.jianying.com/cli | bash
dreamina login
dreamina user_credit
```

可选：`AI_REMOTION_DREAMINA_BIN` 指向自定义二进制。Skill 参考 `~/.dreamina_cli/dreamina/SKILL.md`，以 `dreamina -h` 为准。

## 项目命令

```bash
FLAG_dreamina_media='{"enabled":true}' npm run media:dreamina -- check
FLAG_dreamina_media='{"enabled":true}' npm run media:dreamina -- credit
FLAG_dreamina_media='{"enabled":true}' npm run media:dreamina -- text2image \
  --prompt "..." --out videos/<proj>/assets/dreamina --generation-service dreamina --ratio 9:16
FLAG_dreamina_media='{"enabled":true}' npm run media:dreamina -- image2video \
  --image <ref.png> --out videos/<proj>/assets/dreamina --generation-service dreamina
FLAG_dreamina_media='{"enabled":true}' npm run media:dreamina -- text2video \
  --prompt "..." --out videos/<proj>/renders --generation-service dreamina --ratio 9:16
```

Job 已选 `generation.service: dreamina` 时，生成命令带 `--generation-service dreamina`，不必 `--i-approve-paid`。  
没有 Video Job、单独调用即梦时，仍须用户明文批准后加 `--i-approve-paid`。

## 默认视频模型

`text2video` / `image2video` / `multimodal2video` 默认 **`seedance2.0_vip`**。不要默认 `seedance2.0fast`：Fast 走公排队，容易卡在 Queueing。需要 Fast 时显式传 `--model_version seedance2.0fast`。

数字人封面用 `text2image`、`ratio=9:16`，不要 ffmpeg 抽帧叠字做封面。

热点 `digital-human`：先 `text2image` 出封面，再 `image2video --image <封面>`。即梦把该图当作第一帧。口型、口播和底部中文字幕全部写在 `--prompt` 里，由 Seedance 生成；不要本地 TTS 驱动，也不要 ffmpeg 烧录字幕。

出片后立即发布（不必 `--i-approve-publish`）：

```bash
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_douyin='{"enabled":true}' \
FLAG_video_publish_weixin_channels='{"enabled":true}' \
FLAG_video_publish_xiaohongshu='{"enabled":true}' \
  npm run video:publish -- \
    --generation-service dreamina \
    --platform all \
    --video videos/<proj>/renders/final.mp4 \
    --cover videos/<proj>/renders/cover.jpg \
    --title "标题"
```

## Job 示例

```yaml
generation:
  service: dreamina
render:
  engine: auto
```

Route 后应看到 `renderer: dreamina`、`tts_policy: dreamina-native`、`requires_approval: []`、`provider_requirements` 含 `dreamina`。
