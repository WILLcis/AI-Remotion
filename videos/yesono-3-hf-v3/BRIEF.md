---
workflow: product-launch-video
flow: automation
storyboard: no
message: "YesONO 3.0 — exchange OS you brand as your business; script-faithful 11×15s fintech promo"
destination: website-and-youtube
aspect: 1920x1080
language: zh-CN
audience: B2B market creators, brokers, traffic/data platforms, market makers
length: "~165s CosyVoice-driven (≤15s/clip)"
angle: operator-business
narration: "yes — CosyVoice 3 zero-shot on cornerstone (Mandarin male ref), sentence pauses, speed ~1.10"
vo_mode: verbatim
---

## Intent

Rebuild the YesONO 3.0 B2B promo in HyperFrames (not MiniMax/HeyGen). Follow `episodes/res/doc/yesono-3-26-b2b-minimax-script.md` beat-for-beat: 11 clips × 4 shots, hard cuts / flash-white transitions, dark fintech tech-feel, CosyVoice Mandarin male VO + burned captions.

## Assets

- Source of truth: `../../episodes/res/doc/yesono-3-26-b2b-minimax-script.md`
- CosyVoice 3 at `http://100.125.33.44:8000` (Tailscale / Fun-CosyVoice3-0.5B-2512)
- No site scrape; no-capture design system from script palette

## Customizations

- No storyboard review gate. check → render.
- Each clip = 4 shot layers matching script 分镜时间轴; shot changes use hard cut or ~80ms white flash.
- Spoken YesONO = "Yes or No"; on-screen brand stays YesONO.
- Scene duration = measured WAV duration + 0.08s gap (except last).
- Maximize motion density: grid light-up, overshoot cards, stamp hits, depth bars grow, particle/data flows, parallax push/pull.

## Notes

- Palette: ink #0A101C, brass #D4B36A, harbor #6FA3DC, jade #6FC2A0, alert #E85D5D.
- No cartoons, no real people, no non-YesONO brands.
