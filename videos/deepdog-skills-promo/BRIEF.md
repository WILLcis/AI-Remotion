---
workflow: product-launch-video
flow: automation
storyboard: no
message: "deepdog 把编码智能体变成可分派、可观测、可积累技能的真正队友"
destination: website
aspect: 1920x1080
language: zh-CN
audience: engineering leaders and AI-native software teams
length: 60s
angle: problem-solution-proof
narration: yes
voice: dMkR1XwIkarpNqWUJLnX
style_preset: code-editorial
---

## Intent

为 deepdog 制作一支新的中文产品宣传片。沿用现有事实底座，但采用官方
HyperFrames `product-launch-video` 工作流重新规划和构建。视觉应像一支
developer-facing 产品发布片：清晰、有编辑感、有明显技术动效，不做廉价 HUD 堆叠。

## Assets

- `episodes/res/doc/deepdog-promo-brief.md` — 产品事实、功能与事实红线。
- `episodes/res/img/image 1.png` 至 `image 8.png` — deepdog 实机 UI 截图。
- `episodes/deepdog-promo/audio/narration.mp3` — 已审核中文旁白。
- `episodes/deepdog-promo/audio/heygen-tts.json` — HeyGen 逐字时间戳。

## Customizations

- 字幕以逐字时间戳为准，不绑定场景边界。
- 采用模块化 frame compositions 和统一的主转场语言。
- 使用截图证明功能，不伪造效率数字、客户背书或未实现能力。

## Notes

- 品牌始终写作 `deepdog`。
- 保留旧版 `final.mp4` 和 `final-effects.mp4`，输出到独立目录。
- 不抓取在线素材；所有产品证据来自用户提供的 Brief 和截图。
