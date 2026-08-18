# 热点口播（真人口播文案 / 数字人即梦成片）

> 你应来自根目录 [`AGENTS.md`](../AGENTS.md) 的必读清单。本文件不是 Agent 总入口。  
> **「用我的形象做口播」走本文件的 `digital-human` + 即梦，不是 HeyGen。**

父工单：`YES-549`。样例字段见 [`example.md`](./example.md)。

用户指定 **热点类型** 和 **是否定时**。检索来源可以是 Agent 手搜，或仓库常驻 RSS 爬虫。整理后的口播会走 **LLM 精修**（`AI_REMOTION_LLM_*`；失败则回退模板）。不要编造新闻。

## 两种产物

| `format` | 给用户什么 | 是否生成视频 |
| --- | --- | --- |
| `human-vo` | 热门口播文案（爆款标题 / 封面关键词 / 封面文案 / 话题标签 / **口播文本**） | **否**。用户自己录 |
| `digital-human` | 同上 + **即梦提示词** | **是**。默认用 `config/hotspot-identity.json` 的形象和声音：封面 `image2image`（只复制人脸）→ `seedance2.0mini` `multimodal2video`（`@Image 1` 封面第一帧，`@Image 2` 只复制人脸，音频只当音色，口播写在 `{对白}` 并对口型）。`--photo` + `--audio` 可成对覆盖。然后 `video:publish --platform all --generation-service dreamina --cover` |

真人口播 **不要** 写即梦提示词，也 **不要** 调即梦或发布。两种格式都要 LLM 精修标题 / 封面关键词 / 封面两行短句 / 标签 / 口播。封面关键词必须是文案重点（2–4 字），禁止硬拼如「涨税」；封面文案恰好两句、每句不超过约 12 字。

## 开关（默认关）

```bash
FLAG_video_hotspot={"enabled":false}
FLAG_video_hotspot_crawler={"enabled":false}
```

Kill：`FLAG_video_hotspot={"enabled":false}` 停整条热点；`FLAG_video_hotspot_crawler={"enabled":false}` 只停常驻爬虫，手搜 `--items` 仍可用。数字人出片还要 `FLAG_dreamina_media` 与 `FLAG_video_publish*`。

## Agent 怎么跑

缺这三项就停下来问，不要默认：

1. 热点类型（如 商业消费 / 科技 / 本地民生 / 数字货币）
2. `human-vo` 还是 `digital-human`
3. 现在跑，还是定时（一次 `schedule_at`，或每天 `daily_time=HH:mm`）

然后检索公开网页，写成 items JSON（标题 + 摘要 + 链接），再调用 CLI。LLM 会按 `example.md` 口吻精修，不编造素材里没有的数字。

```bash
FLAG_video_hotspot='{"enabled":true}' \
  npm run video:hotspot -- \
    --format human-vo \
    --topic 商业消费 \
    --items path/to/items.json \
    --out videos/hotspot-YYYYMMDD
```

数字人（会扣即梦积分；抖音 live 暂停时默认只写视频号/小红书 Pack。浏览器自动发见 [`VIDEO_PUBLISH.md`](./VIDEO_PUBLISH.md)：须 `FLAG_video_publish_rpa` 且当次 `--i-accept-rpa-risk`，即梦出片不等于批准 RPA）：

```bash
FLAG_video_hotspot='{"enabled":true}' \
FLAG_dreamina_media='{"enabled":true}' \
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_douyin='{"enabled":true}' \
FLAG_video_publish_weixin_channels='{"enabled":true}' \
FLAG_video_publish_xiaohongshu='{"enabled":true}' \
  npm run video:hotspot -- \
    --format digital-human \
    --topic 商业消费 \
    --items path/to/items.json \
    --out videos/hotspot-YYYYMMDD
```

人已当次说「批准RPA」时，Agent 自己加 RPA 闸（不要让人敲）。`FLAG_video_publish_douyin` 无正式网站应用时保持关：

