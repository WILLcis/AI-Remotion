#!/usr/bin/env python3
"""Natural CosyVoice VO for YesONO HF v3.

Fixes:
- decode PCM at 22050 (model native), not 24000
- native model speed≈1.0 (no harsh ffmpeg atempo unless over budget)
- sentence pauses
- optional instruct for more human broadcast tone
- single voiceover.wav for one-track mix
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
COSY_ROOT = Path(os.environ.get("COSYVOICE_ROOT", "/Users/kksthinkpad/res/code/py/CosyVoice"))
WETEXT_DIR = Path(os.environ.get("WETEXT_DIR", Path.home() / ".cache/modelscope/hub/pengzhendong/wetext"))
OUT = ROOT / "audio" / "cosyvoice"
MODEL_DIR = COSY_ROOT / "pretrained_models" / "CosyVoice-300M-SFT"
SPEAKER = "中文男"
NATIVE_SR = 22050
TARGET_SR = 48000
MODEL_SPEED = 1.08  # slight native speedup inside CosyVoice (not ffmpeg)
MAX_CLIP = 19.5  # prefer natural length over harsh atempo
GAP_SEC = 0.1
SENTENCE_GAP = 0.18
# Prefer SFT for steadier pacing; instruct sometimes over-elongates.
USE_INSTRUCT = False
INSTRUCT = "用自然真人男声播报，沉稳有力，像财经频道主播；语气坚定但不喊麦；标点处自然换气；不要机械腔、不要朗诵腔。"


def run(cmd: list[str]) -> None:
    subprocess.check_call(cmd)


def probe(path: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        text=True,
    ).strip()
    return float(out)


def atempo_filter(factor: float) -> str:
    parts = []
    rem = factor
    while rem > 2.0:
        parts.append("atempo=2.0")
        rem /= 2.0
    while rem < 0.5:
        parts.append("atempo=0.5")
        rem /= 0.5
    parts.append(f"atempo={rem:.4f}")
    return ",".join(parts)


def patch_wetext() -> None:
    import modelscope.hub.snapshot_download as sd
    import wetext.wetext as wetext_mod

    orig = sd.snapshot_download

    def local_snapshot_download(model_id, *args, **kwargs):  # noqa: ANN001
        if str(model_id).endswith("pengzhendong/wetext") or model_id == "pengzhendong/wetext":
            return str(WETEXT_DIR)
        return orig(model_id, *args, **kwargs)

    sd.snapshot_download = local_snapshot_download
    wetext_mod.snapshot_download = local_snapshot_download


def split_sentences(text: str) -> list[str]:
    import re

    parts = [p.strip() for p in re.split(r"(?<=[。！？])", text) if p.strip()]
    merged: list[str] = []
    for p in parts:
        if merged and (len(merged[-1]) < 10 or len(p) < 4):
            merged[-1] += p
        else:
            merged.append(p)
    return merged or [text]


def pcm_to_wav(pcm: Path, wav: Path, speed: float = 1.0) -> None:
    # Soft naturalization: gentle highpass + light compression (not robotic atempo)
    af = [
        f"aresample={TARGET_SR}",
        "highpass=f=70",
        "lowpass=f=11000",
        "acompressor=threshold=-18dB:ratio=2.5:attack=15:release=120:makeup=2",
    ]
    if abs(speed - 1.0) > 0.02:
        af.append(atempo_filter(speed))
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "s16le",
            "-ar",
            str(NATIVE_SR),
            "-ac",
            "1",
            "-i",
            str(pcm),
            "-filter:a",
            ",".join(af),
            "-ar",
            str(TARGET_SR),
            "-ac",
            "1",
            str(wav),
        ]
    )


def main() -> None:
    os.chdir(COSY_ROOT)
    sys.path.insert(0, str(COSY_ROOT))
    sys.path.insert(0, str(COSY_ROOT / "third_party/Matcha-TTS"))
    patch_wetext()

    from cosyvoice.cli.cosyvoice import AutoModel
    import torch
    import numpy as np

    clips = json.loads((ROOT / "clips.json").read_text())
    speaker = clips.get("voice", {}).get("speaker", SPEAKER)

    if OUT.exists():
        for p in OUT.glob("*"):
            if p.is_file():
                p.unlink()
    OUT.mkdir(parents=True, exist_ok=True)

    print("loading CosyVoice…", flush=True)
    model = AutoModel(model_dir=str(MODEL_DIR))
    use_instruct = (
        USE_INSTRUCT
        and hasattr(model, "inference_instruct")
        and model.__class__.__name__ == "CosyVoice"
    )
    print(f"class={model.__class__.__name__} instruct={use_instruct} model_speed={MODEL_SPEED}", flush=True)

    silence = OUT / "silence.wav"
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r={TARGET_SR}:cl=mono",
            "-t",
            str(SENTENCE_GAP),
            str(silence),
        ]
    )

    segments = []
    for idx, clip in enumerate(clips["clips"]):
        stem = f"seg_{idx:02d}"
        # One primary utterance per clip keeps prosody coherent; only split if very long.
        spoken = clip["spoken"]
        sentences = split_sentences(spoken) if len(spoken) > 70 else [spoken]
        if len(sentences) > 3:
            # merge to at most 3 breaths
            q = max(1, (len(sentences) + 2) // 3)
            merged = []
            buf = ""
            for i, s in enumerate(sentences):
                buf += s
                if (i + 1) % q == 0 or i == len(sentences) - 1:
                    merged.append(buf)
                    buf = ""
            sentences = [m for m in merged if m]
        print(f"CosyVoice {clip['id']}/11 ({len(sentences)} parts) …", end=" ", flush=True)
        part_wavs = []
        for si, sentence in enumerate(sentences):
            pcm = OUT / f"{stem}_p{si:02d}.pcm"
            wav = OUT / f"{stem}_p{si:02d}.wav"
            chunks = []
            if use_instruct:
                gen = model.inference_instruct(sentence, speaker, INSTRUCT, stream=False, speed=MODEL_SPEED)
            else:
                gen = model.inference_sft(sentence, speaker, stream=False, speed=MODEL_SPEED)
            for out in gen:
                chunks.append(out["tts_speech"].cpu().numpy().reshape(-1))
            if not chunks:
                raise RuntimeError(f"empty TTS for {clip['id']} part {si}")
            audio = np.concatenate(chunks)
            pcm.write_bytes((audio * 32767.0).astype(np.int16).tobytes())
            pcm_to_wav(pcm, wav, speed=1.0)
            part_wavs.append(wav)
            if si < len(sentences) - 1:
                part_wavs.append(silence)

        concat_list = OUT / f"{stem}_concat.txt"
        concat_list.write_text("".join(f"file '{p}'\n" for p in part_wavs))
        raw = OUT / f"{stem}_raw.wav"
        final = OUT / f"{stem}.wav"
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(raw)])
        dur = probe(raw)
        applied = MODEL_SPEED
        if dur > MAX_CLIP:
            extra = dur / (MAX_CLIP - 0.05)
            applied = MODEL_SPEED * extra
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-v",
                    "error",
                    "-i",
                    str(raw),
                    "-filter:a",
                    atempo_filter(extra),
                    "-ar",
                    str(TARGET_SR),
                    str(final),
                ]
            )
            dur = probe(final)
        else:
            run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-c", "copy", str(final)])
        print(f"{dur:.2f}s speed≈{applied:.2f}", flush=True)
        segments.append(
            {
                "id": clip["id"],
                "title": clip["title"],
                "caption": clip["caption"],
                "spoken": clip["spoken"],
                "path": f"audio/cosyvoice/{stem}.wav",
                "duration": dur,
                "speed": applied,
                "sentences": len(sentences),
            }
        )

    # timeline + single voiceover
    t = 0.0
    timeline = []
    for i, seg in enumerate(segments):
        start = t
        scene = seg["duration"] + (GAP_SEC if i < len(segments) - 1 else 0.0)
        timeline.append({**seg, "start": start, "scene_duration": scene})
        t += scene

    gap = OUT / "gap.wav"
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r={TARGET_SR}:cl=mono",
            "-t",
            str(GAP_SEC),
            str(gap),
        ]
    )
    concat_all = OUT / "concat.txt"
    lines = []
    for i, seg in enumerate(timeline):
        lines.append(f"file '{OUT / Path(seg['path']).name}'")
        if i < len(timeline) - 1:
            lines.append(f"file '{gap}'")
    concat_all.write_text("\n".join(lines) + "\n")
    voiceover = OUT / "voiceover.wav"
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(concat_all), "-c", "copy", str(voiceover)])

    meta = {
        "provider": "cosyvoice",
        "speaker": speaker,
        "speed": MODEL_SPEED,
        "native_sr": NATIVE_SR,
        "instruct": INSTRUCT if use_instruct else None,
        "mix": "single-voiceover",
        "total_duration": t,
        "voiceover": "audio/cosyvoice/voiceover.wav",
        "segments": timeline,
    }
    (ROOT / "audio_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
    (OUT / "timings.json").write_text(json.dumps({"segments": timeline, "total": t}, ensure_ascii=False, indent=2) + "\n")
    print(f"TOTAL {t:.2f}s → audio_meta.json + voiceover.wav", flush=True)


if __name__ == "__main__":
    main()
