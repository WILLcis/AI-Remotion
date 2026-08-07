# Video Agent 工作流 — 接力包

## 上下文

- **目标**：收成一份权威工作流文档，并把 Intake + 入口简化代码合入 `main`
- **权威文档**：`docs/VIDEO_AGENT_WORKFLOW.md`
- **人用入口**：`agents/START_HERE.md`

## 已交付

| 项 | 路径 |
| --- | --- |
| 权威工作流单文档 | `docs/VIDEO_AGENT_WORKFLOW.md` |
| 粘贴即用提示 | `agents/START_HERE.md` |
| 白话默认入口 | `agents/video-producer/AGENT.md` |
| Intake Agent / Skill | `agents/video-job-intake/` · `.devin/skills/video-job-intake/` |
| Intake CLI / schema / tests | `src/cli/intakeVideoJob.ts` · `src/schemas/videoIntake.ts` · `tests/video-intake.test.ts` |
| 用户 Quickstart / Agent 手册 | `docs/VIDEO_AGENT_PLATFORM_QUICKSTART.md` · `docs/VIDEO_AGENT_PLATFORM_AGENT_USAGE.md` |

## 行为要点

- 用户不跑 `video:intake` / `video:route` / `FLAG_...`
- Agent 缺字段才追问；草案确认后写 `state/jobs/<id>.yaml`
- 仍停在 `storyboard` / `final_render`；付费 provider 仍需明示批准
- 生成媒体（mp4 / wav / pcm / thumbnails）不入库

## 回滚

还原本批文档与 Intake 相关文件即可；不影响既有 `video:route` / specialists 运行时行为。
