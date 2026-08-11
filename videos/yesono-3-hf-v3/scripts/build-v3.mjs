#!/usr/bin/env node
/**
 * Build yesono-3-hf-v3: 11 clips × 4 script shots, flash-white cuts, CosyVoice timings.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  artExchangeAsk,
  artFiveLayers,
  artOsModule,
  artSeal,
  artPainEngines,
  artTrustAsh,
  artTower,
  artOpsLayer,
  artTenantRing,
  artMarketShelf,
  artPropMarket,
  artDualProducts,
  artMergeX,
  artOrderPipeline,
  artBlockchain,
  artOrderBook,
  artBudgetBadge,
  artRevenueCurves,
  artBarSurge,
  artCloseSplit,
} from "./viz-art.mjs";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GAP = 0.08;
const FRAMES = path.join(ROOT, "compositions", "frames");
fs.mkdirSync(FRAMES, {recursive: true});

function loadSchedule() {
  const metaPath = path.join(ROOT, "audio_meta.json");
  if (!fs.existsSync(metaPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  if (meta.source === "slowed-existing-raw") return null; // wait for regen
  if (
    !meta.segments?.length ||
    (meta.provider !== "cosyvoice" && meta.provider !== "cosyvoice-clone")
  ) {
    return null;
  }
  const vo = path.join(ROOT, meta.voiceover || "audio/cosyvoice/voiceover.wav");
  if (!fs.existsSync(vo)) return null;
  return meta.segments.map((s) => ({
    id: s.id,
    start: s.start,
    audioDur: s.duration,
    sceneDur: s.scene_duration,
    caption: s.caption,
    spoken: s.spoken,
    path: s.path,
  }));
}

function shot(viz, title, opts = {}) {
  const cls = opts.jade ? "slam jade-text" : opts.brass === false ? "slam" : "slam brass";
  const titleHtml = title
    ? `<div class="overlay-title"><h1 class="${cls}">${title}</h1>${opts.sub ? `<p class="overlay-sub">${opts.sub}</p>` : ""}</div>`
    : "";
  return `<div class="viz-stage">${viz}${titleHtml}</div>`;
}

const CLIPS = [
  {
    file: "01-hook.html",
    id: "01-hook",
    chrome: "YESONO / 01",
    shots: [
      {t: [0, 0.2], html: shot(artExchangeAsk(), "想开一家交易所？")},
      {t: [0.2, 0.47], html: shot(artFiveLayers(), "别自己造轮子")},
      {t: [0.47, 0.73], html: shot(artOsModule(), "交易所操作系统", {brass: false, sub: "治理 · 市场 · 交易 · 资金 · 做市"})},
      {t: [0.73, 1], html: shot(artSeal(), "把它变成你的生意")},
    ],
  },
  {
    file: "02-build-pain.html",
    id: "02-build-pain",
    chrome: "YESONO / 02",
    shots: [
      {t: [0, 0.27], html: shot(artPainEngines(false), "")},
      {t: [0.27, 0.53], html: shot(artPainEngines(false), "门槛看不见", {brass: false})},
      {t: [0.53, 0.8], html: shot(artPainEngines(true), "出错就是事故", {brass: false})},
      {t: [0.8, 1], html: shot(artTrustAsh(), "先烧光的是信任", {brass: false})},
    ],
  },
  {
    file: "03-exchange-os.html",
    id: "03-exchange-os",
    chrome: "YESONO / 03",
    shots: [
      {t: [0, 0.27], html: shot(artTower("stack"), "五层能力组装", {brass: false})},
      {t: [0.27, 0.53], html: shot(artTower("sink"), "平台层下沉", {brass: false})},
      {t: [0.53, 0.8], html: shot(artOpsLayer(), "")},
      {t: [0.8, 1], html: shot(artTower("sink"), "你只留经营层", {brass: false})},
    ],
  },
  {
    file: "04-tenant.html",
    id: "04-tenant",
    chrome: "YESONO / 04",
    shots: [
      {t: [0, 0.27], html: shot(artTenantRing(false), "")},
      {t: [0.27, 0.53], html: shot(artTenantRing(false), "边界清清楚楚", {brass: false})},
      {t: [0.53, 0.73], html: shot(artTenantRing(true), "风险互不牵连", {brass: false})},
      {t: [0.73, 1], html: shot(artTenantRing(false), "这是你的地盘")},
    ],
  },
  {
    file: "05-list-market.html",
    id: "05-list-market",
    chrome: "YESONO / 05",
    shots: [
      {t: [0, 0.27], html: shot(artMarketShelf(), "")},
      {t: [0.27, 0.47], html: shot(artPropMarket(), "")},
      {t: [0.47, 0.73], html: shot(artPropMarket(), "别人抄不走", {brass: false})},
      {t: [0.73, 1], html: shot(artPropMarket(), "以天计，不以年计", {brass: false})},
    ],
  },
  {
    file: "06-outcome-cfd.html",
    id: "06-outcome-cfd",
    chrome: "YESONO / 06",
    shots: [
      {t: [0, 0.27], html: shot(artDualProducts(false), "")},
      {t: [0.27, 0.47], html: shot(artDualProducts(false), "涨跌都是行情", {brass: false})},
      {t: [0.47, 0.73], html: shot(artDualProducts(true), "")},
      {t: [0.73, 1], html: shot(artMergeX(), "你都开得出来", {brass: false})},
    ],
  },
  {
    file: "07-order-flow.html",
    id: "07-order-flow",
    chrome: "YESONO / 07",
    shots: [
      {t: [0, 0.27], html: shot(artOrderPipeline(false), "")},
      {t: [0.27, 0.53], html: shot(artOrderPipeline(true), "")},
      {t: [0.53, 0.8], html: shot(artOrderPipeline(true), "机构级链路", {brass: false})},
      {t: [0.8, 1], html: shot(artOrderPipeline(true), "这支团队，你不用自己养", {brass: false})},
    ],
  },
  {
    file: "08-onchain.html",
    id: "08-onchain",
    chrome: "YESONO / 08",
    shots: [
      {t: [0, 0.27], html: shot(artBlockchain(false), "")},
      {t: [0.27, 0.53], html: shot(artBlockchain(false), "链上取得最终性", {jade: true})},
      {t: [0.53, 0.73], html: shot(artBlockchain(true), "")},
      {t: [0.73, 1], html: shot(artBlockchain(true), "不是承诺，是一条可查证的链", {jade: true})},
    ],
  },
  {
    file: "09-liquidity.html",
    id: "09-liquidity",
    chrome: "YESONO / 09",
    shots: [
      {t: [0, 0.27], html: shot(artOrderBook(false), "")},
      {t: [0.27, 0.53], html: shot(artOrderBook(true), "")},
      {t: [0.53, 0.73], html: shot(artBudgetBadge("$10,000 预算"), "")},
      {t: [0.73, 1], html: shot(artBudgetBadge("投行级做市策略"), "开市第一天就有深度", {brass: false})},
    ],
  },
  {
    file: "10-revenue.html",
    id: "10-revenue",
    chrome: "YESONO / 10",
    shots: [
      {t: [0, 0.27], html: shot(artRevenueCurves(), "")},
      {t: [0.27, 0.53], html: shot(artRevenueCurves(), "五条收入曲线", {brass: false})},
      {t: [0.53, 0.73], html: shot(artBarSurge(), "")},
      {t: [0.73, 1], html: shot(artMergeX(), "两倍经营面", {brass: false})},
    ],
  },
  {
    file: "11-close.html",
    id: "11-close",
    chrome: "YESONO / 11",
    shots: [
      {t: [0, 0.27], html: shot(artCloseSplit(), "")},
      {t: [0.27, 0.53], html: shot(artCloseSplit(), "平台扛 · 你专注", {brass: false})},
      {t: [0.53, 0.73], html: shot(artSeal(), "YesONO 3.0")},
      {t: [0.73, 1], html: shot(artSeal(), "你负责生意，交易所交给我们", {brass: false})},
    ],
  },
];

const CSS = `
@font-face{font-family:"Songti SC";src:local("Songti SC"),local("STSong"),local("Noto Serif CJK SC")}
@font-face{font-family:"PingFang SC";src:local("PingFang SC"),local("Hiragino Sans GB"),local("Microsoft YaHei"),local("Noto Sans CJK SC")}
@font-face{font-family:"JetBrains Mono";src:local("JetBrains Mono"),local("SF Mono"),local("Menlo"),local("Consolas")}
:root{--ink:#0A101C;--panel:#131C2E;--text:#E8EEF7;--dim:#AEBED2;--faint:#8798B0;--jade:#6FC2A0;--harbor:#6FA3DC;--brass:#D4B36A;--alert:#E85D5D}
*{box-sizing:border-box;margin:0;padding:0}
#root{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;color:var(--text);font-family:"PingFang SC",sans-serif;background:var(--ink)}
.ground{position:absolute;inset:0;overflow:hidden;background:radial-gradient(circle at 72% 18%,rgba(111,163,220,.16),transparent 32%),radial-gradient(circle at 18% 86%,rgba(212,179,106,.12),transparent 30%),var(--ink)}
.grid-line{position:absolute;background:rgba(159,176,199,.09)}.grid-h{left:0;right:0;height:1px}.grid-v{top:0;bottom:0;width:1px}
.chrome{position:absolute;left:72px;right:72px;top:42px;display:flex;justify-content:space-between;align-items:center;font-family:"JetBrains Mono",monospace;color:var(--faint);font-size:16px;letter-spacing:.18em;z-index:5}
.progress{width:420px;height:2px;background:rgba(159,176,199,.15)}.progress-fill{height:100%;background:var(--brass);transform-origin:left center;transform:scaleX(0)}
.flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:20}
.shot{position:absolute;inset:0;opacity:0;display:flex;align-items:center;justify-content:center}
.hero-center{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:120px 96px}
.slam{font-family:"Songti SC",serif;font-size:84px;line-height:1.15;text-align:center;font-weight:600}
.slam.bras,.brass{color:var(--brass)}.jade-text{color:var(--jade)}
.layer-col{display:flex;flex-direction:column;gap:12px;margin-top:18px}
.layer-chip,.pain-card,.shelf-card,.tower-block,.sat,.node,.module-card,.pane{background:var(--panel);border:1px solid rgba(159,176,199,.22)}
.layer-chip{min-width:280px;padding:16px 22px;text-align:center;box-shadow:0 0 24px rgba(111,163,220,.12)}.layer-chip b{font-size:28px}
.module-card{position:relative;padding:48px 64px;text-align:center;min-width:420px}
.module-card.big{min-width:560px}.brass-border{border-color:rgba(212,179,106,.65)}.jade-border{border-color:rgba(111,194,160,.65)}
.module-glow{position:absolute;inset:-30px;background:radial-gradient(circle,rgba(212,179,106,.25),transparent 60%);z-index:0}
.module-title{position:relative;font-family:"Songti SC",serif;font-size:64px;color:var(--brass);z-index:1}
.module-sub{position:relative;margin-top:16px;font-family:"JetBrains Mono",monospace;letter-spacing:.16em;color:var(--dim);z-index:1}
.seal{width:180px;height:180px;border-radius:50%;border:2px solid var(--brass);display:flex;align-items:center;justify-content:center;font-family:"Songti SC",serif;font-size:36px;color:var(--brass);box-shadow:0 0 40px rgba(212,179,106,.35)}
.card-grid-6{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;width:1400px;padding:140px 80px}
.pain-card{min-height:160px;padding:28px}.pain-card span{font-family:"JetBrains Mono",monospace;color:var(--faint);letter-spacing:.14em}.pain-card b{display:block;margin-top:18px;font-size:30px}
.alert-card{border-color:var(--alert)!important;box-shadow:0 0 0 1px rgba(232,93,93,.35)}
.tower{display:flex;flex-direction:column;gap:10px;width:520px}
.tower-block{height:88px;display:flex;align-items:center;justify-content:center;font-size:28px;border-color:rgba(111,163,220,.4)}
.tower-block.top{border-color:var(--brass);color:var(--brass);height:110px;font-size:34px}
.platform-base{margin-top:18px;padding:22px;text-align:center;background:#0B1220;border:1px solid rgba(111,163,220,.45);font-family:"JetBrains Mono",monospace;letter-spacing:.14em;color:var(--harbor)}
.tag-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:22px}
.tag{padding:10px 16px;border:1px solid rgba(159,176,199,.28);font-family:"JetBrains Mono",monospace;letter-spacing:.08em;color:var(--dim)}
.ring-core{position:relative;width:420px;height:420px;display:flex;align-items:center;justify-content:center}
.ring-a{position:absolute;inset:0;border:2px solid var(--brass);border-radius:50%;box-shadow:0 0 50px rgba(212,179,106,.25)}
.ring-label{font-family:"Songti SC",serif;font-size:42px;color:var(--brass)}
.orbit{position:relative}.sat{position:absolute;padding:16px 18px;min-width:150px;text-align:center}
.sat-0{top:18%;left:12%}.sat-1{top:18%;right:12%}.sat-2{bottom:18%;left:12%}.sat-3{bottom:22%;right:14%}
.multi-ring{gap:0}.ring-dim{position:absolute;width:260px;height:260px;border:1px solid rgba(159,176,199,.25);border-radius:50%;left:18%;top:38%;opacity:.45}.ring-dim.r2{left:auto;right:14%;top:28%}
.barrier{position:absolute;width:2px;height:520px;background:linear-gradient(to bottom,transparent,var(--brass),transparent);opacity:.7}
.shelf{width:1500px}.shelf-title{font-family:"Songti SC",serif;font-size:40px;margin-bottom:28px;color:var(--harbor)}.shelf-row{display:flex;gap:16px}.shelf-card{flex:1;height:220px;display:flex;align-items:center;justify-content:center;font-size:28px}
.split{display:grid;grid-template-columns:1fr 1fr;width:1680px;height:720px;gap:24px}.pane{padding:48px;display:flex;flex-direction:column;justify-content:center}.pane.empty{opacity:0;border:none;background:transparent}
.pane h2{font-family:"Songti SC",serif;font-size:48px;margin-bottom:18px}.brass-pane{border-color:rgba(212,179,106,.55);background:rgba(212,179,106,.08)}.harbor-pane{border-color:rgba(111,163,220,.55);background:rgba(111,163,220,.08)}
.ticker-col{display:flex;flex-direction:column;gap:14px;font-family:"JetBrains Mono",monospace;font-size:28px;color:var(--dim)}
.x-merge{font-size:120px;color:var(--brass);text-shadow:0 0 40px rgba(212,179,106,.55)}.x-merge.small{font-size:42px;font-family:"JetBrains Mono",monospace;letter-spacing:.12em}
.pipeline{display:flex;align-items:center;gap:18px;width:1600px}.node{min-width:220px;min-height:180px;padding:24px;text-align:center}.node b{display:block;margin-top:24px;font-size:28px}.node i{display:block;margin-top:28px;color:var(--jade);font-style:normal;font-family:"JetBrains Mono",monospace;letter-spacing:.14em;opacity:0}
.node.on i{opacity:1}.link{flex:1;height:3px;background:linear-gradient(90deg,transparent,var(--harbor),transparent)}.packet{position:absolute;width:16px;height:16px;border-radius:50%;background:var(--brass);box-shadow:0 0 18px var(--brass)}
.ledger-pane{width:720px;display:flex;flex-direction:column;gap:12px}.led-row{padding:18px 22px;border:1px solid rgba(111,194,160,.35);background:rgba(111,194,160,.08);font-family:"JetBrains Mono",monospace;letter-spacing:.08em}
.chain-row{display:flex;gap:18px}.block{width:120px;height:120px;border:1px solid var(--jade);background:rgba(111,194,160,.12);box-shadow:0 0 24px rgba(111,194,160,.2)}.check{font-size:72px;color:var(--jade);margin-bottom:8px}
.depth{display:flex;align-items:flex-end;gap:24px;width:1400px;height:560px}.depth .side{flex:1;display:flex;align-items:flex-end;gap:10px;height:100%}.depth i{flex:1;display:block;background:rgba(111,163,220,.35);border-top:3px solid var(--harbor);transform-origin:bottom}.depth .ask i{background:rgba(212,179,106,.28);border-top-color:var(--brass)}
.depth .mid{width:180px;text-align:center;padding-bottom:40px;font-family:"JetBrains Mono",monospace;color:var(--faint)}.mm{position:absolute;top:160px;left:50%;transform:translateX(-50%);padding:14px 22px;border:1px solid var(--brass);color:var(--brass);font-family:"JetBrains Mono",monospace;letter-spacing:.14em}
.curves{width:1400px;height:520px;position:relative}.curve{position:absolute;left:0;right:0;height:3px;top:calc(80px + var(--i)*70px);background:linear-gradient(90deg,var(--brass),var(--harbor),var(--jade));transform-origin:left center;transform:scaleX(0);box-shadow:0 0 12px rgba(111,163,220,.35)}
.rev-list{width:1200px;display:flex;flex-direction:column;gap:14px}.rev-row{display:grid;grid-template-columns:280px 1fr;align-items:center;gap:18px;padding:18px 22px;border:1px solid rgba(159,176,199,.2);background:var(--panel)}.rev-row i{display:block;height:10px;background:linear-gradient(90deg,var(--brass),rgba(212,179,106,.2));transform-origin:left;transform:scaleX(0)}
.bar-surge{width:220px;height:420px;border:1px solid rgba(212,179,106,.45);display:flex;align-items:flex-end}.bar-surge i{display:block;width:100%;height:100%;background:linear-gradient(to top,var(--brass),rgba(212,179,106,.2));transform-origin:bottom;transform:scaleY(0)}
.progress-steps{position:relative;width:980px;display:flex;justify-content:space-between;margin-bottom:36px;font-family:"JetBrains Mono",monospace;color:var(--dim)}.progress-steps .bar{position:absolute;left:0;right:0;bottom:-18px;height:4px;background:rgba(159,176,199,.2)}.progress-steps .bar i{display:block;height:100%;width:100%;background:var(--brass);transform-origin:left;transform:scaleX(0)}
.tagline{margin-top:28px;font-size:32px;color:var(--dim);letter-spacing:.08em}
.ico{width:56px;height:56px;display:block;margin:0 auto 10px}
.ico.seal-svg,.seal-svg{width:160px;height:160px;margin-bottom:18px}
.pain-card.rich .ico,.layer-chip.rich .ico,.sat.rich .ico{width:44px;height:44px;margin-bottom:8px}
.stage{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.stage.dual{display:grid;grid-template-columns:42% 58%;gap:24px;padding:120px 80px;align-items:center}
.bg-wrap{position:absolute;inset:80px 60px 120px;opacity:.55;pointer-events:none}
.bg-art{width:100%;height:100%}
.ray-ring{position:absolute;width:520px;height:520px;border:1px solid rgba(212,179,106,.35);border-radius:50%;box-shadow:0 0 80px rgba(212,179,106,.15)}
.glow-text{text-shadow:0 0 28px rgba(212,179,106,.45)}
.module-3d{display:flex;flex-direction:column;align-items:center;gap:18px}
.orbit-sparks i{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--brass);box-shadow:0 0 16px var(--brass);top:50%;left:50%;margin:-5px}
.orbit-sparks i:nth-child(1){transform:translate(180px,0)}.orbit-sparks i:nth-child(2){transform:translate(-160px,40px)}.orbit-sparks i:nth-child(3){transform:translate(40px,-170px)}.orbit-sparks i:nth-child(4){transform:translate(-120px,-120px)}.orbit-sparks i:nth-child(5){transform:translate(140px,130px)}
.ash-stack{position:relative;width:220px;height:80px;margin-bottom:12px}.ash-stack i{position:absolute;left:10%;right:10%;height:10px;background:rgba(232,93,93,.35);border-radius:4px}.ash-stack i:nth-child(1){top:10px}.ash-stack i:nth-child(2){top:32px;opacity:.7}.ash-stack i:nth-child(3){top:54px;opacity:.4}
.tower-block{display:flex;align-items:center;justify-content:space-between;padding:0 28px}.tower-block em{font-style:normal;font-family:"JetBrains Mono",monospace;color:var(--harbor);letter-spacing:.12em}
.tower-block.dim{opacity:.35;transform:scale(.96)}
.sunk-stack{display:flex;flex-direction:column;gap:8px;max-height:220px;overflow:hidden;opacity:.55}
.ring-b{position:absolute;inset:-36px;border:1px dashed rgba(111,163,220,.35);border-radius:50%}
.ring-label.small{font-size:28px}
.barrier.h{width:520px;height:2px;top:50%;left:50%;margin-left:-260px}
.territory-map{width:420px;height:280px;border:2px solid var(--brass);border-radius:40% 60% 55% 45%/50% 40% 60% 50%;background:radial-gradient(circle at 40% 40%,rgba(212,179,106,.2),transparent 60%);box-shadow:0 0 40px rgba(212,179,106,.2);margin-bottom:18px}
.shelf-card .mini-bars{height:90px;display:flex;align-items:flex-end;gap:4px;margin-bottom:14px}.shelf-card .mini-bars i{flex:1;background:rgba(111,163,220,.35);border-top:2px solid var(--harbor);transform-origin:bottom}
.spark-ring{position:absolute;inset:-24px;border:1px solid rgba(212,179,106,.4);border-radius:12px}
.illus{display:flex;justify-content:center;margin:18px 0}.illus .ico{width:72px;height:72px}.illus.big .ico{width:120px;height:120px}
.burst{position:absolute;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.55),transparent 60%);opacity:0}
.pipeline-wrap{display:flex;flex-direction:column;align-items:center;gap:28px}
.order-chip{padding:10px 18px;border:1px solid var(--brass);color:var(--brass);font-family:"JetBrains Mono",monospace;letter-spacing:.16em;background:rgba(212,179,106,.1)}
.link{position:relative}.link .flow,.link.lit{background:linear-gradient(90deg,transparent,var(--harbor),transparent)}
.flow{position:absolute;inset:0;transform-origin:left}
.team-ghost{display:flex;gap:18px;margin-bottom:18px;opacity:.85}
.chain-link{width:24px;height:4px;background:var(--jade);align-self:center}
.block em{display:flex;height:100%;align-items:center;justify-content:center;font-style:normal;font-family:"JetBrains Mono",monospace;color:var(--jade)}
.chain-glow{margin-bottom:12px;filter:drop-shadow(0 0 18px rgba(111,194,160,.55))}
.mid.dashed{border:1px dashed rgba(159,176,199,.35);padding:18px;border-radius:8px}
.coin-stack{display:flex;gap:8px;justify-content:center;margin-top:18px}.coin-stack i{width:28px;height:28px;border-radius:50%;border:2px solid var(--brass);background:rgba(212,179,106,.2)}
.curves-wrap{width:1400px;height:520px}.curve-svg{width:100%;height:100%}.curve-path{stroke-dasharray:1400;stroke-dashoffset:1400}
.particles-up{position:absolute;width:220px;height:420px;pointer-events:none}.particles-up em{position:absolute;bottom:0;left:calc(10% + var(--i)*14%);width:6px;height:6px;border-radius:50%;background:var(--brass);opacity:.0}
.copy-side{padding-right:20px}.art-side{display:flex;justify-content:center}
.subhead{font-family:"Songti SC",serif;font-size:48px;color:var(--dim);margin-bottom:24px}
.mm .ico{display:inline-block;width:28px;height:28px;vertical-align:middle;margin:0 0 0 8px}
.viz-stage{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.viz{width:min(1680px,92%);height:min(860px,78%);overflow:visible}
.viz.seal-big{width:420px;height:420px}
.overlay-title{position:absolute;left:80px;right:80px;bottom:110px;z-index:4;text-align:center;pointer-events:none}
.overlay-title .slam{font-size:72px;text-shadow:0 8px 40px rgba(0,0,0,.65),0 0 28px rgba(212,179,106,.25)}
.overlay-sub{margin-top:14px;font-family:"JetBrains Mono",monospace;letter-spacing:.14em;color:var(--dim);font-size:22px}
.viz-stage .overlay-title.top{bottom:auto;top:120px}
.depth-bar,.mini-bar,.surge{transform-box:fill-box;transform-origin:bottom center}
.rail-fill,.curve-path{transform-box:fill-box;transform-origin:left center}
.order-packet{transform-box:fill-box}
`;

function gridHtml() {
  const hs = Array.from({length: 11}, (_, i) => `<span class="grid-line grid-h" style="top:${70 + i * 90}px"></span>`).join("");
  const vs = Array.from({length: 16}, (_, i) => `<span class="grid-line grid-v" style="left:${60 + i * 120}px"></span>`).join("");
  return `<div data-layout-ignore>${hs}${vs}</div>`;
}

function frameHtml(clip, duration) {
  const D = Number(duration.toFixed(6));
  const shots = clip.shots
    .map(
      (s, i) =>
        `<div id="${clip.id}-shot-${i + 1}" class="shot shot-${i + 1} clip" data-start="0" data-duration="${D}" data-track-index="${i + 1}" data-layout-allow-overlap>${s.html}</div>`,
    )
    .join("\n");
  const bounds = JSON.stringify(clip.shots.map((s) => s.t));
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"></head><body>
<template>
<style>${CSS}</style>
<div id="root" data-composition-id="${clip.id}" data-start="0" data-duration="${D}" data-width="1920" data-height="1080">
  <div id="ground-${clip.id}" class="clip ground" data-start="0" data-duration="${D}" data-track-index="0" data-layout-allow-overlap>
    ${gridHtml()}
    <div class="chrome"><span>${clip.chrome}</span><div class="progress"><div class="progress-fill"></div></div><span>YESONO 3.0</span></div>
    ${shots}
    <div id="${clip.id}-flash" class="flash clip" data-start="0" data-duration="${D}" data-track-index="12"></div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
(function(){
  var D=${D};
  var bounds=${bounds};
  var root='[data-composition-id="${clip.id}"]';
  var tl=gsap.timeline({paused:true});
  var flash=root+' .flash';
  bounds.forEach(function(b,i){
    var start=b[0]*D, end=b[1]*D, dur=Math.max(0.2,end-start);
    var sel=root+' .shot-'+(i+1);
    if(i===0){
      tl.fromTo(sel,{opacity:0,scale:1.04},{opacity:1,scale:1,duration:0.28,ease:'power3.out',immediateRender:false},0.02);
    } else {
      tl.to(flash,{opacity:0.85,duration:0.04,ease:'none',immediateRender:false},start-0.04);
      tl.to(flash,{opacity:0,duration:0.08,ease:'power2.out',immediateRender:false},start);
      tl.set(root+' .shot-'+i,{opacity:0},start);
      tl.fromTo(sel,{opacity:0,scale:1.05,y:18},{opacity:1,scale:1,y:0,duration:0.32,ease:'power4.out',immediateRender:false},start);
    }
    Array.from(document.querySelectorAll(sel+' .candle, '+sel+' .orb, '+sel+' .engine, '+sel+' .tower-layer, '+sel+' .shelf-item, '+sel+' .chip, '+sel+' .pipe-node, '+sel+' .chain-block, '+sel+' .led-line, '+sel+' .sat-lab, '+sel+' .ops-tag, '+sel+' .orbit-tag')).forEach(function(el,j){
      tl.fromTo(el,{opacity:0,y:28,scale:0.9},{opacity:1,y:0,scale:1,duration:0.38,ease:'back.out(1.5)',immediateRender:false},start+0.06+j*0.045);
    });
    Array.from(document.querySelectorAll(sel+' .coin, '+sel+' .iso-cube, '+sel+' .ex-building, '+sel+' .tenant-core, '+sel+' .prop-card, '+sel+' .mm-badge, '+sel+' .badge, '+sel+' .pane-left, '+sel+' .pane-right')).forEach(function(el,j){
      tl.fromTo(el,{opacity:0,scale:0.86},{opacity:1,scale:1,duration:0.5,ease:'power3.out',immediateRender:false},start+0.08+j*0.06);
    });
    Array.from(document.querySelectorAll(sel+' .curve-path')).forEach(function(el,j){
      var len=1400;
      el.style.strokeDasharray=String(len);
      el.style.strokeDashoffset=String(len);
      tl.fromTo(el,{strokeDashoffset:len},{strokeDashoffset:0,duration:0.95,ease:'power2.out',immediateRender:false},start+0.1+j*0.07);
    });
    Array.from(document.querySelectorAll(sel+' .depth-bar, '+sel+' .mini-bar, '+sel+' .surge')).forEach(function(el,j){
      tl.fromTo(el,{scaleY:0},{scaleY:1,duration:0.55,ease:'power3.out',immediateRender:false},start+0.1+j*0.035);
    });
    Array.from(document.querySelectorAll(sel+' .particle, '+sel+' .spark, '+sel+' .tick, '+sel+' .ash')).forEach(function(el,j){
      tl.fromTo(el,{opacity:0,y:16},{opacity:0.95,y:-18-(j%4)*10,duration:0.65,ease:'power2.out',immediateRender:false},start+0.15+j*0.04);
    });
    Array.from(document.querySelectorAll(sel+' .order-packet')).forEach(function(el){
      tl.fromTo(el,{x:0},{x:1180,duration:Math.min(2.4,dur*0.7),ease:'power1.inOut',immediateRender:false},start+0.15);
    });
    Array.from(document.querySelectorAll(sel+' .rail-fill')).forEach(function(el){
      tl.fromTo(el,{scaleX:0},{scaleX:1,duration:0.7,ease:'power2.out',immediateRender:false},start+0.2);
    });
    Array.from(document.querySelectorAll(sel+' .x-mark, '+sel+' .burst-ring')).forEach(function(el,j){
      tl.fromTo(el,{opacity:0,scale:0.4},{opacity:1,scale:1+(j*0.4),duration:0.35,ease:'back.out(1.8)',immediateRender:false},start+0.12+j*0.05);
    });
    var slam=document.querySelector(sel+' .overlay-title .slam');
    if(slam){
      tl.fromTo(slam,{opacity:0,scale:1.16,y:24},{opacity:1,scale:1,y:0,duration:0.42,ease:'power4.out',immediateRender:false},start+0.12);
    }
    tl.fromTo(sel+' .viz',{scale:1},{scale:1.04,duration:Math.max(0.4,dur-0.25),ease:'none',immediateRender:false},start+0.2);
  });
  tl.fromTo(root+' .progress-fill',{scaleX:0},{scaleX:1,duration:Math.max(0.2,D-0.1),ease:'none',immediateRender:false},0.05);
  tl.to({}, {duration:D}, 0);
  window.__timelines=window.__timelines||{};
  window.__timelines["${clip.id}"]=tl;
})();
</script>
</template>
</body></html>
`;
}

function buildCaptions(schedule, total) {
  const cues = [];
  schedule.forEach((seg) => {
    // Split caption into ~2 chunks across the scene for readability
    const text = seg.caption;
    const mid = Math.floor(text.length / 2);
    let cut = text.lastIndexOf("，", mid);
    if (cut < 10) cut = text.lastIndexOf("。", mid);
    if (cut < 10) cut = mid;
    const a = text.slice(0, cut + 1);
    const b = text.slice(cut + 1);
    const half = seg.audioDur / 2;
    cues.push({start: seg.start, end: seg.start + half, text: a});
    if (b) cues.push({start: seg.start + half, end: seg.start + seg.audioDur, text: b});
  });

  const items = cues
    .map(
      (c, i) => `
    <div id="cap-${i}" class="clip cue" data-start="${c.start.toFixed(3)}" data-duration="${(c.end - c.start).toFixed(3)}" data-track-index="${i % 8}">
      <div class="cap-text">${c.text}</div>
    </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"></head><body>
<template>
<style>
@font-face{font-family:"PingFang SC";src:local("PingFang SC"),local("Hiragino Sans GB"),local("Microsoft YaHei"),local("Noto Sans CJK SC")}
#root{position:absolute;inset:0;width:1920px;height:1080px;pointer-events:none}
.cue{position:absolute;left:120px;right:120px;bottom:72px;display:flex;justify-content:center}
.cap-text{max-width:1500px;padding:16px 28px;background:rgba(5,8,15,.55);border:1px solid rgba(212,179,106,.28);color:#F4F7FC;font-family:"PingFang SC",sans-serif;font-size:40px;line-height:1.45;text-align:center}
</style>
<div id="root" data-composition-id="captions" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${items}
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
window.__timelines=window.__timelines||{};
window.__timelines["captions"]=gsap.timeline({paused:true}).to({}, {duration:${total}}, 0);
</script>
</template>
</body></html>
`;
}

function buildIndex(schedule, total, voiceoverPath) {
  const scenes = schedule
    .map((seg, i) => {
      const clip = CLIPS[i];
      const track = i % 2;
      return `
      <div id="el-${clip.id}" class="scene" data-composition-id="${clip.id}" data-composition-src="compositions/frames/${clip.file}" data-start="${seg.start}" data-duration="${seg.sceneDur}" data-track-index="${track}"></div>`;
    })
    .join("");

  // ONE narration bed only — avoids multi-clip VO overlap / dual-track mix bugs.
  const voice = `<audio id="el-voiceover" src="${voiceoverPath}" data-start="0" data-duration="${total}" data-track-index="10" data-volume="1"></audio>`;

  const transitions = schedule
    .slice(0, -1)
    .map((seg, i) => {
      const next = CLIPS[i + 1].id;
      const cur = CLIPS[i].id;
      const t = seg.start + seg.sceneDur;
      return `tl.to("#el-${cur}",{opacity:0,duration:0.06,ease:"none"},${t});
        tl.fromTo("#el-${next}",{opacity:0},{opacity:1,duration:0.06,ease:"none"},${t});`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, height=1080">
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1920px;height:1080px;overflow:hidden;background:#000}
    #root{position:relative;width:1920px;height:1080px;overflow:hidden;background:#0A101C}
    .scene{position:absolute;inset:0;width:100%;height:100%}
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
    ${scenes}
    <div id="el-captions" class="scene" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${total}" data-track-index="2"></div>
    ${voice}
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = gsap.timeline({ paused: true });
    (function(){ var tl = window.__timelines["main"];
      ${transitions}
      tl.to({}, { duration: ${total} }, 0);
    })();
  </script>
</body>
</html>
`;
}

function writeStoryboard(schedule, total) {
  const lines = [
    "---",
    "title: YesONO 3.0 HF v3",
    `duration: ${total}`,
    "aspect: 1920x1080",
    "music: none",
    "---",
    "",
  ];
  schedule.forEach((seg, i) => {
    const clip = CLIPS[i];
    lines.push(`## Frame ${i + 1}: ${clip.id}`);
    lines.push(`duration: ${seg.sceneDur}`);
    lines.push(`start: ${seg.start}`);
    lines.push(`visual: 4-shot script beats with flash cuts`);
    lines.push(`vo: ${seg.spoken}`);
    lines.push("");
  });
  fs.writeFileSync(path.join(ROOT, "STORYBOARD.md"), lines.join("\n"));
  fs.writeFileSync(
    path.join(ROOT, "SCRIPT.md"),
    schedule.map((s, i) => `## ${CLIPS[i].id}\n\n${s.spoken}\n`).join("\n"),
  );
}

function main() {
  let schedule = loadSchedule();
  let voiceoverPath = "audio/cosyvoice/voiceover.wav";
  if (!schedule) {
    // Placeholder until CosyVoice regen finishes
    const clips = JSON.parse(fs.readFileSync(path.join(ROOT, "clips.json"), "utf8"));
    let t = 0;
    schedule = clips.clips.map((c, i) => {
      const audioDur = 14.5;
      const sceneDur = audioDur + (i < 10 ? GAP : 0);
      const row = {
        id: c.id,
        start: t,
        audioDur,
        sceneDur,
        caption: c.caption,
        spoken: c.spoken,
        path: `audio/cosyvoice/seg_${String(i).padStart(2, "0")}.wav`,
      };
      t += sceneDur;
      return row;
    });
    console.log("Using placeholder timings; re-run after audio_meta.json regen");
  } else {
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "audio_meta.json"), "utf8"));
    if (meta.voiceover) voiceoverPath = meta.voiceover;
  }

  const total = schedule.reduce((a, s) => a + s.sceneDur, 0);
  schedule.forEach((seg, i) => {
    const html = frameHtml(CLIPS[i], seg.sceneDur);
    fs.writeFileSync(path.join(FRAMES, CLIPS[i].file), html);
    console.log("wrote", CLIPS[i].file, seg.sceneDur.toFixed(2) + "s");
  });
  fs.mkdirSync(path.join(ROOT, "compositions"), {recursive: true});
  fs.writeFileSync(path.join(ROOT, "compositions", "captions.html"), buildCaptions(schedule, total));
  fs.writeFileSync(path.join(ROOT, "index.html"), buildIndex(schedule, total, voiceoverPath));
  writeStoryboard(schedule, total);
  console.log("TOTAL", total.toFixed(3), "voice=", voiceoverPath);
}

main();
