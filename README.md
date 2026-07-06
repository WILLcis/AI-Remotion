# AI-Remotion

AI-Remotion is a local-first AI + Remotion agent for making image-and-text explainer videos.

The workflow is:

```text
brief -> script -> storyboard -> render-plan -> voiceover -> captions -> Remotion MP4 -> QA report
```

The project is aimed at knowledge explainers, product explainers, software tutorials, light news analysis, listicles, and educational short videos.

## Requirements

- Node.js 20+
- npm
- FFmpeg support through Remotion for MP4 rendering
- Optional: `ffprobe` on `PATH` for richer QA media duration/resolution/audio checks

## Getting Started

```bash
npm install
npm run dev
```

Open Remotion Studio and choose the `ExplainerVideo` composition.

## Render The Sample

```bash
npm run render:sample
```

The sample MP4 is written to:

```text
episodes/sample/out/final.mp4
```

## Useful Commands

Checks and rendering:

```bash
npm run config:check
npm run typecheck
npm run lint
npm run validate:sample
npm test
npm run render:sample
```

Episode artifact utilities:

```bash
npm run episode:batch -- --episodes sample --steps validate,qa --dry-run
npm run episode:new -- --id remotion-intro --topic "普通人如何理解 Remotion"
npm run episode:captions -- --episode sample
npm run episode:script -- --episode sample
npm run episode:storyboard -- --episode sample
npm run episode:render-plan -- --episode sample
npm run episode:render -- --episode sample
npm run episode:qa -- --episode sample --render-frames
npm run episode:route -- "第 4 段不要卡片，改成时间轴"
npm run episode:voice -- --episode sample --provider silent
npm run episode:voice -- --episode sample --provider macos-say
```

These commands rewrite episode artifacts. `episode:batch -- --dry-run` previews a multi-episode workflow without changing files. `episode:new` creates a new episode folder with a schema-valid `brief.yaml`. `episode:voice` writes `episodes/<id>/audio/voiceover.wav` and updates render-plan audio metadata. `episode:render` writes `episodes/<id>/out/final.mp4` by default. `episode:qa` uses `ffprobe` when available and falls back to file-size checks when it is not installed. `episode:qa -- --render-frames` writes QA stills under `episodes/<id>/out/qa-frames/`.

## LLM And TTS Config

Provider configuration is optional. With no local env configured, AI-Remotion uses deterministic script generation and silent TTS so the pipeline stays local and reproducible.

```bash
cp config/.env.dev.example .env.local
AI_REMOTION_ENV_FILE=.env.local npm run config:check
```

The runtime keys are namespaced with `AI_REMOTION_`:

```text
AI_REMOTION_LLM_PROVIDER=deterministic
AI_REMOTION_LLM_PROVIDER=openai-compatible
AI_REMOTION_TTS_PROVIDER=silent
AI_REMOTION_TTS_PROVIDER=macos-say
```

External LLM/TTS providers are configuration-ready but not called by default. `openai-compatible` currently falls back to deterministic generation unless `AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC=false`, in which case the CLI fails clearly until the adapter is implemented. External TTS providers such as `edge-tts`, `doubao`, `azure`, and `elevenlabs` are recognized as pending and will not run silently.

## New Episode Flow

```bash
npm run episode:new -- --id remotion-intro --topic "普通人如何理解 Remotion"
npm run episode:script -- --episode remotion-intro
npm run episode:storyboard -- --episode remotion-intro
npm run episode:render-plan -- --episode remotion-intro
npm run episode:captions -- --episode remotion-intro
npm run episode:voice -- --episode remotion-intro --provider silent
npm run episode:render -- --episode remotion-intro
npm run episode:qa -- --episode remotion-intro --render-frames
```

Batch runs can target explicit episodes or every folder under `episodes/` that contains `brief.yaml`:

```bash
npm run episode:batch -- --episodes sample --steps validate,render,qa --qa-render-frames
npm run episode:batch -- --all --steps validate --dry-run
```

## Project Structure

```text
docs/                 Product requirements and decisions
episodes/             Episode briefs, scripts, plans, captions, assets, outputs
src/remotion/         Remotion root, templates, scene components, themes
src/render/           Render-plan and timing helpers
tests/                Unit and integration tests
```

See `docs/RPD.md` for the product design and `AGENTS.md` for agent workflow rules.

## Remotion License

Remotion has license terms that may require a company license for some commercial organizations. Review the official terms before production use:

https://github.com/remotion-dev/remotion/blob/main/LICENSE.md
