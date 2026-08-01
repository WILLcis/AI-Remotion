# ADR-002: Multi-Workflow Video Agent Platform

## Status

Accepted

## Date

2026-07-31

## Context

AI-Remotion began as a local Remotion explainer pipeline. The repository now also contains a deterministic HyperFrames product-promo workflow and consent-gated digital-human providers. These workflows share media, audio, captions, QA, and revision capabilities, but have different inputs, planning rules, providers, renderers, review gates, and failure modes.

A single universal agent would accumulate unrelated rules and broad permissions. Fully isolated agents would duplicate shared capabilities and force callers to understand internal workflow selection.

## Decision

Expose one lightweight `video-producer` Skill that validates a top-level Video Job and routes to exactly one primary specialist:

- `product-promo-producer`
- `digital-human-producer`
- `faceless-explainer-producer`
- `existing-video-recut-producer`
- plus P6 specialists: embedded-captions, pr-video, music-video, video-translation, motion-graphics, slideshow, remotion-port

Keep deterministic capabilities in schemas, libraries, CLI commands, provider adapters, and QA utilities. Do not model captions, TTS, rendering, or media probing as personality agents.

Existing-video recut jobs keep the source footage immutable and add designed, transcript-synced graphic overlays through HyperFrames `talking-head-recut`. They are not caption-only packaging. Plain captions and paid translation use explicit workflows.

A Job has one primary agent. Delegated workers may produce bounded artifacts but must not edit shared script, storyboard, render plan, root timeline, or QA state.

The top-level Video Job is an envelope for routing and review state. Workflow-specific artifacts remain authoritative inside their existing Remotion, HyperFrames, or provider-native formats.

The entry Skill runs in the root session rather than a router subagent so a specialist may still dispatch one bounded worker level without unnecessary nesting.

Gate the new entry point behind `FLAGS.VIDEO_AGENT_PLATFORM`, default false.

## Alternatives Considered

### One Universal Video Agent

Rejected because prompt size, permissions, provider rules, and review behavior would grow with every workflow and become difficult to test independently.

### Independent Agents Without A Router

Rejected as the public interface because callers would need to know every workflow and mixed requests would have no ownership rule.

### One Normalized Storyboard For Every Renderer

Rejected because Remotion render plans, HyperFrames compositions, and digital-human provider manifests have different semantics. Only the routing envelope and result protocol are shared.

### Router Subagent Above Specialist Agents

Rejected for the first version because product-promo specialists already dispatch frame workers. Keeping routing inline limits nesting and cost.

## Consequences

- The repository becomes a multi-workflow, multi-renderer local video production platform while retaining CLI/Agent-first operation.
- Remotion remains authoritative for explainer and post-processing workflows; HyperFrames remains authoritative for its deterministic compositions.
- New workflow types require a specialist contract and tests, not additions to one universal prompt.
- Shared capabilities must remain provider-agnostic and deterministic where possible.
- Review gates and feature flags remain mandatory.
- Existing direct commands continue to work when the platform flag is disabled.

## Rollback

Remove the Video Job schema/router/CLI, `.devin/skills/video-producer/`, the specialist profiles (including `existing-video-recut-producer`), and the `VIDEO_AGENT_PLATFORM` flag. Existing episode, HyperFrames, avatar, local source media, and QA paths remain intact.
