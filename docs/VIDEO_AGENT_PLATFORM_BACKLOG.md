# Video Agent Platform — 相邻高需求专家 Backlog

状态：Documented only（不实现）
日期：2026-08-01
关联：`docs/VIDEO_AGENT_PLATFORM_P6_DEVELOPMENT_PLAN.md`（立刻可接七类另案落地）

本文件记录与现有能力相邻、市场需求高、但 **尚未** 进入 Video Job schema / 路由的专业 Agent 候选。
开新工单前必须有稳定重复需求、独立验收与回滚边界；禁止借机做成万能 Agent。

## 候选清单

| 候选 primary | 典型输入 | 与现有关系 | 主要风险 | 建议优先级 |
| --- | --- | --- | --- | --- |
| `product-demo-producer` | 产品 URL / 可登录环境 / 操作脚本 | 邻近 product-promo；偏真实浏览器操作录屏+旁白 | 账号密钥、环境不稳定、云浏览器成本 | 高 |
| `shorts-repackage-producer` | 已有长片 / 成片 | 邻近 recut/captions；多画幅与 15s 切片 | 与 recut 边界糊；避免二次改源片 | 高 |
| `training-sop-producer` | PDF / 飞书 / SOP / 入职文档 | faceless-explainer 垂直版 | 事实审核；企业内部材料权限 | 中高 |
| `data-report-producer` | 表、看板导出、指标 brief | motion-graphics + explainer 组合 | 数字准确性；图表可读性 | 中 |
| `news-brief-producer` | 热点链接 / 快评提纲 | faceless 变体 | **事实与合规**；不得未核实断言 | 中（合规先行） |
| `podcast-visual-producer` | 音频 / 播客集 | 邻近 recut；输入是音频非成片 | 转写质量；竖屏节奏 | 中 |
| `ad-variant-producer` | 同一 promo brief + 多 hook | product-promo 的有界 fan-out | 仍须单一 primary；防并行改共享时间线 | 中 |
| `help-center-embed-producer` | 教程成片 + 嵌入播放器需求 | demo/training 下游包装 | 发布/托管超出本地优先合同 | 低（合同冲突则不做） |

## 明确不做（除非产品合同重开）

- 云端全自动导演万能 Agent（替代多 specialist）
- 自动发布到全平台社媒
- 未授权素材抓取 / 无 rights 声线克隆
- 为 backlog 项预先加 schema「占位 enum」

## 晋升为正式 P 的门槛

1. 连续真实需求或明确付费/内研承诺
2. 可写清 source.type / workflow / renderer / 审核门
3. 与现有四+七专家无不可消解歧义（或强制显式 workflow）
4. 独立 BIOS 子工单 + fixture + 测试
5. 若涉付费 provider：独立批准门与 flag

## 与 P6 的边界

P6 已收口：embedded-captions、pr-video、music-video、video-translation、motion-graphics、slideshow、remotion-port。
本 backlog **不得**在未另开计划时混入 P6 PR。
