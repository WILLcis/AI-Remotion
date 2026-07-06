# RPD: AI-Remotion 图文讲解视频 Agent

Status: Draft for review
Date: 2026-07-06
Repository: `WILLcis/AI-Remotion`
RPD meaning: Requirements & Product Design

## Assumptions

1. MVP is a local-first project, not a hosted SaaS.
2. The first target language is Chinese, with English-compatible structure where it is cheap to support.
3. The first video category is "图文讲解类": knowledge explainers, product explainers, software tutorials, listicles, light news analysis, and educational short videos.
4. Remotion is the renderer and template system. AI agents generate scripts, plans, assets, and code changes, but Remotion remains the source of truth for final video layout.
5. The user reviews the script before rendering. Fully unattended publishing is out of scope for MVP.
6. TTS starts with a simple provider such as Edge TTS, then becomes pluggable for Doubao, ElevenLabs, Azure, or local voice models.
7. The project should be usable from Claude Code, Codex, or another coding agent. Provider-specific logic should be isolated.

## Objective

Build a reusable AI + Remotion Agent that turns a creator's topic brief into a polished, template-based explainer video.

The Agent should help a solo creator move from:

```text
topic / audience / platform / style / duration
```

to:

```text
reviewable script -> storyboard -> render plan -> voiceover -> captions -> Remotion MP4
```

The goal is not to replace human judgment. The goal is to remove repetitive production work while keeping the creator in control of script approval, style direction, factual review, and final publishing.

## Target Users

- Solo creators who publish educational or explanatory short videos.
- Indie hackers who need product explainer videos.
- Operators who want repeatable video templates for updates, tutorials, or announcements.
- AI workflow builders who want a clean local baseline for automated video generation.

## Product Positioning

AI-Remotion is not a traditional video editor and not a "爆款混剪" replacement.

It is a programmable video production line:

- AI handles script drafting, storyboard planning, asset suggestions, timing, captions, and iteration instructions.
- Remotion handles layout, animation, rendering, and reproducibility.
- The creator handles topic judgment, script approval, factual correctness, taste, and publishing.

## Non-Goals

The MVP will not:

- Edit complex real-life footage like Premiere, Final Cut, CapCut, or Jianying.
- Automatically scrape copyrighted images, videos, music, or brand assets.
- Clone voices without explicit rights.
- Generate legal, medical, financial, or investment claims without user review.
- Auto-publish to social platforms.
- Build a full multi-user web app.
- Support high-end cinematic motion design in the first version.

## Product Principles

1. Script first, render second.
   Bad scripts make bad videos faster. Every episode starts with a reviewable script.

2. Machine-readable plans over free-form prompts.
   The Agent should produce structured files that can be validated, rendered, and revised.

3. Templates beat one-off magic.
   Each video style should be a reusable Remotion composition with configurable props.

4. Local-first by default.
   Users should be able to run, inspect, and modify the pipeline on their own machine.

5. Review gates are product features.
   The system should pause at important checkpoints: script approval, render plan approval, final review.

6. Provider-agnostic AI.
   LLM, TTS, image generation, and transcription providers should be replaceable.

## MVP Workflow

### 1. Project Setup

The user installs dependencies and verifies that Remotion can render a minimal sample.

Expected future command:

```bash
npm install
npm run dev
npm run render:sample
```

### 2. Episode Brief

The user creates an episode brief containing:

- topic
- target audience
- platform
- duration
- aspect ratio
- tone
- voice style
- visual style
- source notes or reference material
- claims that must be included
- claims that must be avoided

Example:

```yaml
topic: "普通人如何理解 Remotion"
audience: "想用 AI 做短视频但不会写代码的创作者"
platform: "抖音"
duration_seconds: 90
aspect_ratio: "9:16"
tone: "轻松、清楚、不装专家"
voice: "亲切自然的中文女声"
visual_style: "深色背景、信息卡片、轻量动效"
must_include:
  - "Remotion 是用 React 生成视频的框架"
  - "个人和小团队通常可免费使用"
must_avoid:
  - "不要说 Remotion 是无代码剪辑软件"
```

### 3. Script Draft

The Agent generates a script before creating the video.

Output file:

```text
episodes/<episode-id>/script.md
```

Script requirements:

- 6-8 segments for a 60-120 second short video.
- Each segment has spoken text, visual direction, and intended duration.
- Spoken text is conversational, not essay-like.
- No unsupported factual claims.
- Complex terms are explained with examples.
- Segment transitions are explicit.

### 4. Storyboard

After script approval, the Agent converts the script into a structured storyboard.

Output file:

