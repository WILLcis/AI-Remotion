# 多工作流视频 Agent 平台分步开发计划

状态：In progress
日期：2026-07-31
BIOS：`YES-1909`，父工单 `YES-549`

## 1. 目标

建立一个统一入口下的多专业视频 Agent 平台。首批支持：

- 产品宣传片：`product-promo-producer`
- 数字人口播：`digital-human-producer`
- 无脸图文讲解：`faceless-explainer-producer`

共享顶层 Video Job 契约、确定性路由、审核状态和返回协议；保留各工作流内部 artifact 与渲染器边界。

## 2. 实施原则

- 串行稳定共享契约，再增加专业 Agent。
- 现有 Remotion、HyperFrames、HeyGen 路径不做迁移式重构。
- 所有新增行为放在 `FLAGS.VIDEO_AGENT_PLATFORM` 后，默认关闭。
- 每阶段有独立验证和回滚边界。
- 不修改用户维护的 episode/video artifacts。
- 不运行真实付费 provider 或最终 render，除非用户明确批准。

## 3. 阶段计划

### P0 — 决策与可追踪性

范围：

- 建立 BIOS `YES-1909`。
- 记录架构分析和 ADR。
- 记录本开发计划和结构化实施任务。

验收：

- 文档明确比较单体、多 Agent 和混合方案。
- 明确 primary agent ownership、审核门、feature flag 和回滚边界。
- BIOS 工单状态为 `in_progress`。

验证：

```bash
git diff --check
```

回滚：只删除本阶段新增文档，不触碰业务代码。

### P1 — Video Job 契约与确定性路由

BIOS 子工单：`YES-1966`（历史补录，`in_review`）

依赖：P0。

范围：

- 新增 Zod Video Job/Route schema。
- 新增纯路由函数。
- 新增 `video:route` CLI，支持 YAML/JSON Job 文件。
- 注册 `FLAGS.VIDEO_AGENT_PLATFORM`。
- dev/prod env 模板增加一致的 kill switch。

验收：

- 显式 workflow 可稳定路由。
- product brief/website 路由到产品宣传片。
- digital-human presenter 路由到数字人口播。
- topic/script 路由到无脸讲解。
- 关闭 flag 时拒绝路由。
- 不兼容 renderer 和无效输入返回清晰错误。

验证：

```bash
npm run typecheck
npm run lint
npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts
```

回滚：删除 schema/router/CLI，移除 package script 和 flag/env 行；现有命令不受影响。

### P2 — 统一入口 Skill 与三个专业 Agent

BIOS 子工单：`YES-1967`（历史补录，`in_review`）

依赖：P1。

范围：

- `.devin/skills/video-producer/SKILL.md`
- `.devin/skills/video-producer/references/job-contract.md`
- `.devin/agents/product-promo-producer.md`
- `.devin/agents/digital-human-producer.md`
- `.devin/agents/faceless-explainer-producer.md`

验收：

- Skill 先校验并路由，再调用唯一 primary agent。
- 三个 Agent 均声明输入、输出、审核门、写入范围、禁止事项和验证命令。
- 产品宣传片 Agent 可在最大嵌套深度 2 下分派 frame worker。
- 子 Agent 在需要用户判断时返回 `needs_approval`，不自行批准。

验证：

```bash
devin skills list
make verify-harness
npx vitest run tests/video-agent-platform.test.ts
```

回滚：删除 `.devin/skills/video-producer/` 和三个 Agent 文件。

### P3 — 回归与质量门禁

BIOS 子工单：`YES-1968`（历史补录，`in_review`）

依赖：P1、P2。

范围：

- 增加 routing 正常、边界和错误路径测试。
- 增加 Agent 配置/入口契约测试。
- 执行完整本地门禁。

验证：

```bash
npm run typecheck
npm run lint
npm run validate:sample
npm test
make test-integration
npm audit --audit-level=low
```

已知外部 blocker：当前 `@remotion/eslint-config-flat` 的 minimatch/brace-expansion 传递依赖可能导致 audit 失败；不得降低 audit 等级或添加未经验证的不兼容 override。

回滚：测试和配置可随对应实现一起回滚。

### P4 — 首个受控试运行

BIOS 子工单：`YES-1969`（历史补录，`in_review`）

依赖：P3；按用户批准的 no-render 边界完成，不执行真实 provider/render。

范围：

