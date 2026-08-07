# Video production — start here

**Canonical workflow (single doc):** `docs/VIDEO_AGENT_WORKFLOW.md`

**Mandatory before any work in this repo:** read root `AGENTS.md`, then `docs/HeyGen_skills.md` and `docs/HeyGen.md`. For HeyGen output, also follow the installed `heygen-video` / `heygen-avatar` / `heygen-translate` skills (do not raw-curl v1/v2 APIs).

Paste this into Codex / Claude / Cursor (repo root open), then say what you want:

```text
Read agents/START_HERE.md and agents/video-producer/AGENT.md.
You run intake, Job file, route, and the specialist yourself.
Ask me only if required fields are missing, or for 批准 storyboard / 批准 final_render / paid providers.
Do not ask me to run npm or FLAG_ commands.

My request: <一句话说明要做什么；有本地素材就写出路径>
```

You only need three reply types later:

1. Answer short clarifying questions (时长 / 画幅 / 语言 / 本地文件 / 数字人 provider).
2. Confirm the Job draft.
3. Say `批准 storyboard` or `批准 final_render` when ready (or say what to change).

Finished files usually land under `videos/<project>/` or `episodes/<id>/out/`. Source videos are not overwritten.
