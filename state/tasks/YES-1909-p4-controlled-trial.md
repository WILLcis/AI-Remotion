# YES-1909 P4 — Controlled Trial Evidence

## Scope and constraints

Round 3 completes P4 within the user-approved no-render boundary. It validates the three fixture-driven routing paths, records a read-only product-promo specialist trial, and records an unapproved resume for minimal revision analysis. The trial did not call providers, infer or grant approval, modify workflow artifacts, or generate/replace a render. `final_render` remains pending.

Fixture inputs:

- `tests/fixtures/video-jobs/product-promo.yaml`
- `tests/fixtures/video-jobs/digital-human.yaml`
- `tests/fixtures/video-jobs/faceless-explainer.yaml`

All three files exist and parse/route.

## Root CLI routing

With `VIDEO_AGENT_PLATFORM` enabled:

- product -> `product-promo-producer` / `hyperframes` / only `final_render`.
- digital-human -> `digital-human-producer` / `remotion` / `heygen` / all gates.
- faceless -> `faceless-explainer-producer` / `remotion` / all gates.

With the flag disabled, all three fixtures were rejected with `VIDEO_AGENT_PLATFORM`.

## Read-only specialist trial

The repository-defined product-promo producer profile was exercised against `videos/deepdog-skills-promo` without write or render permission. The structured result was:

- `status`: `needs_approval`
- `phase`: `final_render`
- `changed_artifacts`: `[]`
- primary ownership: exactly one primary, `product-promo-producer`, verified
- pinned HyperFrames check: passed with non-blocking warnings
- provider calls: none
- render handling: the existing `videos/deepdog-skills-promo/renders/deepdog-skills-promo.mp4` was observed only; it was not generated or replaced

The same specialist session was resumed without approval. No approval was inferred, and no edit, provider call, or render occurred. For the requested minimal caption revision, analysis identified:

- authoritative timing change: `audio_meta.json`
- derivatives: `caption_groups.json` and `compositions/captions.html`
- explicitly untouched as unrelated: storyboard, frames, assets, and renders

The `devin` CLI is unavailable in this environment (`command not found`). As the fallback, the repository-defined `product-promo-producer` profile was exercised through the available Cursor specialist. This is an exact environment blocker, not a platform failure.

## Approval and recovery boundary

P4 is complete within the approved no-render boundary. The session-resume behavior was observed without approval, but approved final-render recovery was not executed. `final_render` remains `needs_approval`; no final approval or render occurred.

The next optional action is for the user to explicitly approve `final_render`, then resume at that gate and execute the final render. Without that approval, the job remains paused.

## Verification evidence

- Targeted Vitest: 2 files, 17 tests passed.
- `make verify-harness`: 17/17 passed.
- `make check`:
  - typecheck passed
  - lint passed
  - sample validation passed with 8 scenes / 720 frames
  - 23 files / 107 tests passed
  - final npm audit failed with 12 high brace-expansion/minimatch issues and `No fix available`

`make check` did not fully pass because of the final audit failure.

No `make test-integration` or final render rerun was performed in P4 because the user approved a no-render trial. The prior P3 integration result remains separate evidence.

## Rollback boundary

Rollback is limited to the P4 fixture files, P4 test additions, and this P4 evidence record. Existing workflow code, user artifacts, episodes, videos, provider state, and renders are outside the P4 rollback boundary.
