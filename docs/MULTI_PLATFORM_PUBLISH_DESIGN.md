# 多平台发布设计（抖音 / 微信视频号 / 小红书）

状态：P0 实现中 · 设计 BIOS **YES-2498** · 实现 BIOS **YES-2520** · 父单 **YES-549**  
日期：2026-08-12  
优先级：**抖音 P0 → 微信视频号 P1 → 小红书 P2**  
决策锚点：[`docs/decisions/ADR-003-multi-platform-publish.md`](./decisions/ADR-003-multi-platform-publish.md)

> 本工单只交付设计。不写生产发片代码、不接真实账号发片。实现另建子工单并再次人在环批准。

---

## 1. 目标

在保持 CLI/Agent-first、本地成片、审核门纪律的前提下，让用户在 **明确批准发布** 后，把本地最终 MP4 发到指定平台账号。

成功标准（设计验收）：

1. 有统一发布信封（Job / CLI / flag / 审核门 / 审计日志形态）。
2. 三平台能力矩阵与 blocker 写清，不假装都有官方 API。
3. 凭证与密钥边界明确，文档无秘密。
4. 可拆出实现子工单标题与验收标准。

---

## 2. 产品边界

### In

- 人审后的发布意图：`publish` gate + `批准发布` / `批准发布到抖音` 话术。
- 本地成片路径校验（存在、时长、封装、画幅建议）。
- 平台适配器契约与 P0 抖音官方 API 路径设计。
- P1/P2 在官方 API 缺失时的 **assisted（半自动）** 降级：生成发布清单 + 打开官方创作者页说明。**用户已确认长期接受 Pack，不强上 RPA。**

### Out（本设计与后续默认实现均禁止）

- 静默/定时无人值守群发。
- 非官方协议、买卖号、hook、灰产「视频号 API」。
- 用 cookie 破解 / 私有签名冒充小红书 OpenAPI。
- 浏览器运营后台、云队列、强制对象存储（除非平台强制且用户另批）。
- 改写 `generation.service` 成片链路；发布是成片之后的独立阶段。

---

## 3. 架构

```text
本地 final.mp4（已过 final_render）
  → Publish Request（平台、账号别名、文案、封面、可见性）
  → FLAGS.VIDEO_PUBLISH (+ 分平台 flag)
  → review_gates.publish == approved（当次明文）
  → PublishAdapter[platform].validate → upload → create
  → PublishResult（platform_post_id / status / raw_ref）
  → 本地 audit JSON（无 token）
```

### 3.1 与现有流水线关系

| 阶段 | 所有者 | 发布是否介入 |
| --- | --- | --- |
| generation.service | Remotion / HF / HeyGen / Dreamina | 否 |
| final_render gate | 成片 | 发布前置：必须已 approved |
| publish gate | 新增 | 是 |

发布 **只读** 本地成片；失败不得回写 storyboard / render-plan。

### 3.2 建议模块（实现阶段）

```text
src/publish/
  types.ts              # PublishRequest / PublishResult
  audit.ts              # 本地审计记录
  adapters/
    douyin.ts           # P0
    weixinChannels.ts   # P1（可能 assisted）
    xiaohongshu.ts      # P2（可能 assisted / share-SDK）
src/cli/publishVideo.ts # npm run video:publish
flags: VIDEO_PUBLISH, VIDEO_PUBLISH_DOUYIN, ...
```

---

## 4. 审核门与 Agent 契约

### 4.1 新 gate

在 Video Job `review_gates` 增加：

```yaml
review_gates:
  script: pending|approved
  storyboard: pending|approved
  final_render: pending|approved
  publish: pending|approved   # 新增；默认 pending
```

规则：

- `publish` 未 approved → 禁止任何平台写调用。
- 批准话术示例：`批准发布`、`批准发布到抖音`、`可以发视频号`。
- **一次批准只覆盖声明的平台列表**；换平台或换成片路径需重新批准。
- 付费/云端生成批准 ≠ 发布批准。

### 4.2 Feature flags（草案，实现时登记）

| Flag | 默认 | 含义 |
| --- | --- | --- |
| `video_publish` | false | 总开关 |
| `video_publish_douyin` | false | 抖音适配器 |
| `video_publish_weixin_channels` | false | 视频号 |
| `video_publish_xiaohongshu` | false | 小红书 |

Kill switch：任一总开关关闭 → CLI/Agent 立即 `blocked`。

### 4.3 CLI 草案

```bash
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_douyin='{"enabled":true}' \
  npm run video:publish -- \
    --platform douyin \
    --video path/to/final.mp4 \
    --title "..." \
    --i-approve-publish
```

`--i-approve-publish` 仅在用户当次明文批准后由 Agent 添加。  
例外：`--generation-service dreamina` 视为发布同意（用户选定即梦即发布）；`--platform all` 依次走三平台。

### 4.4 Publish Request 草案（schema 级）

