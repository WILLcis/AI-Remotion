# AI-First + BIOS 项目接入档案

> 本文件是 AI-First 项目接入模板在 AI-Remotion 的落地记录。通用原则见 [`ai-first-project-governance.md`](./ai-first-project-governance.md)，模板见 [`ai-first-project-onboarding-template.md`](./ai-first-project-onboarding-template.md)。

## 0. 项目档案

| 项目 | 已确认内容 |
| --- | --- |
| 仓库 | `WILLcis/AI-Remotion`；remote 为 `git@github.com:WILLcis/AI-Remotion.git` |
| 主要语言 / 包管理器 | TypeScript / npm；Node.js 20+ |
| 服务面 | CLI/Agent、Remotion renderer、episode artifact pipeline、docs |
| 默认质量门禁 | `make check`；等价命令为 `npm run check` |
| 窄范围检查 | `npm run typecheck`、`npm run lint`、`npm run validate:sample`、`npm test` |
| 集成检查 | `make test-integration`；执行样片 Remotion 渲染 |
| Harness 检查 | `make verify-harness`；不调用真实 LLM |
| 测试框架 | Vitest；Remotion sample render 作为集成证据 |
| 发布方式 | GitHub Actions + tag + GitHub Release；合并到 `main` 必须留下两项审计锚点 |
| 敏感状态位置 | `.env.local`、运行时环境变量、操作系统安全存储；不进入仓库、日志或工单 |
| BIOS workspace / project | 待确认；仓库不记录 token、workspace ID 或 daemon 地址 |
| BIOS 父工单 | `YES-549` |

## 1. 已接入清单

- [x] 根目录 `AGENTS.md`：项目结构、命令、质量门禁、数据安全和发布规则。口播 / 我的形象默认即梦，不把 HeyGen 列入必读。
- [x] `docs/HeyGen_skills.md` / `docs/HeyGen.md`：仅当人点名 HeyGen 或 Job 为 `generation.service=heygen` 时遵循；不是口播默认方案。
- [x] `.agents/skills/agent-coding-discipline/SKILL.md`：先读再写、最小改动、测试和交付证据纪律。
- [x] `docs/ai-first-project-governance.md`：通用 AI-First 与 BIOS 协作规范。
- [x] `docs/ai-first-project-onboarding-template.md`：新项目接入模板，保留为通用模板。
- [x] `docs/HARNESS.md`：已安装能力、活动门禁和手工能力说明。
- [x] `.github/pull_request_template.md`：PR 级自检和风险披露。
- [x] `.github/workflows/ci.yml`：CI 质量门禁。
- [x] `state/README.md`：append-only state、任务状态和敏感信息规则。
- [x] `.gitignore`：依赖、临时 state、本地配置和生成产物排除规则。
- [ ] BIOS CLI / workspace / daemon：尚未在当前环境验证；不得假设命令、端口或权限。
- [ ] BIOS MCP 写操作：待完成本机只读握手和权限确认后再启用。

## 2. 项目开发契约

- 先调查、后修改；每个非 typo 的开发、排障或架构任务必须关联 BIOS 工单。
- 以 `YES-549` 作为本阶段父工单；具体实现应复用已有子工单或创建子工单，不能伪造工单号。
- 分支使用 `<type>/<service>/<ISSUE-KEY>-<slug>`；文档治理任务建议使用 `docs/docs/<ISSUE-KEY>-ai-first-onboarding`。
- 生产代码变更必须有同区域测试；文档变更至少运行链接/结构检查和适用的轻量门禁。
- 保留用户编辑过的 `brief`、`script`、`storyboard` 和 `render-plan`；只修改完成任务所必需的 episode artifact。
- 新增用户可见高风险能力才使用 feature flag；当前治理接入不新增 feature flag。
- 不新增云渲染、队列、对象存储、付费 provider 或自动发布流程。

## 3. BIOS / MCP 降级策略

当前未确认 BIOS CLI、workspace、daemon 和实际 health endpoint，因此本仓库只记录待确认事项，不写入抽象配置、token 或猜测的 endpoint。

BIOS 不可用时，使用以下可追溯降级方式：

1. 在本地任务/PR 描述中保留父工单 `YES-549`、目标、范围、验收标准、风险和验证命令。
2. 将“待创建/待更新的 BIOS 子工单内容”记录在交付摘要中，不表述为已经回填。
3. 权限恢复后，按 `backlog → todo → in_progress → in_review → done` 回填实际状态与中文证据。
4. 任何 token、OAuth、workspace ID、daemon 地址和完整会话都不得进入仓库、日志或工单正文。

## 4. 质量门禁矩阵

