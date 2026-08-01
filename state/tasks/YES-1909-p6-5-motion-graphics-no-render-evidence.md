# P6.5 — Motion Graphics 免费 No-Render Trial Evidence

日期：2026-08-01
关联：`YES-1909`；P6：`YES-1923`；BIOS 建单 blocker 见 `state/tasks/YES-1909-p6-5-motion-graphics-no-render-trial.md`

## 范围与约束

本次只验证 `motion-graphics` 的 auto route、feature flag 与审核门停止协议。没有执行 HyperFrames skill 安装、composition authoring、preview、render、网络请求、外部媒体、TTS、provider 或付费 API。

输入 fixture：`tests/fixtures/video-jobs/motion-graphics.yaml`

- `workflow: auto`
- `source.type: motion-brief`
- subject：`品牌 Logo sting 3 秒`
- duration：3 秒
- `script: approved`
- `storyboard: pending`
- `final_render: pending`

## Route matrix

启用 flag：

```bash
FLAG_video_agent_platform='{"enabled":true}' \
  npm run video:route -- --job tests/fixtures/video-jobs/motion-graphics.yaml
```

结果：

```json
{
  "job_id": "motion-graphics-trial",
  "workflow": "motion-graphics",
  "primary_agent": "motion-graphics-producer",
  "renderer": "hyperframes",
  "provider_requirements": [],
  "delegated_capabilities": [],
  "requires_approval": ["storyboard", "final_render"],
  "reason": "Source type motion-brief uses the short motion-graphics pipeline"
}
```

关闭 flag：同一 Job 被 `Video Agent Platform is disabled by FLAGS.VIDEO_AGENT_PLATFORM` 拒绝（exit 1）。

## Specialist 停止边界

`motion-graphics-producer` 仅拥有短时、无旁白的 motion storyboard、composition 与 QA。profile 规定 pending `storyboard` 或 `final_render` 时返回 `needs_approval`。当前 Job 因 storyboard pending 停在如下结构化结果：

```json
{
  "status": "needs_approval",
  "phase": "plan",
  "changed_artifacts": [],
  "verification": [
    "auto route selected motion-graphics-producer / hyperframes",
    "no provider requirements",
    "storyboard and final_render remain pending"
  ],
  "output": null,
  "next_action": "Obtain explicit approval for the motion storyboard; final render requires a separate explicit approval."
}
```

该结果由已验证的 Job、route 与 repository profile 决定；未调用 specialist authoring command，因此未创建 composition 或媒体。

## 不变性与产物边界

- `videos/motion-graphics-trial/` 不存在。
- fixture 无外部 refs，未访问网络或请求素材。
- 没有生成 MP4、音频、图片、HTML、storyboard 或 preview。
- 没有 provider requirement，也未触发付费调用。

## 最小后续变更边界

用户明确批准 motion storyboard 后，唯一 primary 可在独立 `videos/<project>/` 下创建 composition。最终 preview/render 需要单独、当时有效的 `final_render` 明文批准。该变更不得影响现有 episode、P5 recut source 或其他 video job artifacts。

## 验证

- flag on/off CLI matrix：通过。
- `videos/motion-graphics-trial/` 不存在：通过。
- 未执行任何 render/provider/network 命令。

## 回滚

删除此 evidence 文件、P6.5 计划和 BIOS 降级记录即可；不影响 schema、router、fixture、Agent profile、媒体或现有工作流。
