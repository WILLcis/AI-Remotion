# Render Plan Prompt

Convert `storyboard.json` into Remotion input props.

- Use schema-valid render-plan JSON.
- Compute contiguous frame ranges from scene durations.
- Use theme tokens instead of hard-coded per-scene colors.
- Reference only existing local assets or built-in template visuals.
- Include structured captions aligned to scene frame ranges.