- 使用只读/plan 模式分别路由三个 fixture Job。
- 选择一个本地 fixture 执行到 final approval 前。
- 验证恢复、局部 revision 和 primary ownership。

验收：

- 不调用付费 provider。
- 不覆盖用户 artifact。
- 所有审核门可暂停和恢复。

结果：

- 三个 fixture 均存在、可解析并可路由；flag 开启时分别得到：
  - product：`product-promo-producer` / `hyperframes` / 仅 `final_render`。
  - digital-human：`digital-human-producer` / `remotion` / `heygen` / 全部审核门。
  - faceless：`faceless-explainer-producer` / `remotion` / 全部审核门。
- flag 关闭时三个 fixture 均被 `VIDEO_AGENT_PLATFORM` 拒绝。
- product-promo 只读试运行保持单一 primary，不调用 provider、不改文件；固定版本 HyperFrames check 通过并仅有非阻塞 warning，在 `final_render` 以 `needs_approval` 停止，只观察到既有 render。
- 同一 specialist session 在未获批准时恢复；没有推断批准，也没有编辑、provider 调用或 render。最小 caption revision 分析确认 `audio_meta.json` 是权威 timing 变更，`caption_groups.json` 与 `compositions/captions.html` 是派生文件；无关 storyboard、frames、assets、renders 保持不变。
- P4 在批准的 no-render 边界内完成；`final_render` 仍待批准，未发生最终批准或 render。
- 当前环境没有 `devin` CLI（`command not found`）；已通过 Cursor specialist 使用仓库定义 profile 作为 fallback。这是精确环境 blocker，不是平台失败。
- P4 未运行 `make test-integration` 或重跑最终 render；用户批准的是 no-render trial，P3 的既有 integration 证据单独保留。

回滚：仅删除 P4 fixture、测试增量和 P4 证据记录；不触碰既有视频、episode artifact、provider 或 render。

下一可选动作：用户明确批准后，从现有 `final_render` gate 恢复并执行最终 render；若不批准，则保持当前只读状态。

### P5 — Existing-Video Recut 专业 Agent

状态：在用户批准的 no-render 边界内完成（BIOS `YES-1920`）。

落地内容：

- workflow `existing-video-recut`、source `existing-video`、agent `existing-video-recut-producer`
- 自动路由优先级：product source 之后、digital-human 之前
- 安装并调用 HyperFrames `talking-head-recut`（设计化图形叠加，不是 embedded captions）
- fixture：`tests/fixtures/video-jobs/existing-video-recut.yaml`（`HeyGen_out.mp4` + `reference.srt`）
- 审核门语义：script=transcript、storyboard=overlay plan、final_render=preview/render

结果：

- flag 开启时 fixture 路由到 `existing-video-recut-producer` / `hyperframes`，`requires_approval` 为 `storyboard` + `final_render`。
- flag 关闭时同一 fixture 被 `VIDEO_AGENT_PLATFORM` 拒绝。
- 源片 ffprobe：720×1280 / 25fps / 54.187s；SHA-256 试运行前后均为 `cd9f6009…f25b4922`，源片未改。
- no-render specialist trial：仅内存产出 5 张 overlay 规划卡片，停在 `needs_approval` / `plan`；未创建 `videos/` workdir、未调用 provider、未 render。
- 未批准恢复：不推断批准、无编辑、无 provider、无 render；单一 primary ownership。
- `devin` CLI 与 BIOS MCP 写入在当前环境不可用；已用 Cursor specialist + 本地证据文件记录精确 blocker。
- 独立证据：`state/tasks/YES-1920-p5-controlled-trial.md`。

回滚：删除第四 Agent、recut fixture、schema/router/入口 Skill/测试与 P5 文档增量；不触碰既有三类 workflow、episode、源片与 provider。

下一可选动作：用户明确批准 overlay plan（`storyboard`）后再允许 build/preview；最终 render 仍需单独批准。

### P6 — 立刻可接专业 Agent

状态：契约/路由/profile/fixture 已完成（BIOS `YES-1923`）。真实出片试运行按需另开。

详见 `docs/VIDEO_AGENT_PLATFORM_P6_DEVELOPMENT_PLAN.md`。相邻高需求专家仅记入 `docs/VIDEO_AGENT_PLATFORM_BACKLOG.md`。

落地七类：

