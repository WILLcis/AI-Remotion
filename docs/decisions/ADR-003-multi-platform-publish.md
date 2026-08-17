# ADR-003: Multi-Platform Publish (Human-Gated)

## Status

Accepted for design (`YES-2498`). P0 code (`YES-2520`) is in-tree: Douyin upload/create + local schedule queue + Weixin/XHS packs. Douyin live API is paused until a 正式网站应用 obtains `video.create.bind` (not a mini-program; personal Open Platform cannot).

## Date

2026-08-12

## Context

AI-Remotion 原产品合同禁止自动发布。用户已批准新增「发布到抖音 / 微信视频号 / 小红书」能力，要求先单独设计、后实现，且每次发布必须人在环。

本地成片路径已存在（Remotion / HyperFrames / HeyGen / Dreamina）。缺的是：统一发布信封、凭证边界、分平台适配器、审核门与 kill switch。

三平台开放能力不对称：

- **抖音**：网站应用在获批「代替用户发布内容到抖音」能力（scope `video.create.bind`）且用户授权后，可用官方 OpenAPI 上传并创建作品。
- **微信视频号**：官方开放能力以橱窗/留资/直播数据等为主；**通用「一键 API 发视频」对普通企业开发者当前不可用**。助手网页发布是现实路径；RPA/非官方协议不合规，本仓库禁止。
- **小红书**：官方更偏向分享 SDK / 合作类目；**静默 OpenAPI 发笔记对普通开发者不可用或受限**。非官方 cookie/签名方案禁止入库。

## Decision

1. 新增 **可选** 发布子系统，默认关闭：`FLAGS.VIDEO_PUBLISH`（及分平台子开关）。
2. 发布只消费 **本地已批准成片路径**，不改写源片，不依赖云对象存储（除非某平台强制公网 URL 且用户另批）。
3. Video Job / CLI 增加人审门 `publish`；Agent 听到「批准发布」前不得调用任何平台写接口。**例外：** 用户选定 `generation.service=dreamina` 即视为发布同意，不再停该门。
4. 落地顺序固定：**抖音 P0 → 微信视频号 P1 → 小红书 P2**。
5. 适配器模式：`PublishAdapter` 每平台一个；不可用官方 API 的平台在设计中标注为 **assisted / blocked**，不得用灰产协议假装「已接通」。
6. 凭证仅存本机（`.env.local` / OS keychain），永不入库、不进工单正文。
7. 抖音开放平台用 **正式网站应用** 申请 `video.create.bind`（**不是小程序**）。现网文档写主体为党政机关或事业单位；个人入驻目前拿不到该能力。
8. 视频号 / 小红书 **默认** Publish Pack（清单 + 人工发）。浏览器 RPA 仅在用户书面接受风险后，经 `FLAG_video_publish_rpa`（默认关）**和**当次 `--i-accept-rpa-risk` 双闸开启；即梦出片同意不含 RPA。官方 API 开放后可再升级为 official adapter。
9. 抖音 P0 必须支持 **定时发布** 与立即发布。

## Alternatives Considered

### 继续禁止一切发布

Rejected：用户已明确批准需求；保留「默认关 + 人审」即可控制风险。

### 浏览器 RPA 统一三平台

Rejected as **default**：脆弱、易违反 ToS、高封号风险。用户于 2026-08-17 书面接受 residual risk 后，视频号/小红书 RPA 可作为 **可选** 路径，必须同时满足 kill switch `FLAG_video_publish_rpa=false` 默认关，以及当次 `--i-accept-rpa-risk`。RPA 必须用本机 Chrome 持久 profile（非无痕），并遵守白天窗口与日限额。不得用 cookie 私有 API 冒充官方接口。抖音仍走官方 OpenAPI，不走 RPA。

### 第三方聚合发片 SaaS

Rejected for MVP：引入外部数据处理与付费依赖；可在 P2+ 作为可选 adapter，需单独批准。

## Consequences

- `AGENTS.md` / 工作流文档需把「永不发布」改为「默认不发布；经 flag + 人审后可按适配器发布」。
- P0 可做真实抖音 OpenAPI 实现子单（公司主体 + 定时发布）；P1/P2 已确认为长期 Pack。
- high-risk：公开发布不可逆；必须可 kill switch、可撤销授权、可审计每次 publish 调用。
