# AI-Remotion Agent 使用说明书

## 1. 这个 Agent 是做什么的

AI-Remotion 是一个 CLI/Agent-first 的图文讲解视频生产线。

它的目标不是一键生成不可控的视频，也不是剪映/CapCut 草稿生成器，而是把一条讲解视频拆成可审稿、可修改、可复现的本地文件：

```text
brief -> script -> storyboard -> render-plan -> voiceover -> captions -> Remotion MP4 -> QA report
```

当前默认形态：

- 产品入口：CLI + coding agent 协作。
- 渲染方式：本地 Remotion 渲染。
- 默认样片：`episodes/sample`。
- 默认 LLM：本地 deterministic 生成。
- 默认 TTS：silent 占位，不调用真实外部配音服务。

## 2. 环境要求

必需：

- Node.js 20+
- npm
- Remotion 渲染所需的 FFmpeg 支持

推荐：

- `ffprobe`：用于 QA 阶段读取 MP4 的真实时长、分辨率、音频轨信息。

本机已安装：

```bash
ffprobe -version
```

如果换到一台新 Mac，可以用 Homebrew 安装：

```bash
brew install ffmpeg
```

`ffprobe` 会随 `ffmpeg` 一起安装。

## 3. 第一次启动

进入项目：

```bash
cd <ai-remotion-checkout>
npm install
```

打开 Remotion Studio：

```bash
npm run dev
```

在 Studio 里选择 `ExplainerVideo` composition。

## 4. 跑通 Canonical Demo

当前对外展示样片是：

```text
普通人如何理解 Remotion，以及 AI-Remotion 如何生成图文讲解视频
```

完整跑一遍本地 demo：

```bash
npm run demo:canonical
```

这会执行：

```text
validate -> render -> qa
```

主要输出：

```text
episodes/sample/out/final.mp4
episodes/sample/qa-report.md
episodes/sample/out/qa-frames/
```

只渲染 MP4：

```bash
npm run render:sample
```

只生成 QA 报告和 QA 帧：

```bash
npm run episode:qa -- --episode sample --render-frames
```

## 5. 创建一条新视频

创建 episode：

```bash
npm run episode:new -- --id remotion-intro --topic "普通人如何理解 Remotion"
```

生成脚本：

```bash
npm run episode:script -- --episode remotion-intro
```

生成分镜：

```bash
npm run episode:storyboard -- --episode remotion-intro
```

生成 Remotion 渲染计划：

```bash
npm run episode:render-plan -- --episode remotion-intro
```

生成字幕：

```bash
npm run episode:captions -- --episode remotion-intro
```

生成静音占位配音：

```bash
npm run episode:voice -- --episode remotion-intro --provider silent
```

渲染 MP4：

```bash
npm run episode:render -- --episode remotion-intro
```

生成 QA 报告：

```bash
npm run episode:qa -- --episode remotion-intro --render-frames
```

## 6. Episode 文件说明

每条视频在一个目录里：

```text
episodes/<episode-id>/
```

核心文件：

```text
brief.yaml        # 选题、受众、平台、时长、风格、必须包含/避免的内容
script.md         # 可审稿口播脚本
storyboard.json   # 分镜、视觉类型、镜头时长、画面说明
render-plan.json  # Remotion 的最终输入 props
captions.srt      # SRT 字幕
audio/            # 配音文件
out/final.mp4     # 渲染结果，本地输出，不提交 git
qa-report.md      # QA 报告，本地输出，不提交 git
```

最重要的规则：

- 改选题或表达：先改 `brief.yaml` 或 `script.md`。
- 改画面：优先改 `storyboard.json` 或 `render-plan.json`。
- 改字幕：重新生成 `captions.srt`。
- 改配音：重新生成 voiceover，再同步 render-plan timing。
- 不要为了一个小修改整条链路全重做。

## 7. 常用命令速查

质量检查：

```bash
npm run check
```

配置检查：

```bash
npm run config:check
```

校验 sample：

```bash
npm run validate:sample
```

批量预览 workflow，不写文件：

```bash
npm run episode:batch -- --episodes sample --steps validate,qa --dry-run
```

对所有 episode 做校验 dry-run：

