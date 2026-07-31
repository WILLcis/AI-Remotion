# deepdog Skills Promo

`deepdog-skills-promo.mp4` 是一支 60 秒、1920×1080、30 FPS 的中文产品宣传片。
它使用 HeyGen 官方 HyperFrames `product-launch-video` 工作流生成，采用本地产品截图、
已审核旁白、语音时间戳和确定性 HTML/GSAP 动效。

最终成片：

```text
renders/deepdog-skills-promo.mp4
```

## 使用的工作流

- 工作流：`product-launch-video`
- 执行模式：`automation`
- 作者工具：HyperFrames CLI `0.7.83`
- 动画：每个 frame 独立的 paused GSAP timeline
- 旁白：已有 HeyGen 中文 TTS，作为一条连续音轨使用
- 字幕：从 HeyGen 时间戳生成，不绑定场景边界
- 素材：用户提供的 deepdog 产品截图
- 渲染：HyperFrames 本地渲染

这不是 Remotion composition，也没有把整支视频交给 HeyGen Video Agent 自动生成。
HeyGen 在这里主要提供旁白和时间戳；画面、字幕、转场和最终时长由 HyperFrames
项目确定性控制。

## 输入

- `BRIEF.md`：产品信息、受众、时长、风格和事实边界。
- `SCRIPT.md`：八段旁白及表达要求。
- `STORYBOARD.md`：八个场景的时长、叙事作用、素材和动效蓝图。
- `assets/`：经过 media-use 登记的八张产品截图和固定字体。
- `audio/narration.mp3`：已审核的连续中文旁白。
- `audio/heygen-tts.json`：HeyGen 原始语音时间戳。
- `audio_meta.json`：按场景整理后的字幕时间源。

不使用在线抓取素材，不编造客户背书、效率数字或产品能力。

## 生产流程

### 1. 明确创意方向

`BRIEF.md` 使用 problem-solution-proof 结构，核心信息是：

> deepdog 把编码智能体变成可分派、可观测、可积累技能的真正队友。

视觉采用 `code-editorial` 系统：浅色编辑式画布、黑色信息层级、绿色重点状态，
避免通用 AI 紫蓝渐变和无意义 HUD。

### 2. 登记和整理媒体

八张产品截图写入 `.media/manifest.jsonl` 和 `.media/index.md`。场景只使用这些本地
素材，分别证明议题看板、任务创建、控制塔、验证队列、技能、Agent、Runtime 和
会话状态。

### 3. 生成脚本和语音时间轴

旁白存放在 `audio/narration.mp3`。`audio_meta.json` 将连续音轨拆成八个逻辑场景，
保存每句话在场景内的开始和结束时间。字幕生成以这些时间戳为准，不使用场景开始
和结束时间推测语速。

### 4. 构建八个独立场景

每个场景是一个 HyperFrames sub-composition：

1. `01-nobody-manages.html`：失控问题与压迫式开场。
2. `02-management-layer.html`：deepdog 品牌和 AI 队友定位。
3. `03-assign-work.html`：看板派单和任务创建。
4. `04-no-silent-failure.html`：任务生命周期、事件流和验证证据。
5. `05-skills-compound.html`：团队技能复利。
6. `06-control-plane.html`：Runtime、Agent 和上下文控制平面。
7. `07-trust-by-design.html`：开源、本地执行和自有云边界。
8. `08-hire-first-agent.html`：品牌收束和 CTA。

文件位于 `compositions/frames/`。每个 composition 都注册一个暂停的
`window.__timelines[compositionId]`，禁止使用 `Math.random()`、系统时钟和运行时
网络请求，保证任意时间点可 seek、可复现。

### 5. 生成字幕并组装主时间线

官方 `product-launch-video` 脚本完成以下操作：

1. 从 `audio_meta.json` 生成 `compositions/captions.html`。
2. 将八个 frame composition 组装进 `index.html`。
3. 运行 `scripts/inject-source-audio.mjs`，注入连续旁白。
4. 注入并验证七个跨轨转场。

主时间线使用双视频轨交替承载场景，转场窗口允许前后场景短暂重叠。字幕独占轨道
2，旁白独占轨道 10，因此字幕和音频不会被场景转场截断。

完整重组命令：

```bash
cd videos/deepdog-skills-promo

SKILL_DIR="${HOME}/.agents/skills/product-launch-video"

node "${SKILL_DIR}/scripts/captions.mjs" build \
  --storyboard STORYBOARD.md \
  --audio-meta audio_meta.json \
  --hyperframes . \
  --out caption_groups.json

node "${SKILL_DIR}/scripts/assemble-index.mjs" \
  --storyboard STORYBOARD.md \
  --hyperframes .

node scripts/inject-source-audio.mjs

node "${SKILL_DIR}/scripts/transitions.mjs" inject \
  --storyboard STORYBOARD.md \
  --hyperframes .

node "${SKILL_DIR}/scripts/transitions.mjs" verify \
  --storyboard STORYBOARD.md \
  --index index.html
```

重新组装会覆盖 `index.html`，因此必须按以上顺序重新注入音频和转场。

### 6. 检查和视觉 QA

```bash
cd videos/deepdog-skills-promo

npm run check
npx --yes hyperframes@0.7.83 snapshot --at 2,7,14,22,31,39,46,55
```

`npm run check` 覆盖静态 lint、浏览器运行时、布局、动效和对比度检查。快照位于
`snapshots/`，每个场景至少检查一个代表帧。

### 7. 渲染

```bash
cd videos/deepdog-skills-promo

npx --yes hyperframes@0.7.83 render . \
  --output renders/deepdog-skills-promo.mp4 \
  --fps 30 \
  --quality high \
  --skill product-launch-video
```

验证输出：

```bash
ffprobe -v error \
  -show_entries format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate \
  -of json \
  renders/deepdog-skills-promo.mp4
```

当前成片验证结果为 60 秒、1920×1080、30 FPS，包含 H.264 视频和 AAC 音频。

## 目录说明

- `index.html`：60 秒主 composition、连续音轨、字幕挂载和跨场景转场。
- `compositions/frames/`：八个独立场景。
- `compositions/captions.html`：语音时间驱动的字幕 composition。
- `assets/`：产品截图和固定字体。
- `audio/`：连续旁白和原始时间戳。
- `.media/`：素材来源和采用记录。
- `.hyperframes/`：caption skin、frame packets 和工作流中间信息。
- `scripts/`：项目级后处理脚本。
- `snapshots/`：视觉 QA 快照。
- `renders/`：本地渲染输出。

## 修改指南

- 改文案：先更新 `SCRIPT.md`、`STORYBOARD.md` 和 `audio_meta.json`，再重建字幕。
- 改旁白：替换 `audio/narration.mp3`，重新生成时间戳和字幕，不要只拉伸场景。
- 改场景内容：只修改对应的 `compositions/frames/*.html`。
- 改场景时长：同步更新 `STORYBOARD.md`、`audio_meta.json`，然后重新组装和注入转场。
- 改转场：更新 `STORYBOARD.md` 的 `transition_in`，不要直接把临时修改只留在
  `index.html`。
- 所有 HTML 修改后必须运行 `npm run check`，最终渲染前必须复查 snapshots。

## 版本和追踪

- HyperFrames CLI 固定为 `0.7.83`，避免后续版本变化导致渲染漂移。
- BIOS 实现工单：`YES-1881`。
- BIOS 能力父工单：`YES-1879`。
- 生成的 MP4、快照和临时输出属于本地媒体产物，默认不应提交到 Git。
