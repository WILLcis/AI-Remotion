# deepdog 宣传片工作流记忆

## 目标与当前基线

- 产物：60 秒、1920×1080、30fps 的 deepdog 中文产品宣传片。
- 当前稳定成片：`episodes/deepdog-promo/out/final.mp4`。
- 事实底座：`episodes/res/doc/deepdog-promo-brief.md`。
- 实机素材：`episodes/res/img/image 1.png` 至 `image 8.png`，全部映射到 Hyperframes composition。
- 品牌约束：始终写作 `deepdog`；不得编造效率数据、客户背书、Android 客户端或未实现能力。

## 已验证流水线

1. 从 Brief 提炼约 52 秒中文旁白，保留 8 秒 CTA 收束。
2. 使用官方 `heygen-video` 的脚本、素材分类、风格和 dry-run 规则完成创意预检。
3. 通过 `heygen voice speech create`（Starfish）生成旁白与逐字时间戳。
4. 将实机截图复制为稳定、无空格的资源名，供 Hyperframes ZIP 使用。
5. 在 `episodes/deepdog-promo/hyperframes/index.html` 中制作 60 秒确定性 GSAP 时间线。
6. 字幕不得绑定场景边界；必须直接使用 `audio/heygen-tts.json` 中的逐字时间戳按句显示。
7. 通过 `npm run promo:deepdog` 上传 ZIP，并调用 HeyGen Hyperframes 生成无声画面。
8. 使用 FFmpeg 混入 HeyGen 旁白、低频氛围底噪和场景切换 UI 提示音。
9. 用 `ffprobe` 检查时长、分辨率、帧率和音轨；用关键帧 contact sheet 检查字幕边界和构图。

## 关键文件

- Composition：`episodes/deepdog-promo/hyperframes/index.html`
- 旁白输入：`episodes/deepdog-promo/narration.json`
- HeyGen 音频：`episodes/deepdog-promo/audio/narration.mp3`
- 逐字时间：`episodes/deepdog-promo/audio/heygen-tts.json`
- 渲染 CLI：`src/cli/renderDeepdogPromo.ts`
- Hyperframes client：`src/hyperframes/heygen.ts`
- 同步回归测试：`tests/deepdog-promo.test.ts`
- HeyGen Skills 总则：`state/tasks/heygen-skills-workflow.md`

## 已踩坑与护栏

- Hyperframes 画面本身无音轨，必须在下载后本地混音。
- 场景交叉淡入会提前显示下一幕字幕；字幕必须使用独立全局层。
- GSAP 不应对时间字符串做数值 `textContent` 插值，时间文字应使用离散 `set`。
- 参考片只提取动效语言，不复制其品牌、文案、音乐或专有素材。
- 新风格版本必须使用独立 composition 与输出文件，不覆盖稳定成片。
- HeyGen CLI `v0.5.0` 暂无 Hyperframes 命令，因此只有 Hyperframes 继续使用项目适配器；TTS、素材、Video Agent、头像和翻译统一走官方 CLI / Skills。

## 验证命令

```bash
npm run typecheck
npm test -- --run tests/deepdog-promo.test.ts tests/hyperframes.test.ts
npm run promo:deepdog
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate \
  -of json episodes/deepdog-promo/out/final.mp4
```

## 回滚边界

- 原版只涉及 `episodes/deepdog-promo/hyperframes/` 与 `out/final.mp4`。
- 特效版必须放在 `hyperframes-effects/` 并输出 `out/final-effects.mp4`。
- 删除特效版目录和特效版输出即可完整回滚，不影响原版。
