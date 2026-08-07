import {readFileSync, writeFileSync} from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const meta = JSON.parse(readFileSync(path.join(root, "audio_meta.json"), "utf8"));
const sceneIds = {
  "01-hook": "01-hook",
  "02-build-pain": "02-build-pain",
  "03-exchange-os": "03-exchange-os",
  "04-tenant": "frame-04-tenant",
  "05-list-market": "frame-05-list-market",
  "06-outcome-cfd": "frame-06-outcome-cfd",
  "07-order-flow": "order-flow-07",
  "08-onchain": "onchain-08",
  "09-liquidity": "liquidity-09",
  "10-revenue": "frame-10-revenue",
  "11-close": "frame-11-close"
};
const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sceneStart = (index) => index * 15;
const sceneRows = meta.voices.map((voice, index) => {
  const start = sceneStart(index);
  const compositionId = sceneIds[voice.id];
  return `<div id="scene-${voice.id}" class="scene" data-composition-id="${compositionId}" data-composition-src="compositions/frames/${voice.id}.html" data-start="${start}" data-duration="15" data-track-index="${index % 2}" data-width="1344" data-height="768"></div><audio id="voice-${voice.id}" src="${voice.path}" data-start="${start}" data-duration="15" data-track-index="10" data-volume="1"></audio>`;
}).join("\n");
const transitions = meta.voices.slice(1).map((voice, index) => {
  const start = sceneStart(index + 1);
  const previous = meta.voices[index].id;
  return `tl.to("#scene-${previous}",{opacity:0,duration:.12,ease:"none"},${start}).fromTo("#scene-${voice.id}",{opacity:0},{opacity:1,duration:.12,ease:"none"},${start});`;
}).join("");
const indexHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=1344,height=768"><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><style>*{box-sizing:border-box}html,body{margin:0;width:1344px;height:768px;overflow:hidden;background:#0A101C}#root{position:relative;width:1344px;height:768px;overflow:hidden}.scene{position:absolute;inset:0;width:1344px;height:768px}</style></head><body><div id="root" data-composition-id="yesono-3-heygen-promo" data-start="0" data-duration="165" data-width="1344" data-height="768">${sceneRows}<div id="captions-host" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="165" data-track-index="2" data-width="1344" data-height="768"></div></div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});${transitions}tl.to({}, {duration:165},0);window.__timelines["yesono-3-heygen-promo"]=tl;</script></body></html>`;
writeFileSync(path.join(root, "index.html"), indexHtml);
const captions = [];
for (const [sceneIndex, voice] of meta.voices.entries()) {
  for (let wordIndex = 0; wordIndex < voice.words.length; wordIndex += 20) {
    const words = voice.words.slice(wordIndex, wordIndex + 20);
    const text = words.map((word) => word.text).join("").replaceAll("yesor", "yes or").replaceAll("Yesor", "Yes or");
    captions.push({start: sceneStart(sceneIndex) + words[0].start, end: sceneStart(sceneIndex) + words.at(-1).end, text});
  }
}
const captionRows = captions.map((caption, index) => `<div id="caption-${index}" class="caption clip" data-start="${caption.start}" data-duration="${Math.max(.05, caption.end - caption.start)}" data-track-index="0">${escapeHtml(caption.text)}</div>`).join("");
const captionsHtml = `<!doctype html><html lang="zh-CN"><body><template><style>#captions-root{position:absolute;inset:0;width:1344px;height:768px;pointer-events:none}.caption{position:absolute;left:50%;bottom:48px;transform:translateX(-50%);max-width:1080px;padding:13px 24px;border:1px solid rgba(212,179,106,.42);border-radius:8px;background:rgba(5,9,16,.88);color:#F4F0E8;font:600 31px/1.4 "PingFang SC","Hiragino Sans GB",sans-serif;text-align:center;white-space:normal;box-shadow:0 10px 34px rgba(0,0,0,.35)}</style><div id="captions-root" data-composition-id="captions" data-start="0" data-duration="165" data-width="1344" data-height="768" data-layout-allow-overlap>${captionRows}</div><script>window.__timelines=window.__timelines||{};window.__timelines["captions"]=gsap.timeline({paused:true});</script></template></body></html>`;
writeFileSync(path.join(root, "compositions/captions.html"), captionsHtml);
const srtTime = (seconds) => {
  const milliseconds = Math.round(seconds * 1000);
  const hours = String(Math.floor(milliseconds / 3600000)).padStart(2, "0");
  const minutes = String(Math.floor(milliseconds % 3600000 / 60000)).padStart(2, "0");
  const secs = String(Math.floor(milliseconds % 60000 / 1000)).padStart(2, "0");
  return `${hours}:${minutes}:${secs},${String(milliseconds % 1000).padStart(3, "0")}`;
};
writeFileSync(path.join(root, "captions.srt"), captions.map((caption, index) => `${index + 1}\n${srtTime(caption.start)} --> ${srtTime(caption.end)}\n${caption.text}\n`).join("\n"));
