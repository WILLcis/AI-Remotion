# 可复用的 AI-First 开发与 BIOS 协作规范

> 适用对象：希望在任意代码仓库中接入 AI 编程 agent、质量门禁与 BIOS 工单协作的团队。
> 使用方式：将本文复制到新项目并替换所有 `<占位符>`；项目专属命令、目录、数据分级与发布策略必须以该项目的 `AGENTS.md` 为准。

## 1. 原则与职责

1. **工单是工作的事实来源**：按项目治理规则，为非纯 typo 的开发、排障和架构调整创建或复用可追溯工单，再开始实现。
2. **先调查，后修改**：bug 需要先复现、收集错误证据并确认根因；不要用猜测性改动掩盖症状。
3. **最小可验证改动**：只改实现目标所需的文件；不混入无关重构、格式化或依赖升级。
4. **同区域测试**：生产代码变更必须附带同区域测试；跨进程、跨网络或用户可见流程需有 E2E、live smoke，或明确记录阻塞原因。
5. **实现者不是唯一验收者**：重要变更要有独立 checker / quality / security / dependency 视角；无法启动独立 agent 时，需在交付中明确自检范围与局限。
6. **证据优先**：未运行的命令不能写成“通过”；无法验证时应写明已尝试的命令、失败原因、替代检查与残余风险。

## 2. 开工前的最小流程

```text
澄清目标 → 拆分任务 → BIOS 建单/复用 → 建分支 → 调查与实现
→ 窄范围检查 → 项目质量门禁 → 独立检查 → BIOS 回填 → 交付
```

### 2.1 任务拆分

| 情形 | 做法 |
| --- | --- |
| 单文件 typo、已有测试的微调、纯文档小修 | 可直接执行，仍需记录验证。 |
| 多文件功能、行为改变、跨层链路 | 写明 Goal、Context、In/Out of Scope、验收标准、约束、测试、交付与回滚。 |
| 多个目录且没有共享文件/契约 | 可按文件边界并行。每个子任务须有允许修改范围、禁止修改范围和验证命令。 |
| schema、持久化格式、共享契约、同一文件或 API 先后依赖 | 串行推进；先稳定契约，再实现调用方。 |

**结构化任务模板**

```md
## Goal
<用户与业务结果>

## Context
<涉及服务、现有代码、已知根因或设计约束>

## In / Out of Scope
- In: <本次必须交付的内容>
- Out: <明确不做，避免范围膨胀>

## Acceptance Criteria
1. 给定 <前置条件>，当 <动作>，则 <可观察结果>。
2. 给定 <异常/旧数据/权限不足>，当 <动作>，则 <稳定错误或兼容结果>。
3. <测试或用户流程证据>。

## Constraints
<安全、数据兼容、性能、依赖、feature flag 决策>

## Test Requirements
<同区域单测、集成/E2E、质量门禁、live blocker>

## Delivery / Rollback
<回滚边界、剩余风险、交付证据>
```

## 3. BIOS 工单协作

### 3.1 生命周期

推荐状态：`backlog → todo → in_progress → in_review → done`；阻塞时使用 `blocked`，不再执行时使用 `cancelled`。

推荐阶段（若 BIOS 支持）：`plan_assign → execute → verify → close`。状态与阶段可能是两个不同字段，更新阶段前需确认是否会同步移动看板状态。

### 3.2 建单内容

工单至少包括：

- 目标与范围；
- 可检查的验收标准；
- 风险等级；
- 首先应阅读的文件、文档或决策；
- 测试要求与 live / E2E 边界；
- 已知的安全或数据兼容风险。

示例（仅适用于项目已配置对应 CLI 的环境；参数以实际 BIOS / 工单系统文档为准）：

```bash
<bios-cli> issue create \
  --title "修复登录回调超时" \
  --type bug \
  --parent <PARENT-KEY> \
  --priority high \
  --risk medium \
  --description "目标：...；范围：...；根因证据：...；不做：..." \
  --acceptance-criteria "给定回调超时，系统返回稳定错误且不泄露 token" \
  --acceptance-criteria "新增回归测试并通过 <项目质量门禁>" \
  --context-ref "src/auth/callback.ts"
```

开工时按项目工作流更新为 `in_progress` / `execute`；关键设计、根因和验证结果使用团队约定语言追加评论；完成后推进 `in_review` / `done`。不要覆盖历史评论，也不要伪造工单号、阶段或验证结果。

BIOS 不可用、离线开发或团队使用其他工单系统时，应采用项目预先约定的可追溯降级方式（例如本地待调用清单或临时工单），记录待写入内容与失败证据；权限恢复后补回填。不要将“未能调用”表述为“已回填”。

