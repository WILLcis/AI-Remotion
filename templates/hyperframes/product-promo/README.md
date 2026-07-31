# HyperFrames Product Promo Template

AI-Remotion 的可复用产品宣传片起始模板。它吸收了官方
`hyperframes-launches` 项目中可泛化的工程模式，但未复制其品牌素材、
音乐、成片或项目源码。

## Included patterns

- 薄的主时间线加独立 scene compositions。
- 连续场景使用固定的主转场，重点场景使用单一强调转场。
- 字幕按语音时间独立挂载，不绑定场景边界。
- 单一、暂停、可 seek 的 GSAP timeline。
- 禁止运行时网络数据、未设种子的随机数和系统时钟。
- 所有 sub-composition 的 ID、host ID 和 timeline key 严格一致。

## Use

1. 复制整个目录到 `episodes/<episode-id>/hyperframes/`。
2. 修改文案、颜色和 scene compositions；不要改变 mount contract。
3. 如需旁白，在根 composition 中添加连续 `<audio>` 轨，并用真实逐字时间更新字幕。
4. 运行：

```bash
cd templates/hyperframes/product-promo
npx hyperframes lint
npx hyperframes check
npx hyperframes snapshot --at 2,6,10
```

检查通过后再进入 preview 和 render 审批流程。

## Licensing boundary

`hyperframes-launches` 本地副本没有 LICENSE 文件，因此这里只借鉴公开的目录组织、
时间线和视觉编排思想。若未来需要移植具体 launch composition 或素材，必须先取得
明确许可并记录来源。
