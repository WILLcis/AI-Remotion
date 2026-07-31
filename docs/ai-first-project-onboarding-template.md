# AI-First + BIOS 新项目接入模板

> 将本文件复制到新项目的 `docs/` 或内部知识库，逐项替换 `<...>` 并勾选。
> 配套规范见《[可复用的 AI-First 开发与 BIOS 协作规范](./ai-first-project-governance.md)》。

## 0. 项目档案

| 项目 | 填写内容 |
| --- | --- |
| 仓库 | `<git remote URL>` |
| 主要语言 / 包管理器 | `<例如 TypeScript / Bun>` |
| 服务面 | `<例如 web、server、worker、native、docs>` |
| 默认质量门禁 | `<例如 bun run verify>` |
| 窄范围检查 | `<例如 check:web / check:server>` |
| 测试框架 | `<例如 Vitest、pytest、Go test>` |
| 发布方式 | `<例如 GitHub Actions + tag>` |
| 敏感状态位置 | `<例如 ~/.config/<app>、云密钥管理器>` |
| BIOS workspace / project | `<名称或 ID；不要写 token>` |
| BIOS 父工单 | `<ISSUE-KEY；没有则留空>` |

## 1. 仓库内治理文件

- [ ] 新建或更新 `AGENTS.md`：项目结构、代码风格、测试命令、质量门禁、持久化、安全与提交规则。
- [ ] 新建或更新 `CLAUDE.md` / 其他 agent 上下文：工具入口、skills、BIOS 生命周期、日报路径与项目专属安全边界。
- [ ] 为需要长期执行的决策建立 `.cursor/rules/*.mdc`（例如“默认不用 feature flag”或“禁止自动修改用户凭证”）。
- [ ] 将临时 state、产物、依赖目录与本地日报写入 `.gitignore`。
- [ ] 仅保留与本项目有关的规则；不要把另一个项目的端口、绝对路径、账号、issue key 或发布流程照搬过来。
- [ ] 搜索并移除原项目品牌、CLI 名、环境变量、服务域、文档路径与默认端口残留。

### `AGENTS.md` 最小骨架

```md
# Repository Guidelines

## Project Structure
<目录职责>

## Development and Verification
- <安装命令>
- <服务面窄范围检查>
- <统一质量门禁>

## Development Contract
- 先调查、后修改；最小 diff；同区域测试。
- <持久化兼容规则>
- <安全与隐私规则>
- <feature flag 默认策略>

## BIOS
- 开工前创建/复用 BIOS 工单。
- 分支：<type>/<service>/<ISSUE-KEY>-<slug>。
- 验证前后回填中文进度与证据。
```

## 2. BIOS / MCP 接入

### 2.1 本机验证

- [ ] 已安装 BIOS CLI：`<bios-cli> --version`
- [ ] 已登录到正确 workspace；不在 shell history、文档或仓库记录 token。
- [ ] daemon 已运行且只监听 loopback。
- [ ] 已读取实际 health endpoint / profile 配置，不假定其他机器的端口相同。
- [ ] MCP `initialize` 与 `tools/list` 只读握手成功。

### 2.2 项目级 MCP 配置

以下仅为抽象形状。bridge 命令、环境变量名、endpoint 路径和传输方式必须以当前 BIOS / MCP 客户端文档为准；不要把 token 写入 `.mcp.json`：

```json
{
  "mcpServers": {
    "bios": {
      "command": "<bios-cli-absolute-path-or-command>",
      "args": ["<bridge-subcommand>", "<bridge-args>"],
      "env": {
        "<bridge-required-env>": "<daemon-or-bridge-endpoint>"
      }
    }
  }
}
```

- [ ] bridge stdout 只传 MCP 协议；stderr 用于诊断。
- [ ] daemon token 与 workspace 归属不进入仓库。
- [ ] 写入失败或授权失败时，把待调用参数记录到 `<项目定义的待调用清单路径>` 或团队指定系统，待权限恢复后补执行。

### 2.3 工单与分支

```bash
# 先创建或复用工单
<bios-cli> issue create --title "<任务>" --parent <PARENT-KEY> ...

# 再创建规范分支
git switch -c fix/<service>/<ISSUE-KEY>-<slug>
```

- [ ] 工单描述含目标、范围、验收标准、风险与测试要求。
- [ ] 工单与仓库 / 分支关联。
- [ ] 开工、验证、交付时均回填中文进度。
- [ ] CI / PR 是否自动建单或自动指派属于可选增强，不应阻塞 MCP 主通道。

## 3. 质量门禁落地

| 服务面 | 代码目录 | 窄范围检查 | 同区域测试 | E2E / live 触发条件 |
| --- | --- | --- | --- | --- |
| `<web>` | `<path>` | `<command>` | `<command/path>` | `<触发条件>` |
| `<server>` | `<path>` | `<command>` | `<command/path>` | `<触发条件>` |
| `<native>` | `<path>` | `<command>` | `<command/path>` | `<触发条件>` |
| `<docs>` | `<path>` | `<command>` | `<command/path>` | `<触发条件>` |

- [ ] 统一质量门禁可在干净环境运行。
- [ ] 覆盖率策略不允许通过降低 baseline 规避。
- [ ] CI 报告产物有固定位置，失败时可以定位到 lane 日志。
- [ ] 涉及发布、provider、agent loop 的变更有 live 证据或明确凭证 blocker。

## 4. 安全与数据兼容

- [ ] 列出受保护状态：token、OAuth、provider 配置、用户会话、MCP 配置、adapter session、团队数据等。
- [ ] 任何自动修复都采用 deny-by-default + allowlist。
- [ ] 持久化变更保留未知字段、提供迁移、旧 fixture 回归与 rollback 说明。
- [ ] shell / 文件系统 / 下载 / 解压 / remote control 路径完成安全审查。
- [ ] 日志与工单不包含密钥、PII、完整 transcript 或敏感路径。

## 5. CI、发布与权限

- [ ] 分支保护 required checks 已配置。
- [ ] agent / review 所需的 CI secret 由维护者在平台配置，不写入 repo。
- [ ] 发布命令、tag 规则、release notes 来源、签名与回滚路径已文档化。
- [ ] 自动指派、webhook、外部集成分别记录最小权限与故障降级。

## 6. 首次演练

选择一个低风险 bug 或文档改动，完整演练一次：

1. [ ] BIOS 创建工单并建规范分支。
2. [ ] 写明根因 / 目标 / 验收。
3. [ ] 完成最小改动与同区域测试。
4. [ ] 运行窄范围检查和统一门禁。
5. [ ] 追加 BIOS 中文证据、日报、PR / 交付摘要。
6. [ ] 用独立 reviewer 视角检查安全、测试与范围。
7. [ ] 复盘缺失的命令、权限、模板或 CI 配置并补到本文。

## 7. 不要复制的项目特定信息

以下内容必须在每个新项目中重新确认：

- BIOS server URL、workspace ID、daemon 端口、CLI 绝对路径；
- 父工单、服务标签、负责人和 agent 容量；
- 代码目录、包管理器、质量脚本、coverage 门槛；
- 受保护文件路径、数据分类、发布和签名策略；
- feature flag 默认策略与 kill switch 约定。