```text
episodes/<episode-id>/storyboard.json
```

Storyboard requirements:

- One scene per segment or sub-segment.
- Each scene includes title, narration, caption text, visual layout, animation intent, asset needs, and duration.
- Scene duration should sum to the target duration, or explain why it differs.

### 5. Render Plan

The Agent converts the storyboard into Remotion props.

Output file:

```text
episodes/<episode-id>/render-plan.json
```

Render plan requirements:

- Validated against a schema.
- Uses stable template IDs.
- Keeps timing in frames and seconds.
- Includes captions and safe-area settings.
- Includes asset references with local paths.
- Can be rendered without asking the LLM again.

### 6. Voiceover

The system generates voiceover from the approved script or storyboard.

Output files:

```text
episodes/<episode-id>/audio/voice.mp3
episodes/<episode-id>/audio/segments.json
```

Voiceover requirements:

- Voice provider is configurable.
- Segment timings are measured from actual generated audio.
- Render plan is updated if TTS duration differs from planned duration.
- User can regenerate voice without changing script.

### 7. Captions

Captions are generated from approved narration and aligned with voice timing.

Output file:

```text
episodes/<episode-id>/captions.srt
```

Caption requirements:

- Captions must be readable on mobile.
- Captions stay within platform safe areas.
- Captions should follow semantic phrase breaks, not mechanical character counts.
- Captions must not cover core visual elements.

### 8. Remotion Render

Remotion renders the episode to MP4.

Expected future command:

```bash
npm run render -- --episode episodes/<episode-id>/render-plan.json
```

Output file:

```text
episodes/<episode-id>/out/final.mp4
```

Render requirements:

- Default vertical output: 1080x1920, 30fps.
- Optional horizontal output: 1920x1080, 30fps.
- Output duration follows voiceover duration unless explicitly overridden.
- Rendering should fail loudly if required assets are missing.

### 9. QA Report

The Agent generates a QA report after rendering.

Output file:

```text
episodes/<episode-id>/qa-report.md
```

QA checks:

- video file exists and is playable
- duration is within tolerance
- first, middle, and final frames are not blank
- captions exist and do not obviously overflow
- voiceover exists if required
- render plan assets all exist
- script claims marked as needing manual verification are listed
- known limitations are clearly reported

### 10. Revision Loop

The user can request changes in natural language.

Examples:

```text
第 3 段太长，压缩到一句话。
改成更适合抖音的竖屏版本。
换成更沉稳的男声。
第 4 段不要卡片，改成时间轴。
整体节奏快 10%，但字幕别太挤。
```

The Agent should modify the smallest necessary artifact:

- script change -> update script, storyboard, render plan, voice, captions, render
- visual-only change -> update storyboard/render plan/template props, then render
- voice-only change -> regenerate audio, captions, timing, then render
- output format change -> adjust render metadata and safe areas, then render

## Functional Requirements

### FR-001: Repository Baseline

The project must include:

- Remotion project scaffold
- documented commands
- sample episode
- sample render plan
- at least one reusable composition
- validation for structured episode files

### FR-010: Brief Intake

The Agent must accept a structured brief file and use it as the source of truth.

Acceptance:

- Given a valid brief, the Agent can generate a script.
- Given an invalid brief, validation reports missing or invalid fields.

### FR-020: Script Generation

The Agent must generate a reviewable script before rendering.

Acceptance:

- Script includes scene-by-scene narration and visual notes.
- Script can be edited by the user without breaking later steps.
- No render starts before script approval unless explicitly requested.

### FR-030: Storyboard Generation

The Agent must convert approved scripts into structured storyboard JSON.

Acceptance:

- Storyboard is valid JSON.
- Every scene has duration, narration, layout intent, and caption text.
- Storyboard duration is close to the target or explains the difference.

### FR-040: Render Plan Generation

The Agent must convert storyboard into Remotion input props.

Acceptance:

- Render plan validates against a schema.
- Render plan can be rendered deterministically.
- Render plan references only existing local assets or built-in template assets.

### FR-050: TTS Integration

The project must support at least one TTS path.

Acceptance:

- Voiceover can be generated locally or through a documented provider.
- The voiceover file is saved in the episode folder.
- Actual audio duration is measured and reflected in the render plan.

### FR-060: Caption Generation

The project must generate captions from narration.

Acceptance:

- Captions can be exported as `.srt`.
- Captions are also available to Remotion as structured props.
- Captions use semantic line breaks where possible.

### FR-070: Remotion Template

The MVP must include a reusable explainer template.

Acceptance:

