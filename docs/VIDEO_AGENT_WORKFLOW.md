# Video Agent 工作流（当前最佳版）

> **Agent 统一入口是 [`AGENTS.md`](../AGENTS.md)。** 本文件在它的「必读清单」里，应已按顺序读完。给人粘贴：[`agents/START_HERE.md`](../agents/START_HERE.md)；执行细则：[`agents/video-producer/AGENT.md`](../agents/video-producer/AGENT.md)。  
> 契约冲突时以 `src/schemas/videoJob.ts`、`src/agent/videoRouter.ts` 为准。

BIOS：`YES-549` · 平台：`YES-1909` · Intake：`YES-2031`  
开关：`FLAGS.VIDEO_AGENT_PLATFORM`（默认关；由 Agent 在命令里打开）

---

## 1. 产品一句话

本地优先的多工作流视频生产线：

```text
白话需求 → Intake 草案 → Video Job → 确定性路由 → 唯一 primary → 审核门 → 本地出片
```

**不是**：云 SaaS、浏览器 UI、万能导演 Agent。  
**发布**：默认不自动发布。人审后见 [`VIDEO_PUBLISH.md`](./VIDEO_PUBLISH.md)（实现 `YES-2520`）与 [`MULTI_PLATFORM_PUBLISH_DESIGN.md`](./MULTI_PLATFORM_PUBLISH_DESIGN.md)（设计 `YES-2498`）。flag 默认关。  
例外：用户选定 `generation.service=dreamina` 即视为同意生成并发布，不再停审稿/付费/发布门。

人只说话；**Agent 自己跑 CLI**（先 `npm run setup`，再 `video:intake` / `video:route` / `video:hotspot` / flag）。不要把命令甩回给用户。非技术用户把文件夹交给 Agent：见 [`GIVE_TO_AGENT.md`](./GIVE_TO_AGENT.md)。

热点口播：用户定类型与定时 → RSS 爬虫或 Agent 检索 → **LLM 精修**口播（并去掉即梦 TNS 高危词）→ `human-vo` 只交文案（用户自己录）/ `digital-human` 即梦封面 + `multimodal2video`（封面作第一帧、锁脸、音色、口播在 `{对白}`；默认 `seedance2.0mini`），然后发布。**没开定时、Agent 当场出片也走同一条管线**（`media:dreamina talking-head`），禁止裸 `text2video`。单条 TNS 失败写入 `questions`，不阻断其他 clip。常驻：`npm run hotspot:watch`。见 [`VIDEO_HOTSPOT.md`](./VIDEO_HOTSPOT.md)。

**「用我的形象做口播」= 即梦数字人，不是 HeyGen。** 只有人点名 HeyGen 才走 HeyGen。

---

## 2. 给人用的最短路径

1. 用 Cursor（或同类 Agent）打开本仓库根目录。非技术用户见 [`GIVE_TO_AGENT.md`](./GIVE_TO_AGENT.md)。
2. 粘贴下面提示词，用白话说要做什么，并给出本地素材路径（若有）。Agent 先跑 `npm run setup`。
3. 缺字段、未登录即梦、或缺 API 密钥时，用一句话回答即可。
4. Agent 停在审核门时，回复 `批准 storyboard` 或 `批准 final_render`（HeyGen 等付费服务再单独批）。选了即梦则无需这些批准，Agent 直接生成并发布。
5. 成品一般在 `videos/<项目>/` 或 `episodes/<id>/out/`。源片不会被改写。

### 粘贴即用提示词

```text
先读 AGENTS.md 全文，再按里面的「必读清单」把列出的文档按顺序一次读完，然后 npm run setup。不要跳过清单。
Do not ask me to run npm, brew, curl, or FLAG_ commands.
You run intake, Job file, route, and the specialist yourself.
我的形象 / 口播 / 数字人走即梦，不要先看 HeyGen，也不要问四选一 generation.service。
图文讲解（非出镜口播）才问 generation.service: remotion | hyperframes | heygen | dreamina.
Ask me only if required fields are missing, or for 批准 storyboard / 批准 final_render / paid HeyGen (not needed if I chose dreamina). Auto-post Weixin/XHS needs 批准RPA this session.

My request: <一句话说明要做什么；有本地素材就写出路径>
```

之后人只需三种回复：补缺字段 · 确认草案 · 批准某一审核门。

---

## 3. Agent 标准回路

```text
用户白话（或已有 Job）
  → 「我的形象 / 口播 / 数字人」→ 即梦 hotspot identity，不问 generation.service，不打开 HeyGen
  → 图文讲解才追问 generation.service：remotion | hyperframes | heygen | dreamina
  → 缺字段则追问并停（不发明时长/画幅/语言/路径/provider）
  → 可选自检：npm run video:intake -- --request <request.json>
  → 用户确认草案 → 写 state/jobs/<id>.yaml（gates 默认 pending；dreamina 则全部 approved）
  → FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job <job>
  → 以 route JSON 为唯一真相：primary_agent / renderer / requires_approval
  → 只读 agents/video-producer/SPECIALISTS.md 映射的那一个 profile
  → dreamina 口播：requires_approval 为空，立即 media:dreamina talking-head（封面 image2image → @Image 1 第一帧 → 提示词字幕），再 video:publish --platform all --generation-service dreamina --cover。禁止 text2video / 单图 multimodal2video
  → 其他服务：执行到下一 pending gate → 返回 needs_approval
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
generation:
  service: remotion        # 必选：remotion | hyperframes | heygen | dreamina
review_gates:
  script: pending
  storyboard: pending
  final_render: pending
```

