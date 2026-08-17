# Video Agent Platform — 快速开始

**Agent 统一入口：** 根目录 [`AGENTS.md`](../AGENTS.md)（先读全文，再按「必读清单」一次读完）。出片工作流：[`docs/VIDEO_AGENT_WORKFLOW.md`](./VIDEO_AGENT_WORKFLOW.md)。

对 Codex / Claude / Cursor 说一句话即可。你不用跑 `npm` 或记 flag。

1. 用 AI 打开本仓库根目录（需已装好 Node / ffmpeg）。
2. 把 [`docs/GIVE_TO_AGENT.md`](./GIVE_TO_AGENT.md) 或 [`agents/START_HERE.md`](../agents/START_HERE.md) 里的提示词贴进去（Agent 会读完 `AGENTS.md` 和必读清单）。
3. 用白话说要做什么，并给出本地素材路径（若有）。
4. AI 缺字段会追问；草案确认后它自己写 Job、路由、干活。
5. 它停下来时，回复 `批准 storyboard` 或 `批准 final_render`（付费服务再单独批）。成品一般在 `videos/<项目>/` 或 `episodes/<id>/out/`。

改一处就说一处。卡住（环境、付费账号、发版）再找开发同事。

更完整的 Agent 规则：`docs/VIDEO_AGENT_PLATFORM_AGENT_USAGE.md`  
项目说明 / 接力：`docs/VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md` · `HANDOFF_PACKAGE.md`

## 给开发者（人不必跑）

CLI 是 Agent 工具，不是用户步骤：

```bash
npm run video:intake -- --request <request.json>
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job <job.yaml>
```

契约入口：`agents/video-producer/AGENT.md` · 路由权威：`src/agent/videoRouter.ts`
