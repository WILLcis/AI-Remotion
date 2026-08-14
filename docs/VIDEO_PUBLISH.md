# 多平台发布（实现）

BIOS：设计 `YES-2498` · 实现 `YES-2520`  
设计原文：[`MULTI_PLATFORM_PUBLISH_DESIGN.md`](./MULTI_PLATFORM_PUBLISH_DESIGN.md)

## 开关（默认关）

```bash
FLAG_video_publish={"enabled":false}
FLAG_video_publish_douyin={"enabled":false}
FLAG_video_publish_weixin_channels={"enabled":false}
FLAG_video_publish_xiaohongshu={"enabled":false}
```

Kill：`FLAG_video_publish={"enabled":false}`。

## 人审

Remotion / HyperFrames / HeyGen：必须带 `--i-approve-publish`（仅在用户当次说「批准发布」后由 Agent 添加）。

即梦例外：用户已选 `generation.service=dreamina` 时，带 `--generation-service dreamina` 即可发布，不必再批。仍须打开下方 flag。`--platform all` 会依次走抖音 + 视频号 Pack + 小红书 Pack。

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

只生成 Publish Pack（清单 + 创作者链接），人工上传。无 RPA。

```bash
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_weixin_channels='{"enabled":true}' \
  npm run video:publish -- \
    --platform weixin-channels \
    --video path/to/final.mp4 \
    --title "至少六个字标题" \
    --cover path/to/cover.jpg \
    --i-approve-publish \
    --pack-dir videos/<proj>/publish-pack
```
