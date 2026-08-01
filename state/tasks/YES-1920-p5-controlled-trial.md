# YES-1920 P5 — Existing-Video Recut Controlled Trial and Local Build Evidence

## Scope and constraints

P5 adds the fourth specialist `existing-video-recut-producer`, routes `existing-video` jobs to HyperFrames `/talking-head-recut`, and validates a designed graphic-overlay recut.

P5 had two distinct phases. The initial specialist trial was no-render and stopped at pending gates. A later local-only HyperFrames build created `videos/heygen-out-recut-trial/`, including `output.mp4`; `GATE_STATUS.json` records that phase as `done` / `render`. This document was reconciled in P6.4 to reflect both phases. No provider, cloud HyperFrames, HeyGen, Whisper transcription service, or other paid service was called, and the original source MP4 was not modified.

The fixture now records all three review gates as `approved` for the completed local build. P6.4 can verify that recorded state but does not recreate or infer the historical human approval that produced it.

Parent BIOS: `YES-1909`. P5 child BIOS: `YES-1920`.

Fixture input:

- `tests/fixtures/video-jobs/existing-video-recut.yaml`
  - job_id: `heygen-out-recut-trial`
  - source refs: `episodes/res/video/HeyGen_out.mp4`, `episodes/avatar-human3-reference/captions/reference.srt`
  - gates: `script=approved`, `storyboard=approved`, `final_render=approved`

## Source inventory (read-only)

`ffprobe` on `episodes/res/video/HeyGen_out.mp4`:

- video: h264, 720×1280, 25 fps, duration 54.160s
- audio: aac, duration 54.187s
- format duration: 54.187s
- size: 9,453,430 bytes

SHA-256 before trial:

```text
cd9f6009de6bad3024a071b188011bb02cf1afd23e3e17227cf4be61f25b4922
```

Transcript inventory: local `reference.srt` with 21 cues (~00:00.390–00:53.800). Used only as approved script/transcript input; not rewritten.

## Root CLI routing

With `VIDEO_AGENT_PLATFORM` enabled, the initial no-render trial used pending `storyboard` and `final_render` gates and routed to `existing-video-recut-producer` / `hyperframes`.

The recorded P5 fixture was subsequently approved for the local build. Its current route result has no pending approvals:

```json
{
  "job_id": "heygen-out-recut-trial",
  "workflow": "existing-video-recut",
  "primary_agent": "existing-video-recut-producer",
  "renderer": "hyperframes",
  "provider_requirements": [],
  "delegated_capabilities": [],
  "requires_approval": [],
  "reason": "Source type existing-video uses the existing footage recut pipeline"
}
```

With the flag disabled, the same fixture was rejected with `Video Agent Platform is disabled by FLAGS.VIDEO_AGENT_PLATFORM` (exit 1).

## No-render specialist trial

The repository-defined `existing-video-recut-producer` profile was exercised against the fixture without write or render permission. Planned overlay cards (memory-only; not written to disk):

| card | approx window | type | content intent |
| --- | --- | --- | --- |
| 01 | 0.39–6.93 | kinetic title | 数字分身替你出镜 / 用自己的声音说话 |
| 02 | 8.01–10.95 | brand lower-third | AI-Remotion |
| 03 | 11.79–23.79 | process callout | 真实声音 → 音色/语调/节奏 → AI 声音模型 |
| 04 | 25.11–41.68 | side panel | 上传照片创建数字人形象；输入文字驱动口播 |
| 05 | 46.66–53.80 | CTA | 评论区留言；关注获取体验方式 |

Structured result:

- `status`: `needs_approval`
- `phase`: `plan`
- `changed_artifacts`: `[]`
- primary ownership: exactly one primary, `existing-video-recut-producer`
- workflow intent: designed graphic overlays via `talking-head-recut`, not embedded captions
- provider calls: none
- render handling: none; no work directory was created during this initial no-render phase
- source writes: none

The same specialist session was resumed without approving `storyboard` or `final_render`. No approval was inferred. No edit, provider call, transcription, preview, or render occurred during this initial phase.

## Later local-only build evidence

A later P5 build used the recorded approved gates in `tests/fixtures/video-jobs/existing-video-recut.yaml`. The local work directory exists at `videos/heygen-out-recut-trial/` and is intentionally Git-ignored because it contains generated and copied media.

`GATE_STATUS.json` records:

- `status`: `done`
- `phase`: `render`
- output: `videos/heygen-out-recut-trial/output.mp4`
- verification: local HyperFrames output is about 20.5 MB and 54.2 seconds, with video and audio
- provider/cloud usage: none

This later build does not alter the initial no-render evidence; it supersedes its former claim that no render or work directory existed anywhere in P5.

For the requested minimal-revision boundary analysis (if later approved to revise overlays only):

- authoritative plan change: overlay `storyboard.json` / card outline
- derivatives: `public/cards/<card-id>.html`, root `public/index.html`
- explicitly untouched: source MP4, program audio, approved transcript, unrelated product/digital-human/faceless artifacts

## Source immutability proof

SHA-256 after trial:

```text
cd9f6009de6bad3024a071b188011bb02cf1afd23e3e17227cf4be61f25b4922
```

Matches the before hash. File mtime and size unchanged. No HyperFrames work directory was created during the initial no-render phase; the later local-only build used the separate Git-ignored trial directory documented above.

## Environment blockers

- `devin` CLI: unavailable (`command not found`). Fallback: Cursor specialist exercised the repository-defined producer profile. Exact environment blocker, not a platform failure.
- BIOS MCP write tools: unavailable in this Cursor session (`servers: []`). Intended progress payload for `YES-1920` is recorded below; no forged BIOS success.

## Intended BIOS progress payload (YES-1920)

```text
P5 initial no-render trial and later local-only build complete. Fixture
heygen-out-recut-trial routes to existing-video-recut-producer / hyperframes;
recorded current gates are approved and output.mp4 exists locally. Source SHA
unchanged. No provider or cloud call occurred. The local work directory is
Git-ignored. Flag off rejects. Tests + verify-harness pass; make check remains
blocked only by known npm audit brace-expansion/minimatch.
```

## Verification evidence

- Targeted Vitest: `tests/video-agent-platform.test.ts` + `tests/feature-flags.test.ts` — 2 files, 24 tests passed.
- Full unit suite via `make check`: 23 files / 114 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run validate:sample`: passed (8 scenes / 720 frames).
- Flag ON/OFF CLI matrix: recorded above.
- `make verify-harness`: 17/17 passed.
- `make check`: typecheck, lint, sample validation, and unit tests passed; final `npm audit --audit-level=low` failed with 12 high brace-expansion/minimatch issues and `No fix available`. Gate not lowered.

No `make test-integration` or Whisper transcription run was performed in P5. The initial no-render phase did not render; the later local-only build rendered the recorded fixture after its gates were marked approved. No provider API call was performed in either phase.

## Approval and recovery boundary

The current fixture and `GATE_STATUS.json` record all gates as approved and a completed local output. P5 evidence does not include the original human approval conversation, so this record must not be used to infer that a future render is approved. Any new revision, preview, provider invocation, or final render must use a new/reopened Job with explicit review gates and the user's contemporaneous approval.

## Rollback boundary

Rollback is limited to:

- `.devin/agents/existing-video-recut-producer.md`
- recut fixture under `tests/fixtures/video-jobs/`
- schema/router/entry-skill/test increments for the fourth workflow
- P5 documentation and this evidence record

Existing product-promo, digital-human, faceless-explainer, Remotion episodes, provider adapters, and all local media (including `HeyGen_out.mp4`) remain outside the P5 rollback boundary.
