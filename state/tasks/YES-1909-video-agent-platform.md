# YES-1909 — 多工作流视频 Agent 平台

## 1. 目标（Goal）

建立一个 feature-flagged 的统一视频生产入口，使父 Agent 能通过可校验 Video Job 路由到产品宣传片、数字人口播或无脸图文讲解专业 Agent，同时保留各工作流既有 artifact、provider 和渲染边界。

## 2. 背景与上下文（Context）

- 服务面：`src/schemas/`、`src/agent/`、`src/cli/`、`flags/`、`.devin/agents/`、`.devin/skills/`、`tests/`、`docs/`。
- 现有代码：
  - `src/agent/workflows/index.ts`：episode 生成与 revision routing。
  - `src/schemas/artifacts.ts`：brief/storyboard/render plan/rights schema。
  - `src/avatar/`：数字人 provider adapters。
  - `videos/deepdog-skills-promo/`：产品宣传片 HyperFrames 工作流。
  - `flags/feature-flags.ts`：本地/Statsig feature flag facade。
- 规则：遵守根 `AGENTS.md`、`agent-coding-discipline`、feature flag、review gate、provider secrets 和本地渲染边界。
- 产品决策：CLI/Agent-first；不新增浏览器 UI、云队列、对象存储或自动发布。

## 3. 范围（In / Out of Scope）

### In

- Video Job 和 Route Zod schema。
- 基于显式 workflow、source type 和 presenter mode 的确定性路由。
- `video:route` CLI。
- `FLAGS.VIDEO_AGENT_PLATFORM` 与 dev/prod kill switch。
- 一个入口 Skill、四个专业 Agent profile 和共享 contract reference。
- 正常、边界、错误和 kill-switch 测试。
- 架构、ADR、开发计划和 BIOS 证据。

### Out

- 新 provider 实现。
- 真实付费 API 调用。
- 最终视频生成或自动发布。
- 统一 Remotion、HyperFrames、HeyGen 的内部 storyboard。
- 超出已落地四类之外的专业 Agent（translation / music / PR 等仍属后续）。
- 大范围重构现有 episode CLI。

## 4. 验收标准（Acceptance Criteria）

1. 给定显式 `product-promo` workflow，当平台 flag 开启时，路由返回 `product-promo-producer` 和 HyperFrames renderer。
2. 给定 `product-brief` 或 `website` source，当 workflow 为 `auto` 时，路由到产品宣传片。
3. 给定普通 script 且 `presenter.mode=digital-human`，路由到数字人口播；给定产品 source + digital human 时，产品宣传片保持 primary，并返回数字人 delegated capability。
4. 给定 topic 或无主持人的普通 script，路由到无脸图文讲解。
5. 给定无效 Job、未知组合或不兼容 renderer，schema/route 返回清晰错误且不写 artifact。
6. 给定 `VIDEO_AGENT_PLATFORM=false`，路由被 kill switch 拒绝；现有 episode/promo/avatar 直接命令行为不变。
7. 三个 Agent 文件都声明输入、输出、审核门、写入边界、禁止事项和验证命令。
8. `npm run typecheck`、`npm run lint`、相关 Vitest 和 `make test-integration` 通过；audit 外部 blocker 单独记录且不绕过。

## 5. 约束（Constraints）

- 共享契约只覆盖路由 envelope，不替代 workflow-specific artifact。
- 一个 Job 只有一个 primary agent。
- 业务路由函数通过注入的 `enabled` 状态消费 flag，不在纯函数内读取全局单例。
- 不记录 token、个人路径、私有网络地址或 workspace ID。
- 不静默调用付费 provider。
- 特性开关：`FLAGS.VIDEO_AGENT_PLATFORM`，默认 false。

## 6. 测试要求

- 单测：schema defaults/refinements、三类路由、显式 override、组合 capability、renderer mismatch、kill switch。
- 配置测试：入口 Skill 和三个 Agent 文件存在且包含关键 contract。
- 集成：`make test-integration` 保证现有 Remotion 样片不回归。
- 完整门禁：`make check`；若 npm audit 为上游无修复漏洞，保留完整报告，不降低门禁。

## 7. 交付与回滚

- 灰度：teamOnly -> 5% -> 25% -> 100%。
- Kill switch：`FLAG_video_agent_platform={"enabled":false}`。
- 观测：路由成功率、错误路由数、blocked 原因、审核恢复成功率、每 Job Agent 数量。
- 回滚：删除 Video Job/router/CLI、`.devin` 新配置和 flag/env 行；现有工作流保持可直接调用。

