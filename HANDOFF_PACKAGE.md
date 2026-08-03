# AI-Remotion Video Agent Platform — 开发接力包

生成时间：2026-08-01
给：继续开发的 coding Agent
你先读：`docs/VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md`，再读本包，再读 `AGENTS.md`。

| 字段 | 值 |
| --- | --- |
| 分支 | `feat/agent/YES-1909-video-agent-platform` |
| 父 BIOS | `YES-549` |
| 平台 | `YES-1909` |
| P1 | `YES-1966`（历史补录；`done`） |
| P2 | `YES-1967`（历史补录；`done`） |
| P3 | `YES-1968`（历史补录；`done`） |
| P4 | `YES-1969`（历史补录；`done`） |
| P5 | `YES-1920`（`done`） |
| P6 | `YES-1923`（`done`；契约已落地） |
| P6.4 | `YES-1961`（`done`）；本地审计收口与 captions no-render trial 已完成 |
| P6.5 | `YES-1962`（`done`）；motion-graphics no-render trial 已完成 |
| P6.6 | `YES-1960`（`done`）；任意 Agent 可读的中立 package 已完成 |
| P4–P6.4 已提交基线（本机） | `5d8e02d feat: expand video agent specialist routing`；最新状态以 `git log --oneline -5` 为准 |
| 工作树 | 接手前先运行 `git status --short`；不提交任何生成媒体 |

---

## 0. 开场指令（可直接粘贴给下一 Agent）

```text
你在 AI-Remotion 仓库继续 Video Agent Platform 开发。
1. 读 docs/VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md
2. 读 HANDOFF_PACKAGE.md（本文件）
3. 读 AGENTS.md 与 .agents/skills/agent-coding-discipline/SKILL.md
4. 运行 git status，先弄清未提交范围，再问用户要提交还是先做哪条下一步
5. 复用 FLAGS.VIDEO_AGENT_PLATFORM；不要新开万能 Agent；付费/渲染必须用户批准
```

---

## 1. 项目是什么（极简）

本地优先多工作流视频 Agent 平台：

```text
Video Job YAML
  → FLAG on
  → npm run video:route
  → 唯一 primary（由 agents/video-producer/SPECIALISTS.md 映射）
  → needs_approval 门停住
  → 批准后 HyperFrames / Remotion / provider
```

12 个 primary 已接入契约层；P7 shorts-repackage 正在独立开发。详情见 PROJECT_BRIEF。

---

## 2. 完成度

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| P0 | 完成 | 父工单 `YES-1909` 的架构与可追踪性范围 |
| P1 | BIOS `YES-1966` done | schema/router/CLI/flag 基线已在 `c2e7d54`；历史补录 |
| P2 | BIOS `YES-1967` done | 统一入口与三专业 Agent 基线已在 `c2e7d54`；历史补录 |
| P3 | BIOS `YES-1968` done | 回归与质量门禁证据；历史补录 |
| P4 | BIOS `YES-1969` done | `state/tasks/YES-1909-p4-controlled-trial.md`；历史补录 |
| P5 | BIOS `YES-1920` done | `state/tasks/YES-1920-p5-controlled-trial.md`；本地出片目录 Git-ignored |
| P6 | BIOS `YES-1923` done | `docs/VIDEO_AGENT_PLATFORM_P6_DEVELOPMENT_PLAN.md`；`state/tasks/YES-1923-p6.md`；11 fixtures |
| P6.4 | BIOS `YES-1961` done | `docs/VIDEO_AGENT_PLATFORM_P6_4_DEVELOPMENT_PLAN.md`；embedded-captions no-render evidence |
| P6.5 | BIOS `YES-1962` done | `docs/VIDEO_AGENT_PLATFORM_P6_5_DEVELOPMENT_PLAN.md`；motion-graphics no-render evidence |
| P6.6 | BIOS `YES-1960` done | `agents/video-producer/AGENT.md`；host-agnostic package plan |
| Final acceptance | BIOS `YES-1909` done | `state/tasks/YES-1909-final-acceptance.md`；make check + cross-Agent handoff passed |
| P7 | BIOS `YES-1987` done | `docs/SHORTS_REPACKAGE_P7_DEVELOPMENT_PLAN.md`；shorts-repackage no-render trial + complete quality gate |

### 验证（交接时点）

