#!/usr/bin/env python3
"""MiniMax-H3 long-form via multi-segment ComfyUI renders + ffmpeg concat.

H3 Base tops out ~15s per shot. For longer cuts:
  1) split storyboard into <=15s segments
  2) render each at native short-edge 768 (e.g. 1344x768)
  3) optionally condition segment N+1 on last frame of N (FL2VA continuity)
  4) ffmpeg concat (video+audio)
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

COMFY = "http://127.0.0.1:8188"
ROOT = Path("/home/cornerstone/ComfyUI-H3")
OUT = ROOT / "output"
INPUT = ROOT / "input"


def snap_length(seconds: float) -> int:
    """24fps length on H3 17k+5 grid."""
    frames = max(5, int(round(seconds * 24)))
    return frames + (5 - (frames % 17)) % 17


def http_json(method: str, path: str, payload=None, timeout=120):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{COMFY}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = r.read()
        return json.loads(body) if body else {}


def upload_image(path: Path) -> str:
    boundary = "----h3boundary"
    raw = path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{path.name}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + raw + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{COMFY}/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.loads(r.read())
    name = resp.get("name") or path.name
    print(f"uploaded first_frame -> {name}", flush=True)
    return name


def extract_last_frame(video: Path, png: Path) -> None:
    png.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-sseof", "-0.05", "-i", str(video),
            "-frames:v", "1", "-q:v", "2", str(png),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def build_prompt(
    *,
    text: str,
    width: int,
    height: int,
    length: int,
    seed: int,
    steps: int,
    prefix: str,
    first_frame_name: str | None,
) -> dict:
    nodes = {
        "6": {"class_type": "UNETLoader", "inputs": {
            "unet_name": "minimax_h3_fl2va_pruned_int8_convrot.safetensors",
            "weight_dtype": "default"}},
        "13": {"class_type": "CLIPLoader", "inputs": {
            "clip_name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
            "type": "minimax", "device": "default"}},
        "11": {"class_type": "VAELoader", "inputs": {"vae_name": "minimax_h3_video_vae_fp16.safetensors"}},
        "24": {"class_type": "VAELoader", "inputs": {"vae_name": "minimax_h3_audio_vae_fp32.safetensors"}},
        "104": {"class_type": "MiniMaxH3ImageToVideo", "inputs": {
            "clip": ["13", 0], "vae": ["11", 0], "prompt": text,
            "width": width, "height": height, "length": length}},
        "15": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "17": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "res_multistep"}},
        "9": {"class_type": "BasicScheduler", "inputs": {
            "model": ["6", 0], "scheduler": "simple", "steps": steps, "denoise": 1.0}},
        "16": {"class_type": "BasicGuider", "inputs": {"model": ["6", 0], "conditioning": ["104", 0]}},
        "14": {"class_type": "SamplerCustomAdvanced", "inputs": {
            "noise": ["15", 0], "guider": ["16", 0], "sampler": ["17", 0],
            "sigmas": ["9", 0], "latent_image": ["104", 1]}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["14", 0], "vae": ["11", 0]}},
        "23": {"class_type": "VAEDecodeAudio", "inputs": {"samples": ["14", 0], "vae": ["24", 0]}},
        "91": {"class_type": "CreateVideo", "inputs": {
            "images": ["10", 0], "audio": ["23", 0], "fps": 24.0, "bit_depth": 8}},
        "92": {"class_type": "SaveVideo", "inputs": {
            "video": ["91", 0], "filename_prefix": prefix, "format": "mp4", "codec": "h264"}},
    }
    if first_frame_name:
        nodes["100"] = {"class_type": "LoadImage", "inputs": {"image": first_frame_name}}
        nodes["104"]["inputs"]["first_frame"] = ["100", 0]
    return nodes


def wait_prompt(prompt_id: str, poll: float = 15.0) -> dict:
    while True:
        hist = http_json("GET", f"/history/{prompt_id}")
        if prompt_id in hist:
            item = hist[prompt_id]
            status = item.get("status", {}).get("status_str")
            if status == "success":
                return item
            if status in {"error", "interrupted"}:
                raise RuntimeError(f"prompt {prompt_id} failed: {item.get('status')}")
        q = http_json("GET", "/queue")
        running = len(q.get("queue_running", []))
        pending = len(q.get("queue_pending", []))
        print(f"  waiting {prompt_id[:8]}… running={running} pending={pending}", flush=True)
        time.sleep(poll)


def output_video_from_history(item: dict) -> Path:
    outs = item.get("outputs", {})
    for node_out in outs.values():
        for img in node_out.get("images", []):
            name = img["filename"]
            sub = img.get("subfolder") or ""
            typ = img.get("type") or "output"
            base = OUT if typ == "output" else ROOT / typ
            path = base / sub / name if sub else base / name
            if path.exists():
                return path
    raise FileNotFoundError(f"no video in outputs: {outs}")


def concat_videos(paths: list[Path], out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in paths))
    # re-encode for A/V continuity across H3 segment boundaries
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "medium",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out),
        ]
    )
    print(f"stitched -> {out}", flush=True)


def run_job(job: dict) -> Path:
    width = int(job.get("width", 1344))
    height = int(job.get("height", 768))
    steps = int(job.get("steps", 20))
    continuity = bool(job.get("continuity_first_frame", True))
    job_id = job["id"]
    work = OUT / "segments" / job_id
    work.mkdir(parents=True, exist_ok=True)
    segment_paths: list[Path] = []
    continuity_frame_name = None

    for i, seg in enumerate(job["segments"]):
        seconds = float(seg.get("seconds", 10))
        length = snap_length(seconds)
        seed = int(seg.get("seed", 1000 + i))
        prefix = f"video/segments/{job_id}/seg_{i:02d}"
        # Prefer explicit screenshot/first_frame path; else optional continuity from prior clip.
        first_frame_name = None
        if seg.get("first_frame"):
            ff = Path(seg["first_frame"])
            if not ff.is_absolute():
                ff = Path(seg.get("first_frame_base", ROOT)) / ff
            if not ff.exists():
                raise FileNotFoundError(f"first_frame missing: {ff}")
            first_frame_name = upload_image(ff)
        elif continuity and continuity_frame_name:
            first_frame_name = continuity_frame_name
        print(
            f"\n=== segment {i+1}/{len(job['segments'])}: {seconds}s -> length={length} "
            f"{width}x{height} steps={steps} first_frame={bool(first_frame_name)} ===",
            flush=True,
        )
        api = build_prompt(
            text=seg["prompt"],
            width=width,
            height=height,
            length=length,
            seed=seed,
            steps=steps,
            prefix=prefix,
            first_frame_name=first_frame_name,
        )
        resp = http_json("POST", "/prompt", {"prompt": api, "client_id": f"h3-seg-{job_id}-{i}"})
        if resp.get("node_errors"):
            raise RuntimeError(json.dumps(resp["node_errors"], indent=2)[:4000])
        prompt_id = resp["prompt_id"]
        print(f"queued {prompt_id}", flush=True)
        item = wait_prompt(prompt_id)
        video = output_video_from_history(item)
        dest = work / f"seg_{i:02d}.mp4"
        shutil.copy2(video, dest)
        segment_paths.append(dest)
        print(f"segment saved {dest} ({dest.stat().st_size} bytes)", flush=True)

        if continuity and i < len(job["segments"]) - 1 and not job["segments"][i + 1].get("first_frame"):
            png = work / f"seg_{i:02d}_last.png"
            extract_last_frame(dest, png)
            continuity_frame_name = upload_image(png)
        else:
            continuity_frame_name = None

    final = OUT / "stitched" / f"{job_id}.mp4"
    concat_videos(segment_paths, final)

    # Probe real durations so captions can lock to segment boundaries (fixes VO/subtitle drift).
    caption_cues = []
    t0 = 0.0
    for i, p in enumerate(segment_paths):
        dur = probe_duration(p)
        cue = {
            "index": i,
            "path": str(p),
            "seconds_request": job["segments"][i].get("seconds"),
            "duration": dur,
            "start": round(t0, 3),
            "end": round(t0 + dur, 3),
            "caption": job["segments"][i].get("caption") or "",
        }
        caption_cues.append(cue)
        t0 += dur

    meta = {
        "job_id": job_id,
        "width": width,
        "height": height,
        "steps": steps,
        "continuity_first_frame": continuity,
        "segments": caption_cues,
        "output": str(final),
        "total_duration": round(t0, 3),
    }
    (OUT / "stitched" / f"{job_id}.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    (OUT / "stitched" / f"{job_id}.captions.json").write_text(
        json.dumps({"cues": caption_cues, "total_duration": round(t0, 3)}, indent=2, ensure_ascii=False)
    )
    return final


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("job_json", type=Path)
    args = ap.parse_args()
    job = json.loads(args.job_json.read_text())
    final = run_job(job)
    print("DONE", final)


if __name__ == "__main__":
    main()
