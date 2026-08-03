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

- `workflow`: `auto`, `product-promo`, `digital-human`, `faceless-explainer`, `existing-video-recut`, `shorts-repackage`, `embedded-captions`, `pr-video`, `music-video`, `video-translation`, `motion-graphics`, `slideshow`, `remotion-port`
- `source.type`: `topic`, `script`, `product-brief`, `website`, `existing-video`, `github-pr`, `music`, `deck`, `motion-brief`, `remotion-project`
- `presenter.mode`: `none`, `digital-human`; digital-human mode requires an explicit `presenter.provider`
- `video-translation` also requires `presenter.provider` while keeping `presenter.mode=none`
- `render.engine`: `auto`, `remotion`, `hyperframes`
- each review gate: `pending`, `approved`

`job_id` is lowercase kebab-case. `source.subject`, duration, aspect ratio, and language are required. Refs may be empty only when the subject contains the complete source (motion-brief may omit refs).

### Workflow constraints

| workflow | source.type | presenter | renderer |
| --- | --- | --- | --- |
| existing-video-recut | existing-video | none | hyperframes |
| shorts-repackage | existing-video | none | hyperframes |
| embedded-captions | existing-video | none | hyperframes |
| video-translation | existing-video | none + provider | remotion |
| pr-video | github-pr | none | hyperframes |
| music-video | music | none | hyperframes |
| slideshow | deck | none | hyperframes |
| motion-graphics | motion-brief | none | hyperframes |
| remotion-port | remotion-project | none | hyperframes |

`existing-video` must include at least one local file ref. The source file is immutable for recut/shorts-repackage/captions/translation. `shorts-repackage` is explicit-only and requires `output.duration_seconds <= 60`.

## Routing

1. An explicit supported workflow wins when its source, presenter, and renderer constraints are valid.
2. Product brief or website -> product promo.
3. GitHub PR -> pr-video.
4. Music -> music-video.
5. Deck -> slideshow.
6. Remotion project -> remotion-port.
7. Motion brief -> motion-graphics.
8. Existing video -> existing-video recut (shorts repackage, plain captions, and translation require an **explicit** workflow).
9. Digital-human presenter on a non-product source -> digital human.
10. Topic or ordinary script -> faceless explainer.

A product promo with a digital-human presenter keeps `product-promo-producer` as primary and adds `digital-human-presenter` as a delegated capability.

## Ownership

One Job has one primary agent. Only the primary edits shared script, storyboard, render plan, root timeline, and QA report. Delegated agents return bounded files and metadata.

## Approval

Pending script, storyboard, or final-render gates must return to the parent. A subagent cannot approve on the user's behalf.

Paid translation/provider calls require explicit approval; never infer it from a passing check.

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
