# Video Agent 工作流（当前最佳版）

> **权威入口文档。** 人读本节 + [`agents/START_HERE.md`](../agents/START_HERE.md)；Agent 再读 [`agents/video-producer/AGENT.md`](../agents/video-producer/AGENT.md)。  
> 契约冲突时以 `src/schemas/videoJob.ts`、`src/agent/videoRouter.ts` 为准。

BIOS：`YES-549` · 平台：`YES-1909` · Intake：`YES-2031`  
开关：`FLAGS.VIDEO_AGENT_PLATFORM`（默认关；由 Agent 在命令里打开）

---

## 1. 产品一句话

本地优先的多工作流视频生产线：

```text
白话需求 → Intake 草案 → Video Job → 确定性路由 → 唯一 primary → 审核门 → 本地出片
```

**不是**：云 SaaS、浏览器 UI、自动发布、万能导演 Agent。

人只说话；**Agent 自己跑 CLI**（`video:intake` / `video:route` / flag）。不要把命令甩回给用户。

---

## 2. 给人用的最短路径

1. 用 AI 打开本仓库根目录（需 Node / ffmpeg）。
2. 粘贴下面提示词，用白话说要做什么，并给出本地素材路径（若有）。
3. 缺字段时回答追问；确认 Job 草案。
4. Agent 停在审核门时，回复 `批准 storyboard` 或 `批准 final_render`（付费服务再单独批）。
5. 成品一般在 `videos/<项目>/` 或 `episodes/<id>/out/`。源片不会被改写。

### 粘贴即用提示词

```text
Read agents/START_HERE.md and agents/video-producer/AGENT.md.
You run intake, Job file, route, and the specialist yourself.
Ask me only if required fields are missing, or for 批准 storyboard / 批准 final_render / paid providers.
Do not ask me to run npm or FLAG_ commands.

My request: <一句话说明要做什么；有本地素材就写出路径>
```

之后人只需三种回复：补缺字段 · 确认草案 · 批准某一审核门。

---

## 3. Agent 标准回路

```text
用户白话（或已有 Job）
  → 缺字段则追问并停（不发明时长/画幅/语言/路径/provider）
  → 可选自检：npm run video:intake -- --request <request.json>
  → 用户确认草案 → 写 state/jobs/<id>.yaml（gates 全 pending）
  → FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job <job>
  → 以 route JSON 为唯一真相：primary_agent / renderer / requires_approval
  → 只读 agents/video-producer/SPECIALISTS.md 映射的那一个 profile
  → 执行到下一 pending gate → 返回 needs_approval
  → 用户明文批准后恢复同一 Job，继续
```

启用示例（仅当前命令；Agent 执行，不是用户作业）：

```bash
npm run video:intake -- --request tests/fixtures/video-intake/product-promo.json
FLAG_video_agent_platform='{"enabled":true}' \
  npm run video:route -- --job state/jobs/<id>.yaml
```

flag 关闭时必须失败，禁止绕过 flag 直接选 specialist。

---

## 4. Video Job 最小模板

```yaml
job_id: my-job-001
workflow: auto
source:
  type: topic              # 见路由表
  subject: 一句话说明
  refs: []                 # 只填真实本地路径；缺文件 → blocked
output:
  duration_seconds: 60
  aspect_ratio: "16:9"     # 或 "9:16" / "4:5"
  language: zh
presenter:
  mode: none               # 或 digital-human + 显式 provider
render:
  engine: auto             # 或 remotion / hyperframes
review_gates:
  script: pending
  storyboard: pending
  final_render: pending
```

### `workflow: auto` 路由摘要

| 条件 | primary | renderer |
| --- | --- | --- |
| `product-brief` / `website` | product-promo-producer | hyperframes |
| `existing-video` | existing-video-recut-producer | hyperframes |
| `presenter.mode=digital-human`（非产品源） | digital-human-producer | remotion |
| `topic` / 普通 `script` | faceless-explainer-producer | remotion |

显式 `workflow` 优先，但仍须满足该 workflow 的 source / presenter / renderer 约束。  
`existing-video` 自动只走 **recut**；纯字幕 / 译制 / shorts 必须 **显式** workflow。

---

## 5. 十二个专家（一 Job 只跑一个）

完整映射：[`agents/video-producer/SPECIALISTS.md`](../agents/video-producer/SPECIALISTS.md)