```bash
npm run episode:batch -- --all --steps validate --dry-run
```

## 8. LLM 和 TTS 配置

当前无需配置真实 provider，也不会默认发外部请求。

默认行为：

```text
LLM: deterministic
TTS: silent
```

检查当前配置：

```bash
npm run config:check
```

复制示例 env：

```bash
cp config/.env.local.example .env.local
# 或：cp config/.env.dev.example .env.local
AI_REMOTION_ENV_FILE=.env.local npm run config:check
```

注意：

- DeepSeek 可通过 `openai-compatible` 使用：设置 `AI_REMOTION_LLM_BASE_URL=https://api.deepseek.com`、API Key 和模型；网络失败、超时或返回不符合脚本格式时，会在 fallback 开启时回到本地 deterministic 脚本。
- CosyVoice 3 部署在 cornerstone（Tailscale），推荐 `AI_REMOTION_TTS_PROVIDER=cosyvoice-clone` + `AI_REMOTION_TTS_BASE_URL=http://100.125.33.44:8000`；默认参考音色在 `assets/tts/cosyvoice3-zh-male-ref.*`。服务失败时会明确报错，不会偷偷改成静音。本地 300M-SFT `/inference_sft` 仅作 legacy。
- FunASR 是“语音转文字”工具，本期不用于生成旁白；以后再单独用于转写和字幕时间轴对齐。
- `edge-tts`、`doubao`、`azure`、`elevenlabs` 会被识别为 pending provider，不会悄悄运行。
- 不要把真实 key 提交到 git。密钥只放仓库根目录 `.env.local`（已 gitignore）。
- 可提交的是占位模板：`config/.env.dev.example`、`config/.env.prod.example`、`config/.env.local.example`。

## 9. 怎么和 Agent 协作

推荐给 Agent 的请求方式：

```text
用 AI-Remotion 给我做一条 60 秒产品讲解视频，主题是 XXX，面向 XXX 用户，平台是抖音。
先生成 brief 和 script，不要直接渲染。
```

脚本通过后：

```text
脚本方向可以，继续生成 storyboard、render-plan、captions，然后用 silent voiceover 渲染本地 MP4 和 QA 报告。
```

局部修改：

```text
第 4 段不要列表，改成时间轴，不要重写脚本。
```

```text
字幕太长，帮我调短字幕，但不要改口播主旨。
```

```text
把这个 episode 改成 16:9 横屏，只更新必要文件。
```

Agent 应该遵守：

- 先读已有文件，再改。
- 保留用户改过的 `brief/script/storyboard/render-plan`。
- 能局部修改就局部修改。
- 渲染前先 schema validate。
- 渲染后生成 QA report。

## 10. 当前边界

当前不做：

- 浏览器产品 UI。
- 云渲染、队列、对象存储。
- 无人值守群发；视频号 / 小红书 RPA；抖音小程序发片。
- 抓取未授权素材。
- 克隆真人声音。
- 把 AI 生成的事实性内容当作已验证事实。

发布是可选能力，默认关。见第 14 节。

Seedance 等视频生成模型未来可以作为局部素材 provider，例如生成 B-roll、背景动效、插画片段；当前不作为主渲染层。主渲染层仍然是 Remotion，因为它更适合结构化字幕、排版、安全区、复现和 QA。

## 11. 常见问题

### QA 报告提示 ffprobe 不可用

检查：

```bash
command -v ffprobe
ffprobe -version
```

如果没有：

```bash
brew install ffmpeg
```

### 渲染输出在哪里

默认输出：

```text
episodes/<episode-id>/out/final.mp4
```

这些输出文件是本地生成物，不提交 git。

### 什么时候跑完整检查

交付前跑：

```bash
npm run check
```

涉及 Remotion 模板、样片、渲染计划时，再跑：

```bash
npm run demo:canonical
```

## 12. 即梦数字人（交付）

安装 CLI 并登录（本机一次）：

```bash
curl -fsSL https://jimeng.jianying.com/cli | bash
dreamina login
dreamina user_credit
```

默认视频模型是 `seedance2.0_vip`，不要用 Fast。选定即梦即视为同意扣积分并随后发布。详情：`docs/DREAMINA.md`。

