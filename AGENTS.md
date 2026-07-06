# AGENTS.md — AI-Remotion Agent Map

This repository follows the AI-First Coding Loop harness from:

https://github.com/WILLcis/AI--First-Coding-Loop-Codex

Any coding agent entering this repo must read this file first, then read `.agents/skills/agent-coding-discipline/SKILL.md`, then load any task-specific skill that applies.

## Project Goal

AI-Remotion is a local-first AI + Remotion production line for image-and-text explainer videos.

The intended workflow is:

```text
brief -> script -> storyboard -> render-plan -> voiceover -> captions -> Remotion MP4 -> QA report
```

This project is for knowledge explainers, product explainers, software tutorials, light news analysis, listicles, and educational short videos. It is not a CapCut/Jianying draft generator, copyrighted media scraper, or auto-publishing system.

## Harness Discipline

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

## Current Product Contract

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
episodes/             Episode briefs, scripts, plans, captions, assets, outputs
flags/                Harness feature-flag facade
prompts/              AI review and architect-task prompts
scripts/              Harness automation and local review scripts
src/remotion/         Remotion root, templates, scene components, themes
src/render/           Render-plan and timing helpers
state/                Append-only agent/harness memory and orchestration state
tests/                Unit and integration tests
tools/                Harness installation and verification helpers
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

Do not commit generated videos, generated audio, local outputs, or `.env` files.

## Commands

Use npm unless the user explicitly changes package managers.

```bash
make bootstrap          # npm install
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
npm run dev
npm run config:check
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
- Do not auto-publish videos.
- Do not present AI-generated factual claims as verified facts.
- Mark uncertain claims for manual review.
- Ask before adding paid APIs, cloud rendering, online asset scraping, a database, or auto-publishing.

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
- Keep `AGENTS.md` current as the architecture evolves.
- Preserve user-edited `brief`, `script`, `storyboard`, and `render-plan` files unless the requested change requires editing them.
