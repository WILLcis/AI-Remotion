# AI-Remotion Agent Workflow

The local MVP workflow is deterministic and file-first. LLM prompts can improve each step later, but every step should still produce reviewable artifacts.

## Flow

1. `brief.yaml` is the source of truth for topic, audience, platform, duration, aspect ratio, tone, voice, and constraints.
2. `npm run episode:script -- --episode <id>` writes a reviewable `script.md`.
3. Human or agent review edits `script.md` before rendering.
4. `npm run episode:storyboard -- --episode <id>` converts script segments into `storyboard.json`.
5. `npm run episode:render-plan -- --episode <id>` converts the storyboard into Remotion props.
6. `npm run episode:captions -- --episode <id>` exports structured captions and `captions.srt`.
7. `npm run episode:voice -- --episode <id> --provider macos-say` generates local TTS when available.
8. `npm run render:sample` or a future episode render command produces MP4 output.

## Guardrails

- Do not render before the script has been reviewed unless explicitly requested.
- Prefer the smallest artifact change that satisfies a revision.
- Preserve user edits in downstream artifacts unless regeneration is explicitly required.
- Run validation after generated JSON changes.
