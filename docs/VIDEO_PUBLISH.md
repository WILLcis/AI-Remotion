# 多平台发布（实现）

> 你应来自根目录 [`AGENTS.md`](../AGENTS.md) 的必读清单。本文件不是 Agent 总入口。

BIOS：设计 `YES-2498` · 实现 `YES-2520`  
设计原文：[`MULTI_PLATFORM_PUBLISH_DESIGN.md`](./MULTI_PLATFORM_PUBLISH_DESIGN.md)

## 开关（默认关）

```bash
FLAG_video_publish={"enabled":false}
FLAG_video_publish_douyin={"enabled":false}
FLAG_video_publish_weixin_channels={"enabled":false}
FLAG_video_publish_xiaohongshu={"enabled":false}
FLAG_video_publish_rpa={"enabled":false}
```

Kill：`FLAG_video_publish={"enabled":false}`。RPA 单独杀：`FLAG_video_publish_rpa={"enabled":false}`。

## 人审

Remotion / HyperFrames / HeyGen：必须带 `--i-approve-publish`（仅在用户当次说「批准发布」后由 Agent 添加）。

即梦例外：用户已选 `generation.service=dreamina` 时，带 `--generation-service dreamina` 即可发布，不必再批。仍须打开下方 flag。`--platform all` 会依次走抖音 + 视频号 Pack + 小红书 Pack。自动点「发表/发布」须另批 RPA，见下文「给 Agent」。

## 抖音 P0

官方 `create_video` **没有**定时字段。`--schedule-at` 写入本地队列；到期后：

```bash
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_douyin='{"enabled":true}' \
  npm run video:publish -- --due --i-approve-publish
```

立即发布：

```bash
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_douyin='{"enabled":true}' \
  npm run video:publish -- \
    --platform douyin \
    --video path/to/final.mp4 \
    --title "标题 #话题" \
    --i-approve-publish
```

凭证只放本机 env：`AI_REMOTION_DOUYIN_ACCESS_TOKEN`、`AI_REMOTION_DOUYIN_OPEN_ID`。

**不要开小程序。** 官方 `video.create.bind` 只给 **正式网站应用**；移动应用和小程序暂不支持。现网主体要求是党政机关或事业单位。个人入驻暂时跑不通 live 发片。`--platform all` 在 `FLAG_video_publish_douyin` 关闭时会跳过抖音，只出视频号/小红书 Pack。

官方文档：