| 服务面 | 代码目录 | 窄范围检查 | 同区域测试 | E2E / live 边界 |
| --- | --- | --- | --- | --- |
| CLI / artifact pipeline | `src/cli/`、`src/episodes/`、`src/schemas/` | 对应 CLI、`npm run typecheck`、`npm run lint` | `tests/` 中 Vitest fixture tests | 涉及真实 provider 时需要 mock 和 live blocker 说明 |
| Remotion renderer | `src/remotion/`、`src/render/` | `npm run typecheck`、`npm run lint` | `make test-integration` | 视觉变更至少渲染 sample 或 still frame |
| QA / harness | `src/qa/`、`scripts/`、`tools/` | 对应脚本 dry-run 或 `make verify-harness` | mock adapter / fixture | 外部 observability、BIOS、GitHub 权限缺失时记录 blocker |
| Docs / governance | `docs/`、`AGENTS.md` | Markdown 链接和占位符检查 | 不适用；必要时运行 `make check` | BIOS 写操作需实际权限证据，不能用文档替代 |

## 5. 父工单 YES-549 下的首次演练

选用低风险的文档治理接入作为首次演练，不触碰业务代码或生成媒体产物。

### 目标

将 AI-First onboarding/governance 规范落到 AI-Remotion 的 agent 上下文、项目档案和可执行计划中。

### 范围

- In: 项目接入档案、`AGENTS.md` 治理入口、`docs/plan.md` 开发计划、BIOS 降级说明。
- Out: BIOS 凭证/MCP 写配置、业务功能、云 provider、CI 外部权限和发布操作。

### 验收标准

1. 项目档案中的仓库、命令、目录、敏感状态、父工单和发布规则均来自当前仓库事实。
2. 计划按依赖拆分阶段，并为每阶段写出验收证据、风险和回滚边界。
3. 文档中没有 token、PII、猜测的 BIOS endpoint 或伪造的子工单号。
4. `make verify-harness`、文档占位符检查和 `git diff --check` 可执行；未运行的命令必须在交付中明确标注。

### 待回填 BIOS 子工单内容

- **父工单**：`YES-549`
- **建议标题**：`完成 AI-First + BIOS 治理接入与首次演练`
- **类型 / 风险**：`chore` / low
- **目标**：完成仓库治理文档、质量门禁矩阵和 BIOS 降级流程落地。
- **测试**：文档结构检查、`git diff --check`、`make verify-harness`；若涉及业务代码，再补 `make check`。
- **阻塞**：BIOS 只读验证已通过；写权限调用、子工单复用/创建和阶段回填仍待明确执行。

## 6. P1 / P2 执行记录

### P1 — BIOS 只读验证

- **本机发现**：BIOS CLI 为 `deepdog v0.3.32`；daemon health 返回 `status=running`，workspace 与本地安全配置一致。
- **相关命令**：`deepdog --version`、对本地安全配置中的 daemon health endpoint 发起只读检查、`deepdog observe-bridge --help`。
- **MCP 结果**：通过本地安全配置中的 observer endpoint 完成 `initialize` 和 `tools/list` 只读握手；服务端为 `deepdog-bios v0.3.32`，工具集可用。
- **MCP 写入尝试**：按用户要求优先调用 `bios_create_issue`，参数包含 `parent_key=YES-549`、项目 workspace、目标、验收标准和上下文文件。
- **结果**：Deepdog daemon 返回 `deepdog daemon tool endpoint not wired yet (M2-B2)`；工具调用失败，未返回子工单号，未创建或回填子工单。
- **写操作边界**：未调用 `bios_update_stage`、`bios_report_progress` 或其他后续写工具；未伪造工单号或成功状态。
- **状态**：只读验证通过；BIOS 建单 blocker 已确认。需要 Deepdog daemon 接通 tool endpoint，或用户提供可用的 BIOS 建单入口后再重试。

### P2 — Canonical demo 服务器复现

- **本机依赖**：`/opt/homebrew/bin/ffprobe`、`/opt/homebrew/bin/ffmpeg` 可用；本机版本均为 8.1.1。
- **远端只读命令**：通过 `docs/ssh.md` 的本地占位参数执行非交互 SSH，并检查 `ffprobe`、`ffmpeg`、Node.js 与 npm。
- **Tailscale / SSH**：本地安全配置中的目标设备在线；Tailscale ping 经 DERP 中继成功，现有 SSH key 非交互登录成功。
- **远端基础环境**：`ffprobe` 与 `ffmpeg` 为 6.1.1；Node 为 18.19.1、npm 为 9.2.0。
- **结果**：Node 18 不满足项目 Node.js 20+ 要求；只读查找用户目录未发现 `AI-Remotion` 项目目录或 `package.json`，因此未运行 `npm install`、`npm run check` 或 `npm run demo:canonical`。
- **状态**：`blocked`；需要在服务器准备 Node.js 20+ 和项目工作树。按照 `docs/ssh.md` 的只读验证边界，本次未修改远端文件。

### 回滚与后续

本次只读调查未修改 episode artifact、服务器文件或 BIOS 状态，不需要代码回滚。连接和权限恢复后，应先重复 P1/P2 的只读命令，再执行完整 canonical demo；不得用本机依赖结果替代服务器证据。
