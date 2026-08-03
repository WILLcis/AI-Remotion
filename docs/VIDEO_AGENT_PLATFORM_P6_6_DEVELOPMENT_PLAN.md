# P6.6 — Host-Agnostic Video Producer Agent Package 计划

状态：Executed locally；BIOS `YES-1960` 已创建并进入 `in_review`
日期：2026-08-01
父工单：`YES-549`；关联平台：`YES-1909`、P6.6：`YES-1960`

## 1. 问题

现有平台的 schema、CLI 和 feature flag 已经可以由任意可执行本地命令的 Agent 使用，但入口说明和 producer profiles 位于 `.devin/`，部分宿主无法自动发现该目录。Codex/Cursor 等可手动读取，但没有一个明确、宿主无关的单文件入口。

本阶段不把 11 个 specialist 复制到多个格式，也不将平台重构为新的万能 Agent。机器真相仍是 `src/schemas/videoJob.ts` 和 `npm run video:route`。

## 2. 目标

新增 `agents/video-producer/`，使任意 Agent 能从一个无宿主专用 frontmatter 的 Markdown 入口完成：

1. 读取与构造 Video Job；
2. 显式启用并验证 `FLAGS.VIDEO_AGENT_PLATFORM`；
3. 通过 `npm run video:route` 获得唯一 primary；
4. 阅读对应 specialist 执行协议；
5. 在 pending gate 返回 `needs_approval`；
6. 使用统一结果 JSON 交接。

## 3. 范围

### In

- `agents/video-producer/AGENT.md`：任意 Agent 可复制使用的入口契约、步骤、命令、审核门和故障协议。
- `agents/video-producer/SPECIALISTS.md`：11 个 workflow → primary → renderer → profile path 的中立映射；明确 profile Markdown 可由任意宿主读取，不要求自动发现。
- `agents/video-producer/README.md`：最短接入示例与 host adapter 原则。
- 让 `.devin/skills/video-producer/SKILL.md` 引用中立入口，作为 Devin 发现适配层而非第二份权威流程。
- 更新 Agent usage、项目 brief、handoff。
- 新增文件契约测试，验证中立入口引用 schema、CLI、flag、单 primary、审核门、结果协议和所有 11 specialists。

### Out

- 不复制或迁移 11 个 producer profile 内容。
- 不新增 `workflow`、source type、provider、renderer、feature flag 或浏览器 UI。
- 不自动安装 Codex/Cursor/Devin 全局配置，也不写用户目录 symlink。
- 不调用 provider、付费 API、外部网络、preview 或 render。
- 不做 P7 或转换任意媒体资产。

## 4. 设计原则

- **可移植入口，单一机器真相**：中立文档只编排 `video:route`；不重写 schema 校验或路由规则。
- **不复制 specialist 行为**：`SPECIALISTS.md` 映射到 repository-owned profile Markdown，防止 11 份行为规则分叉。
- **薄宿主适配**：`.devin/skills/video-producer/SKILL.md` 仅负责 Devin 发现与指向中立入口；未来 Codex/Cursor adapter 也只能指向同一入口。
- **安全默认**：flag 默认关闭；pending gate 不得自动批准；付费 provider、网络媒体和 final render 需要用户当时的明文批准。

## 5. 执行顺序

### P6.6.0 — 计划与 BIOS

创建本计划并在 `YES-1909` 下建立子工单。若 daemon 不可用，记录真实 blocker 和可幂等重试 payload。

### P6.6.1 — 中立 package

创建 `agents/video-producer/AGENT.md`、`README.md`、`SPECIALISTS.md`。入口必须只使用仓库相对路径和 shell/npm 命令，不引用 Devin/Codex 的全局目录或专有 API。

### P6.6.2 — 现有宿主适配

将 Devin Skill 改为先读 `agents/video-producer/AGENT.md`；保留其 frontmatter 与现有发现行为。不得修改 Codex 全局环境。

### P6.6.3 — 验证

- 增加平台测试，确认中立 package 和 11 条 mapping 存在并含关键 contract。
- 使用现有 motion-graphics fixture 运行 flag on/off route smoke；不创建 work directory。
- 运行聚焦 Vitest、typecheck、lint 与 `git diff --check`。

## 6. 验收

- 任意 Agent 只需读取 `agents/video-producer/AGENT.md`，即可知道如何构造 Job、路由、选择 profile、处理 gate 和返回结果。
- 中立入口不含宿主特定 frontmatter、全局 home path 或 provider secret。
- 11 个 specialist 都有稳定映射，且映射与 route result 的 primary 名称一致。
- Devin Skill 是入口的薄适配，未保留冲突的独立流程。
- 不产生任何媒体、provider 调用或 render。

## 7. 回滚

删除 `agents/video-producer/`、中立入口测试和文档引用，并恢复 Devin Skill 的单独文本。schema、router、fixtures、specialists、flag、媒体和其他宿主配置均不受影响。