| workflow | primary | renderer | 备注 |
| --- | --- | --- | --- |
| product-promo | product-promo-producer | hyperframes | 产品 brief / 网站 |
| digital-human | digital-human-producer | remotion | 须 `presenter.provider` |
| faceless-explainer | faceless-explainer-producer | remotion | topic / 讲解；工作区 `episodes/` |
| existing-video-recut | existing-video-recut-producer | hyperframes | 设计化叠加；源片只读 |
| shorts-repackage | shorts-repackage-producer | hyperframes | 仅显式 workflow |
| embedded-captions | embedded-captions-producer | hyperframes | 须显式 |
| video-translation | video-translation-producer | remotion | 须显式 + provider |
| pr-video | pr-video-producer | hyperframes | GitHub PR |
| music-video | music-video-producer | hyperframes | 音乐 |
| motion-graphics | motion-graphics-producer | hyperframes | motion brief |
| slideshow | slideshow-producer | hyperframes | 幻灯片 |
| remotion-port | remotion-port-producer | hyperframes | Remotion 工程移植 |

经典无脸讲解流水线（Remotion）：

```text
brief → script → storyboard → render-plan → voice → captions → Remotion MP4 → QA
```

---

## 6. 审核门（必须停）

用户没说「批准 X」时，不得把 `pending` 当 `approved`。

| gate | 含义 | Agent 行为 |
| --- | --- | --- |
| `script` | 脚本 / transcript | `needs_approval` |
| `storyboard` | 分镜 / overlay plan / render-plan | 同上 |
| `final_render` | 最终预览或出片 | 未批准前禁止成片与付费调用 |

识别话术示例：`批准 storyboard` · `批准 overlay plan` · `批准 final_render` · `可以出片`。  
批准后只推进该门；其他 pending 门继续卡住。付费 / 云 provider 必须对应该门明文批准。

---

## 7. 结果协议

每次收工只返回一个 JSON：

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

- `needs_approval`：写清要批哪一个 gate  
- `blocked`：写清缺文件 / 权利 / 配置  
- `failed`：只贴真实命令与错误摘要  
- 禁止无证据声称「已渲染 / 已调 API / 已更新 BIOS」

---

## 8. 安全红线

- 不硬编码密钥；不提交 `.env`、生成视频、生成音频  
- 不刮未授权素材；无 rights 不克隆真人声音/形象  
- 不自动发布；不静默付费  
- existing-video / captions / translation：**源片 immutability**（SHA 前后一致）  
- 不降低 `npm audit` 门禁

---

## 9. 仓库内权威路径

| 层 | 路径 |
| --- | --- |
| 人用入口 | `agents/START_HERE.md` |
| 入口 Agent | `agents/video-producer/AGENT.md` |
| Specialist 映射 | `agents/video-producer/SPECIALISTS.md` |
| Intake 规则 | `agents/video-job-intake/AGENT.md` |
| Job schema | `src/schemas/videoJob.ts` |
| Intake schema | `src/schemas/videoIntake.ts` |
| 路由 | `src/agent/videoRouter.ts` |
| CLI | `npm run video:intake` · `npm run video:route` |
| Devin 薄适配 | `.devin/skills/video-producer/` · `.devin/agents/*-producer.md` |
| Fixtures | `tests/fixtures/video-jobs/` · `tests/fixtures/video-intake/` |

### 相关文档（细节展开）

| 文档 | 用途 |
| --- | --- |
| [`VIDEO_AGENT_PLATFORM_QUICKSTART.md`](./VIDEO_AGENT_PLATFORM_QUICKSTART.md) | 人用三分钟版 |
| [`VIDEO_AGENT_PLATFORM_AGENT_USAGE.md`](./VIDEO_AGENT_PLATFORM_AGENT_USAGE.md) | Agent 完整手册 |
| [`VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md`](./VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md) | 平台边界与阶段 |
| [`VIDEO_JOB_INTAKE_P8_DEVELOPMENT_PLAN.md`](./VIDEO_JOB_INTAKE_P8_DEVELOPMENT_PLAN.md) | Intake 开发计划 |
| [`HANDOFF_PACKAGE.md`](../HANDOFF_PACKAGE.md) | 最近一次入口简化接力 |

---

## 10. 交接自检

开始前：

- [ ] 已读本文件 + `agents/video-producer/AGENT.md`
- [ ] flag 将由 Agent 显式启用
- [ ] Job 经 `video:route` 得到唯一 `primary_agent`
- [ ] 清楚当前 pending gates；无静默付费计划

结束时：

- [ ] 只返回一个结构化结果
- [ ] 未批准的门仍为 pending
- [ ] `verification` 有命令证据
- [ ] recut 类任务源片 SHA 未变
