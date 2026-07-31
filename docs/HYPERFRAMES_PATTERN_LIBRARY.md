# HyperFrames 模式库

## 收录原则

AI-Remotion 可以借鉴 `hyperframes-launches` 的工程方法和视觉语言，但不能把该仓库
整体作为本项目依赖或素材库。当前本地副本未提供 LICENSE，因此边界如下：

- 可以：重新实现目录结构、scene orchestration、转场节奏、字幕同步和 QA 方法。
- 不可以：直接复制 HeyGen/第三方品牌素材、音乐、视频、字体或整段 composition 源码。
- 需要审批：移植某个指定 launch 项目的代码或资产；执行前必须确认许可和来源。

## 已收录能力

### 官方 Skills

用户级已安装以下 HeyGen 官方 HyperFrames Skills：

- `hyperframes`
- `hyperframes-cli`
- `hyperframes-core`
- `hyperframes-animation`
- `hyperframes-registry`
- `remotion-to-hyperframes`

新的视频任务先用 `hyperframes` 做意图路由，再按需加载专项 skill。现有 Remotion
composition 只有在用户明确要求迁移时才使用 `remotion-to-hyperframes`。

### 项目模板

`templates/hyperframes/product-promo/` 是首个内部模板，包含：

- 薄的 root orchestrator。
- 三个独立 sub-compositions。
- scene 间有意重叠的转场 seam。
- 独立于 scene timing 的字幕轨。
- 12 秒无外部素材的产品宣传片示例。
- mount contract 和确定性回归测试。

## 从 launch 项目提炼的模式

1. 三个以上场景采用 modular composition，而不是把所有 DOM 塞进单个 HTML。
2. 主 `index.html` 只管理场景窗口、连续音轨、字幕和跨场景转场。
3. 场景内部动效由自己的 paused timeline 管理。
4. 同一支片只选择一个主转场和一至两个强调转场，避免每场都换风格。
5. 旁白、字幕、画面分别拥有时间源；字幕以语音时间戳为准。
6. 预览前执行 lint/check，并对每个 sub-composition 中点做 snapshot。
7. 最终渲染前保留人工审批门。

## 下一步采用方式

新产品宣传片可复制 `templates/hyperframes/product-promo/`，再按 brief 替换 scene
内容。现有 deepdog 和 AI-Remotion promo 不自动迁移，避免无关重构；它们只在下一次
明确修订时逐步采用新 contract。
