# AGENTS.md — Agent 统一入口

**口播 / 我的形象 / 数字人 = 即梦，不是 HeyGen。** 被问「以我的形象生成口播」时，立刻走 [`docs/VIDEO_HOTSPOT.md`](docs/VIDEO_HOTSPOT.md) + [`docs/DREAMINA.md`](docs/DREAMINA.md) + [`config/hotspot-identity.json`](config/hotspot-identity.json)。不要打开 HeyGen 文档，也不要跑本机 `heygen-video` / `heygen-avatar` skill。只有人点名 HeyGen 才走 HeyGen。

**新会话只从本文件进。** 读完本文件全文后，按下面「必读清单」把其余文档**一次读完**，再开始干活。不要跳过清单，也不要从其它文件当入口。

This repository follows the AI-First Coding Loop harness from:

https://github.com/WILLcis/AI--First-Coding-Loop-Codex

## 必读清单（按顺序一次读完）

1. **本文件全文**（目标、目录、命令、Safety、flags）。写码时「Harness Discipline」也算在内。
2. [`.agents/skills/agent-coding-discipline/SKILL.md`](.agents/skills/agent-coding-discipline/SKILL.md)（读懂即可；**未授权改代码时不要动手改仓库**）
3. [`agents/video-producer/AGENT.md`](agents/video-producer/AGENT.md)
4. [`agents/video-producer/SPECIALISTS.md`](agents/video-producer/SPECIALISTS.md)
5. [`docs/VIDEO_AGENT_WORKFLOW.md`](docs/VIDEO_AGENT_WORKFLOW.md)
6. [`docs/VIDEO_HOTSPOT.md`](docs/VIDEO_HOTSPOT.md)
7. [`docs/DREAMINA.md`](docs/DREAMINA.md)
8. [`docs/VIDEO_PUBLISH.md`](docs/VIDEO_PUBLISH.md)（含视频号 / 小红书 RPA「给 Agent」）

**不要把 HeyGen 放进必读。** [`docs/HeyGen_skills.md`](docs/HeyGen_skills.md) / [`docs/HeyGen.md`](docs/HeyGen.md) 只在人点名 HeyGen 或 Job 已是 `generation.service=heygen` 时再读。本机已装的 HeyGen skills 不能当入口。

读完后再 `npm run setup`。JSON：`ready` 继续；`needs_human` 只问 `ask` 原文；`failed` 停。不要让人敲 `brew` / `npm` / `FLAG_`。setup **不能代替** `make check`。

可并行的写码任务，清单读完后再读 [task-decomposer](.agents/skills/task-decomposer/SKILL.md) / [parallel-orchestrator](.agents/skills/parallel-orchestrator/SKILL.md)。

给人粘贴：[`agents/START_HERE.md`](agents/START_HERE.md)。给人看的一页纸：[`docs/GIVE_TO_AGENT.md`](docs/GIVE_TO_AGENT.md)。这两份**不是**给你当入口，也不替代上面的清单。

### 人话怎么落到哪条链路（先看这里）

问「用我的形象做口播 / 数字人 / 出镜讲解」时：**即梦**，不是 HeyGen。

1. 读 [`docs/VIDEO_HOTSPOT.md`](docs/VIDEO_HOTSPOT.md) + [`docs/DREAMINA.md`](docs/DREAMINA.md)。
2. 默认身份 [`config/hotspot-identity.json`](config/hotspot-identity.json)（脸 `episodes/res/img/dh1.jpg`，音色 `episodes/res/audio/dg1.wav`）。不要再问要不要上 HeyGen。
3. 封面 `image2image`（只锁脸）→ `multimodal2video`（`@Image 1` 封面，`@Image 2` 脸，`@Audio 1` 音色，口播写在 `{对白}`）。**即时口播（没开定时任务）也走这条管线**：`npm run media:dreamina -- talking-head --spoken "..." --out videos/<id> --generation-service dreamina`。禁止 `text2video`，禁止只用脸照片做单图 `multimodal2video`。
4. 装在本机的 `heygen-video` / `heygen-avatar` skill **不要当这类需求的入口**。只有人明确说 HeyGen 或 `generation.service=heygen` 才走 HeyGen 文档和 skills。

图文讲解（非出镜口播）才问 `generation.service`：`remotion` | `hyperframes` | `heygen` | `dreamina`。禁止把「我的形象口播」理解成必须先调研 HeyGen。

读清单时记住：

