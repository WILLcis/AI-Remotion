# YesONO Clip01 · HeyGen + CosyVoice 3 smoke test

## Latest cut

`renders/clip01-heygen-cv3.mp4` — CosyVoice 3 zero-shot cloned from `episodes/res/audio/cosyvoice_male.mp3`, burned Chinese captions.

Reference transcript (unrelated to YesONO script, avoids repeat leakage):
`episodes/res/audio/cosyvoice_male.txt`

## Fixes in this pass

1. **台词重复**：旧参考音色文案就是 YesONO Clip01 本身，和 TTS 文本高度重叠，CosyVoice zero-shot 会复读。已改用官方无关 prompt（`希望你以后能够做的比我还好呦。` + `cv3_alt_ref.wav`），并改为**整段一次合成**。
2. **字幕**：底部烧录中文字幕（PNG overlay）。
3. **更像真人**：取消 1.22× 硬加速；仅做轻 EQ/压缩/响度归一；速度 = 1.0。

## Note on voice identity

当前试片音色来自 CosyVoice 官方 zero-shot 样例（更自然、无复读）。若要用你们自己的男声克隆，需要一段**内容与成片台词无关**的 3–10 秒参考录音 + 准确转写，不能再用 YesONO 脚本当 `prompt_text`。