- 能力：[代替用户发布内容到抖音](https://developer.open-douyin.com/docs/resource/zh-CN/dop/ability/content-management/video.create.bind)
- 上传：`POST https://open.douyin.com/api/douyin/v1/video/upload_video/` — [文档](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/create-video/upload-video)
- 创建：`POST https://open.douyin.com/api/douyin/v1/video/create_video/` — [文档](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/create-video/video-create)

仓库已实现整包上传 + 创建 + 本地定时队列。尚未实现：OAuth 换票、分片上传、`cover_tsp`、审核状态查询、发前体积校验。抖音没有单独封面图字段。

## 视频号 / 小红书

默认只生成 Publish Pack（清单 + 创作者链接），人工上传。浏览器自动发是可选高风险路径，完整操作契约见下一节。

## 给 Agent：视频号 / 小红书 RPA

其它 Agent 自动发视频号或小红书前，**必须先读完本节**。实现：`src/publish/rpaPublish.ts`、`src/publish/rpaPace.ts`。设计：[`MULTI_PLATFORM_PUBLISH_DESIGN.md`](./MULTI_PLATFORM_PUBLISH_DESIGN.md) §13.2。

### 何时才允许自动发

缺一不可：

1. 人在**当次会话**说了「批准RPA」或「接受RPA风险」。
2. Agent 自己打开 `FLAG_video_publish`、对应平台 flag、以及 `FLAG_video_publish_rpa={"enabled":true}`。不要让人敲 `FLAG_`。
3. 命令带 `--i-accept-rpa-risk`。

**不是 RPA 同意：** 选即梦 / `--generation-service dreamina` / 「批准发布」。那些只写 Pack（或抖音官方 API）。没听到「批准RPA」就不要加 `--i-accept-rpa-risk`。

关掉：`FLAG_video_publish_rpa={"enabled":false}`。抖音**永远**走官方 API，禁止对抖音做 RPA。禁止 cookie / 私有签名 API。

### 浏览器（必须遵守）

- 用本机已装的 **Google Chrome**（Playwright `channel: "chrome"`），有头窗口。
- **持久 profile**：`state/publish/rpa-profile/<account_alias>/`（默认 `default`）。这是专用登录目录，不是无痕，也不是 Playwright 自带 Chromium。
- 第一次会弹窗：用人话请人在官方创作者页扫码登录视频号助手、小红书创作者。登录态留在上述目录，**不要提交** `state/publish/`。
- 日常 Chrome 可以开着。若启动报 profile 被占用：请人关掉占用 `state/publish/rpa-profile/` 的那个 Chrome 窗口，再重试。
- Agent 自己执行：`npm install playwright && npx playwright install chrome`。不要让人装。

### 降封号（代码强制，不可夜间绕过）

| 规则 | 值 |
| --- | --- |
| 窗口 | 本地时间 **10:00–20:00**；之外拒绝，绝不熬夜批量 |
| 日限额 | 视频号 + 小红书合计 **每天最多 30 条** |
| 不同视频间隔 | 至少 **90 分钟** |
| 同一条跨平台 | 视频号发完再发小红书：随机等 **2–5 分钟** 后自动发，不必再问人 |
| 操作 | 人类化延迟；标题/正文逐字输入，禁止瞬间 `fill` 完事 |
| 关浏览器 | 必须先等到页面出现「发表成功 / 发布成功 / 笔记发布成功」或列表页。点完立刻关会丢掉投稿 |

节奏账本：`state/publish/rpa-pace.json`（gitignore）。不要手改来绕过夜间或日限额。

### 命令（Agent 自己跑）

已有成片、人已说「批准RPA」：

```bash
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_weixin_channels='{"enabled":true}' \
FLAG_video_publish_xiaohongshu='{"enabled":true}' \
FLAG_video_publish_rpa='{"enabled":true}' \
  npm run video:publish -- \
    --platform all \
    --generation-service dreamina \
    --video path/to/final.mp4 \
    --cover path/to/cover.jpg \
    --title "至少六个字标题" \
    --caption "正文" \
    --i-accept-rpa-risk \
    --pack-dir videos/<proj>/publish-pack
```

非即梦成片还要 `--i-approve-publish`（人说了「批准发布」之后）。`--platform all` 在 `FLAG_video_publish_douyin` 关闭时跳过抖音。

热点数字人在人已「批准RPA」时，给 `video:hotspot` 同样加 `--i-accept-rpa-risk`，并打开上面的 publish + RPA flags。

单平台把 `--platform` 换成 `weixin-channels` 或 `xiaohongshu`。

创作者页：

- 视频号：`https://channels.weixin.qq.com/platform/post/create`
- 小红书：`https://creator.xiaohongshu.com/publish/publish`

### 怎么读结果（禁止把 Pack 当成已发布）

| `status` | `error_code` | 含义 | Agent 下一步 |
| --- | --- | --- | --- |
| `submitted` | `null` | 页面已确认发表/发布成功（平台仍可能审核） | 可向人报告已提交 |
| `packed` | `null` | 只写了清单，没有自动点发布 | 把 Pack 路径给人；或等人说「批准RPA」后再跑 |
| `blocked` | `rpa_night` | 不在 10:00–20:00 | 等到白天再发；Pack 仍在 |
| `blocked` | `rpa_daily_cap` | 当天已满 30 条 | 次日再发；Pack 仍在 |
| `blocked` | `rpa_too_soon` | 间隔不够 | 按 message 等待后重试；同条跨平台会自动等 2–5 分钟 |
| `failed` | `rpa` | 没点到按钮、没出现成功文案、Chrome 起不来、页面改版 | 看 Pack 目录里 `rpa-failed-<platform>.png`；用 Pack 手工发；**不要声称已发布** |

`submitted` 的 message 必须是确认成功，不是「已点击」。没有成功确认就关浏览器，历史事故是视频号点了「发表」但稿没出去、小红书要人再点「发布」。

### 对人只问这些

- 当次要不要自动发：等人说「批准RPA」。
- 第一次登录：请人在弹出的 Chrome 里扫码。
- setup / 积分 / 密钥：沿用 `npm run setup` 的 `ask` 原文。

不要让人敲 `brew`、`npm`、`FLAG_`、Playwright 安装命令。页面改版时留下截图 + Pack，**不要改 RPA 源码去硬修**，除非人当次明确说改代码。