# Video Agent Platform — Agent 使用手册

面向：任何接手 AI-Remotion 视频生产的 coding / specialist agent。
目标：按 Video Job 路由到正确专业 Agent，在审核门处停住，不越权、不付费、不毁源片。

BIOS 父线：`YES-549` · 平台工单：`YES-1909` · Recut：`YES-1920` · P6：`YES-1923`
开关：`FLAGS.VIDEO_AGENT_PLATFORM`（默认 **关闭**）

非开发用户先读：`docs/VIDEO_AGENT_PLATFORM_QUICKSTART.md`
P6 计划 / 相邻 backlog：`docs/VIDEO_AGENT_PLATFORM_P6_DEVELOPMENT_PLAN.md` · `docs/VIDEO_AGENT_PLATFORM_BACKLOG.md`

---

## 0. 开场必读（60 秒）

1. 读仓库根 `AGENTS.md`。
2. 读本文件。
3. 读入口 Skill：`.devin/skills/video-producer/SKILL.md` + `references/job-contract.md`。
4. 读将要 dispatch 的那一个 `.devin/agents/<primary>.md`。
5. **不要**跳过 flag、不要直接当万能视频 Agent 干活。

权威实现：

| 层 | 路径 |
| --- | --- |
| Job/Route schema | `src/schemas/videoJob.ts` |
| 路由 | `src/agent/videoRouter.ts` |
| CLI | `npm run video:route -- --job <path>` |
| 入口 Skill | `.devin/skills/video-producer/` |
| 专业 Agent | `.devin/agents/*-producer.md` |
| Fixtures | `tests/fixtures/video-jobs/*.yaml` |

---

## 1. 你是谁、你不是谁

你是 **入口调度者** 或 **某一个 primary specialist**，二者择一：

| 角色 | 做什么 | 不做什么 |
| --- | --- | --- |
| 入口（`video-producer`） | 校验 Job、开 flag、跑路由、dispatch **唯一** primary、转发 `needs_approval` | 自己写 storyboard / 自己 render / 开第二个 primary |
| Primary specialist | 拥有本工作流共享 artifact，执行到下一审核门 | 替用户批准；改别的工作流目录；静默付费调用 |

**一个 Job = 一个 primary_agent。** 数字人若挂在产品片下，只能作为 delegated capability，不得改产品片共享时间线。

---

## 2. 标准执行回路

```text
用户意图 / Job 文件
    -> 确认 VIDEO_AGENT_PLATFORM 已启用
    -> 规范化或加载 Video Job
    -> npm run video:route -- --job <file>
    -> 读取 primary_agent / renderer / requires_approval
    -> 加载对应 .devin/agents/<primary>.md
    -> 执行到下一 pending gate 或 blocked/failed/done
    -> 返回结构化 JSON 结果
    -> 若 needs_approval：停，把 gate 原样交给用户
    -> 用户明确批准后：恢复同一 Job，继续下一阶段
```

启用 flag（仅当前命令）：

```bash
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job <path>
```

关闭时必须失败：

```text
Video Agent Platform is disabled by FLAGS.VIDEO_AGENT_PLATFORM
```

禁止：flag 关闭时直接调用 specialist「绕过去」。

---

## 3. Video Job 最小模板

```yaml
job_id: my-job-001                 # 小写 kebab-case
workflow: auto                     # 或显式 workflow
source:
  type: topic                      # 见下表
  subject: 一句话题目或说明
  refs: []                         # 本地文件路径；缺文件要 blocked
output:
  duration_seconds: 60
  aspect_ratio: "16:9"             # 或 "9:16" / "4:5"
  language: zh
presenter:
  mode: none                       # 或 digital-human + provider
render:
  engine: auto                     # 或 remotion / hyperframes
review_gates:
  script: pending                  # pending | approved
  storyboard: pending
  final_render: pending
```

### source.type → 自动路由（`workflow: auto`）

| source.type / 条件 | primary | renderer |
| --- | --- | --- |
| `product-brief` / `website` | `product-promo-producer` | `hyperframes` |
| `existing-video` | `existing-video-recut-producer` | `hyperframes` |
| `presenter.mode=digital-human`（非产品源） | `digital-human-producer` | `remotion` |
| `topic` / 普通 `script` | `faceless-explainer-producer` | `remotion` |

