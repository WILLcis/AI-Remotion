# 多工作流视频 Agent 平台架构

状态：Accepted for incremental implementation
日期：2026-07-31
BIOS：`YES-1909`，父工单 `YES-549`

## 1. 背景

AI-Remotion 最初以图文讲解视频为核心，正式流水线是：

```text
brief -> script -> storyboard -> render-plan -> voiceover -> captions -> Remotion MP4 -> QA report
```

仓库现已出现三类边界明显不同的生产路径：

1. 图文讲解：结构化 episode artifacts + Remotion。
2. 产品宣传片：产品 brief、实机截图、HyperFrames 场景 composition、独立字幕时间线和本地渲染。
3. 数字人口播：脚本、授权材料、TTS、头像 provider、口型同步、Remotion 后处理与 QA。

它们共享脚本、媒体登记、语音、字幕、渲染检查和 revision routing，但输入、创意判断、provider、渲染器、审核风险和失败模式不同。继续扩展单个万能 Agent 会导致上下文污染、权限过宽和难以测试；完全独立的 Agent 又会重复实现共享能力。

## 2. 目标

- 对调用方提供一个稳定的视频生产入口。
- 内部按完整工作流拆分专业 Agent。
- 用共享 Skills、schema 和 CLI 复用确定性能力。
- 一个任务只有一个 primary agent，避免多个 Agent 同时改共享 artifact。
- 保留脚本、storyboard、render plan 和最终渲染审核门。
- 支持 Remotion、HyperFrames 和受控 provider，而不强行统一各自内部 storyboard。
- 默认本地、可复现、可局部修订、可失败回退。

## 3. 非目标

- 不建设浏览器 UI、云队列、对象存储或自动发布。
- 不把每个 TTS、字幕或 FFmpeg 命令做成独立 Agent。
- 不统一 Remotion JSON、HyperFrames Markdown/HTML 和 HeyGen provider manifest 的内部格式。
- 不默认调用付费 provider。
- 不在无授权时克隆声音或生成真人形象。

## 4. 方案比较

| 方案 | 优点 | 问题 | 结论 |
| --- | --- | --- | --- |
| 单个万能 Agent | 初期入口简单 | Prompt 持续膨胀；路由、权限和审核规则互相污染；难以独立测试 | 不采用 |
| 完全独立的多个 Agent | 隔离清楚 | 调用方必须理解全部工作流；共享能力重复；组合视频难处理 | 不单独采用 |
| 路由器 + 专业 Agent | 入口统一、专业边界清楚 | 仍需共享契约，否则会重复实现 | 作为上层结构 |
| 路由器 + 专业 Agent + 共享 Skills/CLI | 同时获得统一入口、隔离、复用和可测试性 | 初期需要定义 Job 契约和 ownership | 采用 |

## 5. 决策

采用以下分层：

```text
调用方 Agent
    |
    v
video-producer Skill（轻量入口，在根会话执行）
    |
    +-- product-promo-producer
    +-- digital-human-producer
    +-- faceless-explainer-producer
            |
            v
共享 schema / Skills / CLI / provider adapters / QA
```

入口使用 Skill 而不是再启动一层 router subagent，原因是产品宣传片内部还需要 frame workers。这样最大嵌套深度保持为：

```text
root -> specialist -> bounded worker
```

而不是：

```text
root -> router -> specialist -> worker
```

## 6. 专业 Agent 边界

### 6.1 `product-promo-producer`

拥有产品宣传片的故事、场景、最终时间线和 QA。

- 输入：产品 brief、网站或本地产品截图、品牌约束、目标平台。
- 主要工作流：HyperFrames `product-launch-video`。
- 默认渲染器：HyperFrames。
- 可分派：每个 frame 一个有界 worker。
- 写入范围：自己的 `videos/<project>/` 或明确 episode 项目目录。
- 审核门：storyboard、最终 preview、render。
- 禁止：编造产品事实、在线抓取未授权素材、覆盖用户审核过的旁白。

### 6.2 `digital-human-producer`

拥有纯数字人口播任务，或作为其他 primary agent 的有界素材生产者。

