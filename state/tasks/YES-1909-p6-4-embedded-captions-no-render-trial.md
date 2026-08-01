# P6.4 — Embedded Captions 无付费 No-Render Trial Evidence

日期：2026-08-01
关联：`YES-1909`；P6：`YES-1923`；BIOS 子工单创建 blocker 见 `state/tasks/YES-1909-p6-4-audit-and-no-render-trial.md`

## 范围与约束

本次仅验证 `embedded-captions` 的 route、输入完整性、审核门和 source immutability。未调用 HyperFrames render、Remotion render、provider、云 HyperFrames、HeyGen、转写服务或任何付费 API。

输入 fixture：`tests/fixtures/video-jobs/embedded-captions.yaml`

- source video：`episodes/res/video/HeyGen_out.mp4`
- approved transcript input：`episodes/avatar-human3-reference/captions/reference.srt`
- review gates：`script=pending`、`storyboard=pending`、`final_render=pending`

fixture 在 P6.4 增加 transcript ref，避免 captions trial 隐式依赖工作树中未声明的输入。

## Route matrix

启用 flag：

```bash
FLAG_video_agent_platform='{"enabled":true}' \
  npm run video:route -- --job tests/fixtures/video-jobs/embedded-captions.yaml
```

结果：

```json
{
  "job_id": "embedded-captions-trial",
  "workflow": "embedded-captions",
  "primary_agent": "embedded-captions-producer",
  "renderer": "hyperframes",
  "provider_requirements": [],
  "delegated_capabilities": [],
  "requires_approval": ["script", "storyboard", "final_render"],
  "reason": "Explicit workflow selected: embedded-captions"
}
```

关闭 flag：同一命令以 `Video Agent Platform is disabled by FLAGS.VIDEO_AGENT_PLATFORM` 失败（exit 1）。

## Specialist stop boundary

`embedded-captions-producer` profile 要求：缺失 source/rights 时 `blocked`；任一 script、caption-plan 或 final-render gate pending 时返回 `needs_approval`。本 job 保持三个 gate pending，因此 trial 在 plan 前停住：

```json
{
  "status": "needs_approval",
  "phase": "intake",
  "changed_artifacts": [],
  "verification": [
    "route selected embedded-captions-producer / hyperframes",
    "source video and transcript inputs exist",
    "all review gates remain pending"
  ],
  "output": null,
  "next_action": "Obtain explicit approval for transcript/script and caption plan; final render requires separate explicit approval."
}
```

这是基于已验证的 Job、route 和 repository profile 的受控停止结果；未越过审核门实际创建 composition、字幕或 work directory。

## Source immutability

SHA-256（trial 前后相同）：

```text
cd9f6009de6bad3024a071b188011bb02cf1afd23e3e17227cf4be61f25b4922  episodes/res/video/HeyGen_out.mp4
276c4f535d70dff9345f7effbb5675a0ee71f1963c8faf0dc53ea9acd673883a  episodes/avatar-human3-reference/captions/reference.srt
```

`videos/embedded-captions-trial/` 不存在。没有创建输出、媒体复制、字幕文件或任何渲染工作目录。

## 最小后续变更边界

在用户明确批准 script/transcript 和 caption plan 后，primary agent 才可在独立 `videos/<project>/` 目录创建 caption composition 和字幕 artifact。源 MP4、源 transcript 与无关 episode/video artifacts 必须保持不变。最终 preview 或 render 必须使用独立的 `final_render` 明文批准。

## 验证

- flag on/off CLI matrix：通过。
- source/transcript SHA-256：前后相同。
- P5 local render work directory：已被精确 Git 忽略，不参与本次 trial。
- 未执行 render/provider 命令。

## 回滚

删除此 evidence 文件并从 fixture 移除 transcript ref，即可回到 P6.4 之前的契约测试输入；不影响 schema、router、Agent profile、源媒体或 P5 本地工作目录。
