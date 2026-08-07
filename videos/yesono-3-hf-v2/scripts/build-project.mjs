#!/usr/bin/env node
/**
 * Build yesono-3-hf-v2: retime frames, rewrite on-screen copy from MiniMax script,
 * assemble index.html + caption layer from CosyVoice timings / SRT.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GAP = 0.1; // ≤0.15s between scenes

const timings = JSON.parse(
  fs.readFileSync(path.join(ROOT, "audio/cosyvoice/timings.json"), "utf8"),
);

const SCENES = [
  {
    id: "01-hook",
    file: "01-hook.html",
    chrome: "YESONO / 01",
    eyebrow: "CLIP 01 · HOOK",
    h1: '想开一家交易所？<em>别自己造轮子。</em>',
    lede: "YesONO 3.0，一套现成的交易所操作系统。",
    stamp: "交易所操作系统",
    visual: `<div class="aperture-viz"><div class="ring ring-a"></div><div class="ring ring-b"></div><div class="core">YESONO<br><b>3.0</b></div><div class="orbit-node reveal"><b>治理</b><small>LAYER</small></div><div class="orbit-node reveal"><b>市场</b><small>LAYER</small></div><div class="orbit-node reveal"><b>交易</b><small>LAYER</small></div><div class="orbit-node reveal"><b>资金</b><small>LAYER</small></div><div class="orbit-node reveal"><b>做市</b><small>LAYER</small></div></div><div class="liability reveal"><small>CTA</small><b>把它变成你的生意</b></div>`,
  },
  {
    id: "02-build-pain",
    file: "02-build-pain.html",
    chrome: "YESONO / 02",
    eyebrow: "CLIP 02 · 自建之痛",
    h1: '先烧光的，<em>是信任。</em>',
    lede: "撮合引擎、预交易风控、资金账本、链上清算、KYC合规、冷启动流动性。",
    stamp: "TEAM · YEARS · TRUST",
    visual: `<div class="cost-grid"><div class="cost-card reveal"><span>01</span><b>撮合引擎</b><small>专业团队数年</small></div><div class="cost-card reveal"><span>02</span><b>预交易风控</b><small>专业团队数年</small></div><div class="cost-card reveal"><span>03</span><b>资金账本</b><small>专业团队数年</small></div><div class="cost-card reveal"><span>04</span><b>链上清算</b><small>专业团队数年</small></div><div class="cost-card reveal"><span>05</span><b>KYC合规</b><small>专业团队数年</small></div><div class="cost-card reveal"><span>06</span><b>冷启动流动性</b><small>专业团队数年</small></div></div><div class="liability reveal"><small>PRIMARY LIABILITY</small><b>先烧光的是信任</b></div>`,
  },
  {
    id: "03-exchange-os",
    file: "03-exchange-os.html",
    chrome: "YESONO / 03",
    eyebrow: "CLIP 03 · 交易所操作系统",
    h1: '你只留<em>经营层</em>',
    lede: "五层交易所级能力由平台扛住；品牌、客户、玩法、增长归你。",
    stamp: "PLATFORM → OPERATOR",
    visual: `<div class="layer-stack"><div class="operator-layer reveal">经营层：品牌 · 客户 · 玩法 · 增长</div><div class="platform-layer reveal" style="--i:1"><span>L5</span><b>做市生态</b><i>PLATFORM</i></div><div class="platform-layer reveal" style="--i:2"><span>L4</span><b>资金链上</b><i>PLATFORM</i></div><div class="platform-layer reveal" style="--i:3"><span>L3</span><b>交易账本</b><i>PLATFORM</i></div><div class="platform-layer reveal" style="--i:4"><span>L2</span><b>市场定价</b><i>PLATFORM</i></div><div class="platform-layer reveal" style="--i:5"><span>L1</span><b>接入治理</b><i>PLATFORM</i></div></div>`,
  },
  {
    id: "04-tenant",
    file: "04-tenant.html",
    chrome: "YESONO / 04",
    eyebrow: "CLIP 04 · 租户主权",
    h1: '这是你的<em>地盘</em>',
    lede: "每个租户都是独立经营域：账户、结算、数据边界清楚。",
    stamp: "TENANT BOUNDARY",
    visual: `<div class="tenant-domain"><svg class="draw" viewBox="0 0 640 640" data-layout-ignore><rect x="70" y="70" width="500" height="500" rx="250"/></svg><div class="tenant-core reveal">独立经营域<br><b>你的租户</b></div><div class="tenant-node reveal"><b>你的客户</b><small>OWNED</small></div><div class="tenant-node reveal"><b>你的账务</b><small>OWNED</small></div><div class="tenant-node reveal"><b>你的数据</b><small>OWNED</small></div><div class="tenant-node reveal"><b>你的品牌</b><small>OWNED</small></div></div>`,
  },
  {
    id: "05-list-market",
    file: "05-list-market.html",
    chrome: "YESONO / 05",
    eyebrow: "CLIP 05 · 上架市场",
    h1: '以天计，<em>不以年计</em>',
    lede: "共享订单簿有深度；专有市场定义独家题材、规则与定价。",
    stamp: "定义市场 → 风控门禁 → 开市交易",
    visual: `<div class="market-split"><div class="market-panel harbor-panel reveal"><small>SHARED BOOK</small><h3>共享订单簿</h3><div class="mini-bars"><i style="height:42%"></i><i style="height:68%"></i><i style="height:55%"></i><i style="height:78%"></i><i style="height:61%"></i><i style="height:88%"></i><i style="height:49%"></i><i style="height:72%"></i></div></div><div class="market-panel brass-panel reveal"><small>PRIVATE MARKET</small><h3>专有市场</h3><div class="mini-bars"><i style="height:58%"></i><i style="height:74%"></i><i style="height:66%"></i><i style="height:92%"></i><i style="height:70%"></i><i style="height:84%"></i><i style="height:60%"></i><i style="height:77%"></i></div></div></div><div class="account-rail reveal">独家题材 · 独家规则 · 独家定价</div>`,
  },
  {
    id: "06-outcome-cfd",
    file: "06-outcome-cfd.html",
    chrome: "YESONO / 06",
    eyebrow: "CLIP 06 · Outcome × CFD",
    h1: '你都<em>开得出来</em>',
    lede: "Outcome 预测市场与 CFD 差价合约，同一底座双产品域。",
    stamp: "OUTCOME × CFD",
    visual: `<div class="market-split"><div class="market-panel brass-panel reveal"><small>OUTCOME</small><h3>Outcome 预测市场</h3><div class="cost-grid" style="grid-template-columns:1fr 1fr;padding:0"><div class="cost-card reveal"><span>01</span><b>体育</b></div><div class="cost-card reveal"><span>02</span><b>选举</b></div><div class="cost-card reveal"><span>03</span><b>宏观数据</b></div><div class="cost-card reveal"><span>04</span><b>Yes / No</b></div></div></div><div class="market-panel harbor-panel reveal"><small>CFD</small><h3>CFD 差价合约</h3><div class="cost-grid" style="grid-template-columns:1fr 1fr;padding:0"><div class="cost-card reveal"><span>01</span><b>股票</b></div><div class="cost-card reveal"><span>02</span><b>黄金</b></div><div class="cost-card reveal"><span>03</span><b>BTC</b></div><div class="cost-card reveal"><span>04</span><b>ETH</b></div></div></div></div>`,
  },
  {
    id: "07-order-flow",
    file: "07-order-flow.html",
    chrome: "YESONO / 07",
    eyebrow: "CLIP 07 · 平台跑全程",
    h1: '这支团队，<em>你不用自己养</em>',
    lede: "风控准入、撮合成交、逐笔入账、清算交割——机构级链路全程留痕。",
    stamp: "INSTITUTIONAL PIPELINE",
    visual: `<div class="flow-row"><div class="flow-node reveal"><small>01</small><b>风控准入</b><i>通过</i></div><div class="flow-link"><div class="line-grow"></div><div class="packet"></div></div><div class="flow-node reveal"><small>02</small><b>撮合成交</b><i>通过</i></div><div class="flow-link"><div class="line-grow"></div><div class="packet"></div></div><div class="flow-node reveal"><small>03</small><b>逐笔入账</b><i>通过</i></div><div class="flow-link"><div class="line-grow"></div><div class="packet"></div></div><div class="flow-node reveal"><small>04</small><b>清算交割</b><i>通过</i></div></div><div class="ledger reveal">机构级链路 · 全程留痕 · 随时可审计</div>`,
  },
  {
    id: "08-onchain",
    file: "08-onchain.html",
    chrome: "YESONO / 08",
    eyebrow: "CLIP 08 · 链上信任",
    h1: '不是承诺，<em>是一条可查证的链</em>',
    lede: "资金账本逐笔入账，链上取得最终性——不可篡改，可验证。",
    stamp: "VERIFIABLE FINALITY",
    visual: `<div class="aperture-viz"><div class="ring ring-a" style="border-color:rgba(111,194,160,.55)"></div><div class="ring ring-b" style="border-color:rgba(111,194,160,.35)"></div><div class="core reveal" style="border-color:var(--jade);background:rgba(111,194,160,.12)">可验证<br><b style="color:var(--jade)">链上最终性</b></div></div><div class="ledger reveal">逐笔入账 · 不可篡改 · 用户可自查</div>`,
  },
  {
    id: "09-liquidity",
    file: "09-liquidity.html",
    chrome: "YESONO / 09",
    eyebrow: "CLIP 09 · 开市即有对手盘",
    h1: '开市第一天，<em>就有深度</em>',
    lede: "做市商工作台管资格、额度、保证金；一万美元也能用投行级策略。",
    stamp: "$10,000 → 投行级做市策略",
    visual: `<div class="depth-book"><i class="depth-bar" style="height:28%"></i><i class="depth-bar" style="height:44%"></i><i class="depth-bar" style="height:58%"></i><i class="depth-bar" style="height:72%"></i><i class="depth-bar" style="height:86%"></i><i class="depth-bar ask" style="height:82%"></i><i class="depth-bar ask" style="height:70%"></i><i class="depth-bar ask" style="height:56%"></i><i class="depth-bar ask" style="height:42%"></i><i class="depth-bar ask" style="height:30%"></i><div class="mid-price reveal"><small>MM DESK</small><b>做市商工作台</b></div></div><div class="depth-labels"><span>BID 深度</span><span>ASK 深度</span></div><div class="liability reveal"><small>BUDGET</small><b>$10,000</b></div>`,
  },
  {
    id: "10-revenue",
    file: "10-revenue.html",
    chrome: "YESONO / 10",
    eyebrow: "CLIP 10 · 收入空间",
    h1: '两倍<em>经营面</em>',
    lede: "五条收入曲线 + Outcome 加 CFD，同一批客户，边际成本趋近于零。",
    stamp: "FIVE REVENUE CURVES",
    visual: `<div class="revenue-field"><div class="revenue-row reveal"><span>01</span><b>交易手续费</b><div class="revenue-fill" style="--fill:92%"></div></div><div class="revenue-row reveal"><span>02</span><b>专有市场溢价</b><div class="revenue-fill" style="--fill:78%"></div></div><div class="revenue-row reveal"><span>03</span><b>做市点差协同</b><div class="revenue-fill" style="--fill:84%"></div></div><div class="revenue-row reveal"><span>04</span><b>数据产品</b><div class="revenue-fill" style="--fill:66%"></div></div><div class="revenue-row reveal"><span>05</span><b>客户资产服务</b><div class="revenue-fill" style="--fill:71%"></div></div></div><div class="multiplier reveal">Outcome <b>×</b> CFD</div>`,
  },
  {
    id: "11-close",
    file: "11-close.html",
    chrome: "YESONO / 11",
    eyebrow: "CLIP 11 · CTA",
    h1: '你负责生意，<em>交易所交给我们</em>',
    lede: "权威、安全、清算、审计，平台扛；客户、玩法、品牌、增长，归你。",
    stamp: "这就是 YesONO 3.0",
    visual: `<div class="close-split"><div class="close-panel reveal"><small>平台扛</small><b>权威 · 安全 · 清算 · 审计</b></div><div class="close-panel reveal you-panel"><small>你专注</small><b>客户 · 玩法 · 品牌 · 增长</b></div></div><div class="brand-lock reveal">YesONO <b>3.0</b></div>`,
  },
];

const SHARED_CSS = `      @font-face { font-family: "Songti SC"; src: local("Songti SC"), local("STSong"), local("Noto Serif CJK SC"); }
      @font-face { font-family: "PingFang SC"; src: local("PingFang SC"), local("Hiragino Sans GB"), local("Microsoft YaHei"); }
      :root { --ink:#0A101C; --letter:#05080F; --panel:#131C2E; --panel2:#0F1727; --text:#E8EEF7; --dim:#AEBED2; --faint:#8798B0; --jade:#6FC2A0; --harbor:#6FA3DC; --brass:#D4B36A; }
      * { box-sizing:border-box; }
      #root { position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; color:var(--text); font-family:"PingFang SC",sans-serif; }
      .ground { position:absolute; inset:0; overflow:hidden; background:var(--ink); }
      .ground::before { content:""; position:absolute; inset:-160px; background:radial-gradient(circle at 74% 18%,rgba(111,163,220,.18),transparent 30%),radial-gradient(circle at 18% 88%,rgba(212,179,106,.13),transparent 29%); }
      .grid-line { position:absolute; display:block; background:rgba(159,176,199,.09); }
      .grid-h { left:0; right:0; height:1px; } .grid-v { top:0; bottom:0; width:1px; }
      .particle { position:absolute; width:4px; height:4px; border-radius:50%; background:var(--harbor); box-shadow:0 0 18px rgba(111,163,220,.65); opacity:.14; }
      .chrome { position:absolute; left:72px; right:72px; top:46px; display:flex; justify-content:space-between; align-items:center; font-family:"JetBrains Mono",monospace; color:var(--faint); font-size:17px; letter-spacing:.18em; }
      .progress { width:480px; height:2px; background:rgba(159,176,199,.15); transform-origin:left center; }
      .progress-fill { height:100%; background:var(--brass); transform-origin:left center; }
      .content { position:absolute; left:96px; right:96px; top:120px; bottom:196px; display:grid; grid-template-columns:43% 57%; gap:52px; align-items:center; }
      .copy { position:relative; z-index:3; }
      .eyebrow { font-family:"JetBrains Mono",monospace; color:var(--brass); font-size:20px; letter-spacing:.24em; margin-bottom:26px; }
      h1 { margin:0; font-family:"Songti SC",serif; font-size:72px; line-height:1.14; font-weight:600; letter-spacing:.02em; }
      h1 em { color:var(--brass); font-style:normal; }
      .lede { max-width:700px; margin:32px 0 0; color:var(--dim); font-size:28px; line-height:1.65; }
      .stamp { display:inline-flex; margin-top:36px; padding:12px 18px; border:1px solid rgba(212,179,106,.55); background:rgba(212,179,106,.09); color:var(--brass); font-family:"JetBrains Mono",monospace; font-size:16px; letter-spacing:.13em; }
      .visual { position:relative; height:660px; min-width:0; }
      .aperture-viz,.tenant-domain { position:absolute; inset:30px 20px 20px 20px; display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:12px; }
      .ring { position:absolute; border:1px solid rgba(111,163,220,.4); border-radius:50%; } .ring-a{width:470px;height:470px}.ring-b{width:610px;height:610px;border-style:dashed}
      .core,.tenant-core { width:210px; height:210px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; border:1px solid var(--brass); background:rgba(212,179,106,.10); font-family:"JetBrains Mono",monospace; font-size:22px; letter-spacing:.12em; z-index:2; }
      .core b,.tenant-core b { margin-top:8px; color:var(--brass); font-family:"Songti SC",serif; font-size:34px; letter-spacing:.02em; }
      .orbit-node,.tenant-node { position:relative; width:150px; padding:16px; border:1px solid rgba(159,176,199,.25); background:rgba(19,28,46,.92); z-index:2; }
      .orbit-node b,.tenant-node b { display:block; font-size:22px; }.orbit-node small,.tenant-node small { display:block; margin-top:8px; color:var(--faint); font-family:"JetBrains Mono",monospace; font-size:11px; }
      .cost-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; padding:18px 0; }
      .cost-card { min-height:110px; padding:18px; border:1px solid rgba(159,176,199,.19); background:var(--panel); }
      .cost-card span,.platform-layer span,.flow-node small,.market-panel small,.revenue-row span { color:var(--faint); font-family:"JetBrains Mono",monospace; font-size:13px; letter-spacing:.14em; }
      .cost-card b { display:block; margin-top:11px; font-size:22px; }.cost-card small { display:block; margin-top:10px; color:var(--dim); }
      .liability { position:absolute; right:18px; bottom:2px; padding:18px 26px; border:1px solid var(--brass); background:rgba(212,179,106,.10); z-index:3; }.liability small{color:var(--faint)}.liability b{display:block;margin-top:6px;font-family:"Songti SC",serif;font-size:28px;color:var(--brass)}
      .layer-stack { position:absolute; inset:48px 50px; }
      .platform-layer { height:72px; margin-bottom:12px; padding:0 24px; display:grid; grid-template-columns:70px 1fr auto; align-items:center; border:1px solid rgba(111,163,220,.28); background:var(--panel); box-shadow:calc(var(--i) * 7px) calc(var(--i) * 4px) 0 rgba(111,163,220,.04); }
      .platform-layer b { font-size:24px; }.platform-layer i { color:var(--harbor); font-family:"JetBrains Mono",monospace; font-size:13px; font-style:normal; letter-spacing:.12em; }
      .operator-layer { height:80px; margin-bottom:18px; padding:0 24px; display:flex; align-items:center; justify-content:center; border:1px solid var(--brass); background:rgba(212,179,106,.12); color:var(--brass); font-family:"JetBrains Mono",monospace; font-size:18px; letter-spacing:.12em; }
      .tenant-domain svg { position:absolute; inset:0; width:100%; height:100%; }.tenant-domain rect { fill:rgba(212,179,106,.04); stroke:var(--brass); stroke-width:2; stroke-dasharray:420; }
      .market-split { display:grid; grid-template-columns:1fr 1fr; gap:20px; padding:40px 0 0; }
      .market-panel { min-height:380px; padding:28px; border:1px solid; background:var(--panel); }.harbor-panel{border-color:rgba(111,163,220,.55)}.brass-panel{border-color:rgba(212,179,106,.55);background:rgba(212,179,106,.07)}
      .market-panel h3 { margin:18px 0 28px; font-family:"Songti SC",serif; font-size:30px; }
      .mini-bars { height:180px; display:flex; align-items:flex-end; gap:9px; }.mini-bars i { flex:1; display:block; background:rgba(111,163,220,.35); border-top:2px solid var(--harbor); transform-origin:bottom; }.brass-panel .mini-bars i{background:rgba(212,179,106,.25);border-top-color:var(--brass)}
      .account-rail { position:absolute; left:0; right:0; bottom:8px; padding:14px; border:1px solid rgba(111,194,160,.5); color:var(--jade); text-align:center; font-family:"JetBrains Mono",monospace; letter-spacing:.12em; }
      .flow-row { position:absolute; left:0; right:0; top:190px; display:flex; align-items:center; }
      .flow-node { width:170px; min-height:170px; padding:20px; border:1px solid rgba(111,163,220,.42); background:var(--panel); }.flow-node b{display:block;margin-top:20px;font-size:24px}.flow-node i{display:block;margin-top:20px;color:var(--jade);font-family:"JetBrains Mono",monospace;font-size:12px;font-style:normal}
      .flow-link { flex:1; position:relative; height:2px; background:rgba(111,163,220,.2); overflow:visible; }.line-grow{position:absolute;inset:0;background:var(--harbor);transform-origin:left}.packet{position:absolute;width:9px;height:9px;top:-4px;left:44%;border-radius:50%;background:var(--brass);box-shadow:0 0 16px var(--brass)}
      .ledger { position:absolute; left:0; right:0; bottom:40px; padding:16px 22px; border:1px solid rgba(111,194,160,.45); background:rgba(111,194,160,.08); color:var(--jade); font-family:"JetBrains Mono",monospace; font-size:15px; letter-spacing:.1em; text-align:center; }
      .depth-book { position:absolute; inset:80px 12px 100px; display:flex; align-items:flex-end; gap:8px; }.depth-bar{flex:1;display:block;background:rgba(111,163,220,.28);border-top:3px solid var(--harbor);transform-origin:bottom}.depth-bar.ask{background:rgba(212,179,106,.22);border-top-color:var(--brass)}
      .mid-price { position:absolute; left:50%; top:42%; width:220px; margin-left:-110px; padding:18px; background:var(--letter); border:1px solid rgba(232,238,247,.24); text-align:center; color:var(--dim); font-family:"JetBrains Mono",monospace; }.mid-price b{display:block;margin-top:6px;font-size:24px;color:var(--text)}
      .depth-labels { position:absolute; left:12px; right:12px; bottom:70px; display:flex; justify-content:space-between; color:var(--faint); font-family:"JetBrains Mono",monospace; letter-spacing:.12em; }
      .revenue-field { padding:40px 0 0; }.revenue-row{position:relative;height:78px;margin-bottom:12px;padding:0 22px;display:grid;grid-template-columns:76px 220px 1fr;align-items:center;border:1px solid rgba(159,176,199,.17);background:var(--panel);overflow:hidden}.revenue-row b{font-size:22px}.revenue-fill{height:12px;width:var(--fill);background:linear-gradient(90deg,var(--brass),rgba(212,179,106,.18));transform-origin:left}
      .multiplier { position:absolute; right:0; bottom:8px; padding:16px 22px; border:1px solid var(--brass); background:rgba(212,179,106,.08); font-family:"JetBrains Mono",monospace; letter-spacing:.14em; }.multiplier b{color:var(--brass);margin:0 12px}
      .close-split { display:grid; grid-template-columns:1fr 1fr; gap:22px; padding-top:80px; }.close-panel{min-height:240px;padding:36px;border:1px solid rgba(111,163,220,.45);background:var(--panel)}.close-panel.you-panel{border-color:var(--brass);background:rgba(212,179,106,.08)}.close-panel small{color:var(--faint);font-family:"JetBrains Mono",monospace;letter-spacing:.18em}.close-panel b{display:block;margin-top:40px;font-family:"Songti SC",serif;font-size:28px;line-height:1.55}
      .brand-lock { position:absolute; left:0; right:0; bottom:20px; text-align:center; font-family:"Songti SC",serif; font-size:60px; letter-spacing:.12em; }.brand-lock b{color:var(--brass)}`;

function gridHtml() {
  const hs = Array.from({ length: 10 }, (_, i) => 80 + i * 86)
    .map((t) => `<span class="grid-line grid-h" style="top:${t}px"></span>`)
    .join("");
  const vs = Array.from({ length: 15 }, (_, i) => 70 + i * 128)
    .map((l) => `<span class="grid-line grid-v" style="left:${l}px"></span>`)
    .join("");
  const particles = [
    [90, 110], [227, 193], [364, 276], [501, 359], [638, 442], [775, 525],
    [912, 608], [1049, 691], [1186, 124], [1323, 207], [1460, 290], [1597, 373],
    [1734, 456], [131, 539], [268, 622], [405, 705], [542, 138], [679, 221],
  ]
    .map(([l, t]) => `<i class="particle" style="left:${l}px;top:${t}px"></i>`)
    .join("");
  return `<div class="grid" data-layout-ignore>${hs}${vs}</div><div class="particles" data-layout-ignore>${particles}</div>`;
}

function frameHtml(scene, duration) {
  const D = Number(duration.toFixed(6));
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"></head><body>
<template>
  <style>
${SHARED_CSS}
</style>
  <div id="root" data-composition-id="${scene.id}" data-start="0" data-duration="${D}" data-width="1920" data-height="1080">
    <div id="ground-${scene.id}" class="clip ground" data-layout-allow-overlap data-start="0" data-duration="${D}" data-track-index="0">
      ${gridHtml()}
      <div class="chrome"><span>${scene.chrome}</span><div class="progress"><div class="progress-fill"></div></div><span>YESONO 3.0</span></div>
      <div class="content">
        <section class="copy">
          <div class="eyebrow reveal">${scene.eyebrow}</div>
          <h1 class="reveal">${scene.h1}</h1>
          <p class="lede reveal">${scene.lede}</p>
          <div class="stamp reveal">${scene.stamp}</div>
        </section>
        <section class="visual">${scene.visual}</section>
      </div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    (function () {
      var D = ${D};
      var tl = gsap.timeline({ paused: true });
      var root = '[data-composition-id="${scene.id}"]';
      var reveals = Array.from(document.querySelectorAll(root + ' .reveal'));
      reveals.forEach(function (el, i) {
        var start = 0.12 + (Math.min(i, 11) / Math.max(1, Math.min(reveals.length - 1, 11))) * D * 0.72;
        var mode = i % 4;
        var from = mode === 0 ? { opacity:0, x:-28 } : mode === 1 ? { opacity:0, y:22 } : mode === 2 ? { opacity:0, x:28 } : { opacity:0, scale:0.96 };
        var to = { opacity:1, x:0, y:0, scale:1, duration:Math.min(0.55, D * 0.06), ease:i % 3 === 0 ? "power4.out" : i % 3 === 1 ? "expo.out" : "power3.out", immediateRender:false };
        tl.fromTo(el, from, to, start);
      });
      Array.from(document.querySelectorAll(root + ' .depth-bar, ' + root + ' .mini-bars i')).forEach(function (el, i) {
        tl.fromTo(el, { scaleY:0 }, { scaleY:1, duration:0.45, ease:"power3.out", immediateRender:false }, D * 0.2 + i * 0.04);
      });
      Array.from(document.querySelectorAll(root + ' .revenue-fill, ' + root + ' .line-grow')).forEach(function (el, i) {
        tl.fromTo(el, { scaleX:0 }, { scaleX:1, duration:0.55, ease:"power3.out", immediateRender:false }, D * 0.22 + i * 0.18);
      });
      Array.from(document.querySelectorAll(root + ' .draw')).forEach(function (el) {
        tl.fromTo(el, { strokeDashoffset:420 }, { strokeDashoffset:0, duration:Math.min(2.0,D*.2), ease:"power2.inOut", immediateRender:false }, D * 0.12);
      });
      Array.from(document.querySelectorAll(root + ' .particle')).forEach(function (el, i) {
        tl.fromTo(el, { opacity:0.05, y:8 }, { opacity:0.26, y:-8-(i%4)*3, duration:D*0.7, ease:"sine.inOut", immediateRender:false }, 0.15 + (i%6)*0.06);
      });
      tl.fromTo(root + ' .progress-fill', { scaleX:0 }, { scaleX:1, duration:Math.max(0.2, D-0.15), ease:"none", immediateRender:false }, 0.08);
      tl.to({}, { duration:D }, 0);
      window.__timelines = window.__timelines || {};
      window.__timelines["${scene.id}"] = tl;
    })();
  </script>
</template>
</body></html>
`;
}

function parseSrt(srtText) {
  const blocks = srtText.trim().split(/\n\s*\n/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;
    const m = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/,
    );
    if (!m) continue;
    const toSec = (h, mi, s, ms) =>
      Number(h) * 3600 + Number(mi) * 60 + Number(s) + Number(ms) / 1000;
    const start = toSec(m[1], m[2], m[3], m[4]);
    const end = toSec(m[5], m[6], m[7], m[8]);
    const text = lines.slice(2).join("");
    if (!text || text === "—" || text === "——") continue;
    cues.push({ start, end, text });
  }
  return cues;
}

function remapCues(cues, schedule) {
  // Original SRT uses 15s slots. Map into continuous schedule.
  const SLOT = 15;
  const out = [];
  for (const cue of cues) {
    const slot = Math.floor(cue.start / SLOT + 1e-9);
    if (slot < 0 || slot >= schedule.length) continue;
    const localStart = cue.start - slot * SLOT;
    const localEnd = cue.end - slot * SLOT;
    const seg = schedule[slot];
    if (localStart >= seg.audioDur + 0.05) continue; // skip padding silence
    const start = seg.start + Math.min(localStart, seg.audioDur);
    const end = seg.start + Math.min(Math.max(localEnd, localStart + 0.2), seg.audioDur);
    if (end <= start) continue;
    out.push({ start, end, text: cue.text.replace(/\s+/g, "") });
  }
  // Merge tiny fragments that are continuations (ending with incomplete punctuation)
  const merged = [];
  for (const c of out) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      c.start - prev.end < 0.05 &&
      prev.text.length < 8 &&
      !/[。！？；]$/.test(prev.text)
    ) {
      prev.text += c.text;
      prev.end = c.end;
    } else {
      merged.push({ ...c });
    }
  }
  // Phrase-group captions: keep ~1–2 clauses per group for readability
  const groups = [];
  let buf = null;
  for (const c of merged) {
    if (!buf) {
      buf = { start: c.start, end: c.end, parts: [c] };
      continue;
    }
    const span = c.end - buf.start;
    const chars = buf.parts.reduce((n, p) => n + p.text.length, 0) + c.text.length;
    if (span < 2.8 && chars < 28 && c.start - buf.end < 0.35) {
      buf.parts.push(c);
      buf.end = c.end;
    } else {
      groups.push(buf);
      buf = { start: c.start, end: c.end, parts: [c] };
    }
  }
  if (buf) groups.push(buf);

  return groups.map((g, i) => ({
    id: `caption-group-${i}`,
    start: Number(g.start.toFixed(3)),
    end: Number(g.end.toFixed(3)),
    text: g.parts.map((p) => p.text).join(""),
    words: g.parts.map((p, wi) => ({
      id: `caption-word-${i}-${wi}`,
      text: p.text,
      start: Number(p.start.toFixed(3)),
      end: Number(p.end.toFixed(3)),
    })),
  }));
}

function buildSchedule() {
  const schedule = [];
  let t = 0;
  timings.segments.forEach((seg, i) => {
    const audioDur = seg.duration;
    const sceneDur = audioDur + (i < timings.segments.length - 1 ? GAP : 0);
    schedule.push({
      ...SCENES[i],
      audioDur,
      sceneDur,
      start: t,
      audioStart: t,
      wav: `audio/cosyvoice/seg_${String(i).padStart(2, "0")}.wav`,
      caption: seg.caption,
      spoken: seg.spoken,
    });
    t += sceneDur;
  });
  return { schedule, total: Number(t.toFixed(6)) };
}

function writeFrames(schedule) {
  const dir = path.join(ROOT, "compositions/frames");
  fs.mkdirSync(dir, { recursive: true });
  // remove old reference filenames
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith(".html")) fs.unlinkSync(path.join(dir, f));
  }
  for (const scene of schedule) {
    fs.writeFileSync(path.join(dir, scene.file), frameHtml(scene, scene.sceneDur));
  }
}

function writeIndex(schedule, total) {
  const sceneBlocks = schedule
    .map((s, i) => {
      const track = i % 2;
      return `      <div id="el-${s.id}" class="scene" data-composition-id="${s.id}" data-composition-src="compositions/frames/${s.file}" data-start="${s.start}" data-duration="${s.sceneDur}" data-track-index="${track}"></div>
      <audio id="el-${s.id}-voice" src="${s.wav}" data-start="${s.audioStart}" data-duration="${s.audioDur}" data-track-index="${10 + i}" data-volume="1"></audio>`;
    })
    .join("\n");

  const transitions = [];
  for (let i = 0; i < schedule.length - 1; i++) {
    const a = schedule[i];
    const b = schedule[i + 1];
    const cut = b.start;
    // hard cut / fast flash — short opacity flash
    transitions.push(
      `        tl.to("#el-${a.id}", { opacity: 0, duration: 0.08, ease: "none" }, ${cut});`,
    );
    transitions.push(
      `        tl.fromTo("#el-${b.id}", { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, ${cut});`,
    );
  }

  const sfxTimes = [2.2, 16.5, 32, 48, 63, 78, 95, 110, 126, 142, 154].filter(
    (t) => t < total - 1,
  );
  const sfxFiles = ["impact.wav", "tick.wav", "whoosh.wav", "confirm.wav"];
  const sfxBlocks = sfxTimes
    .map((t, i) => {
      const file = sfxFiles[i % sfxFiles.length];
      const dur = file === "tick.wav" ? 0.09 : file === "whoosh.wav" ? 0.42 : file === "confirm.wav" ? 0.28 : 0.34;
      const vol = file === "tick.wav" ? 0.14 : 0.18;
      return `      <audio id="el-sfx-${i}" src="assets/sfx/${file}" data-start="${t}" data-duration="${dur}" data-track-index="${30 + i}" data-volume="${vol}"></audio>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #0A101C; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${sceneBlocks}

      <div id="el-captions" class="scene" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${total}" data-track-index="2"></div>

${sfxBlocks}
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
      (function () { var tl = window.__timelines["main"];
${transitions.join("\n")}
        tl.to({}, { duration: ${total} }, 0);
      })();
    </script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, "index.html"), html);
}

function writeCaptions(groups, total) {
  const payload = JSON.stringify(groups);
  const html = `<template id="captions-template">
  <div data-composition-id="captions" data-width="1920" data-height="1080" data-duration="${total}" id="captions-root">
    <div id="cap"></div>
  </div>
  <style>
    @font-face { font-family: "PingFang SC"; src: local("PingFang SC"), local("Hiragino Sans GB"), local("Microsoft YaHei"); }
    #captions-root { position: absolute; inset: 0; pointer-events: none; }
    #cap { position: absolute; left: 0; right: 0; top: 900px; height: 180px; display: flex; align-items: center; justify-content: center; }
    .caption-group {
      position: absolute;
      max-width: 82%;
      padding: 14px 28px;
      background: rgba(5, 8, 15, 0.82);
      border: 1px solid rgba(212, 179, 106, 0.28);
      border-radius: 10px;
      font-family: "PingFang SC", sans-serif;
      font-weight: 600;
      font-size: 38px;
      line-height: 1.35;
      text-align: center;
      color: #E8EEF7;
      opacity: 0;
    }
    .caption-word { color: rgba(232, 238, 247, 0.45); display: inline; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>
  <script>
    (function () {
      var GROUPS = ${payload};
      var cap = document.getElementById("cap");
      var tl = gsap.timeline({ paused: true });
      GROUPS.forEach(function (g) {
        var el = document.createElement("div");
        el.className = "caption-group";
        g.words.forEach(function (w) {
          var s = document.createElement("span");
          s.className = "caption-word";
          s.textContent = w.text;
          el.appendChild(s);
        });
        cap.appendChild(el);
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.12, overwrite: "auto" }, g.start);
        tl.to(el, { opacity: 0, duration: 0.1, overwrite: "auto" }, Math.max(g.start + 0.15, g.end - 0.05));
        tl.set(el, { opacity: 0, visibility: "hidden" }, g.end + 0.1);
        g.words.forEach(function (w, i) {
          tl.to(el.children[i], { color: "#E8EEF7", duration: 0.05 }, w.start);
        });
      });
      tl.to({}, { duration: ${total} }, 0);
      window.__timelines = window.__timelines || {};
      window.__timelines["captions"] = tl;
    })();
  </script>
</template>
`;
  fs.writeFileSync(path.join(ROOT, "compositions/captions.html"), html);
  fs.writeFileSync(
    path.join(ROOT, "caption_groups.json"),
    JSON.stringify(groups, null, 2),
  );
}

function writeMeta(schedule, total) {
  const brief = `---
workflow: product-launch-video
flow: automation
storyboard: no
message: "YesONO 3.0 turns exchange-grade infrastructure into your branded business — HyperFrames alternative to MiniMax H3"
destination: website-and-youtube
aspect: 1920x1080
language: zh-CN
audience: B2B market creators, brokers, traffic and data platforms, and market makers
length: "~157s measured CosyVoice"
angle: operator-business
narration: "yes — CosyVoice Mandarin male 中文男 ~1.22 speed (copied from minimax promo)"
vo_mode: verbatim
---

## Intent

Build an autonomous HyperFrames alternative to the failed MiniMax H3 cut. Eleven clips from the MiniMax B2B script, dark fintech look, CosyVoice WAVs wired by measured duration, burned caption layer.

## Assets

- \`../../episodes/res/doc/yesono-3-26-b2b-minimax-script.md\` — narrative, 旁白/字幕, visual beats (source of truth).
- \`../yesono-3-minimax-promo/audio/cosyvoice/\` — CosyVoice WAVs + timings (read-only copy into this project).

## Customizations

- No storyboard review gate. Proceed through check → render.
- On-screen typography is author-controlled HTML only; Chinese strings exact from script key titles/labels.
- Spoken YesONO = "Yes or No"; on-screen brand stays YesONO.
- Scene duration = WAV duration + ${GAP}s gap (except last).

## Notes

- Palette: ink #0A101C, brass #D4B36A, harbor #6FA3DC, jade #6FC2A0.
- Hard cuts / fast flash between scenes. No cartoons, no real people, no non-YesONO brands.
`;

  fs.writeFileSync(path.join(ROOT, "BRIEF.md"), brief);

  const scriptLines = schedule
    .map(
      (s, i) =>
        `## Clip ${String(i + 1).padStart(2, "0")} · ${timings.segments[i].title}\n\n${s.caption}\n\nSpoken: ${s.spoken}\n`,
    )
    .join("\n");
  fs.writeFileSync(
    path.join(ROOT, "SCRIPT.md"),
    `---\nlanguage: zh-CN\nprovider: cosyvoice\nvoice: 中文男\n---\n\n${scriptLines}`,
  );

  const story = schedule
    .map(
      (s, i) => `## Frame ${i + 1}: ${s.id}
duration: ${s.sceneDur}
start: ${s.start}
visual: ${s.eyebrow} — ${s.stamp}
vo: ${s.caption}
`,
    )
    .join("\n");
  fs.writeFileSync(
    path.join(ROOT, "STORYBOARD.md"),
    `---
title: YesONO 3.0 HF v2
duration: ${total}
aspect: 1920x1080
music: none
---

${story}
`,
  );

  fs.writeFileSync(
    path.join(ROOT, "capture/extracted/tokens.json"),
    JSON.stringify(
      {
        title: "YesONO 3.0",
        description: "Exchange OS for operators",
        colors: ["#0A101C", "#D4B36A", "#6FA3DC", "#6FC2A0", "#E8EEF7"],
        fonts: ["Songti SC", "PingFang SC", "SF Mono"],
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(ROOT, "capture/extracted/visible-text.txt"),
    schedule.map((s) => s.caption).join("\n\n"),
  );
  fs.writeFileSync(
    path.join(ROOT, "capture/extracted/asset-descriptions.md"),
    "No site capture. Motion-graphics only from MiniMax script visual beats.\n",
  );
  fs.writeFileSync(
    path.join(ROOT, "user_script.txt"),
    fs.readFileSync(
      path.join(ROOT, "../../episodes/res/doc/yesono-3-26-b2b-minimax-script.md"),
      "utf8",
    ),
  );

  fs.writeFileSync(
    path.join(ROOT, "audio_meta.json"),
    JSON.stringify(
      {
        provider: "cosyvoice",
        total_duration: total,
        gap: GAP,
        segments: schedule.map((s) => ({
          id: s.id,
          start: s.start,
          duration: s.audioDur,
          scene_duration: s.sceneDur,
          path: s.wav,
          caption: s.caption,
          spoken: s.spoken,
        })),
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(ROOT, "caption-overrides.json"), "[]\n");

  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "meta.json"), "utf8"));
  meta.name = "yesono-3-hf-v2";
  fs.writeFileSync(path.join(ROOT, "meta.json"), JSON.stringify(meta, null, 2));
}

function main() {
  const { schedule, total } = buildSchedule();
  console.log("Total duration:", total);
  schedule.forEach((s) =>
    console.log(
      `${s.id} start=${s.start.toFixed(3)} scene=${s.sceneDur.toFixed(3)} audio=${s.audioDur.toFixed(3)}`,
    ),
  );

  writeFrames(schedule);
  writeIndex(schedule, total);

  const srt = fs.readFileSync(
    path.join(ROOT, "audio/cosyvoice/captions.srt"),
    "utf8",
  );
  const cues = parseSrt(srt);
  const groups = remapCues(cues, schedule);
  writeCaptions(groups, total);
  writeMeta(schedule, total);

  console.log("Caption groups:", groups.length);
  console.log("Built project at", ROOT);
}

main();
