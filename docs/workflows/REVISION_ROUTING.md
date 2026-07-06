# Revision Routing

Use `npm run episode:route -- "<request>"` to classify a natural-language revision before editing.

## Routing Rules

- Voice changes update `render-plan.json`, voiceover audio, and captions only when timing changes.
- Caption-only changes update `captions.srt` and render-plan caption props.
- Format changes update render metadata, dimensions, and safe areas.
- Visual changes update `storyboard.json` and `render-plan.json`.
- Timing changes start at `script.md`, then flow through storyboard, render plan, captions, and voiceover.
- Content changes start at `script.md` and regenerate downstream artifacts.

The goal is to avoid regenerating unrelated files when a targeted edit is enough.