## 8. P4 受控试运行结果

状态：在用户批准的 no-render 边界内完成。`final_render` 仍待批准；没有最终批准或 render。

- 三个 fixture 文件存在并成功解析/路由。
- flag 开启：
  - product -> `product-promo-producer` / `hyperframes` / 仅 `final_render`。
  - digital-human -> `digital-human-producer` / `remotion` / `heygen` / 全部审核门。
  - faceless -> `faceless-explainer-producer` / `remotion` / 全部审核门。
- flag 关闭：三个 fixture 均被 `VIDEO_AGENT_PLATFORM` 拒绝。
- product-promo 只读 trial 保持单一 primary；无 provider、无文件变更；固定版本 HyperFrames check 通过并有非阻塞 warning；在 `final_render` 返回 `needs_approval`；只观察既有 render。
- 同一 specialist session 在未批准的情况下恢复。没有推断批准，没有编辑、provider 调用或 render。最小 caption revision 分析确认 `audio_meta.json` 是权威 timing 变更，`caption_groups.json` 和 `compositions/captions.html` 是派生文件；无关 storyboard、frames、assets、renders 保持不变。
- `devin` CLI 当前不可用（`command not found`）；fallback 通过 Cursor specialist 使用仓库定义 profile。这是精确环境 blocker，不是平台失败。
- P4 未运行 `make test-integration` 或重跑最终 render，因为用户批准的是 no-render trial；P3 integration 证据保留且不归入 P4。

验证：

- 聚焦 Vitest：2 个文件、17 个测试通过。
- `make verify-harness`：17/17。
- `make check`：typecheck、lint、sample validation（8 个场景、720 帧）、23 个文件/107 个测试通过；最终 npm audit 仍因 brace-expansion/minimatch 报告 12 个 high、`No fix available`。`make check` 未完整通过。

P4 回滚边界：移除 P4 fixture、测试增量和受控试运行证据；不改动既有 workflow、episode、video artifact、provider 或 render。

下一可选动作：仅在用户明确批准 `final_render` 后恢复同一 gate 并执行最终 render；否则保持 no-render 状态。

## 9. P5 Existing-Video Recut 结果

状态：在用户批准的 no-render 边界内完成（BIOS `YES-1920`）。`storyboard` 与 `final_render` 仍待批准；没有最终批准或 render。源片未改。

- fixture `tests/fixtures/video-jobs/existing-video-recut.yaml` 存在并成功解析/路由。
- flag 开启：existing-video -> `existing-video-recut-producer` / `hyperframes` / `storyboard` + `final_render`。
- flag 关闭：同一 fixture 被 `VIDEO_AGENT_PLATFORM` 拒绝。
- 源片 `HeyGen_out.mp4`：720×1280 / 25fps / 54.187s；SHA-256 前后均为 `cd9f6009de6bad3024a071b188011bb02cf1afd23e3e17227cf4be61f25b4922`。
- no-render specialist trial：内存规划 5 张设计化 overlay 卡片；`needs_approval` / `plan`；无 workdir、无 provider、无 render。
- 未批准恢复：不推断批准；单一 primary；最小 revision 边界为 overlay storyboard → card HTML → root composition，源片与 transcript 不触碰。
- `devin` CLI 与 BIOS MCP 写入当前不可用；fallback 为 Cursor specialist + `state/tasks/YES-1920-p5-controlled-trial.md`。精确环境 blocker，不是平台失败。
- P5 未运行 `make test-integration`、HyperFrames render、Whisper 转写或 provider API。

验证：

- 聚焦 Vitest：2 个文件、24 个测试通过。
- `make verify-harness`：17/17。
- `make check`：typecheck/lint/unit 路径通过；最终 npm audit 仍因 brace-expansion/minimatch 报告 12 个 high、`No fix available`。

P5 回滚边界：移除第四 Agent、recut fixture、schema/router/入口 Skill/测试与 P5 文档增量；不改动既有三类 workflow、源片、episode 或 provider。

下一可选动作：仅在用户明确批准 overlay plan（`storyboard`）后再 build/preview；`final_render` 仍需单独批准。

> 请基于以上任务:① 先输出实现计划与你识别到的风险/失败模式,等架构师确认;② 实现代码并生成对应测试;③ 确保 `make test-integration` 通过;④ 把功能包在指定特性开关后;⑤ 开 PR,在描述里列出权衡与需人类评审者重点看的战略风险。**不要扩大范围;遇到第 3 节之外的需求先问架构师。**