### 3.3 MCP / daemon 信任边界

BIOS MCP 通常是：

```text
AI 客户端 → MCP bridge（stdio，无凭证） → 本地 daemon（localhost，持凭证） → BIOS 服务
```

- MCP bridge 的 stdout 只承载协议，诊断日志写 stderr。
- token、workspace ID、OAuth 信息仅保存在 daemon 或操作系统安全存储；不得写入仓库、日志、提示词或文档。
- daemon 不可用、工作区不一致或鉴权失败时，记录准备调用的参数到 `<项目定义的待调用清单路径>` 或团队指定的可追溯载体；不要反复探测权限或假装写入成功。

### 3.4 分支命名

推荐：

```text
<type>/<service>/<ISSUE-KEY>-<slug>
```

- `type`：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`build`、`ci` 等；
- `service`：用项目已定义的质量门禁域，例如 `server`、`web`、`desktop`、`native`、`docs`；
- `slug`：小写连字符的简短描述。

示例：`fix/web/ABC-123-login-timeout`。

## 4. 安全、隐私与持久化

### 4.1 必须禁止

- 硬编码、提交或打印 API key、OAuth / refresh token、MCP secret、IM bot token、完整会话与用户 PII；
- 通过“自动修复”改写用户拥有的配置、聊天记录、凭证、插件或连接器状态；
- 在没有 allowlist、备份和审查流程时执行文件删除、下载、解压、远程控制或 shell 自动修复；
- 在回答、日志、截图与工单中暴露敏感绝对路径或完整秘密内容。

### 4.2 持久化变更的交付条件

任何 JSON、数据库、localStorage、配置文件、会话或 provider 状态的改动，都必须：

1. 保留未知字段；
2. 提供前向迁移；
3. 保留旧 fixture 并有回归测试；
4. 使用原子写入或等效一致性保障；
5. 明确 downgrade / rollback 风险；
6. 对损坏、旧版或部分数据安全降级，而非阻断启动。

## 5. 测试与质量门禁

### 5.1 选择最小正确检查

| 变更面 | 需要的最低证据 |
| --- | --- |
| 纯逻辑 | 单元测试 |
| API / 服务端 / provider / runtime | 请求形状或服务端测试 + 输入校验、鉴权、错误形态检查 |
| Web / 桌面 UI / store | Vitest / Testing Library，同区域测试 |
| 文件系统、网络、WebSocket、sidecar、原生壳、浏览器流程 | 上述测试 + 有意义的 E2E 或明确 live blocker |
| 发布、模型路由、agent loop、工具执行 | mock / fixture 测试 + 有凭证时的 live baseline |

执行顺序：先跑窄范围检查，再跑项目总门禁。例如：

```bash
<package-manager> run check:<service>
<package-manager> run verify
```

如门禁失败，应读取报告和失败 lane 日志，修复根因后重跑；不要通过降低 coverage baseline、删除测试或使用无证据豁免绕过。

### 5.2 交付证据

交付 / PR 至少写明：

- 改动文件与用户可见影响；
- 新增或更新的测试；
- 已运行命令及通过/失败/跳过情况；
- E2E / live evidence，或明确缺少凭证、设备、外部服务的 blocker；
- 剩余风险、回滚边界；
- BIOS 工单号及已回填的阶段。

## 6. Feature Flag 决策

默认策略应由项目规则决定，不应机械复制其他仓库：

- **默认不使用开关**：产品明确要求直接发布时，不新增 `FLAG_*` / `VITE_FLAG_*`；在任务说明中记录“无需开关”的原因。
- **必须使用开关**：灰度、可快速关闭的高风险体验、跨进程新能力、或用户明确要求 kill switch 时，使用项目现有 flag 机制。
- 开关默认值、环境变量、测试、文档和回滚方式必须一致；关闭开关应回到已验证的旧行为。

## 7. 收工检查表

- [ ] 目标、范围和验收标准仍与工单一致。
- [ ] 每处改动都能解释为完成本任务所必需。
- [ ] 已运行窄范围测试与对应质量门禁，或记录精确 blocker。
- [ ] 已做安全、持久化兼容与依赖自检。
- [ ] 已完成独立 checker / quality / security / dependency 检查，或记录环境限制。
- [ ] BIOS 已追加中文进度和验证证据；状态与实际结果一致。
- [ ] 本地日报已追加（不提交凭证、PII、完整会话）。
- [ ] 最终交付包含测试、风险与回滚边界。

## 8. 迁移到新项目

下一步请使用《[新项目接入模板](./ai-first-project-onboarding-template.md)》，将本规范落到新仓库的 `AGENTS.md` / `CLAUDE.md`、质量脚本、BIOS 配置与 CI 中。