显式 `workflow` 优先，但仍须满足该 workflow 的 source/presenter/renderer 约束。

### 现成 fixtures（先路由再学）

```bash
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job tests/fixtures/video-jobs/product-promo.yaml
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job tests/fixtures/video-jobs/digital-human.yaml
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job tests/fixtures/video-jobs/faceless-explainer.yaml
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job tests/fixtures/video-jobs/existing-video-recut.yaml
```

---

## 4. 四个专业 Agent

### 4.1 `product-promo-producer`

- **何时**：产品 brief / 网站 / 产品宣传片。
- **工作区**：`videos/<project>/`（例：`videos/deepdog-skills-promo`）。
- **栈**：HyperFrames `product-launch-video`。
- **可分派**：每个 frame 一个有界 worker。
- **禁止**：编造产品事实、未授权抓图、覆盖已审旁白。

### 4.2 `digital-human-producer`

- **何时**：口播数字人；或作为产品片的 delegated 素材生产者。
- **栈**：provider adapter + Remotion 后处理。
- **硬条件**：`presenter.mode=digital-human` 且显式 `presenter.provider`（如 `heygen`）；缺 rights / 未批付费 → `blocked` 或 `needs_approval`。
- **禁止**：无授权克隆声音/形象；静默换 provider；把密钥写入仓库。

### 4.3 `faceless-explainer-producer`

- **何时**：知识讲解、教程、无主持人图文短视频。
- **工作区**：`episodes/<episode-id>/`。
- **流水线**：`brief → script → storyboard → render-plan → voice → captions → Remotion → QA`。
- **禁止**：未标记的不确定事实；无关 artifact 全量重生成。

### 4.4 `existing-video-recut-producer`

- **何时**：已有 talking-head / 访谈 / 播客本地成片，要「设计化图形叠加」。
- **栈**：`/hyperframes` → `talking-head-recut`（**不是** plain captions / `embedded-captions`）。
- **源片**：只读。记录 SHA-256 + `ffprobe`；结束后再 hash，必须一致。
- **工作区**：`videos/<project>/` 派生 composition；可写 cards / index；**永不改源 MP4**。
- **门语义**：
  - `script` = transcript
  - `storyboard` = overlay plan
  - `final_render` = preview/render
- **参考样例**：`videos/heygen-out-recut-trial/`（含已渲染 `output.mp4`）。

---

## 5. 审核门（必须停）

用户没说「批准 X」时，**不得**把 `pending` 当 `approved`。

| gate | 典型含义 | agent 行为 |
| --- | --- | --- |
| `script` | 脚本 / transcript | 返回 `needs_approval`，`phase` 对应 plan/intake |
| `storyboard` | 分镜 / overlay plan / render-plan | 同上 |
| `final_render` | 最终预览或出片 | 未批准前禁止 `hyperframes render` / Remotion 成片 / 付费 provider |

用户批准话术示例（可原样识别）：

- `批准 storyboard` / `批准 overlay plan`
- `批准 final_render` / `批准渲染` / `可以出片`

批准后只推进该 gate；其他 pending 门继续卡住。

---

## 6. 必须返回的结果协议

每个 specialist 结束时返回 **恰好一个** JSON 对象：

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

规则：

- `needs_approval`：`next_action` 写清要用户批准哪一个 gate。
- `blocked`：缺本地文件、缺权利、缺 provider 配置等；写清缺什么。
- `failed`：命令失败；贴真实命令与错误摘要。
- `verification`：只写有证据的检查（typecheck、ffprobe、SHA、check 输出）。
- 禁止声称「已渲染 / 已调 API / 已更新 BIOS」却无命令证据。

---

## 7. 安全红线

- 不硬编码密钥；不提交 `.env`、生成视频以外用户未要求入库的大媒体（项目默认不提交生成片）。
- 不调用付费 / 云 provider，除非用户对应该门 **明确批准**。
- 不改用户已维护的 episode/video 权威文件，除非 Job 明确要求。
- 不刮未授权素材；不克隆真人声音/形象且无 rights。
- 不自动发布。
- 不降低 `npm audit` 门禁。
- Existing-video：**源片 immutability** 是硬约束。

