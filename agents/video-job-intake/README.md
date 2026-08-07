# Portable Video Job Intake Package

**Agent-internal** helper: convert prose into a safe Video Job draft. Humans start at `agents/START_HERE.md`; do not ask them to run `video:intake`.

The Agent should return JSON only:

- `draft_ready`: a schema-valid draft Job with every review gate pending;
- `needs_clarification`: the exact fields the caller must supply;
- `blocked`: an input, rights, or safety boundary prevents a draft.

After the user confirms the draft in the same conversation, continue with `agents/video-producer/AGENT.md` (write Job, route, specialist). Intake does not replace routing and cannot approve or render a video.
