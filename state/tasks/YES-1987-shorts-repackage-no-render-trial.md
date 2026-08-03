# YES-1987 — Shorts Repackage No-Render Trial Evidence

日期：2026-08-03
父工单：`YES-549`
BIOS：`YES-1987`（`in_review`）

## 范围与约束

本次只验证 `shorts-repackage` 的显式 Job、flag、route、审核门和源片不可变性。未调用 FFmpeg cut、HyperFrames、provider、云服务、转写、preview、render、网络媒体或自动发布。

Fixture：`tests/fixtures/video-jobs/shorts-repackage.yaml`

- `workflow: shorts-repackage`（显式）
- `source.type: existing-video`
- output：30 秒 / 9:16
- gates：`script`、`storyboard`、`final_render` 均为 pending

## Route matrix

启用 flag：

```json
{
  "job_id": "shorts-repackage-trial",
  "workflow": "shorts-repackage",
  "primary_agent": "shorts-repackage-producer",
  "renderer": "hyperframes",
  "provider_requirements": [],
  "delegated_capabilities": [],
  "requires_approval": ["script", "storyboard", "final_render"],
  "reason": "Explicit workflow selected: shorts-repackage"
}
```

关闭 flag：相同 Job 被 `Video Agent Platform is disabled by FLAGS.VIDEO_AGENT_PLATFORM` 拒绝（exit 1）。

## 审核门停止边界

`shorts-repackage-producer` 在 `script` pending 时返回：

```json
{
  "status": "needs_approval",
  "phase": "intake",
  "changed_artifacts": [],
  "verification": [
    "explicit route selected shorts-repackage-producer / hyperframes",
    "script, storyboard, and final_render remain pending",
    "source video and transcript inputs exist"
  ],
  "output": null,
  "next_action": "Obtain explicit approval for source/transcript/segment intent, then separately approve the segment/reframe plan and final render."
}
```

没有创建 `videos/shorts-repackage-trial/`，也未生成短视频、媒体副本、composition、segment plan 或 preview。

## Source immutability

SHA-256 前后相同：

```text
cd9f6009de6bad3024a071b188011bb02cf1afd23e3e17227cf4be61f25b4922  episodes/res/video/HeyGen_out.mp4
276c4f535d70dff9345f7effbb5675a0ee71f1963c8faf0dc53ea9acd673883a  episodes/avatar-human3-reference/captions/reference.srt
```

## 验证

- P7 focused Vitest：29/29 通过。
- `make check`：23 个测试文件、125 个测试与 npm audit（0 vulnerabilities）通过。
- `make verify-harness`：17/17 通过。
- flag on/off CLI matrix：通过。
- source/transcript SHA-256：前后相同。
- 无 output directory、provider、网络、preview 或 render。

## 回滚

删除 P7 workflow 的 schema/router/profile/map/fixture/test/docs 增量和本 evidence 文件即可；现有 `existing-video` auto recut 行为、源媒体和已关闭 `YES-1909` 不受影响。