**合成服务必问用户（禁止默认；选定后整条链路独占）：**

| `generation.service` | 最终成片 | TTS |
| --- | --- | --- |
| `remotion` | 只走 Remotion | 项目 TTS（`AI_REMOTION_TTS_*`，常用 CosyVoice 3） |
| `hyperframes` | 只走 HyperFrames | 同上，项目 TTS / CosyVoice 3 |
| `heygen` | 只走 HeyGen，最终 MP4=HeyGen 下载件 | 默认 HeyGen 自带音色；仅用户明确要求才 CosyVoice 换轨 |
| `dreamina` | 只走即梦 CLI，最终 MP4=dreamina 下载件 | 默认即梦侧音频；不走项目 CosyVoice，除非用户明确要求换轨。选定即梦=立即生成并发布，无审稿门 |

Intake 缺 `generation_service` 时返回 `needs_clarification`，并列出上述选项。`video:route` 结果里的 `renderer` / `tts_policy` 必须服从该选择。

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

**即梦例外：** `generation.service=dreamina` 时 gates 全部 approved，`requires_approval` 为空。Agent 不得再要审稿/付费/发布批准，直接生成并 `video:publish --platform all --generation-service dreamina`。

| gate | 含义 | Agent 行为 |
| --- | --- | --- |
| `script` | 脚本 / transcript | `needs_approval` |
| `storyboard` | 分镜 / overlay plan / render-plan | 同上 |
| `final_render` | 最终预览或出片 | 未批准前禁止成片与付费调用 |
| `publish` | 多平台发布 | 未批准前禁止 `video:publish`（dreamina 除外） |

识别话术示例：`批准 storyboard` · `批准 overlay plan` · `批准 final_render` · `可以出片` · `批准发布`。  
批准后只推进该门；其他 pending 门继续卡住。付费 / 云 provider 必须对应该门明文批准（dreamina 除外：选定即同意）。

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
- 不静默发布；须 `批准发布` + `--i-approve-publish`（**dreamina 除外**：选定即梦即发布同意）。视频号/小红书 **RPA 另须** `批准RPA` + `FLAG_video_publish_rpa` + `--i-accept-rpa-risk`。契约：[`VIDEO_PUBLISH.md`](./VIDEO_PUBLISH.md)。即梦出片 **不等于** 批准 RPA。RPA 用本机 Chrome 持久登录，等到「发表成功/发布成功」才算已提交；夜间不发。
- 不静默付费（**dreamina 除外**：选定即梦即付费同意）  
- existing-video / captions / translation：**源片 immutability**（SHA 前后一致）  
- 不降低 `npm audit` 门禁
- **不改仓库源码**（`src/`、`tests/`、`flags/`、文档）。出片/发布只跑 CLI。除非人当次明确说改代码。

---

## 9. 仓库内权威路径

| 层 | 路径 |
| --- | --- |
| Agent 统一入口 | 根目录 `AGENTS.md`（必读清单，一次读完） |
| 人用粘贴 | `agents/START_HERE.md` |
| 出片执行 | `agents/video-producer/AGENT.md` |
| Specialist 映射 | `agents/video-producer/SPECIALISTS.md` |
| Intake 规则 | `agents/video-job-intake/AGENT.md` |
| Job schema | `src/schemas/videoJob.ts` |
| Intake schema | `src/schemas/videoIntake.ts` |
| 路由 | `src/agent/videoRouter.ts` |
| CLI | `npm run video:intake` · `npm run video:route` · `npm run video:hotspot` |
| Devin 薄适配 | `.devin/skills/video-producer/` · `.devin/agents/*-producer.md` |
| Fixtures | `tests/fixtures/video-jobs/` · `tests/fixtures/video-intake/` |

### 相关文档（细节展开）

| 文档 | 用途 |
| --- | --- |
| [`VIDEO_AGENT_PLATFORM_QUICKSTART.md`](./VIDEO_AGENT_PLATFORM_QUICKSTART.md) | 人用三分钟版 |
| [`VIDEO_AGENT_PLATFORM_AGENT_USAGE.md`](./VIDEO_AGENT_PLATFORM_AGENT_USAGE.md) | 出片细节展开（入口仍是 `AGENTS.md`） |
| [`VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md`](./VIDEO_AGENT_PLATFORM_PROJECT_BRIEF.md) | 平台边界与阶段 |
| [`VIDEO_JOB_INTAKE_P8_DEVELOPMENT_PLAN.md`](./VIDEO_JOB_INTAKE_P8_DEVELOPMENT_PLAN.md) | Intake 开发计划 |
| [`VIDEO_HOTSPOT.md`](./VIDEO_HOTSPOT.md) | 全网热点 → LLM 精修口播 / 数字人即梦成片 / 常驻 RSS 爬虫 |
| [`VIDEO_PUBLISH.md`](./VIDEO_PUBLISH.md) | 多平台发布；视频号/小红书 RPA 给 Agent 的操作契约 |

---

## 10. 交接自检

开始前：

- [ ] 已从 `AGENTS.md` 进来，并按「必读清单」把列出的文档一次读完
- [ ] 若要自动发视频号/小红书：已读 `docs/VIDEO_PUBLISH.md`；人已当次说「批准RPA」才加 `--i-accept-rpa-risk`
- [ ] flag 将由 Agent 显式启用
- [ ] Job 经 `video:route` 得到唯一 `primary_agent`
- [ ] 清楚当前 pending gates；无静默付费计划

结束时：

- [ ] 只返回一个结构化结果
- [ ] 未批准的门仍为 pending
- [ ] `verification` 有命令证据
- [ ] recut 类任务源片 SHA 未变