- 输入：脚本、头像/参考音频、rights artifact、provider 选择和构图要求。
- provider：本地头像服务或显式启用的 HeyGen 等 provider。
- 默认后处理：Remotion + FFmpeg/ffprobe。
- 输出：主持人视频、时间戳、provider manifest、QA 证据。
- 审核门：rights、付费/云 provider、最终 render。
- 禁止：无授权克隆、把密钥写入仓库、静默降级为错误 provider。

### 6.3 `faceless-explainer-producer`

拥有知识讲解、软件教程、教育短视频和无主持人的图文视频。

- 输入：topic、source notes、结构化 brief。
- 工作流：episode script -> storyboard -> render plan -> voice -> captions -> Remotion -> QA。
- 默认渲染器：Remotion。
- 写入范围：自己的 `episodes/<episode-id>/`。
- 审核门：script、render plan、final render。
- 禁止：未标记的不确定事实、无关 artifact 重生成。

## 7. Primary Agent 与组合能力

每个 Job 只有一个 `primary_agent`。组合需求通过有界委派处理：

```yaml
primary_agent: product-promo-producer
delegated_capability:
  agent: digital-human-producer
  output:
    - presenter-video.mp4
    - presenter-metadata.json
    - word-timestamps.json
```

委派 Agent 只返回约定产物；primary agent 独占共享 script、storyboard、主时间线、render plan 和 QA report 的写权限。

## 8. 顶层 Video Job 契约

顶层契约只统一路由所需信息：

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

契约不替代各工作流已有的 `brief.yaml`、`STORYBOARD.md`、`render-plan.json`、HyperFrames composition 或 provider manifest。

## 9. 路由规则

按以下优先级确定 primary agent：

1. 用户显式指定受支持 workflow 时尊重指定值。
2. `product-brief` 或 `website` -> `product-promo-producer`。
3. `presenter.mode=digital-human` -> `digital-human-producer`。
4. `topic` 或普通 `script` -> `faceless-explainer-producer`。
5. 无法唯一判断时返回结构化错误，不猜测、不进入生产。

产品宣传片带数字人时，产品宣传片仍是 primary；数字人作为 delegated capability。

## 10. 共享能力边界

以下能力是 Skill、库函数或 CLI，不单独建人格 Agent：

- schema 校验和 Job 路由
- brief/script/storyboard 基础格式
- media provenance
- TTS 和音频时长测量
- captions
- Remotion/HyperFrames render adapter
- FFmpeg/ffprobe
- QA report
- revision routing
- provider configuration

## 11. Feature Flag

平台入口受 `FLAGS.VIDEO_AGENT_PLATFORM` 控制，默认 `false`。

```text
FLAG_video_agent_platform={"enabled":false}
```

灰度顺序：team only -> 5% -> 25% -> 100%。kill switch 将 `enabled` 设为 `false`。关闭后仅阻止新 Job 路由，不破坏现有 episode、video composition 或直接 CLI。

## 12. 安全和审核

- 付费或云 provider 必须显式选择，并遵守现有 provider flag。
- 数字人必须先验证 rights artifact。
- 子 Agent 不能直接向用户提问；遇到审核门返回 `needs_approval` 给父 Agent。
- 不提交生成视频、音频、snapshot、密钥或本地端点。
- 缺少本地素材时必须失败，不得以占位静默完成。
- 同一个 Job 的共享 artifact 只允许 primary agent 修改。

## 13. 失败与恢复协议

专业 Agent 返回：

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

父 Agent 使用原 subagent 会话恢复，不从头重跑已通过阶段。

## 14. 风险与缓解

- **Wrong Abstraction**：只统一顶层 Job，不统一内部 storyboard。
- **上下文污染**：每个专业 Agent 只加载自己的 workflow 和规则。
- **并发冲突**：primary agent 独占共享 artifact；frame workers 只写分配文件。
- **成本膨胀**：路由留在根 Skill；仅真正独立的场景并行。
- **provider 漂移**：provider adapters 和 feature flags 保持独立。
- **渲染器分裂**：用共同 QA/output contract 收敛，不强行统一源码格式。

## 15. 回滚边界

删除 `.devin/skills/video-producer/`、三个 `.devin/agents/*.md`、Video Job schema/router/CLI 和 `VIDEO_AGENT_PLATFORM` flag 即可回滚。现有 episode、HyperFrames 项目、数字人 provider 和直接命令保持不变。
