# P6 — 立刻可接专业 Agent 分步开发计划

状态：Completed；BIOS `YES-1923` 已关闭为 `done`
日期：2026-08-01
父 BIOS：`YES-1909` · 父工单：`YES-549` · **P6 子工单：`YES-1923`**
范围：仅「立刻能接」七类；相邻高需求专家见 `docs/VIDEO_AGENT_PLATFORM_BACKLOG.md`（只记录不实现）。

## 1. 目标

在复用同一 Video Job envelope、`FLAGS.VIDEO_AGENT_PLATFORM` 与审核门协议的前提下，接入七个已有 HyperFrames / HeyGen 工作流对齐的专业 Agent：

| workflow | primary agent | 默认 renderer | 主 Skill / 能力 |
| --- | --- | --- | --- |
| `embedded-captions` | `embedded-captions-producer` | hyperframes | `/embedded-captions` |
| `pr-video` | `pr-video-producer` | hyperframes | `/pr-to-video` |
| `music-video` | `music-video-producer` | hyperframes | `/music-to-video` |
| `video-translation` | `video-translation-producer` | remotion | HeyGen translate（付费门） |
| `motion-graphics` | `motion-graphics-producer` | hyperframes | `/motion-graphics` |
| `slideshow` | `slideshow-producer` | hyperframes | `/slideshow` |
| `remotion-port` | `remotion-port-producer` | hyperframes | `/remotion-to-hyperframes` |

本阶段交付：**契约 + 路由 + Agent profile + fixture + 单测 + 文档**。
不要求每个 workflow 在本阶段完成真实出片试运行（与 P5 不同）；付费 translation 禁止静默调用。

## 2. 原则

- 复用 `VIDEO_AGENT_PLATFORM`，不新开平台 flag。
- 一个 Job 一个 primary；不合并成万能 Agent。
- `existing-video` 自动路由仍指向 **recut**；纯字幕 / 翻译必须 **显式 workflow**（避免与 recut 歧义）。
- 缺少本地 Skill 时 Agent 文档要求先 `npx hyperframes skills update <name>`，不硬编码家目录路径。
- 不改用户 episode/源片；不降 npm audit 门禁。

## 3. 阶段

### P6.0 — 计划与 BIOS

- 本文件 + `docs/VIDEO_AGENT_PLATFORM_BACKLOG.md`
- 在 `YES-1909` 下建 P6 子工单并进入 `in_progress`

### P6.1 — 契约与路由

- 扩展 `src/schemas/videoJob.ts`：七 workflow、新 source types、agent 枚举、交叉校验
- 扩展 `src/agent/videoRouter.ts`：routeConfig、auto 优先级、reason
- 更新 `.devin/skills/video-producer/` 入口与 job-contract

**新 source.type**

| type | 用于 |
| --- | --- |
| `github-pr` | pr-video |
| `music` | music-video |
| `deck` | slideshow |
| `motion-brief` | motion-graphics |
| `remotion-project` | remotion-port |

`existing-video` 允许的显式 workflow：`existing-video-recut` | `embedded-captions` | `video-translation`

**Auto 优先级（显式除外）**

1. product-brief / website → product-promo
2. github-pr → pr-video
3. music → music-video
4. deck → slideshow
5. remotion-project → remotion-port
6. motion-brief → motion-graphics
7. existing-video → existing-video-recut
8. digital-human presenter → digital-human
9. 其他 → faceless-explainer

### P6.2 — Agent profiles 与 fixtures

- 七个 `.devin/agents/*-producer.md`
- 七个 `tests/fixtures/video-jobs/*.yaml`
- 扩展 `tests/video-agent-platform.test.ts`（路由、约束、kill switch、profile 存在性）

### P6.3 — 文档与门禁

- 更新 Architecture / Development Plan / Agent Usage / Quickstart / HANDOFF
- `npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts`
- `npm run typecheck` + `npm run lint`

## 4. 验收

- 七 workflow 显式路由稳定；对应 source 可 auto（captions/translation 除外）
- 错误组合返回清晰 schema/route 错误
- flag OFF 全部拒绝
- 七 Agent 文件声明 Skill、门、写入边界与 `needs_approval`
- translation：无明文批准不得调用付费 provider
- 相邻需求仅出现在 backlog，不进入 schema

## 5. 回滚

删除七 Agent、七 fixture、schema/router/入口/测试/文档增量；保留 P0–P5 四专家与既有媒体。

## 6. 当前勾选

- [x] P6.0 计划与 BIOS（`YES-1923`）
- [x] P6.1 契约路由
- [x] P6.2 profiles/fixtures/tests
- [x] P6.3 文档与验证（契约/测试门禁；各 workflow 真实出片试运行不在本阶段强制范围）

状态：P6 平台接入完成（契约层）。