- **默认不许改仓库代码。** 出片 / 热点 / 发布 Agent 只跑 CLI、写 Job 与产物（`state/jobs/`、`videos/`、`episodes/` 产物、`state/publish/` 运行态）。不要改 `src/`、`tests/`、`flags/`、`package.json`、文档或本文件。只有人**当次明确说**「改代码 / 修 bug / 实现某某」才允许动源码。读写码纪律不等于授权改代码。
- 不要把命令甩回给人。
- 图文讲解才问 `generation.service`。口播 / 我的形象 / 数字人固定即梦（上表「人话怎么落到哪条链路」），禁止默认成 HeyGen。
- 选定 `dreamina`：不要再要 storyboard / 付费 / 发布批准；仍要开 kill-switch flags。这只写 Pack（和可选的抖音 API），**不等于**批准 RPA。
- 即梦切号：一次只登录一个账号。用 `npm run media:dreamina -- whoami` / `login --account <alias>` / `switch --account <alias>` / `logout`，不要让人敲 `dreamina login`。`dreamina session` 是任务会话，不是用户账号。设备码（`verification_uri` / `user_code`）原样转给人，等命令结束再报成功或失败。扫码必须是**高级及以上会员**，否则 CLI 无权限。别名只在本机 `state/dreamina/accounts.json`（不入库）。细节 [`docs/DREAMINA.md`](docs/DREAMINA.md)。
- 自动点「发表/发布」：当次「批准RPA」+ `docs/VIDEO_PUBLISH.md`。`packed` 不是已发布。
- 抖音 live 默认关；不要申请小程序。
- 不要编造新闻。不要提交 `.env.local`、MP4、封面、`state/publish/`。
- HeyGen：仅当人点名 HeyGen 时走 skills / CLI，禁止 raw `curl` 编造 v1/v2。口播形象需求不要打开 HeyGen 当第一步。

---

## Project Goal

AI-Remotion is a local-first AI + Remotion production line for image-and-text explainer videos.

The intended workflow is:

```text
brief -> script -> storyboard -> render-plan -> voiceover -> captions -> Remotion MP4 -> QA report
```

This project is for knowledge explainers, product explainers, software tutorials, light news analysis, listicles, and educational short videos. It is not a CapCut/Jianying draft generator, copyrighted media scraper, or auto-publishing system.

## Harness Discipline

**Do not follow this section to edit the repo** unless the user explicitly asked for a code change this session. Video / hotspot / publish work stays CLI-only.

Before writing code:

1. Read `.agents/skills/agent-coding-discipline/SKILL.md`.
2. Decide whether the task can be parallelized. If it can, read `.agents/skills/task-decomposer/SKILL.md` and `.agents/skills/parallel-orchestrator/SKILL.md`.
3. State the plan, assumptions, risks, and verification target.
4. Keep changes surgical. Do not reformat or refactor unrelated files.
5. Add or update tests for behavior changes.
6. Continue until the verifiable stopping condition is reached unless a real human decision is required.

Four failure modes are BLOCK-level:

- Kitchen Sink: unrelated cleanup or broad refactor.
- Wrong Abstraction: abstraction before the project has earned it.
- Optimistic Path: happy-path-only logic.
- Runaway Refactor: a local fix spreads across unrelated modules.

## BIOS And Project Onboarding

- Project-specific onboarding status, quality matrix, protected state, and BIOS fallback rules live in `docs/AI_FIRST_PROJECT_PROFILE.md`.
- The current parent work item is `YES-549`; do not invent child issue keys or claim BIOS updates without evidence.
- Before non-trivial work, clarify scope, reuse/create a traceable BIOS issue, then investigate and implement on a conventionally named branch.
- If BIOS is unavailable, record the intended issue payload and exact blocker in the delivery summary; never write tokens, guessed endpoints, or workspace identifiers to the repository.
- At handoff, report the actual commands and evidence, remaining risks, rollback boundary, and BIOS status separately.

## Current Product Contract

- Short-term product shape is CLI/Agent-first. Do not add a browser UI unless the user explicitly reopens that decision.
- MVP rendering is local Remotion rendering. Do not add cloud rendering, hosted queues, or object storage unless explicitly requested.
- `episodes/sample` is the canonical public demo: `普通人如何理解 Remotion，以及 AI-Remotion 如何生成图文讲解视频`.
- Keep the creator in control at review gates.
- Treat Markdown scripts and structured JSON plans as user-owned artifacts.
- Remotion templates are the source of truth for final layout and animation.
- Generated video should be deterministic from local files and a render plan.
- Preserve user-edited episode files unless explicitly asked to change them.
- Use structured files and schema validation before rendering.

## Directory Map

