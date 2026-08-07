# Audio status

Status: complete.

- Provider: repository-local CosyVoice SFT workflow
- Speaker: `中文男`
- Delivery speed: `1.15×`
- Measured duration: `66.853499s`
- Master: `audio/cosyvoice/voiceover.wav`
- Scene timing: `audio/cosyvoice/timings.json`
- Captions: `captions.srt` and `audio/cosyvoice/captions.srt`

Each frame line was generated as one continuous CosyVoice request, paced to 1.15×, and assembled with 110ms inter-frame gaps. Composition starts, captions, and transitions use the measured audio windows. Requests use a 300-second timeout with three exponential-backoff attempts.

`silencedetect` found only natural punctuation pauses, with the longest internal silence measuring 0.439s; no suspicious long internal gap was detected.

CosyVoice provides speech synthesis only in this repository workflow. No BGM or SFX provider was configured, so none were fabricated or substituted.
