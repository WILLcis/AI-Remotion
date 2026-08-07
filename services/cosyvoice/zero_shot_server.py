"""Private FastAPI adapter for CosyVoice 3 zero-shot synthesis."""

from __future__ import annotations

import asyncio
import os
import tempfile
from pathlib import Path

import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from cosyvoice.cli.cosyvoice import AutoModel

MODEL_DIR = os.environ["COSYVOICE_MODEL_DIR"]
MAX_PROMPT_BYTES = 10 * 1024 * 1024
SAMPLE_RATE = 24_000
COSYVOICE3_PROMPT_PREFIX = "You are a helpful assistant.<|endofprompt|>"
INFERENCE_LOCK = asyncio.Lock()

app = FastAPI(title="AI-Remotion CosyVoice 3")
model = AutoModel(model_dir=MODEL_DIR)


@app.get("/health")
def health() -> dict[str, str | int]:
    return {
        "model_dir": MODEL_DIR,
        "sample_rate": SAMPLE_RATE,
        "status": "ok",
    }


@app.get("/model-info")
def model_info() -> dict[str, str | int]:
    model_path = Path(MODEL_DIR)
    return {
        "model_dir": MODEL_DIR,
        "model_name": model_path.name,
        "sample_rate": SAMPLE_RATE,
        "endpoints": "health,model-info,inference_zero_shot",
        "status": "ok" if model_path.exists() else "missing",
    }


@app.post("/inference_zero_shot")
async def inference_zero_shot(
    tts_text: str = Form(...),
    prompt_text: str = Form(...),
    prompt_wav: UploadFile = File(...),
) -> Response:
    if not tts_text.strip() or not prompt_text.strip():
        raise HTTPException(status_code=422, detail="tts_text and prompt_text are required")

    prompt_bytes = await prompt_wav.read(MAX_PROMPT_BYTES + 1)
    if len(prompt_bytes) == 0 or len(prompt_bytes) > MAX_PROMPT_BYTES:
        raise HTTPException(status_code=413, detail="prompt_wav must be 1-10 MiB")

    formatted_prompt_text = (
        prompt_text
        if "<|endofprompt|>" in prompt_text
        else f"{COSYVOICE3_PROMPT_PREFIX}{prompt_text}"
    )

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as prompt_file:
        prompt_file.write(prompt_bytes)
        prompt_path = Path(prompt_file.name)

    try:
        async with INFERENCE_LOCK:
            chunks = [
                result["tts_speech"].cpu()
                for result in model.inference_zero_shot(
                    tts_text,
                    formatted_prompt_text,
                    str(prompt_path),
                )
            ]
        if not chunks:
            raise HTTPException(status_code=502, detail="CosyVoice returned no audio")
        speech = torch.cat(chunks, dim=1).squeeze().numpy()
        pcm = (np.clip(speech, -1, 1) * 32767).astype(np.int16).tobytes()
        return Response(
            content=pcm,
            media_type="application/octet-stream",
            headers={"X-AI-Remotion-Sample-Rate": str(SAMPLE_RATE)},
        )
    finally:
        prompt_path.unlink(missing_ok=True)
