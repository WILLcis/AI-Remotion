# ADR-001: CLI-First, Local Rendering, And Canonical Demo

## Status
Accepted

## Date
2026-07-07

## Context
AI-Remotion is still stabilizing its core production loop:

```text
brief -> script -> storyboard -> render-plan -> voiceover -> captions -> Remotion MP4 -> QA report
```

The project needs a clear near-term product shape, a rendering boundary, and a public sample topic that demonstrates the product without introducing extra infrastructure.

## Decision
Keep the product CLI/Agent-first in the short term. Do not build a browser UI until the artifact workflow, revision routing, provider configuration, and render QA are stable.

Continue rendering locally with Remotion. Do not add cloud rendering, queueing, hosted storage, or paid rendering infrastructure for the MVP.

Use `episodes/sample` as the canonical public demo with the topic:

```text
普通人如何理解 Remotion，以及 AI-Remotion 如何生成图文讲解视频
```

The canonical demo should explain both Remotion and AI-Remotion's own structured production line.

## Alternatives Considered

### Small Browser UI Now
- Pros: Easier for non-technical users to discover the flow.
- Cons: Adds state management, file editing UX, preview coordination, and browser testing before the core workflow is stable.
- Rejected: A UI would multiply surface area before the CLI/Agent workflow has earned it.

### Cloud Rendering Now
- Pros: Better for long videos and batch rendering later.
- Cons: Requires account setup, billing, queueing, object storage, retry behavior, and operational monitoring.
- Rejected: Local rendering is simpler, cheaper, and sufficient for the current sample and MVP workflow.

### Generic External Demo Topic
- Pros: Could look less self-referential.
- Cons: Would not demonstrate why AI-Remotion exists or how the artifact pipeline works.
- Rejected: A self-explaining demo is the clearest first public proof of the project.

## Consequences
- Commands, README examples, CI, and tests should keep `episodes/sample` as the default demo path.
- Agents should not introduce browser UI or cloud rendering unless the user explicitly reopens those decisions.
- Render output remains reproducible from local files and a schema-valid render plan.
- The canonical demo becomes a living fixture: changes to it should preserve script, storyboard, render-plan, captions, render, and QA alignment.
