#!/usr/bin/env node
/**
 * MiniMax H3 v2 — text-safe prompts + VO-duration-locked segment lengths.
 * Fixes: garbled on-screen Chinese, irrelevant copy, speech/visual desync.
 */
import {mkdirSync, readFileSync, writeFileSync, existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));
const repo = path.resolve(project, "../..");
const clips = JSON.parse(readFileSync(path.join(project, "clips.json"), "utf8"));
const timingsPath = path.join(project, "audio/cosyvoice/timings.json");
const promptsDir = path.join(project, "prompts-v2");
mkdirSync(promptsDir, {recursive: true});

const TEXT_LAW = [
  "【文字铁律——违反即废片】",
  "1) 画面上最多出现本段「允许文字」列表中的字符串，必须字形正确、无错别字、无缺笔、无乱码。",
  "2) 禁止任何未列出的中文/英文/数字/标语/水印/UI假文案/乱码字符。",
  "3) 若无法保证文字正确，该镜头完全不要文字，只做抽象光效、几何体、网格、图标与运动。",
  "4) 旁白由后期配音，本段视频不要生成人声口播。",
  "5) 最高清晰度，ultra sharp，1344x768，硬切或极快闪白，不要慢溶解，不要卡通，不要真人，不要非 YesONO 品牌。",
].join("\n");

const STYLE = [
  "暗夜藏青背景 #0A101C，金铜 #D4B36A，冷港蓝 #6FA3DC，翡翠绿 #6FC2A0。",
  "极简金融科技发布会视觉：干净留白、轻微推近与视差、锐利边缘。",
].join("");

/** One locked title card string per part (graphics-first). */
const ALLOWED = {
  "01": [
    {focus: "金色问句标题浮现，四周网格向中心点亮；几乎只有标题。", allow: ["想开一家交易所？"]},
    {focus: "五个发光模块纵向排列合并，抽象交易所系统，少文字。", allow: ["治理", "市场", "交易", "资金", "做市"]},
    {focus: "金色立体模块定格为印章徽标质感。", allow: ["YesONO 3.0", "把它变成你的生意"]},
  ],
  "02": [
    {focus: "六张深色风险卡片弹出成网格，强调压力，文字仅用允许列表。", allow: ["撮合引擎", "资金账本", "链上清算"]},
    {focus: "卡片红框震动，抽象事故感，尽量少字。", allow: []},
    {focus: "卡片熄灭，中央一句定格。", allow: ["先烧光的是信任"]},
  ],
  "03": [
    {focus: "五层色块快速堆叠成塔。", allow: []},
    {focus: "塔身下沉入平台基座，顶层经营层发光。", allow: ["平台层", "经营层"]},
    {focus: "俯瞰结构，定格一句。", allow: ["你只留经营层"]},
  ],
  "04": [
    {focus: "金色圆环展开为独立经营域。", allow: ["独立经营域"]},
    {focus: "四个卫星标签环绕，外侧暗环被屏障隔开。", allow: ["你的客户", "你的数据"]},
    {focus: "金环放大定格。", allow: ["这是你的地盘"]},
  ],
  "05": [
    {focus: "货架式卡片上架，抽象共享订单簿。", allow: ["共享订单簿"]},
    {focus: "金色专有市场卡片升起并环绕标签。", allow: ["专有市场"]},
    {focus: "三段进度条跑满后定格。", allow: ["以天计，不以年计"]},
  ],
  "06": [
    {focus: "左右分屏：左 Outcome 抽象事件块，右 CFD 行情块，信息密度高但文字极少。", allow: ["Outcome", "CFD"]},
    {focus: "两侧关键词快闪滚动，像信息流而非可读长句。", allow: []},
    {focus: "中间金色 × 合并爆发。", allow: ["你都开得出来"]},
  ],
  "07": [
    {focus: "订单方块穿过四个关卡节点的流水线。", allow: ["风控", "撮合", "入账", "清算"]},
    {focus: "节点点亮并盖通过戳。", allow: ["通过"]},
    {focus: "发光链路脉冲后定格。", allow: ["你不用自己养"]},
  ],
  "08": [
    {focus: "账本逐行写入转粒子流入翡翠链条。", allow: []},
    {focus: "链上区块放大出现对勾。", allow: ["可验证"]},
    {focus: "整链定格翡翠绿标题。", allow: ["不是承诺，是一条可查证的链"]},
  ],
  "09": [
    {focus: "空订单簿虚线深度变饱满柱状图。", allow: []},
    {focus: "做市注入后深度生长。", allow: ["做市商工作台"]},
    {focus: "标签升级后脉冲定格。", allow: ["投行级做市策略"]},
  ],
  "10": [
    {focus: "五条收入曲线并行生长。", allow: []},
    {focus: "曲线汇入上涨条形图。", allow: []},
    {focus: "Outcome 与 CFD 图标碰撞定格。", allow: ["两倍经营面"]},
  ],
  "11": [
    {focus: "左右分屏：平台扛 vs 你专注，关键词快闪。", allow: ["平台扛", "你专注"]},
    {focus: "两侧标题向中碰撞爆发白光。", allow: []},
    {focus: "金色 YesONO 3.0 定格收尾。", allow: ["YesONO 3.0", "你负责生意，交易所交给我们"]},
  ],
};

function snapSeconds(sec) {
  // Keep within H3-friendly 4–6s band for VRAM; VO lock happens at assemble.
  return Math.max(4, Math.min(6, Math.round(sec * 10) / 10));
}

const voById = {};
if (existsSync(timingsPath)) {
  const timings = JSON.parse(readFileSync(timingsPath, "utf8"));
  for (const s of timings.segments) voById[s.id] = s.duration;
}

const segments = [];
let seed = 914100;

for (const clip of clips.clips) {
  const vo = voById[clip.id] || 15;
  const parts = ALLOWED[clip.id];
  const each = snapSeconds(vo / parts.length);

  parts.forEach((part, wi) => {
    const allowLine =
      part.allow.length === 0
        ? "允许文字：无（本段禁止一切可读文字）"
        : `允许文字（仅这些，逐字正确）：${part.allow.map((t) => `「${t}」`).join(" ")}`;
    const prompt = [
      STYLE,
      TEXT_LAW,
      `Clip ${clip.id}「${clip.title}」第 ${wi + 1}/${parts.length} 段，约 ${each}s。`,
      `画面重点：${part.focus}`,
      allowLine,
      "用抽象图形与光效讲故事；不要长段落，不要无关营销文案。",
    ].join("\n");

    writeFileSync(path.join(promptsDir, `clip_${clip.id}_p${wi + 1}.txt`), `${prompt}\n`);
    segments.push({
      seconds: each,
      seed: seed++,
      caption: wi === 0 ? clip.caption : "",
      clip_id: clip.id,
      vo_duration: vo,
      part: wi + 1,
      prompt,
    });
  });
}

const job = {
  id: "yesono_promo_11x15_minimax_v2_clean",
  width: 1344,
  height: 768,
  steps: 24,
  continuity_first_frame: false,
  notes:
    "v2 text-safe: allowlisted on-screen strings only. Segment lengths ~VO/3. Final assemble time-warps each clip trio to exact CosyVoice duration.",
  segments,
};

const jobPath = path.join(repo, "scripts/h3-longform", `${job.id}.json`);
writeFileSync(jobPath, `${JSON.stringify(job, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      job_path: jobPath,
      segments: segments.length,
      vo_locked_clips: Object.keys(voById).length,
      sample_seconds: segments.slice(0, 3).map((s) => s.seconds),
    },
    null,
    2,
  ),
);