- Template supports title card, section cards, image/card scenes, quote scenes, list scenes, timeline scenes, comparison scenes, and closing CTA.
- Template uses theme tokens for colors, font sizes, spacing, and safe areas.
- Template supports vertical and horizontal variants, even if vertical is the default.

### FR-080: Rendering

The project must render a final MP4 from a render plan.

Acceptance:

- `npm run render:sample` produces a playable sample MP4.
- Rendering fails on missing assets rather than silently producing broken scenes.
- Render output path is deterministic.

### FR-090: QA

The project must produce a QA report for each rendered episode.

Acceptance:

- QA report lists output file, duration, resolution, audio presence, captions presence, and missing assets.
- QA report includes manual review reminders for factual claims and platform compliance.

### FR-100: Revision

The Agent must support iterative revision.

Acceptance:

- User can request natural language changes.
- Agent identifies which artifact should change.
- Agent avoids regenerating unrelated files when a small change is enough.

## Proposed Tech Stack

- Runtime: Node.js 20+
- Language: TypeScript
- Renderer: Remotion
- UI foundation: React components rendered by Remotion
- Validation: Zod or equivalent schema validation
- Captions: generated `.srt` plus structured caption props
- Audio: Edge TTS for MVP, provider adapter interface for others
- Media inspection: FFmpeg / ffprobe
- Package manager: npm by default unless the scaffold chooses otherwise

## Planned Commands

These commands are part of the desired developer experience. They may not exist until implementation starts.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run render:sample
npm run episode:new -- --id remotion-intro
npm run episode:script -- --episode remotion-intro
npm run episode:storyboard -- --episode remotion-intro
npm run episode:voice -- --episode remotion-intro
npm run episode:render -- --episode remotion-intro
npm run episode:qa -- --episode remotion-intro
```

## Proposed Project Structure

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   ├── RPD.md
│   └── decisions/
├── episodes/
│   └── sample/
│       ├── brief.yaml
│       ├── script.md
│       ├── storyboard.json
│       ├── render-plan.json
│       ├── captions.srt
│       ├── audio/
│       ├── assets/
│       ├── out/
│       └── qa-report.md
├── src/
│   ├── remotion/
│   │   ├── Root.tsx
│   │   ├── compositions/
│   │   ├── templates/
│   │   ├── themes/
│   │   └── components/
│   ├── agent/
│   │   ├── prompts/
│   │   ├── workflows/
│   │   └── providers/
│   ├── schemas/
│   ├── captions/
│   ├── audio/
│   ├── render/
│   └── qa/
├── scripts/
└── tests/
```

## Data Contracts

### Brief

The brief describes what the creator wants.

Required fields:

- `topic`
- `audience`
- `platform`
- `duration_seconds`
- `aspect_ratio`
- `tone`
- `voice`
- `visual_style`

### Storyboard

The storyboard describes scenes in human-readable and machine-readable form.

Required scene fields:

- `id`
- `duration_seconds`
- `narration`
- `caption`
- `visual_type`
- `visual_direction`
- `assets`
- `animation`

### Render Plan

The render plan is the final input to Remotion.

Required fields:

- `episode_id`
- `metadata`
- `theme`
- `video`
- `audio`
- `captions`
- `scenes`

Render plan rule:

The render plan should be deterministic. Given the same render plan and assets, Remotion should generate the same video.

## Visual System Requirements

The default visual system should avoid looking like a generic slide deck.

Required capabilities:

- clear hierarchy for title, subtitle, body, annotation, and CTA
- mobile-safe caption placement
- theme tokens for color, spacing, typography, and motion
- light and dark themes eventually, dark first for MVP
- reusable scene types
- restrained motion that supports comprehension
- support for simple charts, timelines, comparisons, and step-by-step explainers

MVP scene types:

- TitleScene
- KeyPointScene
- ImageCardScene
- ListScene
- TimelineScene
- ComparisonScene
- QuoteScene
- CTAScene

## Content Quality Requirements

Scripts must:

- be spoken-language friendly
- avoid dense paragraphs
- explain one idea per scene
- avoid unsupported claims
- mark uncertain claims for review
- include a hook, useful body, and clear ending

Captions must:

- be readable on mobile
- avoid 1-2 character orphan lines
- avoid covering key visuals
- match narration timing closely

Videos must:

- have a clear first 3 seconds
- avoid long static screens
- keep visual changes aligned with semantic changes
- maintain a consistent style across scenes

## Testing Strategy

### Unit Tests

Cover:

- schema validation
- duration calculation
- caption segmentation
- render plan generation
- provider adapters with mocks

### Integration Tests

Cover:

- sample brief -> script fixture
- storyboard fixture -> render plan
- render plan -> sample still frame
- sample render -> QA report

