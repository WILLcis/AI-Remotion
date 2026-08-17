# AI-Remotion Video Producer

Host-neutral entry for **any AI agent** (Codex, Claude, Cursor, Devin, …) that can read files and run local shell commands. The **human talks; you run the CLI**. Do not ask the user to type `npm run video:intake`, `video:route`, `brew`, `curl`, or flag env vars.

**You should have arrived from root `AGENTS.md` and already finished its required reading list.** This file is on that list; do not use it as the repo entry.

On a new session, after the reading list: run `npm run setup` before intake or hotspot work. If `node` is missing, install Node 20+ yourself (Homebrew on Mac), then `npm install`, then `npm run setup` again. Honor the JSON: `ready` continues; `needs_human` asks only `human_blockers[].ask`; `failed` stops. Setup does not replace `make check`.

## Purpose

Turn a plain-language request (or an existing Job file) into exactly one primary specialist run, stop at review gates, and return a structured result.

Executable source of truth:

- Schema: `src/schemas/videoJob.ts`
- Intake (optional internal check): `npm run video:intake -- --request <request.json>`
- Route: `npm run video:route -- --job <job.yaml|job.json>`
- Kill switch: `FLAGS.VIDEO_AGENT_PLATFORM`

Read `AGENTS.md` first (full file + required reading list). Human paste: `agents/START_HERE.md`.

## Plain-language entry (default)

When the user did **not** hand you a Job file:

0. Run `npm run setup` and follow its JSON before any other CLI.
1. Read this file and `SPECIALISTS.md`. For ambiguous intake rules, also read `agents/video-job-intake/AGENT.md`.
2. Extract only facts the user supplied. **Do not invent** duration, aspect ratio, language, local media paths, provider names, **generation.service**, rights, or approvals.
3. Before any synthesize / render path: if `generation.service` is missing, ask the user to choose one of `remotion` | `hyperframes` | `heygen` | `dreamina` (list labels from `src/schemas/videoGenerationServices.ts` / `docs/DREAMINA.md`). Never default.
4. If anything required is missing, ask the user short questions and stop. Do not invent defaults.
5. You may run intake yourself as a check:

   ```bash
   npm run video:intake -- --request path/to/request.json
   ```

   Present a brief draft summary. After the user confirms the draft (one sentence is enough), write the Job to `state/jobs/<job-id>.yaml` (create the directory if needed). Review gates stay `pending` unless `generation.service` is `dreamina` (then auto-approved, including publish).
6. Enable the platform **yourself** and route:

   ```bash
   FLAG_video_agent_platform='{"enabled":true}' \
     npm run video:route -- --job state/jobs/<job-id>.yaml
   ```

7. Treat the route JSON as authoritative. Read only the mapped specialist profile (`.devin/agents/<primary>.md` or the path in `SPECIALISTS.md`).
8. Execute as that primary until the next pending gate, then return `needs_approval`. Never approve gates yourself. Never call paid/cloud `heygen` or `final_render` without the user's current explicit approval. **Dreamina exception:** selecting `generation.service=dreamina` is paid-generation and publish consent — do not wait for 批准 storyboard / 批准付费 / 批准发布. Use `docs/DREAMINA.md` + `npm run media:dreamina -- ... --generation-service dreamina` (flag `FLAG_dreamina_media`), then `video:publish --platform all --generation-service dreamina`.
9. **Exclusive composition:** honor `route.renderer` / `Job.generation.service` for the **final** MP4 only:
   - `dreamina` → final from Dreamina CLI only; TTS = dreamina-native (no project CosyVoice unless user asks).
   - `hyperframes` → final from HyperFrames only; TTS = project `AI_REMOTION_TTS_*` (usually CosyVoice 3).
   - `remotion` → final from Remotion only; same project TTS.
   - `heygen` → final from HeyGen only; TTS = HeyGen-native unless user asks CosyVoice replace.
