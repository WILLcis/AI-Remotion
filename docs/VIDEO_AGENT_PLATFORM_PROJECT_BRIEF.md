# AI-Remotion · Video Agent Platform — 项目说明

面向：接手继续开发的 Agent / 工程师
日期：2026-08-01
分支：`feat/agent/YES-1909-video-agent-platform`

更完整的执行纪律见仓库根 `AGENTS.md`。本文件只说明 **Video Agent 平台** 这块在做什么、做到哪、下一步可以碰什么。

---

## 1. 一句话

本地优先的多工作流视频生产平台：一份 Video Job → 确定性路由 → **唯一** primary specialist → 审核门停住 → 本地 Remotion / HyperFrames（或受控 provider）出片。

**不是**：云 SaaS、浏览器 UI、自动发布、万能导演 Agent。

---

## 2. 产品边界

| 做 | 不做 |
| --- | --- |
| CLI / Agent-first | 未批准的浏览器产品 UI |
| 本地渲染为主 | 默认云队列 / 对象存储 |
| Feature flag 默认关 | 绕过 flag 直接调 specialist |
| 一 Job 一 primary | 多 Agent 同时改共享 artifact |
| 审核门可暂停恢复 | Agent 自行「批准」 |
| 源片 immutability（recut/captions/translation） | 静默改写用户源 MP4 |
| 付费 API 需明文批准 | 静默 HeyGen / 云 HyperFrames |

经典 Remotion 讲解流水线仍有效：

```text
brief → script → storyboard → render-plan → voice → captions → Remotion MP4 → QA
```

---

## 3. 平台结构

```text
调用方 Agent
  → .devin/skills/video-producer/     (入口，根会话路由)
  → npm run video:route               (机器真相)
  → .devin/agents/<primary>.md        (唯一 primary)
  → Remotion / HyperFrames / provider
```

| 层 | 路径 |
| --- | --- |
| Job / Route schema | `src/schemas/videoJob.ts` |
| 路由 | `src/agent/videoRouter.ts` |
| CLI | `src/cli/routeVideoJob.ts` → `npm run video:route` |
| Flag | `FLAGS.VIDEO_AGENT_PLATFORM`（默认 false） |
| 入口 Skill | `.devin/skills/video-producer/` |
| Specialists | `.devin/agents/*-producer.md`（现 11 个） |
| Fixtures | `tests/fixtures/video-jobs/*.yaml`（现 11 个） |

启用示例：

```bash
FLAG_video_agent_platform='{"enabled":true}' \
  npm run video:route -- --job tests/fixtures/video-jobs/pr-video.yaml
```

---

## 4. 已接入的 11 个专家

| workflow | primary | renderer | 备注 |
| --- | --- | --- | --- |
| product-promo | product-promo-producer | hyperframes | product-brief / website |
| digital-human | digital-human-producer | remotion | 需 `presenter.provider` |
| faceless-explainer | faceless-explainer-producer | remotion | topic / script |
| existing-video-recut | existing-video-recut-producer | hyperframes | `existing-video` **自动默认** |
| embedded-captions | embedded-captions-producer | hyperframes | 须 **显式** workflow |
| video-translation | video-translation-producer | remotion | 须显式 + provider |
| pr-video | pr-video-producer | hyperframes | github-pr |
| music-video | music-video-producer | hyperframes | music |
| motion-graphics | motion-graphics-producer | hyperframes | motion-brief |
| slideshow | slideshow-producer | hyperframes | deck |
| remotion-port | remotion-port-producer | hyperframes | remotion-project |

`existing-video` 自动只走 **recut**；纯字幕 / 译制必须显式指定，避免歧义。

---

## 5. 阶段完成度

| 阶段 | BIOS | 状态 |
| --- | --- | --- |
| P0–P3 契约与门禁 | YES-1909 | 完成 |
| P4 三工作流 no-render 试运行 | YES-1909 | 完成 |
| P5 Existing-Video Recut + 本地出片 | YES-1920 | 完成（`videos/heygen-out-recut-trial/output.mp4`） |
| P6 七专家契约接入 | YES-1923 | **契约层完成**；未强制七条真实出片 |
| P6.4 审计收口 + captions no-render trial | 待建（daemon blocker） | 完成本地证据、生成媒体排除和一条无付费试运行 |
| P6.5 motion-graphics no-render trial | 待建（daemon blocker） | 完成第二条无外部输入、无付费试运行 |
| P6.6 Host-Agnostic Agent Package | 待建（daemon blocker） | 提供任意 Agent 可读的中立入口与 specialist map |
| P7 backlog 晋升 | — | 未开工；见 `docs/VIDEO_AGENT_PLATFORM_BACKLOG.md` |

父工单：`YES-549`。

---

## 6. 必读文档地图

| 文档 | 用途 |
| --- | --- |
| `AGENTS.md` | 仓库总纪律 |
| `docs/VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md` | **本说明** |
| `HANDOFF_PACKAGE.md` | **接力包**（状态、未提交面、下一步） |
| `agents/video-producer/AGENT.md` | **任意 Agent 的中立入口** |
| `agents/video-producer/SPECIALISTS.md` | 11 specialist 的 route-selected profile map |
| `docs/VIDEO_AGENT_PLATFORM_AGENT_USAGE.md` | 宿主接入与执行手册 |
| `docs/VIDEO_AGENT_PLATFORM_QUICKSTART.md` | 非开发用户 10 步 |
| `docs/VIDEO_AGENT_PLATFORM_ARCHITECTURE.md` | 架构 |
| `docs/VIDEO_AGENT_PLATFORM_DEVELOPMENT_PLAN.md` | 总开发计划 |
| `docs/VIDEO_AGENT_PLATFORM_P6_DEVELOPMENT_PLAN.md` | P6 细节 |
| `docs/VIDEO_AGENT_PLATFORM_BACKLOG.md` | 相邻高需求、未实现 |
| `docs/decisions/ADR-002-*.md` | 架构决策 |

---

## 7. 红线（接手后仍必须遵守）

1. 先读再写；最小 diff；加测试。
2. 不降 `npm audit` 门禁（已知 brace-expansion/minimatch 12 high，无修复）。
3. 不提交密钥；生成大媒体是否入库按团队策略（默认不强制提交 `output.mp4`）。
4. 不把 backlog 项偷偷塞进 schema。
5. 付费 / 最终 render 必须用户明文批准。
6. 回滚边界写进交付说明。

---

## 8. 建议的继续方向（任选，需用户确认范围）

1. **提交 / PR**：工作树大量未提交 P4–P6 增量，优先整理提交再开 PR。
2. **P6 出片 trial**：为 captions / PR / music / motion / slideshow / port 各选一条做 no-render 或批准后 render（translation 单独付费门）。
3. **P7**：从 backlog 挑 `product-demo` 或 `shorts-repackage`，先写计划 + BIOS 再动 schema。
4. **可选宿主适配**：为某个宿主增加只指向 `agents/video-producer/AGENT.md` 的薄封装。
5. **文档对齐**：`AGENT_USAGE` 第 4 节仍偏重前四专家，可补 P6 一节。

详细检查清单与命令见 `HANDOFF_PACKAGE.md`。
