# P7 — Shorts Repackage Producer 开发计划

状态：Completed；BIOS `YES-1987` 已关闭为 `done`
日期：2026-08-03
父工单：`YES-549`；P7 工单：`YES-1987`
独立于已关闭的平台工单：`YES-1909`

## 1. 目标

新增 `shorts-repackage-producer`，将已授权的本地长片或成片按经批准的 segment/reframe plan 产出短版本。P7 只接入契约、路由、Agent profile、fixture、测试和 no-render trial；不自动生成任何短片。

## 2. 与既有工作流的边界

| 工作流 | 输入 | 时间轴 | 输出意图 |
| --- | --- | --- | --- |
| `existing-video-recut` | existing-video | 保留源时长与节目音频 | 在源片上添加设计化 overlay |
| `embedded-captions` | existing-video | 保留源片 | 添加普通字幕 |
| `shorts-repackage` | existing-video | 仅按用户批准的 segment plan 提取短段 | 新的短视频版本与可选 reframe |

`shorts-repackage` 必须显式指定 `workflow: shorts-repackage`。`workflow: auto` 与 `source.type: existing-video` 继续稳定路由到 `existing-video-recut`，避免破坏已有默认行为。

## 3. 范围

### In

- 在 Video Job schema、router、host-neutral specialist map、Devin profile 与入口 contract 中加入 `shorts-repackage`。
- 约束：`source.type=existing-video`、`presenter.mode=none`、本地 source ref 非空、`render.engine=auto|hyperframes`、输出时长不超过 60 秒。
- `shorts-repackage-producer` profile：源片不可变、先审批 segment plan、再审批 final render、无明确批准不生成 artifacts。
- fixture、正常/错误/auto-ambiguity 单测。
- 一个只读/no-render trial，验证显式路由、flag on/off、源片 SHA-256 不变、pending gate 停止。

### Out

- 不调用 FFmpeg cut、HyperFrames render、preview、provider、云服务、转写、素材搜索或自动发布。
- 不修改源 MP4、源音频、用户 transcript 或已有 recut/caption artifact。
- 不实现自动找高光、自动剪辑点、自动多版本生成、账号登录、浏览器录屏或 P7 之外的 workflow。
- 不让 `shorts-repackage` 参与 `existing-video` auto route。

## 4. 审核与安全

- 缺少本地源片、rights 证据或已批准 segment plan：`blocked` 或 `needs_approval`。
- `script` gate 用于 source/transcript/segment intent 审核；`storyboard` gate 用于 clip/reframe plan；`final_render` 需独立明文批准。
- 构建前后记录 SHA-256；源片必须保持不变。
- 一个 Job 只有 `shorts-repackage-producer` 一个 primary；任何辅助 worker 只能返回有界 clip plan，不能改源片或共享计划。

## 5. 路由设计

```text
workflow=shorts-repackage + source.type=existing-video
  -> shorts-repackage-producer / hyperframes

workflow=auto + source.type=existing-video
  -> existing-video-recut-producer / hyperframes
```

不新增新 feature flag；继续使用 `FLAGS.VIDEO_AGENT_PLATFORM`，默认关闭。

## 6. 验收

1. 有效的显式 shorts Job 在 flag on 时路由到 `shorts-repackage-producer` / `hyperframes`。
2. flag off 拒绝该 Job。
3. `workflow=auto` + `existing-video` 仍路由到 `existing-video-recut`。
4. 错误 source type、digital-human presenter、空 refs、Remotion engine 或大于 60 秒的输出被明确拒绝。
5. profile、host-neutral map 与 Deven adapter contract 均包含新 primary。
6. no-render trial 不创建工作目录、不调用 provider/render、不改源片，且停在 pending gate。
7. 聚焦 Vitest、typecheck、lint、`make check` 通过。

## 7. 风险与控制

| 风险 | 控制 |
| --- | --- |
| 与 recut 混淆或抢占 auto 路由 | 强制显式 workflow；保留 existing-video auto 行为并测试 |
| 静默修改或重新编码源片 | source SHA-256 前后比对；profile 禁止任何 source write |
| 自动剪辑范围失控 | 不实现 highlight detection；只消费人工批准的 segment plan |
| 未批准出片 | 三个 gate 逐个停住；不执行 render 命令 |
| P7 膨胀为产品 demo/社媒发布 | 禁止账号、浏览器、发布与云服务；超出范围另开工单 |

## 8. 回滚

删除该 workflow 的 schema/router/Agent/profile/fixture/test/documentation 增量即可。现有 11 条路由、自动 existing-video recut、媒体和已关闭 `YES-1909` 的实现均不受影响。
