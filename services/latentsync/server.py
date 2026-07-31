"""Private, serialized LatentSync adapter for AI-Remotion scene clips."""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

LATENTSYNC_DIR = Path(os.environ["LATENTSYNC_DIR"]).resolve()
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
INFERENCE_LOCK = asyncio.Lock()

app = FastAPI(title="AI-Remotion LatentSync")


@app.get("/health")
def health() -> dict[str, str]:
    checkpoint = LATENTSYNC_DIR / "checkpoints" / "latentsync_unet.pt"
    return {
        "checkpoint": "ready" if checkpoint.exists() else "missing",
        "status": "ok",
    }


@app.post("/generate")
async def generate(
    source_video: UploadFile = File(...),
    audio: UploadFile = File(...),
) -> FileResponse:
    video_bytes = await source_video.read(MAX_UPLOAD_BYTES + 1)
    audio_bytes = await audio.read(MAX_UPLOAD_BYTES + 1)
    if not video_bytes or not audio_bytes:
        raise HTTPException(status_code=422, detail="source_video and audio are required")
    if len(video_bytes) > MAX_UPLOAD_BYTES or len(audio_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="upload exceeds 50 MiB limit")

    async with INFERENCE_LOCK:
        work_dir = Path(tempfile.mkdtemp(prefix="ai-remotion-latentsync-"))
        try:
            source_path = work_dir / "source.mp4"
            audio_path = work_dir / "speech.wav"
            generated_path = work_dir / "generated.mp4"
            silent_path = work_dir / "response.mp4"
            source_path.write_bytes(video_bytes)
            audio_path.write_bytes(audio_bytes)

            subprocess.run(
                [
                    "python",
                    "-m",
                    "scripts.inference",
                    "--unet_config_path",
                    "configs/unet/stage2_512.yaml",
                    "--inference_ckpt_path",
                    "checkpoints/latentsync_unet.pt",
                    "--inference_steps",
                    "20",
                    "--guidance_scale",
                    "1.5",
                    "--enable_deepcache",
                    "--video_path",
                    str(source_path),
                    "--audio_path",
                    str(audio_path),
                    "--video_out_path",
                    str(generated_path),
                ],
                check=True,
                cwd=LATENTSYNC_DIR,
                capture_output=True,
                timeout=1_800,
            )
            if not generated_path.exists() or generated_path.stat().st_size == 0:
                raise HTTPException(status_code=502, detail="LatentSync did not produce a clip")

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
                    "copy",
                    str(silent_path),
                ],
                check=True,
                cwd=LATENTSYNC_DIR,
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
            raise HTTPException(status_code=504, detail="LatentSync timed out") from error
        except subprocess.CalledProcessError as error:
            logging.error(
                "LatentSync inference failed: %s",
                error.stderr.decode(errors="replace") if error.stderr else error,
            )
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=502, detail="LatentSync inference failed") from error
        except Exception:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise
