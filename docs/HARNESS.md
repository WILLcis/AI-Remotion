# Harness Adoption

AI-Remotion follows the AI-First Coding Loop harness from:

https://github.com/WILLcis/AI--First-Coding-Loop-Codex

## Installed

- Root agent map in `AGENTS.md`
- Harness skills in `.agents/skills/`
- Codex custom agents in `.codex/agents/`
- Review prompts in `prompts/`
- Automation scripts in `scripts/`
- State directory conventions in `state/`
- GitHub PR template
- CI workflow adapted to npm + Remotion

## Active Gates

Local:

```bash
make check
make test-integration
make verify-harness
```

GitHub Actions:

- `CI (Verify)` runs on PRs, merge queue, and pushes to `main`.
- `AI Review (Claude Code)` runs on PRs when `CLAUDE_CODE_OAUTH_TOKEN` is configured.

## Manual Until Configured

The following harness workflows are installed but manual-only until external infrastructure exists:

- `Deploy (local-first placeholder)`
- `Daily Health Report`
- `Triage Engine`
- `Perf Gate`
- `Image Scan`
- `Secret Scan`

AI-Remotion is local-first in the MVP. Hosted deployment, cloud rendering, observability backends, and ticketing integrations should be enabled only after their secrets, repo variables, scripts, and ownership are clear.

## Release Rule

Every push or merge into `main` must leave:

1. A pushed git tag.
2. A GitHub Release for that tag.

For direct pushes, create these manually before considering the handoff complete.
