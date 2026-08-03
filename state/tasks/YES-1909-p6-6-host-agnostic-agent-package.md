# P6.6 — Host-Agnostic Video Producer Agent Package BIOS 降级记录

日期：2026-08-01
父工单：`YES-549`
关联平台：`YES-1909`
BIOS 子工单：`YES-1960`（`in_review`）

## BIOS 创建尝试

已通过 `deepdog-observer.bios_create_issue` 尝试创建：

- 标题：`P6.6 建立任意 Agent 可用的 Video Producer 中立封装`
- 类型：`task`
- 风险：`low`
- 优先级：`medium`
- 幂等 token：`ai-remotion-p6-6-host-agnostic-video-producer-2026-08-01`

首次结果：`deepdog daemon is not running on this machine`。

daemon 恢复后已用同一幂等 token 重试，成功创建 `YES-1960`，并通过 MCP 更新至 `verify` stage（BIOS 状态 `in_review`）及回填进度证据。

## 目标与验收

详见 `docs/VIDEO_AGENT_PLATFORM_P6_6_DEVELOPMENT_PLAN.md`。本阶段为 repository-local 中立 Agent package，不调用 provider、付费服务、外部网络、preview 或 render，也不写用户级宿主配置。

## 本地执行与验证

已交付：

- `agents/video-producer/AGENT.md`：无宿主专用 frontmatter 的入口契约。
- `agents/video-producer/SPECIALISTS.md`：11 个 workflow/primary/renderer/profile 映射。
- `agents/video-producer/README.md`：任意 Agent 接入与薄 adapter 原则。
- `.devin/skills/video-producer/SKILL.md`：改为读取中立入口的 Devin 发现适配。
- `tests/video-agent-platform.test.ts`：验证中立入口、结果协议、无 frontmatter 与全部 11 条 mapping。

验证：

- `npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts`：32 passed。
- `npm run typecheck`：passed。
- `npm run lint -- --quiet`：passed。
- `FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job tests/fixtures/video-jobs/motion-graphics.yaml`：路由至 `motion-graphics-producer` / `hyperframes`，gates 未自动批准。
- 未执行 provider、付费服务、外部网络、preview 或 render。

## 回滚

仅删除 P6.6 package、测试、计划、证据和文档引用；不影响 schema、router、specialist profile、feature flag、媒体或任一现有宿主配置。