```bash
FLAG_video_hotspot='{"enabled":true}' \
FLAG_dreamina_media='{"enabled":true}' \
FLAG_video_publish='{"enabled":true}' \
FLAG_video_publish_douyin='{"enabled":false}' \
FLAG_video_publish_weixin_channels='{"enabled":true}' \
FLAG_video_publish_xiaohongshu='{"enabled":true}' \
FLAG_video_publish_rpa='{"enabled":true}' \
  npm run video:hotspot -- \
    --format digital-human \
    --topic 商业消费 \
    --items path/to/items.json \
    --out videos/hotspot-YYYYMMDD \
    --i-accept-rpa-risk
```

数字人默认身份见 [`config/hotspot-identity.json`](../config/hotspot-identity.json)：脸来自 `episodes/res/img/dh1.jpg`，音色来自 `episodes/res/audio/dg1.wav`，造型走 `DEFAULT_DREAMINA_PRESENTER_PROMPT`。已确认样片：`videos/hotspot-20260816-identity-v4`。不必每次再传 `--photo` / `--audio`；要换人时两者成对覆盖。

只出文案、先不调用即梦：加 `--pack-only`。

试爬（打印 JSON，不写口播）：

```bash
FLAG_video_hotspot_crawler='{"enabled":true}' \
  npm run video:hotspot -- --crawl --topic 数字货币
```

## 常驻定时爬虫

仓库内进程：到期任务用公开 RSS 拉条目（默认 CoinDesk / Cointelegraph / 36氪，见 `config/hotspot-crawler.example.json`），再 LLM 精修。不新增加付搜索 API，不编造标题。

本地覆盖（已 gitignore）：把 example 拷成 `config/hotspot-crawler.local.json`。

先建每天任务，再常驻：

```bash
FLAG_video_hotspot='{"enabled":true}' \
FLAG_video_hotspot_crawler='{"enabled":true}' \
  npm run hotspot:watch -- \
    --format human-vo \
    --topic 数字货币 \
    --repeat daily \
    --daily-time 08:00 \
    --pack-only
```

`--watch` 默认每 60s 看一次到期任务；`--due` 在爬虫开关打开时也会自动 RSS，不必等 Agent 手搜。数字人常驻会扣即梦积分，确认开关后再去掉 `--pack-only`。

macOS 开机常驻：复制 `scripts/launchd/ai-remotion-hotspot-crawler.plist.example`，改成仓库绝对路径后：

```bash
cp scripts/launchd/ai-remotion-hotspot-crawler.plist.example ~/Library/LaunchAgents/com.ai-remotion.hotspot-crawler.plist
launchctl load ~/Library/LaunchAgents/com.ai-remotion.hotspot-crawler.plist
```

关掉爬虫（不必卸 launchd）：`FLAG_video_hotspot_crawler={"enabled":false}`。

没有爬虫开关时，`--due` 仍只列出待检索任务，Agent 手搜后再 `--run-id`。

## 安全

- 文案末尾带素材来源；公开报道整理，待核，不当已核实事实。
- LLM 精修不得发明数字；失败时回退模板口播。标题/口播会去掉诈骗、判刑等即梦 TNS 高危词。
- 即梦 CLI 仍需高级会员；默认 `seedance2.0mini`（720p，4–15 秒）。质量不够时改 `--model_version seedance2.0fast` 或 `seedance2.0_vip`。会员等级不够会失败，文案包仍会留下。
- 数字人默认走创作者授权身份（`config/hotspot-identity.json`）：封面 `image2image` 只复制人脸，成片 `seedance2.0mini` `multimodal2video --image <封面> --image <照片> --audio <音色>`——`@Image 1` 是封面第一帧，`@Image 2` 只复制人脸，音频是 `@Audio 1` 音色（不继承原句），口播写在 `{对白}` 里并对口型。`--photo` + `--audio` 可成对覆盖。参考音频须大于 5 秒，成片最长 15 秒。发给即梦的封面/视频提示词都必须含 **口型匹配** 和字幕要求；视频字幕在画面正下方居中，中文超大号加粗衬线、关键词金色（参考 `episodes/res/img/image-subtitle1.png` 的字体，不要胸口错落、不要底部黑条），不在本地 ffmpeg 烧录。
- 发布默认只写 Pack。自动点视频号「发表」/ 小红书「发布」须当次「批准RPA」，契约见 [`VIDEO_PUBLISH.md`](./VIDEO_PUBLISH.md)。即梦出片不等于批准 RPA。不要提交 `state/publish/`。
