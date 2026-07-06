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
npm run typecheck
npm run lint
npm run validate:sample
npm test
npm run render:sample
```

Episode artifact utilities:

```bash
npm run episode:captions -- --episode sample
npm run episode:script -- --episode sample
npm run episode:storyboard -- --episode sample
npm run episode:render-plan -- --episode sample
npm run episode:qa -- --episode sample --render-frames
npm run episode:route -- "第 4 段不要卡片，改成时间轴"
npm run episode:voice -- --episode sample --provider silent
npm run episode:voice -- --episode sample --provider macos-say
```

These commands rewrite episode artifacts. `episode:voice` writes `episodes/<id>/audio/voiceover.wav` and updates render-plan audio metadata. `episode:qa -- --render-frames` writes QA stills under `episodes/<id>/out/qa-frames/`.

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
