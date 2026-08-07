#!/usr/bin/env python3
"""Sync YesONO timeline/captions to measured CosyVoice WAV durations."""

from __future__ import annotations

import json
import math
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOICE_DIR = ROOT / "assets" / "voice"
PAD = 0.4  # scene hold after narration ends
TRANSITIONS = [
    ("zoom-through", 0.4),
    ("squeeze", 0.4),
    ("crossfade", 0.5),
    ("push-slide", 0.5),
    ("zoom-through", 0.4),
    ("push-slide", 0.5),
    ("blur-crossfade", 0.6),
    ("squeeze", 0.4),
    ("push-slide", 0.5),
    ("blur-crossfade", 0.6),
]
SCENE_SLUGS = [
    "01-operator-open",
    "02-hidden-cost",
    "03-exchange-os",
    "04-tenant-boundary",
    "05-shared-private",
    "06-outcome-cfd",
    "07-order-flow",
    "08-verifiable-finality",
    "09-liquidity",
    "10-revenue-surfaces",
    "11-close",
]
SFX = [
    ("impact", 0.6, 0.34, 0.22),
    ("tick", 0.25, 0.09, 0.16),
    ("whoosh", 0.38, 0.42, 0.18),
    ("confirm", 0.65, 0.28, 0.18),
    ("impact", 0.55, 0.34, 0.21),
    ("whoosh", 0.22, 0.42, 0.16),
    ("tick", 0.2, 0.09, 0.15),
    ("confirm", 0.55, 0.28, 0.19),
    ("impact", 0.5, 0.34, 0.18),
    ("tick", 0.5, 0.09, 0.16),
    ("confirm", 0.55, 0.28, 0.2),
]


def ffprobe_duration(path: Path) -> float:
    raw = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        text=True,
    ).strip()
    return round(float(raw), 3)


def parse_script_lines() -> list[str]:
    lines: list[str] = []
    current: list[str] = []
    for line in (ROOT / "SCRIPT.md").read_text(encoding="utf-8").splitlines():
        if re.match(r"^## Line \d+ .* \(Frame \d+\)$", line):
            if current:
                lines.append(" ".join(current).strip())
            current = []
            continue
        if line.startswith("    "):
            current.append(line.strip())
    if current:
        lines.append(" ".join(current).strip())
    if len(lines) != 11:
        raise RuntimeError(f"Expected 11 SCRIPT lines, got {len(lines)}")
    return lines


def caption_tokens(text: str) -> list[str]:
    tokens: list[str] = []
    for part in re.findall(
        r"[A-Za-z]+(?:/[A-Za-z]+)?|\d+(?:\.\d+)?|[\u4e00-\u9fff]+|[^\s]", text
    ):
        if re.fullmatch(r"[\u4e00-\u9fff]+", part):
            tokens.extend(part[i : i + 6] for i in range(0, len(part), 6))
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


def derive_words(text: str, duration: float, start_offset: float = 0.0) -> list[dict]:
    tokens = caption_tokens(text)
    weights = [token_weight(token) for token in tokens]
    total = sum(weights)
    cursor = start_offset + 0.05
    usable = max(0.1, duration - 0.12)
    words = []
    for index, (token, weight) in enumerate(zip(tokens, weights)):
        token_duration = usable * weight / total
        end = min(start_offset + duration - 0.02, cursor + token_duration)
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


def group_words(words: list[dict], frame: int, group_size: int = 4) -> list[dict]:
    groups = []
    for index in range(0, len(words), group_size):
        chunk = words[index : index + group_size]
        groups.append(
            {
                "id": f"caption-group-{len(groups)}",
                "frame": frame,
                "start": chunk[0]["start"],
                "end": chunk[-1]["end"],
                "text": " ".join(word["text"] for word in chunk),
                "words": [
                    {
                        "id": f"caption-word-{len(groups)}-{word_index}",
                        "text": word["text"],
                        "start": word["start"],
                        "end": word["end"],
                    }
                    for word_index, word in enumerate(chunk)
                ],
            }
        )
    return groups