```text
.agents/skills/       Repo-scoped harness skills for Codex/agents
.codex/agents/        Repo-scoped Codex custom agent definitions
.github/workflows/    CI, AI review, optional security/perf/self-healing workflows
config/               Environment template files for parity checks
docs/                 Product requirements, decisions, harness notes
agents/               Human paste (`START_HERE.md`) + video-producer package
episodes/             Episode briefs, scripts, plans, captions, assets, outputs
flags/                Harness feature-flag facade
prompts/              AI review and architect-task prompts
scripts/              Harness automation and local review scripts
src/hotspot/          Hotspot digest: crawl, LLM polish, Dreamina cover
src/publish/          Multi-platform publish (Douyin API + Weixin/XHS packs + optional Chrome RPA)
src/setup/            First-run doctor for agents (`npm run setup`)
src/remotion/         Remotion root, templates, scene components, themes
src/render/           Render-plan and timing helpers
state/                Append-only agent/harness memory and orchestration state
tests/                Unit and integration tests
tools/                Harness installation and verification helpers
videos/               Non-episode video jobs (generated MP4s are gitignored)
```

Episode artifacts live in `episodes/<episode-id>/`:

```text
brief.yaml
script.md
storyboard.json
render-plan.json
captions.srt
audio/voice.mp3
audio/segments.json
assets/
out/final.mp4
qa-report.md
```

Do not commit generated videos, generated audio, local outputs, or `.env` / `.env.local` files. Commit `config/.env.*.example` placeholders only.

## Commands

Use npm unless the user explicitly changes package managers.

```bash
make bootstrap          # npm install
make setup              # first-run doctor for agents (does not replace make check)
make canonical-demo     # validate, render, and QA the canonical local demo
make batch-sample       # preview sample validate + QA batch workflow
make check              # typecheck + lint + unit tests + npm audit
make config-check       # print LLM/TTS runtime config without secrets
make captions-sample    # regenerate sample captions from render-plan scenes
make new-sample         # create a sample-draft episode skeleton
make qa-sample          # generate sample QA report from existing output
make render-episode-sample # render sample via the generic episode renderer
make test-unit          # npm test
make test-integration   # render sample MP4
make validate-sample    # validate sample brief/storyboard/render-plan
make voice-sample       # generate sample silent voiceover and update render plan
make render-sample      # render sample MP4
make verify-harness     # harness sanity checks
```

Caption and voice commands write episode artifacts; do not run them as passive checks unless that is the intended change.

Direct npm commands:

```bash
npm install
npm run setup
npm run dev
npm run config:check
npm run demo:canonical
npm run typecheck
npm run lint
npm run episode:batch -- --episodes sample --steps validate,qa --dry-run
npm run episode:captions -- --episode sample
npm run episode:new -- --id remotion-intro --topic "普通人如何理解 Remotion"
npm run episode:render -- --episode sample
npm run episode:script -- --episode sample
npm run episode:storyboard -- --episode sample
npm run episode:render-plan -- --episode sample
npm run episode:qa -- --episode sample --render-frames
npm run episode:route -- "第 4 段不要卡片，改成时间轴"
npm run episode:voice -- --episode sample --provider silent
npm run video:intake -- --request tests/fixtures/video-intake/product-promo.json
npm run video:route -- --job tests/fixtures/video-jobs/product-promo.yaml
npm run video:publish -- --help
npm run video:hotspot -- --help
npm run hotspot:watch -- --help
npm run validate:sample
npm test
npm run render:sample
npm audit --audit-level=low
```

Rendering must fail loudly when required local assets are missing.

## Revision Rules

When revising an episode, update the smallest necessary artifact:

- Script change: update script, then storyboard, render plan, voice, captions, render.
- Visual-only change: update storyboard/render plan/template props, then render.
- Voice-only change: regenerate audio, captions, timing, then render.
- Format change: update render metadata and safe areas, then render.

Do not regenerate unrelated episode files during revisions.

## Style Rules

- TypeScript first.
- Prefer small, deterministic pure functions for data transforms.
- Keep Remotion scene components focused on rendering, not planning logic.
- Keep templates reusable; avoid one-off layout code in episode files.
- Dark theme is the MVP default, but avoid a one-note palette.
- Use restrained motion that supports comprehension.
- Keep captions mobile-readable and inside safe areas.

## Testing Rules

- Add tests for structured data validation, duration math, caption segmentation, render-plan generation, and provider adapters.
- Prefer fixture-based tests for episode artifacts.
- For visual/template changes, render at least the sample video or a still frame.
- Before handoff, run `make check`. For Remotion/template changes, also run `make test-integration`.

