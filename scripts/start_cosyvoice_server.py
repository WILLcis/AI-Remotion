#!/usr/bin/env python3
"""Bootstrap CosyVoice FastAPI with offline wetext (modelscope API 403 workaround)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

COSY_ROOT = Path(os.environ.get("COSYVOICE_ROOT", "/Users/kksthinkpad/res/code/py/CosyVoice"))
WETEXT_DIR = Path(
    os.environ.get(
        "WETEXT_DIR",
        str(Path.home() / ".cache/modelscope/hub/pengzhendong/wetext"),
    )
)
PORT = os.environ.get("COSYVOICE_PORT", "8000")
MODEL_DIR = os.environ.get("COSYVOICE_MODEL_DIR", "pretrained_models/CosyVoice-300M-SFT")

os.chdir(COSY_ROOT)
sys.path.insert(0, str(COSY_ROOT))
sys.path.insert(0, str(COSY_ROOT / "third_party/Matcha-TTS"))
sys.path.insert(0, str(COSY_ROOT / "runtime/python/fastapi"))


def _patch_wetext_offline() -> None:
    if not (WETEXT_DIR / "zh/tn/tagger.fst").exists():
        raise SystemExit(f"wetext cache missing: {WETEXT_DIR}")

    import modelscope.hub.snapshot_download as sd

    orig = sd.snapshot_download

    def local_snapshot_download(model_id, *args, **kwargs):  # noqa: ANN001
        if str(model_id).endswith("pengzhendong/wetext") or model_id == "pengzhendong/wetext":
            return str(WETEXT_DIR)
        return orig(model_id, *args, **kwargs)

    sd.snapshot_download = local_snapshot_download

    import wetext.wetext as wetext_mod

    wetext_mod.snapshot_download = local_snapshot_download


_patch_wetext_offline()

sys.argv = ["server.py", "--port", PORT, "--model_dir", MODEL_DIR]
import runpy

runpy.run_path(str(COSY_ROOT / "runtime/python/fastapi/server.py"), run_name="__main__")
