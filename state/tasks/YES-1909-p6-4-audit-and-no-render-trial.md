# P6.4 — BIOS 建单降级记录与执行任务

日期：2026-08-01
父工单：`YES-549`
关联平台：`YES-1909`
BIOS 子工单：`YES-1961`（`done`）

## BIOS 创建尝试

已通过 `deepdog-observer.bios_create_issue` 尝试在 `YES-1909` 下创建：

- 标题：`P6.4 收口 P5 审计证据并完成 Embedded Captions 无付费试运行`
- 类型：`task`
- 风险：`medium`
- 优先级：`medium`
- 幂等 token：`ai-remotion-p6-4-audit-no-render-trial-2026-08-01`

首次结果：`deepdog daemon is not running on this machine`。

daemon 恢复后已用同一幂等 token 重试，成功创建 `YES-1961`，并通过 MCP 更新至 `verify` stage 后完成关闭（BIOS 状态 `done`）及回填进度证据。

## 目标

1. 让 P5 evidence 与本地已存在的实际构建证据一致，但不虚构用户批准记录。
2. 不提交 `videos/heygen-out-recut-trial/` 中的生成视频、音频、复制源片、日志或中间产物。
3. 执行 `embedded-captions` fixture 的只读/no-render trial；不调用 provider，不批准 review gate，不改源片。

## 验收

- P5 evidence 明确区分本地 render 与 provider/cloud 调用，并标注批准记录未验证。
- P5 工作目录被精确 Git 忽略，仍保留在本地供审计。
- flag on 路由到 `embedded-captions-producer`，flag off 被拒绝。
- 只读 trial 的源片 SHA-256 前后相同，所有 gate 保持 pending，结果为 `needs_approval`。
- 完成聚焦测试、typecheck、lint、CLI on/off 和 `git diff --check`；audit blocker 仅记录不绕过。

## 范围与禁止事项

详见 `docs/VIDEO_AGENT_PLATFORM_P6_4_DEVELOPMENT_PLAN.md`。禁止执行渲染、付费/云 provider、字幕生成、转写、源片/用户 artifact 修改、P7 schema 扩展或 Codex 宿主封装。

## 回滚

仅回滚 P6.4 文档、trial evidence 和 P5 工作目录的精确 ignore 规则；不修改既有平台实现、源媒体或用户 artifact。
