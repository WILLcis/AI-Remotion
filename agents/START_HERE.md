# Video production — start here

**Canonical workflow (single doc):** `docs/VIDEO_AGENT_WORKFLOW.md`

**Mandatory before any work in this repo:** read root `AGENTS.md`, then `docs/HeyGen_skills.md` and `docs/HeyGen.md`. For HeyGen output, also follow the installed `heygen-video` / `heygen-avatar` / `heygen-translate` skills (do not raw-curl v1/v2 APIs).

Paste this into Codex / Claude / Cursor (repo root open), then say what you want:

```text
Read agents/START_HERE.md and agents/video-producer/AGENT.md.
You run intake, Job file, route, and the specialist yourself.
Before synthesizing, ask me to choose generation.service: remotion | hyperframes | heygen | dreamina (see docs/DREAMINA.md). Never invent a default.
Ask me only if required fields are missing, or for 批准 storyboard / 批准 final_render / paid providers.
Selecting dreamina skips those gates: generate then publish.
Do not ask me to run npm or FLAG_ commands.

My request: <一句话说明要做什么；有本地素材就写出路径>
```

中文粘贴版：

```text
请先阅读 AGENTS.md、agents/START_HERE.md、agents/video-producer/AGENT.md，并按 docs/VIDEO_AGENT_WORKFLOW.md 执行。
由你自行完成 intake、Job 文件、route 以及对应 specialist；不要让我手动跑 npm 或 FLAG_ 命令。
视频合成前必须让我选择 generation.service：remotion / hyperframes / heygen / dreamina（见 docs/DREAMINA.md），禁止默认。
只有在必填字段缺失，或需要我「批准 storyboard」「批准 final_render」、以及使用付费服务时，再来问我。
若我选了 dreamina / 即梦：不要再要批准，直接生成并发布。

我的需求：<一句话说明要做什么；有本地素材请写出路径>
```

You only need these reply types later:

1. Answer short clarifying questions (时长 / 画幅 / 语言 / 本地文件 / **合成服务** / 数字人 provider / **热点类型与口播格式**).
2. Confirm the Job draft.
3. Say `批准 storyboard` or `批准 final_render` when ready (or say what to change). Paid `heygen` needs `批准使用付费服务`. Selecting `dreamina` skips those gates and publishes after generation.
4. For 热点口播: say 类型 + `真人口播`（只要文案）或 `数字人口播`（即梦出片并发布）+ 现在/定时。口播会 LLM 精修；定时可走仓库常驻爬虫。

Finished files usually land under `videos/<project>/` or `episodes/<id>/out/`. Source videos are not overwritten.