```bash
FLAG_dreamina_media='{"enabled":true}' npm run media:dreamina -- check
FLAG_dreamina_media='{"enabled":true}' npm run media:dreamina -- credit
```

数字人封面走即梦 `text2image`（9:16），不抽视频帧、不用 ffmpeg 叠字。

## 13. 热点口播（交付）

先问三件事：热点类型、`human-vo` 还是 `digital-human`、现在跑还是定时。不要编造新闻。详情：`docs/VIDEO_HOTSPOT.md`。

真人口播（只要文案）：

```bash
FLAG_video_hotspot='{"enabled":true}' \
  npm run video:hotspot -- \
    --format human-vo \
    --topic 数字货币 \
    --items tests/fixtures/hotspot/items.json \
    --out videos/hotspot-YYYYMMDD
```

数字人（扣即梦积分；出片 + 封面 + 发布 Pack）：

```bash
FLAG_video_hotspot='{"enabled":true}' \
FLAG_dreamina_media='{"enabled":true}' \
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_douyin='{"enabled":false}' \
FLAG_video_publish_weixin_channels='{"enabled":true}' \
FLAG_video_publish_xiaohongshu='{"enabled":true}' \
  npm run video:hotspot -- \
    --format digital-human \
    --topic 数字货币 \
    --items path/to/items.json \
    --out videos/hotspot-YYYYMMDD
```

常驻 RSS 爬虫：`npm run hotspot:watch`（`FLAG_video_hotspot_crawler`）。macOS 开机示例见 `scripts/launchd/ai-remotion-hotspot-crawler.plist.example`。

即梦审核（TNS）失败会扣积分且无成片。当前不会自动改写后重试；换一条口播或改掉敏感词后再生成。

## 14. 多平台发布（交付）

详情：`docs/VIDEO_PUBLISH.md`。总开关和分平台开关默认关。

| 平台 | 实际做什么 |
| --- | --- |
| 抖音 | 官方 OpenAPI：`upload_video` → `create_video`（需 `video.create.bind`） |
| 视频号 | 写 Pack JSON，你在助手里手动上传 |
| 小红书 | 写 Pack JSON，你在创作者后台手动上传 |

即梦成片后：

```bash
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_douyin='{"enabled":false}' \
FLAG_video_publish_weixin_channels='{"enabled":true}' \
FLAG_video_publish_xiaohongshu='{"enabled":true}' \
  npm run video:publish -- \
    --generation-service dreamina \
    --platform all \
    --video path/to/final.mp4 \
    --cover path/to/cover.png \
    --title "标题"
```

`--platform all` 在抖音 flag 关闭时会跳过抖音。Pack 落在 `--pack-dir`（热点默认 `videos/<proj>/publish-pack`）。

### 抖音 live 前提

不是小程序。官方能力只给 **正式网站应用**：

- 文档：[代替用户发布内容到抖音](https://developer.open-douyin.com/docs/resource/zh-CN/dop/ability/content-management/video.create.bind)
- 上传：[upload_video](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/create-video/upload-video)
- 创建：[create_video](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/create-video/video-create)

现网准入写的是党政机关/事业单位主体。个人开放平台申请目前跑不通。凭证只放 `.env.local`：`AI_REMOTION_DOUYIN_ACCESS_TOKEN`、`AI_REMOTION_DOUYIN_OPEN_ID`。

抖音封面字段是 `cover_tsp`（视频第几秒），不是即梦那张封面图。即梦封面给视频号/小红书 Pack 用。

尚未实现：OAuth 换票 CLI、>128MB 分片上传、`cover_tsp`、作品审核状态查询、发前时长/体积校验。定时发布是本地队列 + `--due`。

## 15. 交付检查清单

1. `cp config/.env.local.example .env.local`，填密钥，不要提交 `.env.local`。
2. `npm install` 后 `npm run config:check`（不应打印密钥）。
3. `npm run check`。
4. 即梦：`dreamina login` + `FLAG_dreamina_media` + `npm run media:dreamina -- credit`。
5. 热点/发布：只在当次任务打开对应 `FLAG_video_*`。
6. 生成的 MP4 / 封面 PNG / `state/publish/` 不入库。