---

## 8. 自然语言 → Job 的归一化

用户没给 YAML 时，入口 Agent 只推断合同字段：

1. 判断 `source.type`（产品 URL/brief？本地成片？口播数字人？纯 topic？）。
2. 填 `subject`、`aspect_ratio`、`language`、合理 `duration_seconds`。
3. `refs` 只填用户给出或仓库内已存在的路径；**不要发明路径**。
4. `review_gates` 默认全 `pending`，除非用户已明确批准某阶段。
5. 缺关键字段 → **先问用户**，不要开写。

写到临时 Job 文件后再 `video:route`，以 CLI JSON 为路由真相。

---

## 9. 常用命令

```bash
# 路由
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job path/to/job.yaml

# 平台测试
npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts

# 本地门禁（当前完整通过；历史 audit blocker 保留证据）
make check
make verify-harness

# Existing-video / HyperFrames（在 videos/<project>/ 内；render 前须有 final_render 明文批准）
npx hyperframes check
PRODUCER_BROWSER_GPU_MODE=hardware npx hyperframes render . --skill=talking-head-recut -o output.mp4 --fps 25 --browser-gpu

# 源片不变证明
shasum -a 256 path/to/source.mp4
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of json path/to/source.mp4
```

旧的直接命令（`npm run episode:*`、既有 HyperFrames 项目命令）在 flag 关闭时仍可用；那是旁路，不是本平台入口。

---

## 10. 故障速查

| 现象 | 处理 |
| --- | --- |
| flag 关闭报错 | 加上 `FLAG_video_agent_platform='{"enabled":true}'`，或请用户确认是否应启用 |
| schema 校验失败 | 对照 `job-contract.md` / fixtures；检查 provider、refs、workflow 配对 |
| renderer mismatch | 不要硬塞 `remotion` 给 recut/promo；用 `auto` |
| `devin` command not found | 用 Cursor 加载仓库内 `.devin/agents/*.md` 作为 profile；记为环境 blocker，不是平台失败 |
| 想做「加字幕」 | 不是 `existing-video-recut`；那是 designed overlays。纯字幕走别的 captions 路径 |
| 用户说「继续」但未批 gate | 仍停在 `needs_approval`；复述缺哪一个批准 |

---

## 11. 最小可复制示例

### A. 无脸讲解（auto）

```yaml
job_id: remotion-intro-trial
workflow: auto
source:
  type: topic
  subject: 普通人如何理解 Remotion
  refs: []
output:
  duration_seconds: 60
  aspect_ratio: "16:9"
  language: zh
presenter:
  mode: none
render:
  engine: auto
review_gates:
  script: pending
  storyboard: pending
  final_render: pending
```

期望路由：`faceless-explainer-producer` / `remotion`。

### B. 现有视频设计化重剪

```yaml
job_id: my-recut-001
workflow: auto
source:
  type: existing-video
  subject: 访谈成片重剪
  refs:
    - path/to/local.mp4
    - path/to/captions.srt   # 可选但推荐
output:
  duration_seconds: 54.187
  aspect_ratio: "9:16"
  language: zh
presenter:
  mode: none
render:
  engine: auto
review_gates:
  script: approved
  storyboard: pending
  final_render: pending
```

期望路由：`existing-video-recut-producer` / `hyperframes`；先 overlay plan，再等 `批准 storyboard`，最后等 `批准 final_render`。

---

## 12. 交接检查（agent self-check）

开始生产前确认：

- [ ] flag 已显式启用（或用户确认启用）
- [ ] Job 已通过 `video:route`，拿到唯一 `primary_agent`
- [ ] 已读对应 producer profile
- [ ] 清楚当前 pending gates
- [ ] 写入目录仅限本工作流
- [ ] 无付费调用计划，或已有对应该门的明文批准
- [ ] existing-video 已记录源片 SHA

结束时确认：

- [ ] 只返回一个结构化结果
- [ ] `changed_artifacts` / `verification` 可核对
- [ ] 未批准的门仍为 pending
- [ ] 源片（若 recut）SHA 未变

---

## 13. 如何「部署」与让别的 Agent（含 Codex）调用

### 先澄清：没有独立云服务要部署