| workflow | agent | renderer |
| --- | --- | --- |
| embedded-captions | embedded-captions-producer | hyperframes |
| pr-video | pr-video-producer | hyperframes |
| music-video | music-video-producer | hyperframes |
| video-translation | video-translation-producer | remotion（需 provider） |
| motion-graphics | motion-graphics-producer | hyperframes |
| slideshow | slideshow-producer | hyperframes |
| remotion-port | remotion-port-producer | hyperframes |

### P7 — backlog 晋升项

仅当 `VIDEO_AGENT_PLATFORM_BACKLOG.md` 中候选项满足晋升门槛时另开（product-demo、shorts-repackage、training-sop 等）。

## 4. 依赖顺序

```text
P0 -> P1 -> P2 -> P3 -> P4 -> P5 -> P6

P7 仅在 backlog 项获独立需求与 BIOS 后启动
```

P1 修改共享契约，必须串行完成。P2 的三个 Agent 文件可以并行编写，但本次为避免配置分叉，先使用同一 contract 串行落地。P3 最后统一验证。P5 在 P4 稳定证据后启动。P6 在 P5 后扩展七个立刻可接专家。

## 5. Feature Flag 灰度

- Key：`VIDEO_AGENT_PLATFORM`
- 默认：`false`
- dev/prod 初始值：`{"enabled":false}`
- team 验证：`{"enabled":true,"teamOnly":true}`
- 灰度：5% -> 25% -> 100%
- kill：`FLAG_video_agent_platform={"enabled":false}`
- 观测：路由成功率、blocked 原因、错误路由数、审核门恢复成功率、每 Job Agent 数量。

## 6. 完成定义

本次实现完成需同时满足：

- P0-P3 完成。
- 三条 workflow 路由有单元测试。
- Agent 配置能被 Devin 发现或有精确环境 blocker。
- `make test-integration` 通过。
- `make check` 除已记录且不可修复的外部 audit blocker 外无失败。
- BIOS 记录真实命令、结果、风险和回滚边界。

## 7. 当前状态

- [x] BIOS `YES-1909` 已创建并进入 `in_progress`。
- [x] YES-620 既有工作已单独提交，工作树已切换到 `feat/agent/YES-1909-video-agent-platform`。
- [x] P0 文档完成并通过 `git diff --check`。
- [x] P1 契约、路由、CLI 和 flag。
- [x] P2 Skill 与三个专业 Agent。
- [x] P3 测试和门禁；唯一未通过项为上游无修复版本的 npm audit 漏洞。
- [x] P4 受控试运行在用户批准的 no-render 边界内完成；`final_render` 仍待批准，未发生最终批准或 render。
- [x] P5 Existing-Video Recut 在用户批准的 no-render 边界内完成（BIOS `YES-1920`）；其后用户批准 storyboard/final_render 并完成本地出片。
- [x] P6 七个立刻可接专家：schema/router/profiles/fixtures/tests 完成（BIOS `YES-1923`）；相邻需求见 backlog 文档。

## 8. 本次验证证据

- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run validate:sample`：通过，8 个场景、720 帧。
- `npm test`：23 个文件、114 个测试通过。
- `npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts`：2 个文件、24 个测试通过。
- 四个 fixture 文件均存在、可解析并可路由；flag 开启时 product 仅要求 `final_render`，digital-human 和 faceless 要求全部审核门，existing-video-recut 要求 `storyboard` + `final_render`；flag 关闭时均被 `VIDEO_AGENT_PLATFORM` 拒绝。
- P5 源片 SHA 试运行前后一致；未创建 HyperFrames workdir；未调用 provider / 云 / 最终 render。
- `make verify-harness`：17/17 通过。
- P3 `make test-integration`：通过，生成 720 帧样片 MP4，约 4.1 MB；P4/P5 因批准的 no-render 边界未重跑 integration 或最终 render。
- 当前环境的 `devin` CLI 不可用（`command not found`）；BIOS MCP 写入在本会话不可用；通过 Cursor specialist 与本地证据文件完成 fallback，不将此环境 blocker 记为平台失败。
- 独立 checker：首次判定 `continue`，指出 digital-human provider 不应使用隐式占位值；已改为 schema 必填并补错误路径测试。
- `make check`：typecheck、lint、sample validation（8 个场景、720 帧）和 23 个文件/114 个测试通过；最终 `npm audit` 仍因 brace-expansion/minimatch 报告 12 个 high 且 `No fix available`，因此不得声称 `make check` 完整通过。