```yaml
publish:
  platforms: [douyin]          # 可多选，但每平台单独 adapter 调用与审计
  video_path: videos/x/renders/final.mp4
  title: "..."
  caption: "..."
  cover_path: optional
  topics: []
  visibility: public           # 平台枚举子集
  account_alias: default       # 映射到本机凭证槽，不是密钥本身
  schedule_at: null            # P0 抖音必支持：null=立即，ISO-8601=定时；平台时区规则在实现子单核验
```

---

## 5. 凭证与安全

| 项 | 规则 |
| --- | --- |
| 存储 | `.env.local` 或 OS 钥匙串；示例只放 placeholder |
| 入库 | 禁止 token、refresh_token、cookie、client_secret |
| 日志/工单/审计 JSON | 只留 `account_alias`、`open_id` 哈希或末四位、request_id |
| OAuth | 本机回调 `127.0.0.1`；授权用途文案必须在发起前展示给用户 |
| 撤销 | 文档写明各平台解除授权步骤；适配器提供 `auth status` / `auth logout` |

环境键草案（无真实值）：

```bash
# Douyin website app
AI_REMOTION_DOUYIN_CLIENT_KEY=
AI_REMOTION_DOUYIN_CLIENT_SECRET=
AI_REMOTION_DOUYIN_ACCESS_TOKEN=
AI_REMOTION_DOUYIN_OPEN_ID=
AI_REMOTION_DOUYIN_REFRESH_TOKEN=
```

---

## 6. 分平台能力矩阵

### 6.1 抖音（P0）— 官方 API 路径

| 能力 | 状态 | 备注 |
| --- | --- | --- |
| OAuth 用户授权 | 可用（需申请） | 视频管理授权应在发布场景单独触发 |
| 上传视频 | OpenAPI | `upload_video`；>50MB 建议分片，>128MB 必须分片；总大小限制以官方文档为准 |
| 创建视频作品 | OpenAPI | 需 scope `video.create.bind` |
| 标题/话题 | 支持 | 创建作品接口字段 |
| 定时发布 | **P0 必做** | 用户已确认；实现时对接官方定时字段或等价能力；文档核验后写入 adapter |
| 查询审核/状态 | 待核验 | 实现子单需补齐 |

**前置 blocker（业务）**

1. 用 **网站应用**（不是小程序、不是移动应用）在抖音开放平台创建并转正，再申请 `video.create.bind`。现网主体要求为党政机关或事业单位。
2. 在能力实验室申请 **代替用户发布内容到抖音**；面向服务产品/机构场景，公司主体更贴近审核要求。
3. 一个抖音用户将该能力授权给应用（平台限制：用户侧授权关系可能互斥覆盖）。
4. 内容合规：品牌水印易触发降权/下架；成片需过本项目 QA。

**技术流程（P0）**

```text
校验本地 MP4 →（可选）压缩到平台限额
→ init/upload(/part) → video_id
→ create video（title/topics；立即或 schedule_at 定时）
→ 轮询或返回「已提交 / 已预约，待平台审核」
→ 写 audit JSON
```

参考（官方，实现时以现网文档为准）：

- https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/create-video/upload-video
- 能力：代替用户发布内容到抖音（`video.create.bind`）

### 6.2 微信视频号（P1）— 官方 API 缺口

| 能力 | 状态 | 备注 |
| --- | --- | --- |
| 官方「通用发视频」OpenAPI | **当前不可用**（开放社区多次确认） | 视频号助手开放能力侧重橱窗/留资/直播数据 |
| 视频号助手网页发布 | 可用 | https://channels.weixin.qq.com |
| 非官方协议 / RPA 发片 | **禁止作为仓库默认实现** | ToS 与封号风险 |

**设计结论（P1）— 用户已确认长期 Pack**

- **不得**宣称「已接通视频号 OpenAPI」。
- 采用 **Publish Pack**（不强上 RPA）：  
  - 校验 MP4  
  - 生成 `publish-pack/weixin-channels.json`（标题≥6 字、描述、话题、本地路径、检查清单）  
  - 打印助手发布 URL 与人工步骤  
  - 可选：仅打开浏览器到发布页（不自动填表、不自动点发布），仍需 `批准发布`
- 若未来官方开放投稿 API：在本矩阵升级为 `official`，另开实现子单。

### 6.3 小红书（P2）— 官方能力受限

| 能力 | 状态 | 备注 |
| --- | --- | --- |
| 合作分享 SDK / 扫码跳转发布页 | 部分可用 | 偏「唤起 App 预填」，非服务端静默发 |
| 开放平台静默发笔记 | **对普通开发者通常不可用** | 需类目资质 |
| Cookie / 私有 web_api / 第三方灰产 | **禁止** | |

**设计结论（P2）— 用户已确认长期 Pack**

- 同样走 **Publish Pack** + 创作者后台人工确认（不强上 RPA）。
- 若拿到官方合作分享资质：可做「生成分享载荷 / 展示二维码」半自动，**最终点击仍在用户设备**。
- 禁止把第三方「付费代发 API」写进默认适配器。

---

## 7. TTS / 成片关系（澄清）

