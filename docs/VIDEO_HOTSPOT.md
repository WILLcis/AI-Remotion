# 热点口播（真人口播文案 / 数字人即梦成片）

父工单：`YES-549`。样例字段见 [`example.md`](./example.md)。

用户指定 **热点类型** 和 **是否定时**。检索来源可以是 Agent 手搜，或仓库常驻 RSS 爬虫。整理后的口播会走 **LLM 精修**（`AI_REMOTION_LLM_*`；失败则回退模板）。不要编造新闻。

## 两种产物

| `format` | 给用户什么 | 是否生成视频 |
| --- | --- | --- |
| `human-vo` | 热门口播文案（爆款标题 / 封面文案 / 话题标签 / **口播文本**） | **否**。用户自己录 |
| `digital-human` | 同上 + **即梦提示词** | **是**。`text2image` 9:16 封面 → `image2video`（封面作第一帧；提示词要求口型 + 底部中文字幕，`seedance2.0_vip`）→ `video:publish --platform all --generation-service dreamina --cover` |

真人口播 **不要** 写即梦提示词，也 **不要** 调即梦或发布。两种格式都要 LLM 精修标题/封面/标签/口播。

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

数字人（会扣即梦积分；抖音 live 暂停时只写视频号/小红书 Pack）：

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
- 即梦 CLI 仍需高级会员；默认 `seedance2.0_vip`。会员等级不够会失败，文案包仍会留下。
- 数字人封面仍走即梦 `text2image` 9:16。成片走 `image2video`，CLI 把该图当作视频第一帧；字幕和口型写在提示词里，由即梦生成，不在本地 ffmpeg 烧录或换轨。
- 单条即梦 TNS / 生成失败不阻断其余 clip；失败原因写入结果 `questions`（例如 `口播1 即梦失败：…`）。同一提示词不要重提。
