# Video Agent Platform — 快速开始

给非开发用户：用 Cursor / Codex 等 AI，按下面做就能出片。默认不花钱、不改你的原视频。

1. **拿到仓库**，用 AI 打开项目根目录（需要同事先帮你装好 Node / ffmpeg）。
2. **对 AI 说**：先读 `docs/VIDEO_AGENT_PLATFORM_QUICKSTART.md` 和 `docs/VIDEO_AGENT_PLATFORM_AGENT_USAGE.md`。
3. **说清楚要做什么**：产品宣传片 / 数字人口播 / 图文讲解 / 现有视频设计卡片或纯字幕或译制 / PR 讲解 / 音乐卡点 / 短动效 / 演示文稿 / Remotion 迁移。
4. **准备材料**：文案或 brief；若是「现有视频重剪」，再给本地 MP4（和字幕更好）。
5. **等 AI 写出 Job 并路由**；它会告诉你交给哪个专业 Agent。
6. **审核脚本/分镜**：AI 停下来问你时，看规划，回复「批准 storyboard」（或指出要改什么）。
7. **审核成片**：满意规划后再回「批准 final_render」；未说批准前不会出片、不会调用付费服务。
8. **收片**：成品一般在 `videos/<项目名>/` 或 `episodes/<id>/out/`；原视频不会被改写。
9. **改一处就说一处**：「只改第 3 张卡片文案」——不要让它整条流水线重跑。
10. **卡住就找人**：环境装不上、要开 HeyGen 等付费能力、或要合并代码发版，交给会开发的同事。

更完整的 Agent 规则与 Job 样例见 `docs/VIDEO_AGENT_PLATFORM_AGENT_USAGE.md`。
项目说明 / 开发接力：`docs/VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md` · `HANDOFF_PACKAGE.md`。
