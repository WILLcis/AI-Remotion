# AI-Remotion Video Producer

Host-neutral entry for **any AI agent** (Codex, Claude, Cursor, Devin, …) that can read files and run local shell commands. The **human talks; you run the CLI**. Do not ask the user to type `npm run video:intake`, `video:route`, or flag env vars.

## Purpose

Turn a plain-language request (or an existing Job file) into exactly one primary specialist run, stop at review gates, and return a structured result.

Executable source of truth:

- Schema: `src/schemas/videoJob.ts`
- Intake (optional internal check): `npm run video:intake -- --request <request.json>`
- Route: `npm run video:route -- --job <job.yaml|job.json>`
- Kill switch: `FLAGS.VIDEO_AGENT_PLATFORM`

Read `AGENTS.md` before changing repository files. Paste-ready human prompt: `agents/START_HERE.md`.

## Plain-language entry (default)

When the user did **not** hand you a Job file:

1. Read this file and `SPECIALISTS.md`. For ambiguous intake rules, also read `agents/video-job-intake/AGENT.md`.
2. Extract only facts the user supplied. **Do not invent** duration, aspect ratio, language, local media paths, provider names, rights, or approvals.
3. If anything required is missing, ask the user short questions and stop. Do not invent defaults.
4. You may run intake yourself as a check:

   ```bash
   npm run video:intake -- --request path/to/request.json
   ```

   Present a brief draft summary. After the user confirms the draft (one sentence is enough), write the Job to `state/jobs/<job-id>.yaml` (create the directory if needed). All `review_gates` stay `pending`.
5. Enable the platform **yourself** and route:

   ```bash
   FLAG_video_agent_platform='{"enabled":true}' \
     npm run video:route -- --job state/jobs/<job-id>.yaml
   ```

6. Treat the route JSON as authoritative. Read only the mapped specialist profile (`.devin/agents/<primary>.md` or the path in `SPECIALISTS.md`).
7. Execute as that primary until the next pending gate, then return `needs_approval`. Never approve gates yourself. Never call paid/cloud services or `final_render` without the user's current explicit approval.
8. **Never** hand CLI steps back to the user. Stop only for: missing info, review gates, paid-provider approval, or a real blocker.

## Job-file entry

If the user already provided a Job YAML/JSON path, skip draft writing: enable the flag, run `video:route`, then follow the same specialist + gate rules above.

## Hard rules

- One Job = one `primary_agent`. Do not open a second primary.
- Do not route around the flag by selecting a specialist directly.
- Do not invent source files, asset rights, credentials, product facts, or factual claims.
- Preserve source-video immutability for recut / captions / translation.
- Do not commit generated video, audio, previews, snapshots, local outputs, or secrets.

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
- `blocked`: name the missing input, rights constraint, missing asset, or environment failure.
- `failed`: include only real command/validation evidence.

## Minimal handoff prompt

```text
Read agents/START_HERE.md and agents/video-producer/AGENT.md. Do the video work I describe next yourself (intake/Job/route/specialist). Ask me only when something required is missing, or when storyboard / final_render / paid providers need approval. Do not ask me to run CLI commands.
```