## Safety Rules

- Never hardcode secrets.
- Use `.env` for provider keys and commit only placeholder templates.
- Prefer `AI_REMOTION_*` runtime env keys for video pipeline providers.
- Do not scrape or embed unlicensed media.
- Do not clone a real person's voice without explicit rights.
- Do not auto-publish videos without an explicit current-session approval and an enabled publish feature flag. Exception: selecting `generation.service=dreamina` is that consent; still require publish flags. Remotion / HyperFrames / HeyGen still need `批准发布` + `--i-approve-publish`. Weixin/XHS **browser RPA** is a separate dual gate: `FLAG_video_publish_rpa` (default off) **and** current-session `批准RPA` / `--i-accept-rpa-risk`. Dreamina does not imply RPA. Kill: `FLAG_video_publish_rpa={"enabled":false}`. RPA uses installed Google Chrome + a persistent profile (`state/publish/rpa-profile/`, not Incognito); wait for 发表成功/发布成功 before closing; daytime 10:00–20:00, max 30 posts/day, 90 min spacing (2–5 min for the same clip on the other platform). Design: `docs/MULTI_PLATFORM_PUBLISH_DESIGN.md` (BIOS `YES-2498`); P0 implementation `YES-2520`.
- Hotspot digest (`docs/VIDEO_HOTSPOT.md`): topic + `human-vo` / `digital-human` + now or schedule. Copy is LLM-polished and TNS-softened (including a 2–4 character cover keyword and two short cover lines). `human-vo` is copy only. `digital-human` defaults to the creator-authorized identity in `config/hotspot-identity.json` (face from `episodes/res/img/dh1.jpg`, timbre from `episodes/res/audio/dg1.wav`, look from `DEFAULT_DREAMINA_PRESENTER_PROMPT`; approved clip `videos/hotspot-20260816-identity-v4`). Cover via `image2image` (face only), then `seedance2.0mini` `multimodal2video` with `@Image 1` = cover first frame, `@Image 2` = face only, `@Audio 1` = timbre only; the spoken script goes in `{dialogue}` for lip-sync. Agent one-off (no schedule) uses the same pipeline via `media:dreamina talking-head`; never `text2video` or face-only `multimodal2video`. `--photo` + `--audio` override as a pair. One clip TNS failure must not stop the rest; report which clip failed. Resident RSS crawler: `npm run hotspot:watch` behind `FLAG_video_hotspot_crawler`. Do not invent headlines. Dreamina login is one active account at a time: `media:dreamina switch --account <alias>` (高级+ CLI membership); never raw `dreamina login`.
- Douyin live API (`docs/VIDEO_PUBLISH.md`) needs a **正式网站应用** + scope `video.create.bind` (not a mini-program, not a personal Open Platform signup). Keep `FLAG_video_publish_douyin` off until that exists; `--platform all` then skips Douyin and writes Weixin/XHS packs only.
- Do not present AI-generated factual claims as verified facts.
- Mark uncertain claims for manual review.
- Ask before adding paid APIs, cloud rendering, online asset scraping, a database, or auto-publishing.
- Operator agents (video, hotspot, publish, RPA) must not rewrite application code, tests, flags, or docs. Allowed writes: Job YAML under `state/jobs/`, episode/video artifacts, publish packs, setup-created `.env.local`. Source edits require an explicit current-session ask to change the repository.

## Feature Flags

Harness feature-flag support lives in `flags/feature-flags.ts`.

New user-facing features should be designed with a kill switch or rollout path. For the local-first MVP, flags may stay as local environment-driven rules until a real provider is chosen.

## CI And Optional Loops

The active required local gate is:

```bash
make check
```

CI mirrors this with npm install, typecheck, lint, unit tests, npm audit, env parity, and sample Remotion render.

AI review, self-healing scripts, triage, perf, image scan, and secret scan are installed from the harness. Workflows that require external infrastructure are kept manual until the corresponding GitHub secrets, repo variables, and runtime targets exist.

## Merge And Release Discipline

The harness requires every merge into `main` to leave two audit anchors:

1. A pushed git tag.
2. A GitHub Release for that tag describing what changed, why, and impact.

This project may be pushed directly to `main` only when the user explicitly allows it. Otherwise use a PR. Direct pushes must still run local gates and create the tag + Release.

## Handoff Notes

- Read `docs/RPD.md` before roadmap-level changes.
- Keep `AGENTS.md` current as the architecture evolves — especially the required reading list at the top.
- Preserve user-edited `brief`, `script`, `storyboard`, and `render-plan` files unless the requested change requires editing them.