发布层 **不选择 TTS**。口播已在 `generation.service` 阶段决定（项目 CosyVoice / HeyGen / 即梦原生）。发布只传最终音画一体文件。

---

## 8. 审计与失败语义

每次尝试写：

```json
{
  "ts": "ISO-8601",
  "platform": "douyin",
  "video_path": "...",
  "video_sha256": "...",
  "account_alias": "default",
  "title": "...",
  "result": "submitted|failed|blocked",
  "platform_post_id": null,
  "error_code": null
}
```

落盘建议：`videos/<proj>/publish/audit.jsonl` 或 `state/publish/`（若用 state，遵守敏感信息规则）。

Agent 结果协议沿用现有：

- `needs_approval`：缺 publish 批准  
- `blocked`：flag 关 / 缺凭证 / 平台能力未开通 / 文件不符  
- `failed`：平台返回错误（附官方错误码摘要，无 token）  
- `done`：已提交（注明「平台侧可能仍在审核」）

---

## 9. 成片规格建议（发布前校验）

| 平台 | 建议画幅 | 容器 | 备注 |
| --- | --- | --- | --- |
| 抖音 | 9:16 优先 | mp4 | 时长/大小按现网文档；大文件分片 |
| 视频号 | 9:16 优先 | mp4 | 标题长度等人审清单校验 |
| 小红书 | 9:16 优先 | mp4 | 标题约 20 字量级；正文/话题限制写入 pack |

校验失败 → `blocked`，提示先用对应 `generation.service` 重出竖屏版，而不是发布层强转（除非用户批准转码子步骤）。

---

## 10. 分阶段实现子工单（建议拆分）

| 建议标题 | 依赖 | 验收要点 |
| --- | --- | --- |
| **实现 P0：抖音官方发布适配器 + `video:publish`（含定时发布）** | YES-2498 设计验收；开放平台应用与 `video.create.bind` 获批 | flag 默认关；无批准不发；支持立即与 `schedule_at` 定时；单测 mock；一次真实沙箱/测试号证据 |
| **实现 P1：视频号 Publish Pack（人工助手路径）** | P0 CLI 信封可复用 | 生成清单+检查项；不调用非官方协议；可选仅打开助手 URL |
| **实现 P2：小红书 Publish Pack / 官方分享降级** | 明确资质或接受 pack-only | 同 P1；禁止 cookie 私有 API |
| **（可选）视频号/小红书官方 API 接通** | 官方能力实际开放证据 | 升级矩阵 `assisted` → `official` |

---

## 11. 回滚

1. `FLAG_video_publish={"enabled":false}` 总杀。  
2. 分平台 flag 单杀。  
3. 撤销 OAuth / 删除本机 token 文件。  
4. 已发出内容只能在平台侧删除；本地 audit 保留。  
5. 文档回退：恢复「默认不发布」表述，保留 ADR 为历史决策。

---

## 12. 设计验收清单（YES-2498）

- [x] ADR-003 提出独占发布子系统与人审原则  
- [x] 本设计文档含门禁、凭证、CLI/Job、flag、审计、回滚  
- [x] 优先级抖音 → 视频号 → 小红书，含能力矩阵与 blocker  
- [x] 明确本单无生产发片代码；实现另开子单  
- [x] 文档无 token/密钥  

---

## 13. 产品确认（2026-08-13）

1. **P1/P2 Publish Pack** — **已确认**：视频号 / 小红书长期走「清单 + 人工发」，不强上 RPA（含义见 §13.1）。官方投稿 API 若日后开放，另开工单升级。
2. **抖音开放平台申请** — **网站应用 + `video.create.bind`**（不是小程序）。现网主体要求党政机关/事业单位；个人入驻目前跑不通。
3. **P0 发布时机** — **已确认：需要定时发布**（不仅立即提交）。实现子单必须覆盖 `schedule_at`（或平台等价字段）与「立即发布」两种模式。

### 13.1 「半自动 Pack」是什么意思？

**不是**自动帮你点开发布。

因为微信视频号、小红书目前**没有**对本仓库可用的官方「服务端一键发视频」API，若强行用浏览器机器人（RPA）去模拟点击，容易违反对平台条款、账号被封，且页面一改就坏。

所以 P1/P2 的默认设计是 **Publish Pack（发布包）**：

| 步骤 | 谁做 | 做什么 |
| --- | --- | --- |
| 1 | 程序 | 检查本地 MP4、标题字数等是否符合平台建议 |
| 2 | 程序 | 生成一份清单（标题、描述、话题、文件路径、检查项）+ 打开/打印官方创作者后台链接 |
| 3 | **你本人** | 在抖音创作者无关的 **视频号助手 / 小红书创作者** 网页或 App 里，自己上传并点「发布」 |

也就是：**工具帮你准备好素材与文案清单，最后一下仍由你人工发出。**  
「不强上 RPA」= 不默认做自动填表、自动点发布的浏览器脚本。

若你以后希望「完全无人值守发视频号/小红书」，需要等官方开放 API，或你书面接受 RPA 风险后再另开高风险工单——**当前设计默认不做。**