10. Never publish without current-session `批准发布` plus `--i-approve-publish`, except `generation.service=dreamina` (use `--generation-service dreamina` instead). Follow the agent playbook in `docs/VIDEO_PUBLISH.md`. Douyin is official API; Weixin Channels / Xiaohongshu default to publish packs. Browser RPA needs the user to say `批准RPA` this session **and** `FLAG_video_publish_rpa`; then pass `--i-accept-rpa-risk`. Do not treat Dreamina as RPA consent. Kill switch: `FLAG_video_publish_rpa={"enabled":false}`. RPA must use installed Chrome (persistent profile, not Incognito), click 发表/发布, wait for 发表成功/发布成功, and obey daytime 10:00–20:00 / 30 posts per day / 90 min spacing (2–5 min for the same clip on the other platform). Never overnight batch. `packed` is not posted; `failed` + screenshot is not posted.
11. **Hotspot digest** (`docs/VIDEO_HOTSPOT.md`): if the user wants 全网热点 / 口播文案, ask for (a) topic type, (b) `human-vo` vs `digital-human`, (c) now vs schedule. Prefer the in-repo RSS crawler (`video:hotspot --watch` / `--crawl`) when `FLAG_video_hotspot_crawler` is on; otherwise search the public web yourself and write items JSON. Both formats get LLM polish via `AI_REMOTION_LLM_*` (cover keyword 2–4 chars + two short cover lines). `human-vo` → deliver `hotspot-copy.md` only, user records, no Dreamina. `digital-human` → default identity in `config/hotspot-identity.json` (do not ask for photo/audio unless the user wants a different person). Cover via `image2image` (face only), then `seedance2.0fast` `multimodal2video`: `@Image 1` = cover first frame, `@Image 2` = face only, audio = timbre only, spoken script in `{dialogue}` for lip-sync. Then `video:publish --platform all --generation-service dreamina --cover`. Skip Douyin when `FLAG_video_publish_douyin` is off. Do not invent news.
12. **Never** hand CLI steps back to the user (`brew`, `npm install`, `FLAG_`, `curl`). **Never rewrite source code** on a production/out-video request. Stop only for: setup `needs_human`, missing info, review gates (not dreamina), paid-provider approval (HeyGen), publish approval (not dreamina), **RPA** (`批准RPA` — not implied by dreamina), or a real blocker.

## Job-file entry

If the user already provided a Job YAML/JSON path, run `npm run setup` first, then skip draft writing: enable the flag, run `video:route`, then follow the same specialist + gate rules above.

## Hard rules

- **Do not rewrite repository code.** Run the CLI. Do not edit `src/`, `tests/`, `flags/`, `package.json`, or docs unless the user explicitly asked to change the codebase this session. Job files under `state/jobs/` and generated artifacts are allowed.
- New session: `npm run setup` first. Do not skip because the last machine already worked.
- One Job = one `primary_agent`. Do not open a second primary.
- Do not route around the flag by selecting a specialist directly.
- Do not invent source files, asset rights, credentials, product facts, or factual claims.
- Preserve source-video immutability for recut / captions / translation.
- Do not commit generated video, audio, previews, snapshots, local outputs, or secrets (including `.env.local`).
- Dreamina covers: `text2image` 9:16. Do not ffmpeg-overlay a frame to *create* the cover. Digital-human clips use `image2video --image <cover>` so Dreamina treats that still as the first frame. Captions and lip-sync belong in the Dreamina prompt, not local ffmpeg.
- Douyin live API is paused. Do not apply for a mini-program. Keep `FLAG_video_publish_douyin` off unless the user has a 正式网站应用 with `video.create.bind`. `--platform all` then writes Weixin/XHS packs only.
- Weixin/XHS auto-publish: read `docs/VIDEO_PUBLISH.md` first. Dual gate + Chrome persistent profile. Do not claim a post succeeded unless `status` is `submitted` after on-page success. Do not commit `state/publish/rpa-profile/`.
- If Dreamina returns TNS / 未审核通过: skip that clip, record `口播N 即梦失败` in `questions`, continue other clips, do not resubmit the same prompt (already billed).

## Result contract

Return exactly one result object:

```json
{
  "status": "done | needs_approval | blocked | failed",
  "phase": "intake | plan | build | qa | render",
  "changed_artifacts": [],
  "verification": [],
  "output": null,
  "next_action": ""
}
```

- `needs_approval`: name the exact pending gate and the next approval required.
- `blocked`: name the missing input, rights constraint, missing asset, or environment failure.
- `failed`: include only real command/validation evidence.

## Minimal handoff prompt

```text
Read AGENTS.md in full, then every document in its required reading list in order, then npm run setup. Do the video work I describe next yourself (intake/Job/route/specialist). Do not edit repository source unless I explicitly ask to change code. Ask me only when something required is missing, or when storyboard / final_render / paid HeyGen need approval. If I chose dreamina, generate then publish packs without extra gates. Auto-post Weixin/XHS needs 批准RPA. Do not ask me to run CLI commands.
```

