# Portable Video Producer Package

Hand AI-Remotion video work to any Agent framework. **Humans talk; the Agent runs the CLI.**

## Default: plain-language request

1. Point the Agent at `agents/START_HERE.md` and `AGENT.md`.
2. The Agent asks only for missing required fields, drafts a Job, waits for a one-line confirm, writes `state/jobs/<id>.yaml`, routes with the platform flag, and runs the mapped specialist.
3. It stops at pending review gates and returns the result JSON.

Do not ask the user to run `video:intake` or `video:route`. Intake helpers under `agents/video-job-intake/` are **internal** Agent steps.

## Job-file shortcut

If a Job YAML/JSON already exists:

1. Give the Agent `AGENT.md` and the Job path.
2. It enables `FLAGS.VIDEO_AGENT_PLATFORM`, runs `npm run video:route -- --job <job-file>`, reads `SPECIALISTS.md`, and stops at pending gates.

No global installation, symlink, host plugin, or cloud account is required. The host needs repository access and permission to run local npm.

## Host adapters

Keep adapters thin:

- point to `agents/video-producer/AGENT.md` (and `agents/START_HERE.md` for humans);
- preserve `npm run video:route` as the routing authority;
- preserve the feature flag and approval rules;
- never duplicate all specialist profiles into an adapter format.

`.devin/skills/video-producer/` is one discovery adapter. It does not replace this package.
