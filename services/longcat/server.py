"""Private, serialized LongCat Avatar 1.5 adapter for AI-Remotion clips."""

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

LONGCAT_DIR = Path(os.environ["LONGCAT_DIR"]).resolve()
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_AUDIO_SECONDS = 120
SEGMENT_SECONDS = 3.2
FIRST_SEGMENT_SECONDS = 3.72
INFERENCE_LOCK = asyncio.Lock()

app = FastAPI(title="AI-Remotion LongCat Avatar")


@app.get("/health")
def health() -> dict[str, str]:
    checkpoints = {
        "avatar": (
            LONGCAT_DIR
            / "weights"
            / "LongCat-Video-Avatar-1.5"
            / "base_model_int8"
            / "config.json"
        ),
        "base": LONGCAT_DIR / "weights" / "LongCat-Video",
        "runner": LONGCAT_DIR / "run_demo_avatar_single_lowmem.py",
    }
    return {
        name: "ready" if checkpoint.exists() else "missing"
        for name, checkpoint in checkpoints.items()
    } | {"status": "ok"}


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
        work_dir = Path(tempfile.mkdtemp(prefix="ai-remotion-longcat-"))
        try:
            photo_path = work_dir / "portrait.png"
            audio_path = work_dir / "speech.wav"
            input_path = work_dir / "input.json"
            output_dir = work_dir / "output"
            silent_path = work_dir / "response.mp4"
            photo_path.write_bytes(photo_bytes)
            audio_path.write_bytes(audio_bytes)
            audio_seconds = validate_wav(audio_path)
            input_path.write_text(
                json.dumps(
                    {
                        "prompt": (
                            "A single professional presenter faces the camera, speaking "
                            "naturally with subtle facial expressions and head motion. "
                            "Keep the same person, clothes, background, and camera framing."
                        ),
                        "cond_audio": {"person1": str(audio_path)},
                        "cond_image": str(photo_path),
                    }
                ),
                encoding="utf-8",
            )
            num_segments = segment_count(audio_seconds)
            command = [
                sys.executable,
                "-m",
                "torch.distributed.run",
                "--standalone",
                "--nproc_per_node=1",
                "run_demo_avatar_single_lowmem.py",
                "--checkpoint_dir",
                "./weights/LongCat-Video-Avatar-1.5",
                "--input_json",
                str(input_path),
                "--resolution",
                "480p",
                "--num_segments",
                str(num_segments),
                "--output_dir",
                str(output_dir),
            ]
            subprocess.run(
                command,
                check=True,
                cwd=LONGCAT_DIR,
                capture_output=True,
                env={
                    **os.environ,
                    "PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
                },
                timeout=2_700,
            )
            generated_path = (
                output_dir / "final_video.mp4"
                if num_segments > 1
                else output_dir / "segment_001.mp4"
            )
            if not generated_path.exists() or generated_path.stat().st_size == 0:
                raise HTTPException(status_code=502, detail="LongCat did not produce a clip")
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
            raise HTTPException(status_code=504, detail="LongCat timed out") from error
        except subprocess.CalledProcessError as error:
            logging.error(
                "LongCat inference failed: %s",
                error.stderr.decode(errors="replace") if error.stderr else error,
            )
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=502, detail="LongCat inference failed") from error
        except Exception:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise


def validate_wav(audio_path: Path) -> float:
    try:
        with wave.open(str(audio_path), "rb") as wav:
            if wav.getframerate() != 16_000 or wav.getnchannels() != 1:
                raise HTTPException(
                    status_code=422,
                    detail="audio must be a 16kHz mono PCM WAV",
                )
            duration_seconds = wav.getnframes() / wav.getframerate()
    except wave.Error as error:
        raise HTTPException(status_code=422, detail="audio must be a PCM WAV") from error
    if duration_seconds > MAX_AUDIO_SECONDS:
        raise HTTPException(
            status_code=422,
            detail=f"audio must be at most {MAX_AUDIO_SECONDS} seconds",
        )
    return duration_seconds


def segment_count(audio_seconds: float) -> int:
    if audio_seconds <= FIRST_SEGMENT_SECONDS:
        return 1
    return 1 + int(
        (audio_seconds - FIRST_SEGMENT_SECONDS + SEGMENT_SECONDS - 0.001)
        // SEGMENT_SECONDS
    )