def transition_js(kind: str, out_id: str, in_id: str, at: float, duration: float) -> str:
    if kind == "zoom-through":
        return (
            f'tl.to("#{out_id}", {{ scale: 2.5, opacity: 0, filter: "blur(8px)", duration: {duration}, ease: "power3.in" }}, {at});\n'
            f'        tl.fromTo("#{in_id}", {{ scale: 0.5, opacity: 0, filter: "blur(8px)" }}, {{ scale: 1, opacity: 1, filter: "blur(0px)", duration: {duration}, ease: "power3.out" }}, {at});'
        )
    if kind == "squeeze":
        return (
            f'tl.to("#{out_id}", {{ scaleX: 0, transformOrigin: "left center", duration: {duration}, ease: "power3.inOut" }}, {at});\n'
            f'        tl.fromTo("#{in_id}", {{ scaleX: 0, transformOrigin: "right center", opacity: 1 }}, {{ scaleX: 1, transformOrigin: "right center", duration: {duration}, ease: "power3.inOut" }}, {at});'
        )
    if kind == "push-slide":
        return (
            f'tl.to("#{out_id}", {{ x: -1920, duration: {duration}, ease: "power3.inOut" }}, {at});\n'
            f'        tl.fromTo("#{in_id}", {{ x: 1920, opacity: 1 }}, {{ x: 0, duration: {duration}, ease: "power3.inOut" }}, {at});'
        )
    if kind == "blur-crossfade":
        return (
            f'tl.to("#{out_id}", {{ filter: "blur(10px)", scale: 1.03, opacity: 0, duration: {duration}, ease: "power2.inOut" }}, {at});\n'
            f'        tl.fromTo("#{in_id}", {{ filter: "blur(10px)", scale: 0.97, opacity: 0 }}, {{ filter: "blur(0px)", scale: 1, opacity: 1, duration: {duration}, ease: "power2.inOut" }}, {at});'
        )
    return (
        f'tl.to("#{out_id}", {{ opacity: 0, duration: {duration}, ease: "power2.inOut" }}, {at});\n'
        f'        tl.fromTo("#{in_id}", {{ opacity: 0 }}, {{ opacity: 1, duration: {duration}, ease: "power2.inOut" }}, {at});'
    )


