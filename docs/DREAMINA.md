# 即梦 / Dreamina CLI

> 你应来自根目录 [`AGENTS.md`](../AGENTS.md) 的必读清单。本文件不是 Agent 总入口。  
> **口播 / 我的形象 / 数字人默认走本文件，不是 HeyGen。**

即梦（Dreamina）通过本机 `dreamina` CLI 接入。  
当 Video Job 选择 `generation.service: dreamina` 时：**整条最终成片只走即梦**，不以 Remotion / HyperFrames / HeyGen / 火山 Seedance API 重做主片。

## 独占规则

1. 最终 MP4 = `dreamina` 下载结果（`text2video` / `image2video` / `multimodal2video` 等）。
2. **TTS**：默认即梦侧音频（`tts_policy: dreamina-native`）。不调用项目 CosyVoice，除非用户明确说「用 CosyVoice 换轨」。
3. **无审稿门**：用户选定 `generation.service: dreamina` 即视为同意扣积分、立即生成、并随后发布。Agent **不得**再要「批准 storyboard / 批准付费 / 批准发布」。
4. 出片后立即 `video:publish --platform all --generation-service dreamina`（抖音走官方 API，flag 关则跳过；视频号/小红书**默认写 Pack**）。自动点「发表/发布」是另一道闸：人必须当次说「批准RPA」，见 [`VIDEO_PUBLISH.md`](./VIDEO_PUBLISH.md)。选即梦 **不等于** 批准 RPA。
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

`text2video` / `image2video` / `multimodal2video` 默认 **`seedance2.0mini`**（720p，4–15 秒）。Fast / VIP 用 `--model_version seedance2.0fast` 或 `seedance2.0_vip`。

数字人封面用 `text2image`、`ratio=9:16`，不要 ffmpeg 抽帧叠字做封面。

热点 `digital-human` 默认用 `config/hotspot-identity.json` 的照片和音色：先 `image2image` 出封面（只移植人脸），再 `seedance2.0mini` `multimodal2video --image <封面> --image <照片> --audio <音色样本>`。提示词里 `@Image 1` 是封面第一帧、`@Image 2` 只复制人脸、`@Audio 1` 只当音色、`{口播脚本}` 对口型（参考音频须大于 5 秒，成片最长 15 秒）。`--photo` + `--audio` 可成对覆盖。不要把样本原句当视频内容，也不要 CosyVoice。发给即梦的封面和视频 `--prompt` 都必须含 **口型匹配** 和字幕要求。不要 ffmpeg 烧录字幕。

出片后立即发布 Pack（不必 `--i-approve-publish`）。自动发视频号/小红书还要当次「批准RPA」并加 `--i-accept-rpa-risk`，见 [`VIDEO_PUBLISH.md`](./VIDEO_PUBLISH.md)：

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
