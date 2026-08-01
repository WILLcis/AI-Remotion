# AI-Remotion Video Producer

This is the repository-local entry contract for **any AI agent** that can read files and run local shell commands. It does not require a particular agent host, global skill directory, cloud provider, or automatic profile discovery.

## Purpose

Route one structured Video Job to exactly one AI-Remotion video-production specialist, preserve review gates, and return a structured result. The executable source of truth is:

- Schema: `src/schemas/videoJob.ts`
- Route command: `npm run video:route -- --job <job.yaml|job.json>`
- Kill switch: `FLAGS.VIDEO_AGENT_PLATFORM`

Read `AGENTS.md` before changing repository files.

## Required input

Provide a Video Job YAML or JSON file. The complete field contract, supported workflow/source values, and routing precedence live in `src/schemas/videoJob.ts`; `npm run video:route` is the authoritative validation and routing operation.

Do not invent source files, asset rights, provider credentials, approvals, product facts, or factual claims. If required input is missing, return `blocked` or ask the parent/user before production.

## Required procedure

1. Start in the repository root and ensure the platform is explicitly enabled for this invocation:

   ```bash
   FLAG_video_agent_platform='{"enabled":true}' \
     npm run video:route -- --job path/to/job.yaml
   ```

2. Treat the route JSON as authoritative. It provides `primary_agent`, `renderer`, `provider_requirements`, delegated capabilities, and pending gates.
3. Read `SPECIALISTS.md`, then read only the profile mapped to `primary_agent`. That profile is repository Markdown, so any host may read and follow it directly.
4. A Job has exactly one primary. Only that primary may modify shared script, storyboard, render plan, root timeline, or QA state. Delegated work returns bounded artifacts only.
5. If any `requires_approval` gate is present, stop at the appropriate phase and return `needs_approval`. Never infer approval from a passing check, a fixture, a previous render, or an earlier conversation.
6. Do not call a paid provider, cloud service, media search/scrape operation, preview, or final render without the user's current explicit approval. `final_render` requires separate explicit approval.
7. When no gate blocks the approved scope, follow the mapped specialist profile, preserve user-owned artifacts, and run its required local verification.

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
- `blocked`: name the missing/invalid input, rights constraint, missing local asset, or environment failure.
- `failed`: include only real command/validation evidence; do not fabricate completion.

## Safety and rollback

- Keep `FLAGS.VIDEO_AGENT_PLATFORM` as the entry-point kill switch; do not route around it by selecting a profile directly.
- Preserve source-video immutability for recut, captions, and translation workflows.
- Do not commit generated video, audio, previews, snapshots, local outputs, or secrets.
- Keep changes scoped to the selected Job. If a request requires a new workflow, source type, provider, or renderer, stop and create a separately scoped plan first.

## Minimal handoff prompt

```text
Read agents/video-producer/AGENT.md. Validate and route <job-file> with the Video Agent Platform flag enabled. Read only the mapped specialist profile. Do not approve pending gates, call paid/cloud services, or render without my explicit approval. Return the required result JSON.
```
