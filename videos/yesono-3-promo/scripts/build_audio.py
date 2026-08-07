#!/usr/bin/env python3
"""Build scene-aligned CosyVoice narration and derived caption timing."""

from __future__ import annotations

import json
import http.client
import re
import subprocess
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "SCRIPT.md"
TTS_URL = "http://127.0.0.1:8000/inference_sft"
SPEAKER = "中文男"
SAMPLE_RATE = 22_050
SPEED = 1.15


def parse_script() -> list[tuple[int, str]]:
    lines: list[tuple[int, str]] = []
    current: int | None = None
    text: list[str] = []
    for line in SCRIPT.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^## Line \d+ .* \(Frame (\d+)\)$", line)
        if match:
            if current is not None:
                lines.append((current, " ".join(text).strip()))
            current = int(match.group(1))
            text = []
            continue
        if current is not None and line.startswith("    "):
            text.append(line.strip())
    if current is not None:
        lines.append((current, " ".join(text).strip()))
    if len(lines) != 11 or any(not text for _, text in lines):
        raise RuntimeError(f"Expected 11 non-empty SCRIPT.md lines, got {len(lines)}")
    return lines


def synthesize(text: str, pcm_path: Path) -> None:
    boundary = "----yesono-cosyvoice-boundary"
    body = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="tts_text"\r\n\r\n{text}\r\n'
        f'--{boundary}\r\nContent-Disposition: form-data; name="spk_id"\r\n\r\n{SPEAKER}\r\n'
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    payload = b""
    for attempt in range(1, 6):
        try:
            request = urllib.request.Request(
                TTS_URL,
                data=body,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=600) as response:
                payload = response.read()
            break
        except (
            ConnectionResetError,
            http.client.IncompleteRead,
            OSError,
            TimeoutError,
            urllib.error.URLError,
        ) as error:
            if attempt == 5:
                raise
            print(
                f"  retry {attempt}/5 after {type(error).__name__}",
                flush=True,
            )
            time.sleep(min(15, attempt * 3))
    if len(payload) < 2 or len(payload) % 2:
        raise RuntimeError(f"CosyVoice returned invalid PCM for: {text[:32]}")
    pcm_path.write_bytes(payload)


def pcm_to_wav(pcm_path: Path, wav_path: Path) -> None:
    with wave.open(str(wav_path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm_path.read_bytes())


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as source:
        return source.getnframes() / source.getframerate()


def caption_tokens(text: str) -> list[str]:
    tokens: list[str] = []
    for part in re.findall(r"[A-Za-z]+(?:/[A-Za-z]+)?|\d+(?:\.\d+)?|[\u4e00-\u9fff]+|[^\s]", text):
        if re.fullmatch(r"[\u4e00-\u9fff]+", part):
            tokens.extend(part[index : index + 6] for index in range(0, len(part), 6))
        elif part in {"“", "”", '"'} and tokens:
            tokens[-1] += part
        elif re.fullmatch(r"[，。！？：；、——\-]+", part) and tokens:
            tokens[-1] += part
        else:
            tokens.append(part)
    return tokens


def token_weight(token: str) -> float:
    chinese = len(re.findall(r"[\u4e00-\u9fff]", token))
    latin = len(re.findall(r"[A-Za-z0-9]", token))
    return max(1.0, chinese + latin * 0.55)


def derive_words(text: str, duration: float) -> list[dict[str, object]]:
    tokens = caption_tokens(text)
    weights = [token_weight(token) for token in tokens]
    total = sum(weights)
    cursor = 0.05
    usable = max(0.1, duration - 0.12)
    words: list[dict[str, object]] = []
    for index, (token, weight) in enumerate(zip(tokens, weights)):
        token_duration = usable * weight / total
        end = min(duration - 0.02, cursor + token_duration)
        words.append(
            {
                "id": f"w{index}",
                "text": token,
                "start": round(cursor, 3),
                "end": round(max(cursor + 0.02, end), 3),
            }
        )
        cursor = end
    return words


def generate_sfx() -> list[dict[str, object]]:
    sfx_dir = ROOT / "assets" / "sfx"
    sfx_dir.mkdir(parents=True, exist_ok=True)
    specs = {
        "impact": "sine=frequency=92:duration=0.34,afade=t=out:st=0.03:d=0.31,volume=0.26",
        "tick": "sine=frequency=1320:duration=0.09,afade=t=out:st=0.015:d=0.075,volume=0.12",
        "confirm": "sine=frequency=660:duration=0.28,afade=t=out:st=0.04:d=0.24,volume=0.11",
        "whoosh": "anoisesrc=color=pink:duration=0.42,highpass=f=380,lowpass=f=4200,afade=t=in:st=0:d=0.06,afade=t=out:st=0.2:d=0.22,volume=0.08",
    }
    for name, source in specs.items():
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                source,
                "-ar",
                "44100",
                "-ac",
                "1",
                str(sfx_dir / f"{name}.wav"),
            ],
            check=True,
        )
    cue_specs = [
        (1, "impact", 6.1, 0.34, 0.22),
        (2, "tick", 3.0, 0.09, 0.16),
        (3, "whoosh", 5.2, 0.42, 0.18),
        (4, "confirm", 6.2, 0.28, 0.18),
        (5, "impact", 9.2, 0.34, 0.21),
        (6, "whoosh", 5.4, 0.42, 0.16),
        (7, "tick", 2.0, 0.09, 0.15),
        (8, "confirm", 5.6, 0.28, 0.19),
        (9, "impact", 8.0, 0.34, 0.18),
        (10, "tick", 10.0, 0.09, 0.16),
        (11, "confirm", 6.5, 0.28, 0.20),
    ]
    return [
        {
            "frame": frame,
            "file": f"assets/sfx/{name}.wav",
            "offset_s": offset,
            "duration_s": duration,
            "volume": volume,
        }
        for frame, name, offset, duration, volume in cue_specs
    ]


def update_script_timings(scene_meta: list[dict[str, object]]) -> None:
    lines = SCRIPT.read_text(encoding="utf-8").splitlines()
    timing_by_frame: dict[int, tuple[float, float]] = {}
    cursor = 0.0
    for scene in scene_meta:
        frame = int(scene["frame"])
        end = cursor + float(scene["duration_s"])
        timing_by_frame[frame] = (cursor, end)
        cursor = end

    current_frame: int | None = None
    for index, line in enumerate(lines):
        match = re.match(r"^## Line \d+ .* \(Frame (\d+)\)$", line)
        if match:
            current_frame = int(match.group(1))
            continue
        if current_frame is not None and line.startswith("**Time:**"):
            start, end = timing_by_frame[current_frame]
            lines[index] = f"**Time:** {start:.3f} – {end:.3f}s"
            current_frame = None
    SCRIPT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    raw_dir = ROOT / ".audio-work"
    voice_dir = ROOT / "assets" / "voice"
    raw_dir.mkdir(parents=True, exist_ok=True)
    voice_dir.mkdir(parents=True, exist_ok=True)
    voices: list[dict[str, object]] = []
    scene_meta: list[dict[str, object]] = []

    scene_lines = parse_script()
    for frame, text in scene_lines:
        if "YesONO" in text or "Yes/No" in text:
            raise RuntimeError(
                f"Frame {frame} still contains an unexpanded spoken brand token."
            )

    for frame, text in scene_lines:
        pcm_path = raw_dir / f"{frame:02d}.pcm"
        raw_wav_path = raw_dir / f"{frame:02d}.wav"
        output_path = voice_dir / f"{frame:02d}.wav"
        temporary_output_path = voice_dir / f"{frame:02d}.new.wav"
        output_path.unlink(missing_ok=True)
        pcm_path.unlink(missing_ok=True)
        raw_wav_path.unlink(missing_ok=True)
        temporary_output_path.unlink(missing_ok=True)
        print(f"CosyVoice {frame:02d}/11 continuous: {text[:28]}…", flush=True)
        synthesize(text, pcm_path)
        pcm_to_wav(pcm_path, raw_wav_path)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-i",
                str(raw_wav_path),
                "-filter:a",
                f"atempo={SPEED}",
                "-ar",
                "22050",
                "-ac",
                "1",
                str(temporary_output_path),
            ],
            check=True,
        )
        temporary_output_path.replace(output_path)
        duration = round(wav_duration(output_path), 3)
        words = derive_words(text, duration)
        voices.append(
            {
                "frame": frame,
                "path": f"assets/voice/{frame:02d}.wav",
                "duration_s": duration,
                "words": words,
            }
        )
        scene_meta.append(
            {
                "frame": frame,
                "duration_s": duration,
                "speaker": SPEAKER,
                "speed": SPEED,
                "text": text,
            }
        )
        pcm_path.unlink(missing_ok=True)
        raw_wav_path.unlink(missing_ok=True)

    raw_dir.rmdir()
    update_script_timings(scene_meta)
    metadata = {
        "provider": "cosyvoice",
        "voice": SPEAKER,
        "speed": SPEED,
        "requests": 11,
        "synthesis": "one continuous request per scene",
        "bgm": None,
        "bgm_note": "No local BGM provider is supported by the established repository workflow.",
        "voices": voices,
        "sfx": generate_sfx(),
    }
    (ROOT / "audio_meta.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (ROOT / "audio_scene_meta.json").write_text(
        json.dumps(
            {
                "provider": "cosyvoice",
                "voice": SPEAKER,
                "speed": SPEED,
                "requests": 11,
                "synthesis": "one continuous request per scene",
                "total_duration_s": round(sum(item["duration_s"] for item in scene_meta), 3),
                "scenes": scene_meta,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        f"Generated {len(voices)} scene voices, "
        f"{sum(item['duration_s'] for item in scene_meta):.3f}s total."
    )


if __name__ == "__main__":
    main()
