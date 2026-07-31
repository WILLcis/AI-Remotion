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

依赖：P3；不在本次自动执行真实 provider/render。

范围：

- 使用只读/plan 模式分别路由三个 fixture Job。
- 选择一个本地 fixture 执行到 final approval 前。
- 验证恢复、局部 revision 和 primary ownership。

验收：

- 不调用付费 provider。
- 不覆盖用户 artifact。
- 所有审核门可暂停和恢复。

### P5 — 后续专业 Agent

只有出现稳定需求和独立验收时才增加：

- existing-video-recut-producer
- video-translation-producer
- music-video-producer
- pr-video-producer

每个新增 Agent 复用 Video Job envelope，但拥有独立 workflow contract。

## 4. 依赖顺序

```text
P0 -> P1 -> P2 -> P3 -> P4

P5 仅在 P4 形成稳定证据后启动
```

P1 修改共享契约，必须串行完成。P2 的三个 Agent 文件可以并行编写，但本次为避免配置分叉，先使用同一 contract 串行落地。P3 最后统一验证。

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
- [ ] P4 受控试运行，需要用户选择真实 Job 和审核是否进入 render。

## 8. 本次验证证据

- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run validate:sample`：通过，8 个场景、720 帧。
- `npm test`：23 个文件、104 个测试通过。
- `npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts`：14 个聚焦测试通过。
- `npm run video:route -- --job /dev/stdin`：flag 开启时路由到 `faceless-explainer-producer`，输出 schema-valid JSON。
- `make verify-harness`：17/17 通过。
- `make test-integration`：通过，生成 720 帧样片 MP4，约 4.1 MB。
- Devin CLI `skills show video-producer`：通过，项目级 Skill 可发现；初次验证发现 description 冒号未加引号，已修复并增加 YAML frontmatter 测试。
- 独立 checker：首次判定 `continue`，指出 digital-human provider 不应使用隐式占位值；已改为 schema 必填并补错误路径测试。
- `make check`：typecheck、lint、sample validation 和 104 个测试通过；`npm audit` 因 `@remotion/eslint-config-flat -> minimatch -> brace-expansion` 报告 12 个 high 且 `No fix available`，未降低门禁或添加不兼容 override。
