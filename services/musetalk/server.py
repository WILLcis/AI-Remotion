"""Private, serialized MuseTalk adapter for AI-Remotion scene clips."""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

MUSE_TALK_DIR = Path(os.environ["MUSE_TALK_DIR"]).resolve()
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
INFERENCE_LOCK = asyncio.Lock()

app = FastAPI(title="AI-Remotion MuseTalk")


@app.get("/health")
def health() -> dict[str, str]:
    return {"model_dir": str(MUSE_TALK_DIR / "models"), "status": "ok"}


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
        raise HTTPException(status_code=413, detail="upload exceeds 15 MiB limit")

    async with INFERENCE_LOCK:
        work_dir = Path(tempfile.mkdtemp(prefix="ai-remotion-musetalk-"))
        try:
            photo_path = work_dir / "portrait.jpg"
            audio_path = work_dir / "speech.wav"
            source_video_path = work_dir / "source.mp4"
            result_dir = work_dir / "result"
            config_path = work_dir / "inference.yaml"
            output_path = result_dir / "v15" / "avatar.mp4"
            photo_path.write_bytes(photo_bytes)
            audio_path.write_bytes(audio_bytes)

            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-loop",
                    "1",
                    "-i",
                    str(photo_path),
                    "-i",
                    str(audio_path),
                    "-shortest",
                    "-r",
                    "25",
                    "-pix_fmt",
                    "yuv420p",
                    str(source_video_path),
                ],
                check=True,
                cwd=MUSE_TALK_DIR,
                capture_output=True,
            )
            config_path.write_text(
                yaml.safe_dump(
                    {
                        "task_0": {
                            "audio_path": str(audio_path),
                            "result_name": "avatar.mp4",
                            "video_path": str(source_video_path),
                        }
                    }
                )
            )
            subprocess.run(
                [
                    "python",
                    "-m",
                    "scripts.inference",
                    "--inference_config",
                    str(config_path),
                    "--result_dir",
                    str(result_dir),
                    "--unet_model_path",
                    "models/musetalkV15/unet.pth",
                    "--unet_config",
                    "models/musetalkV15/musetalk.json",
                    "--version",
                    "v15",
                ],
                check=True,
                cwd=MUSE_TALK_DIR,
                capture_output=True,
                timeout=900,
            )
            if not output_path.exists() or output_path.stat().st_size == 0:
                raise HTTPException(status_code=502, detail="MuseTalk did not produce a clip")
            response_path = work_dir / "response.mp4"
            shutil.copyfile(output_path, response_path)
            return FileResponse(
                response_path,
                media_type="video/mp4",
                background=BackgroundTask(shutil.rmtree, work_dir, ignore_errors=True),
                filename="avatar.mp4",
            )
        except subprocess.TimeoutExpired as error:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=504, detail="MuseTalk timed out") from error
        except subprocess.CalledProcessError as error:
            logging.error(
                "MuseTalk inference failed: %s",
                error.stderr.decode(errors="replace") if error.stderr else error,
            )
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=502, detail="MuseTalk inference failed") from error
        except Exception:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise
