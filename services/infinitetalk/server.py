"""Private, serialized InfiniteTalk adapter for AI-Remotion scene clips."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

INFINITETALK_DIR = Path(os.environ["INFINITETALK_DIR"]).resolve()
INFINITETALK_QUANT = os.environ.get("INFINITETALK_QUANT", "").strip()
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
INFERENCE_LOCK = asyncio.Lock()

app = FastAPI(title="AI-Remotion InfiniteTalk")


@app.get("/health")
def health() -> dict[str, str]:
    checkpoints = {
        "infinitetalk": INFINITETALK_DIR
        / "weights"
        / "InfiniteTalk"
        / "single"
        / "infinitetalk.safetensors",
        "wan": INFINITETALK_DIR / "weights" / "Wan2.1-I2V-14B-480P",
        "wav2vec": INFINITETALK_DIR / "weights" / "chinese-wav2vec2-base",
    }
    return {
        name: "ready" if checkpoint.exists() else "missing"
        for name, checkpoint in checkpoints.items()
    } | {
        "quant": INFINITETALK_QUANT or "disabled",
        "status": "ok",
    }


@app.post("/generate")
async def generate(
    photo: UploadFile = File(...),
    audio: UploadFile = File(...),
) -> FileResponse:
    photo_bytes = await photo.read(MAX_UPLOAD_BYTES + 1)
    audio_bytes = await audio.read(MAX_UPLOAD_BYTES + 1)
    if not photo_bytes or not audio_bytes:
        raise HTTPException(status_code=422, detail="photo and audio are required")
    if len(photo_bytes) > MAX_UPLOAD_BYTES or len(audio_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="upload exceeds 50 MiB limit")
    if not (photo.content_type or "").startswith("image/"):
        raise HTTPException(status_code=422, detail="photo must be an image")

    async with INFERENCE_LOCK:
        work_dir = Path(tempfile.mkdtemp(prefix="ai-remotion-infinitetalk-"))
        try:
            photo_path = work_dir / "portrait.png"
            audio_path = work_dir / "speech.wav"
            input_path = work_dir / "input.json"
            generated_base = work_dir / "generated"
            generated_path = generated_base.with_suffix(".mp4")
            silent_path = work_dir / "response.mp4"
            photo_path.write_bytes(photo_bytes)
            audio_path.write_bytes(audio_bytes)
            validate_wav(audio_path)
            input_path.write_text(
                json.dumps(
                    {
                        "prompt": (
                            "A single professional Chinese presenter faces the camera, "
                            "speaking naturally with subtle facial expressions and head motion. "
                            "Keep the same person, clothes, background, and camera framing."
                        ),
                        "cond_audio": {"person1": str(audio_path)},
                        "cond_video": str(photo_path),
                    }
                ),
                encoding="utf-8",
            )

            command = [
                sys.executable,
                "generate_infinitetalk.py",
                "--ckpt_dir",
                "weights/Wan2.1-I2V-14B-480P",
                "--wav2vec_dir",
                "weights/chinese-wav2vec2-base",
                "--input_json",
                str(input_path),
                "--size",
                "infinitetalk-480",
                "--sample_steps",
                "40",
                "--mode",
                "streaming",
                "--motion_frame",
                "9",
                "--infinitetalk_dir",
                "weights/InfiniteTalk/single/infinitetalk.safetensors",
                "--save_file",
                str(generated_base),
            ]
            if INFINITETALK_QUANT:
                command.extend(
                    [
                        "--quant",
                        INFINITETALK_QUANT,
                        "--quant_dir",
                        f"weights/InfiniteTalk/quant_models/infinitetalk_single_{INFINITETALK_QUANT}.safetensors",
                        "--num_persistent_param_in_dit",
                        "0",
                    ],
                )

            subprocess.run(
                command,
                check=True,
                cwd=INFINITETALK_DIR,
                capture_output=True,
                env={
                    **os.environ,
                    "PATH": f"{Path(sys.executable).parent}{os.pathsep}{os.environ.get('PATH', '')}",
                },
                timeout=2_700,
            )
            if not generated_path.exists() or generated_path.stat().st_size == 0:
                raise HTTPException(status_code=502, detail="InfiniteTalk did not produce a clip")

            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(generated_path),
                    "-map",
                    "0:v:0",
                    "-an",
                    "-c:v",
                    "libx264",
                    "-pix_fmt",
                    "yuv420p",
                    str(silent_path),
                ],
                check=True,
                capture_output=True,
            )
            return FileResponse(
                silent_path,
                media_type="video/mp4",
                background=BackgroundTask(shutil.rmtree, work_dir, ignore_errors=True),
                filename="avatar.mp4",
            )
        except subprocess.TimeoutExpired as error:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=504, detail="InfiniteTalk timed out") from error
        except subprocess.CalledProcessError as error:
            logging.error(
                "InfiniteTalk inference failed: %s",
                error.stderr.decode(errors="replace") if error.stderr else error,
            )
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=502, detail="InfiniteTalk inference failed") from error
        except Exception:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise


def validate_wav(audio_path: Path) -> None:
    try:
        with wave.open(str(audio_path), "rb") as wav:
            if wav.getframerate() != 16_000 or wav.getnchannels() != 1:
                raise HTTPException(
                    status_code=422,
                    detail="audio must be a 16kHz mono PCM WAV",
                )
    except wave.Error as error:
        raise HTTPException(status_code=422, detail="audio must be a PCM WAV") from error