def write_index(starts: list[float], scene_durs: list[float], voice_durs: list[float], total: float) -> None:
    blocks = []
    for index, slug in enumerate(SCENE_SLUGS):
        scene_id = f"el-{slug}"
        track = 0 if index % 2 == 0 else 1
        blocks.append(
            f'      <div id="{scene_id}" class="scene" data-composition-id="{slug}" data-composition-src="compositions/frames/{slug}.html" data-start="{starts[index]}" data-duration="{scene_durs[index]}" data-track-index="{track}"></div>\n'
            f'      <audio id="{scene_id}-voice" src="assets/voice/{index + 1:02d}.wav" data-start="{starts[index]}" data-duration="{voice_durs[index]}" data-track-index="{10 + index}" data-volume="1"></audio>'
        )
    sfx_blocks = []
    for index, (name, ratio, duration, volume) in enumerate(SFX):
        offset = round(starts[index] + voice_durs[index] * ratio, 3)
        offset = min(offset, max(0.0, total - duration))
        sfx_blocks.append(
            f'      <audio id="el-sfx-{index}" src="assets/sfx/{name}.wav" data-start="{offset}" data-duration="{duration}" data-track-index="{20 + index}" data-volume="{volume}"></audio>'
        )
    transitions = []
    for index, ((kind, duration), at) in enumerate(zip(TRANSITIONS, starts[1:])):
        out_id = f"el-{SCENE_SLUGS[index]}"
        in_id = f"el-{SCENE_SLUGS[index + 1]}"
        transitions.append("        " + transition_js(kind, out_id, in_id, at, duration))
    html = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; }}
      .scene {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1920" data-height="1080">
{chr(10).join(blocks)}

      <div id="el-captions" class="scene" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{total}" data-track-index="2"></div>

{chr(10).join(sfx_blocks)}
    </div>

    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
      (function () {{ var tl = window.__timelines["main"];
{chr(10).join(transitions)}
        tl.to({{}}, {{ duration: {total} }}, 0);
      }})();
    </script>
  </body>
</html>
"""
    (ROOT / "index.html").write_text(html, encoding="utf-8")


def write_captions(groups: list[dict], total: float) -> None:
    payload = json.dumps(groups, ensure_ascii=False)
    html = f"""<template id="captions-template">
  <div data-composition-id="captions" data-width="1920" data-height="1080" data-duration="{total}" id="captions-root">
    <div id="cap"></div>
  </div>
  <style>
    #captions-root {{ position: absolute; inset: 0; pointer-events: none; }}
    #cap {{ position: absolute; left: 0; right: 0; top: 900px; height: 180px; display: flex; align-items: center; justify-content: center; }}
    .caption-group {{ position: absolute; max-width: 80%; padding: 16px 29px; background: rgba(0, 0, 0, 0.72); border-radius: 12px; font-family: Roboto, sans-serif; font-weight: 700; font-size: 41px; line-height: 1.25; text-align: center; color: #fff; opacity: 0; }}
    .caption-word {{ color: rgba(255, 255, 255, 0.55); }}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>
  <script>
    (function () {{
      var GROUPS = {payload};
      var cap = document.getElementById("cap");
      var tl = gsap.timeline({{ paused: true }});
      GROUPS.forEach(function (g) {{
        var el = document.createElement("div");
        el.className = "caption-group";
        g.words.forEach(function (w) {{
          var s = document.createElement("span");
          s.className = "caption-word";
          s.textContent = w.text + " ";
          el.appendChild(s);
        }});
        cap.appendChild(el);
        tl.fromTo(el, {{ opacity: 0 }}, {{ opacity: 1, duration: 0.18, overwrite: "auto" }}, g.start);
        tl.to(el, {{ opacity: 0, duration: 0.12, overwrite: "auto" }}, g.end);
        tl.set(el, {{ opacity: 0, visibility: "hidden" }}, g.end + 0.12);
        g.words.forEach(function (w, i) {{
          tl.to(el.children[i], {{ color: "#ffffff", duration: 0.06 }}, w.start);
        }});
      }});
      tl.to({{}}, {{ duration: {total} }}, 0);
      window.__timelines = window.__timelines || {{}};
      window.__timelines["captions"] = tl;
    }})();
  </script>
</template>
"""
    (ROOT / "compositions" / "captions.html").write_text(html, encoding="utf-8")


def update_script_timings(starts: list[float], voice_durs: list[float]) -> None:
    lines = (ROOT / "SCRIPT.md").read_text(encoding="utf-8").splitlines()
    current = None
    for index, line in enumerate(lines):
        match = re.match(r"^## Line \d+ .* \(Frame (\d+)\)$", line)
        if match:
            current = int(match.group(1))
            continue
        if current is not None and line.startswith("**Time:**"):
            start = starts[current - 1]
            end = start + voice_durs[current - 1]
            lines[index] = f"**Time:** {start:.3f} – {end:.3f}s"
            current = None
    (ROOT / "SCRIPT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    texts = parse_script_lines()
    voice_durs = [ffprobe_duration(VOICE_DIR / f"{index:02d}.wav") for index in range(1, 12)]
    starts: list[float] = []
    scene_durs: list[float] = []
    cursor = 0.0
    for index, voice_duration in enumerate(voice_durs):
        starts.append(round(cursor, 3))
        if index < len(voice_durs) - 1:
            scene_duration = round(voice_duration + PAD, 3)
        else:
            scene_duration = round(voice_duration, 3)
        scene_durs.append(scene_duration)
        cursor = round(cursor + voice_duration, 3)
    total = round(starts[-1] + scene_durs[-1], 3)

    voices = []
    groups: list[dict] = []
    for index, (text, duration, start) in enumerate(zip(texts, voice_durs, starts), start=1):
        local_words = derive_words(text, duration, 0.0)
        absolute_words = [
            {
                **word,
                "start": round(word["start"] + start, 3),
                "end": round(word["end"] + start, 3),
            }
            for word in local_words
        ]
        voices.append(
            {
                "frame": index,
                "path": f"assets/voice/{index:02d}.wav",
                "duration_s": duration,
                "words": local_words,
            }
        )
        groups.extend(group_words(absolute_words, index))

    metadata = {
        "provider": "cosyvoice",
        "voice": "中文男",
        "speed": 1.15,
        "requests": 11,
        "synthesis": "one continuous request per scene",
        "bgm": None,
        "bgm_note": "No local BGM provider is supported by the established repository workflow.",
        "voices": voices,
        "sfx": [
            {
                "frame": index + 1,
                "file": f"assets/sfx/{name}.wav",
                "offset_s": round(starts[index] + voice_durs[index] * ratio, 3),
                "duration_s": duration,
                "volume": volume,
            }
            for index, (name, ratio, duration, volume) in enumerate(SFX)
        ],
    }
    (ROOT / "audio_meta.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (ROOT / "audio_scene_meta.json").write_text(
        json.dumps(
            {
                "provider": "cosyvoice",
                "voice": "中文男",
                "speed": 1.15,
                "requests": 11,
                "synthesis": "one continuous request per scene",
                "total_duration_s": total,
                "scenes": [
                    {
                        "frame": index + 1,
                        "duration_s": voice_durs[index],
                        "speaker": "中文男",
                        "speed": 1.15,
                        "text": texts[index],
                    }
                    for index in range(11)
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (ROOT / "caption_groups.json").write_text(
        json.dumps(groups, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    update_script_timings(starts, voice_durs)
    write_index(starts, scene_durs, voice_durs, total)
    write_captions(groups, total)
    print(json.dumps({"total_duration_s": total, "voice_durs": voice_durs, "starts": starts}))


if __name__ == "__main__":
    main()
