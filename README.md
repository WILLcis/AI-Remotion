# AI-Remotion

AI-Remotion is a local-first AI + Remotion agent for making image-and-text explainer videos.

The workflow is:

```text
brief -> script -> storyboard -> render-plan -> voiceover -> captions -> Remotion MP4 -> QA report
```

The project is aimed at knowledge explainers, product explainers, software tutorials, light news analysis, listicles, and educational short videos.

## Current Product Direction

AI-Remotion is CLI/Agent-first for the near term. The browser UI comes later, after the artifact workflow and revision loop are stable.

**Hand this folder to an agent (no UI):** install Cursor, open this repository, paste [docs/GIVE_TO_AGENT.md](docs/GIVE_TO_AGENT.md) (or [agents/START_HERE.md](agents/START_HERE.md)). The agent starts at [AGENTS.md](AGENTS.md) and reads every document on that required list before working. You only log in to Dreamina and provide API keys when asked. To auto-post Weixin Channels / Xiaohongshu, say `批准RPA` and scan QR in the opened Chrome.

Rendering is local Remotion rendering for the MVP. Cloud rendering, hosted queues, and object storage are intentionally out of scope until the local pipeline is reliable.

The canonical public demo lives in `episodes/sample`:

```text
普通人如何理解 Remotion，以及 AI-Remotion 如何生成图文讲解视频
```

See `docs/decisions/ADR-001-cli-first-local-rendering-canonical-demo.md` for the decision record.

For a Chinese step-by-step operator guide, see `docs/USER_MANUAL.md`.

## Requirements

- Node.js 20+
- npm
- FFmpeg support through Remotion for MP4 rendering
- Optional: `ffprobe` on `PATH` for richer QA media duration/resolution/audio checks

## Getting Started

Non-technical: [docs/GIVE_TO_AGENT.md](docs/GIVE_TO_AGENT.md) — do not start with `npm run dev`.

Operators:

```bash
npm install
npm run setup
npm run dev
```

Open Remotion Studio and choose the `ExplainerVideo` composition.

## Render The Canonical Demo

```bash
npm run render:sample
```

The canonical demo MP4 is written to:

```text
episodes/sample/out/final.mp4
```

To run the full local demo path, including validation, render, QA report, and QA stills:

```bash
npm run demo:canonical
```

## Useful Commands

Checks and rendering:

```bash
npm run config:check
npm run demo:canonical
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
AI_REMOTION_TTS_PROVIDER=cosyvoice
```

External providers are opt-in. To use DeepSeek through its OpenAI-compatible Chat Completions API, set `AI_REMOTION_LLM_PROVIDER=openai-compatible`, `AI_REMOTION_LLM_BASE_URL=https://api.deepseek.com`, an API key, and an explicit model. When `AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC=true`, missing configuration, timeouts, and invalid responses fall back to the local deterministic script generator.

CosyVoice 3 runs on the cornerstone GPU host over Tailscale. Set `AI_REMOTION_TTS_PROVIDER=cosyvoice-clone`, `AI_REMOTION_TTS_BASE_URL=http://100.125.33.44:8000`, and use the default reference assets under `assets/tts/` (or episode rights for personal clones). The `/inference_zero_shot` endpoint returns PCM; failures fail loudly and do not substitute silent audio. Legacy `cosyvoice` + local CosyVoice-300M-SFT `/inference_sft` remains available but is not the default path. FunASR is reserved for a future transcription and caption-alignment stage, not TTS. `edge-tts`, `doubao`, `azure`, and `elevenlabs` remain pending and will not run silently.

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