当前交付物是 **仓库内契约 + 本地 CLI + Agent profile**，不是托管 API / 队列 / SaaS Agent。

「部署」= 别人能在本仓库工作树里：

1. 读到入口说明与 profile
2. 打开 `VIDEO_AGENT_PLATFORM`
3. 用 `video:route` 得到唯一 primary
4. 按对应 `.devin/agents/<primary>.md` 执行并停在审核门

不需要单独 install 服务进程。

### 仓库里三套东西分别给谁用

| 路径 | 适用对象 | 用途 |
| --- | --- | --- |
| `agents/video-producer/` | **任意 Agent** | 宿主无关入口、11 specialist map、可复制 handoff prompt |
| `.devin/skills/video-producer/` + `.devin/agents/*-producer.md` | Devin 自动发现；任意 Agent 也可直接读取 profile Markdown | Devin 薄发现适配与 repository-owned specialist 协议 |
| `.agents/skills/*` / `.codex/agents/*.toml` | Coding harness / Codex coding loop | 写码纪律和 implementer/verifier，不替代视频入口 |

因此：任意 Agent 不需要安装某个宿主插件；只要能读取仓库、运行 npm，就可从 `agents/video-producer/AGENT.md` 启动。Codex、Cursor、Claude、Devin 的差异只应停留在“如何把入口文档喂给会话”的薄适配层。

### 推荐调用方式（按稳妥程度）

#### 方式 A — Host-neutral Prompt 调用（推荐）

在目标 Agent 会话开头粘贴或引用：

```text
Read agents/video-producer/AGENT.md. Validate and route <job-file> with the Video Agent Platform flag enabled. Read only the mapped specialist profile. Do not approve pending gates, call paid/cloud services, or render without my explicit approval. Return the required result JSON.
```

该入口不假设 Agent 是 Codex、Cursor、Claude 或 Devin。

#### 方式 B — CLI 作为 Agent 间机器接口（最稳）

任何上游 Agent / 脚本只负责：

1. 写好 Job YAML；
2. 调用路由，拿到 JSON；
3. 将 JSON + Job 交给 `agents/video-producer/SPECIALISTS.md` 映射的 profile。

```bash
FLAG_video_agent_platform='{"enabled":true}' \
  npm run video:route -- --job path/to/job.yaml > /tmp/route.json
```

`route.json` 的 `primary_agent` / `requires_approval` / `renderer` 是跨 Agent 的唯一机器真相；不要靠自然语言重猜 workflow。

#### 方式 C — 可选宿主发现适配

若某个宿主支持自定义 skill/agent discovery，可创建**薄适配**，只指向：

```text
agents/video-producer/AGENT.md
agents/video-producer/SPECIALISTS.md
```

适配不得复制 12 个 profile、不得实现自己的路由、不得绕开 `VIDEO_AGENT_PLATFORM`。用户级 symlink 或宿主配置是可选部署动作，不是使用此 package 的前提。

### Devin 宿主

若本机有 Devin CLI：

```bash
devin skills list
devin skills show video-producer
```

应能看到仓库 `.devin/skills/video-producer`。然后在 Devin 会话中走同一套 Job → route → 单 primary。
本环境若 `devin: command not found`，用 Cursor/Codex + 方式 A/B，记为环境 blocker，不是平台未封装。

### 不要这样做

- 不要把 12 个 producer 合成一个宿主专属「万能视频 agent」。
- 不要在 flag 关闭时直接读 producer 文件开干。
- 不要部署云队列 / 对象存储 / 自动发布来「完成封装」——超出当前产品合同。
- 不要让上游 Agent 跳过 `video:route` 自己指定 primary（除非用户显式指定且仍通过 schema）。

### 最小跨 Agent 时序图

```text
Codex/Cursor (上游)
  写 job.yaml
  跑 video:route → route.json
  开子会话 / 自扮演 primary
       |
       v
.devin/agents/<primary>.md
  执行到 needs_approval | done | blocked | failed
       |
       v
用户批准 gate 后，上游恢复同一 Job 继续
```

---

**维护**：契约以 `src/schemas/videoJob.ts` 与 `.devin/skills/video-producer/references/job-contract.md` 为准；本手册与二者冲突时，以代码和 job-contract 为准并回修本文。