```bash
npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts
# → 2 files / 32 tests passed
npm run typecheck   # passed
npm run lint -- --quiet  # passed
```

`make check` 已完整通过：typecheck、lint、sample validation、23 个测试文件 / 122 个测试及 `npm audit --audit-level=low` 均通过（0 vulnerabilities）。历史 audit blocker 未通过降低门禁或添加 override 解决。

---

## 3. Git：什么已提交、什么还在工作树

### 已提交基线（约 P0–P3 主线）

- `c2e7d54` 及更早：平台路由初版、数字人工作流等

### 典型未提交 / 未跟踪（接手后务必 `git status` 复核）

**已修改**

- `src/schemas/videoJob.ts`、`src/agent/videoRouter.ts`
- `.devin/skills/video-producer/**`
- `tests/video-agent-platform.test.ts`
- `docs/VIDEO_AGENT_PLATFORM_*`、`docs/decisions/ADR-002-*`
- `state/tasks/YES-1909-video-agent-platform.md`

**未跟踪（重要）**

- `.devin/agents/` 下 P5/P6 新增：`existing-video-recut-*`、`embedded-captions-*`、`pr-video-*`、`music-video-*`、`video-translation-*`、`motion-graphics-*`、`slideshow-*`、`remotion-port-*`
- `tests/fixtures/video-jobs/`（12 个 yaml，含 P7 shorts-repackage）
- `docs/VIDEO_AGENT_PLATFORM_{PROJECT_BRIEF,AGENT_USAGE,QUICKSTART,P6_*,BACKLOG}.md`
- `HANDOFF_PACKAGE.md`
- `state/tasks/YES-1909-p4-*`、`YES-1920-*`、`YES-1923-*`
- `state/orchestration/YES-1909-p4/`
- `videos/heygen-out-recut-trial/`（含大文件 `output.mp4` — **提交前问用户是否入库**）

---

## 4. 关键路径速查

| 类别 | 路径 |
| --- | --- |
| 项目说明 | `docs/VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md` |
| Agent 用法 | `docs/VIDEO_AGENT_PLATFORM_AGENT_USAGE.md` |
| 非开发上手 | `docs/VIDEO_AGENT_PLATFORM_QUICKSTART.md` |
| 架构 / 总计划 | `docs/VIDEO_AGENT_PLATFORM_ARCHITECTURE.md` · `DEVELOPMENT_PLAN.md` |
| P6 计划 | `docs/VIDEO_AGENT_PLATFORM_P6_DEVELOPMENT_PLAN.md` |
| P7 候选 | `docs/VIDEO_AGENT_PLATFORM_BACKLOG.md` |
| Schema / Router | `src/schemas/videoJob.ts` · `src/agent/videoRouter.ts` |
| 入口 Skill | `.devin/skills/video-producer/` |
| Specialists | `.devin/agents/*-producer.md` |
| Fixtures | `tests/fixtures/video-jobs/*.yaml` |
| P5 成片 | `videos/heygen-out-recut-trial/output.mp4` |

---

## 5. 路由与歧义规则（易踩坑）

Auto 优先级摘要：

1. 显式 workflow
2. product-brief / website → promo
3. github-pr → pr-video
4. music → music-video
5. deck → slideshow
6. remotion-project → remotion-port
7. motion-brief → motion-graphics
8. **existing-video → recut（不是 captions/translation）**
9. digital-human presenter → digital-human
10. 其他 → faceless

- 纯字幕：`workflow: embedded-captions`
- 译制：`workflow: video-translation` + `presenter.provider`（mode 仍为 `none`）
- 付费调用：必须用户批准；profile 已禁止静默

---

## 6. 环境 Blocker

| 问题 | 处理 |
| --- | --- |
| `devin` CLI 可能缺失 | Cursor/Codex 直接读 `.devin/agents/*.md` |
| MCP `bios_*` 报 `deepdog daemon is not running` | **不是 CLI 坏了**：observer bridge 依赖本机 daemon。先 `deepdog daemon status`；若 stopped → `deepdog daemon start`；再 `curl -s http://127.0.0.1:19514/health`；必要时重启 Cursor MCP。详见下文 §6.1 |
| BIOS 远程评论偶发失败 | 本地 `state/tasks/YES-*.md`；或 `deepdog issue comment add <KEY> --content-stdin` |
| npm audit | 当前 `make check` 通过（0 vulnerabilities）；历史 blocker 保留证据，不降级、不乱 override |
| HyperFrames skill 未装全 | Agent 内 `npx hyperframes skills update <name>` |

