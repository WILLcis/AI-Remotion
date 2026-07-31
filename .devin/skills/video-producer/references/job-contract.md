# Video Job contract

The canonical executable schema is `src/schemas/videoJob.ts`. This reference explains how an agent supplies it.

## Input

```yaml
job_id: deepdog-launch-001
workflow: auto
source:
  type: product-brief
  subject: deepdog 产品宣传片
  refs:
    - briefs/deepdog.md
output:
  duration_seconds: 60
  aspect_ratio: 16:9
  language: zh
presenter:
  mode: none
render:
  engine: auto
review_gates:
  script: approved
  storyboard: approved
  final_render: pending
```

## Supported values

- `workflow`: `auto`, `product-promo`, `digital-human`, `faceless-explainer`
- `source.type`: `topic`, `script`, `product-brief`, `website`
- `presenter.mode`: `none`, `digital-human`; digital-human mode requires an explicit `presenter.provider`
- `render.engine`: `auto`, `remotion`, `hyperframes`
- each review gate: `pending`, `approved`

`job_id` is lowercase kebab-case. `source.subject`, duration, aspect ratio, and language are required. Refs may be empty only when the subject contains the complete source.

## Routing

1. An explicit supported workflow wins.
2. Product brief or website -> product promo.
3. Digital-human presenter on a non-product source -> digital human.
4. Topic or ordinary script -> faceless explainer.

A product promo with a digital-human presenter keeps `product-promo-producer` as primary and adds `digital-human-presenter` as a delegated capability.

## Ownership

One Job has one primary agent. Only the primary edits shared script, storyboard, render plan, root timeline, and QA report. Delegated agents return bounded files and metadata.

## Approval

Pending script, storyboard, or final-render gates must return to the parent. A subagent cannot approve on the user's behalf.

## Result

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