### Visual Verification

For sample videos:

- render first frame, middle frame, and final frame
- assert frames are nonblank
- assert captions stay within safe-area bounds where practical
- manually inspect sample MP4 before release

## Boundaries

### Always Do

- Keep scripts reviewable before rendering.
- Keep intermediate artifacts in the episode folder.
- Validate structured files before using them.
- Use environment variables for API keys.
- Fail loudly on missing assets.
- Preserve user-edited script and brief files.
- Prefer local deterministic rendering for MVP.

### Ask First

- Adding paid API providers.
- Adding cloud rendering.
- Adding online asset scraping.
- Adding auto-publishing.
- Changing the default package manager.
- Introducing a database.
- Making claims in regulated domains such as finance, medicine, or law.

### Never Do

- Hardcode secrets.
- Use unlicensed media.
- Clone a real person's voice without explicit rights.
- Delete user-created episode artifacts without confirmation.
- Publish videos automatically.
- Present AI-generated factual claims as verified facts.
- Hide render failures behind fallback empty scenes.

## Security and Compliance

- Store provider keys in `.env`, never in source files.
- Provide `.env.example` with placeholder values only.
- Track media source and license fields in render plans where possible.
- Include manual review reminders for commercial, medical, legal, financial, and political content.
- Remotion licensing should be documented in the README. Personal and small-team use is generally allowed under Remotion's free license, but larger commercial organizations may need a company license.

## Success Criteria

MVP is done when:

1. A new user can run the sample project locally from a clean checkout.
2. The repo contains a clear `AGENTS.md` that tells coding agents how to work in this project.
3. A sample episode can render to MP4.
4. The sample episode has script, storyboard, render plan, captions, voiceover placeholder or generated audio, output video, and QA report.
5. The render plan is schema-validated.
6. The default template looks like a real explainer video, not a bare PowerPoint export.
7. The workflow supports at least one revision path without regenerating everything.
8. Documentation explains how to create a new episode.

## Milestones

### M0: RPD

- Add this RPD.
- Review assumptions and scope.

### M1: Repository Scaffold

- Initialize Remotion + TypeScript project.
- Add README, AGENTS.md, package scripts, and sample composition.
- Render a minimal sample video.

### M2: Data Contracts

- Add schemas for brief, storyboard, and render plan.
- Add sample episode files.
- Add validation command.

### M3: Template System

- Build default explainer composition.
- Add scene components and theme tokens.
- Render sample episode from render plan.

### M4: Audio and Captions

- Add TTS provider adapter.
- Generate or import voiceover.
- Generate captions and align timing.

### M5: Agent Workflow

- Add prompts and workflow documentation for coding agents.
- Add script -> storyboard -> render plan flow.
- Add revision routing rules.

### M6: QA and Batch Readiness

- Add QA report generation.
- Add visual checks for sample frames.
- Add batch episode workflow if MVP is stable.

## Risks

### Template videos may feel repetitive

Mitigation:

- Support multiple scene types.
- Add theme tokens.
- Encourage per-episode visual direction.

### AI scripts may hallucinate

Mitigation:

- Require script review.
- Mark uncertain claims.
- Keep source notes in the brief.

### Captions may overflow

Mitigation:

- Add caption segmentation tests.
- Enforce safe-area constraints in templates.

### TTS timing may drift from planned scene timing

Mitigation:

- Measure real audio duration.
- Recalculate render plan timing after voice generation.

### Remotion render may be slow on long videos

Mitigation:

- Start with 60-120 second MVP.
- Add render benchmarking later.
- Consider cloud rendering only after local MVP works.

## Open Questions

1. Should the first default format be vertical `1080x1920` only, or should horizontal `1920x1080` ship in MVP?
2. Which TTS provider should be the first real implementation: Edge TTS, Doubao, ElevenLabs, Azure, or local model?
3. Should the Agent use Markdown scripts as the user-editable source of truth, or should it use structured YAML/JSON only?
4. Should generated images be in scope for MVP, or should MVP only use text, icons, simple shapes, and user-provided images?
5. Should the project include a small browser UI later, or remain CLI/agent-first?
6. What is the first real sample topic we want to use for the canonical demo video?

## Next Step After RPD Approval

Generate `AGENTS.md` for this repository. It should encode:

- project goal
- expected workflow
- allowed commands
- file ownership boundaries
- style and testing rules
- safety rules for media, voice, and factual claims
- the requirement that agents update structured artifacts before rendering

After `AGENTS.md`, implement M1: Remotion + TypeScript scaffold and a minimal sample render.