### 6.1 BIOS 建单：MCP vs CLI（必读）

两条路径：

| 路径 | 依赖 | 命令/工具 |
| --- | --- | --- |
| **A. deepdog CLI（推荐兜底）** | 已 `deepdog auth` / login；**不需要** daemon 也可建单（走云 API） | `deepdog issue create --parent YES-1909 --title "..." ...` |
| **B. MCP `bios_create_issue`** | Cursor 的 `deepdog-observer` bridge **必须**本机 daemon 在跑（默认 health `127.0.0.1:19514`） | MCP tools |

修复 B：

```bash
deepdog version
deepdog daemon status          # 若 Daemon: stopped
deepdog daemon start
deepdog daemon status          # 期望 running
curl -sS http://127.0.0.1:19514/health
```

仍失败时：检查 MCP env 是否含 `MULTICA_OBSERVER_ENDPOINT=http://127.0.0.1:19514/observer/events`（见 `docs/deepdog BIOS · MCP 工具对接文档.md`），然后重启 Cursor / 重载 MCP。

**Agent 纪律**：MCP 建单失败时立刻改走 CLI（路径 A），并把结果写入 `state/tasks/`；不要把「daemon 未启动」记成平台功能缺失。

---

## 7. 建议下一步（需用户选一条再干）

### A. 工程收口（最高优先若要换人长期维护）

1. 与用户确认：`videos/heygen-out-recut-trial/output.mp4` 是否提交或 gitignore
2. 分提交：P4 证据 / P5 recut / P6 七专家 / 文档
3. PR + 本地 `make check` 完整通过证据
4. 按 harness：tag + Release（若合入 main）

### B. P6 深化

- 为尚未出片的 workflow 做 controlled trial（先 no-render）
- 优先：`embedded-captions`、`pr-video`、`motion-graphics`（本地、无付费）
- `video-translation` 单独要付费批准

### C. P7 新专家

- 读 `BACKLOG.md`，选 `product-demo-producer` 或 `shorts-repackage-producer`
- **先**计划文档 + BIOS 子工单，**再**改 schema（禁止无单直接加 enum）

### D. 宿主集成

- `.codex/agents/video-producer.toml`
- 或 `ln -s` skill 到 `~/.codex/skills/`

---

## 8. 验证命令清单

```bash
make bootstrap
npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts
npm run typecheck
npm run lint
make verify-harness
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job tests/fixtures/video-jobs/product-promo.yaml
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job tests/fixtures/video-jobs/embedded-captions.yaml
# flag off 必须失败：
npm run video:route -- --job tests/fixtures/video-jobs/pr-video.yaml
```

---

## 9. 回滚边界

| 范围 | 回滚 |
| --- | --- |
| 整平台 | 删 schema/router/CLI、`.devin/skills/video-producer/`、全部 `*-producer.md`、flag、相关测试文档 |
| 仅 P6 | 删七 agent + 七 fixture + schema/router 中七 workflow 增量 + P6 文档 |
| 仅 P5 | 删 recut agent/fixture/workdir 证据；**不动源片** `episodes/res/video/HeyGen_out.mp4` |

保留：既有 episode、`videos/deepdog-skills-promo`、数字人 adapters、直接 `npm run episode:*`。

---

## 10. 接手检查清单

- [ ] 读 PROJECT_BRIEF + 本接力包 + AGENTS.md + coding-discipline
- [ ] `git status` / `git log -5` 对齐上文
- [ ] 确认 12 个 `.devin/agents/*-producer.md` 与 12 fixtures
- [ ] 跑 32 条平台相关 Vitest
- [ ] 问用户：先提交 PR，还是做 P6 trial / P7 / Codex 封装
- [ ] 未获批准不调付费、不最终 render、不降 audit

---

## 11. 安全与产品合同（再强调）

- 不刮未授权媒体；不无 rights 克隆声线
- 不自动发布
- 不确定事实要标记人工审
- 数字人 / 译制：rights + provider 显式

---

**交接结语**：平台基础的 12 个专家已具备契约与路由；P7 `YES-1987` 已完成并关闭。下一 Agent 应只在明确批准的真实 Job 上恢复；不得调用 provider、自动出片或越过 pending gate。
