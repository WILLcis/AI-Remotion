/**
 * Large illustrated SVG scenes — blockchain / exchange / crypto motion art.
 * Text is overlay; drawings carry the shot.
 */

const C = {
  brass: "#D4B36A",
  harbor: "#6FA3DC",
  jade: "#6FC2A0",
  alert: "#E85D5D",
  dim: "#AEBED2",
  faint: "#8798B0",
  ink: "#0A101C",
  panel: "#131C2E",
};

function candle(x, base, h, up) {
  const body = Math.max(18, h * 0.55);
  const wick = h;
  const y = base - body;
  const fill = up ? C.brass : C.harbor;
  return `<g class="candle" transform="translate(${x} 0)">
    <line x1="10" y1="${base - wick}" x2="10" y2="${base + 8}" stroke="${fill}" stroke-width="2" opacity=".7"/>
    <rect x="2" y="${y}" width="16" height="${body}" rx="2" fill="${fill}" opacity=".85"/>
  </g>`;
}

function coin(cx, cy, r, label, fill = C.brass) {
  return `<g class="coin" transform="translate(${cx} ${cy})">
    <circle r="${r}" fill="${fill}" fill-opacity=".18" stroke="${fill}" stroke-width="3"/>
    <circle r="${r * 0.72}" fill="none" stroke="${fill}" stroke-width="1.5" stroke-dasharray="4 3" opacity=".7"/>
    <text text-anchor="middle" dominant-baseline="central" fill="${fill}" font-size="${r * 0.55}" font-family="JetBrains Mono,monospace" font-weight="700">${label}</text>
  </g>`;
}

function block(x, y, w, h, label) {
  return `<g class="chain-block" transform="translate(${x} ${y})">
    <rect width="${w}" height="${h}" rx="10" fill="rgba(111,194,160,.12)" stroke="${C.jade}" stroke-width="2.5"/>
    <rect x="10" y="12" width="${w - 20}" height="10" rx="2" fill="${C.jade}" opacity=".35"/>
    <rect x="10" y="28" width="${(w - 20) * 0.7}" height="8" rx="2" fill="${C.dim}" opacity=".35"/>
    <text x="${w / 2}" y="${h - 16}" text-anchor="middle" fill="${C.jade}" font-size="14" font-family="JetBrains Mono,monospace">${label}</text>
  </g>`;
}

/** Full-bleed exchange floor: building + candlesticks + order ticks */
export function artExchangeAsk() {
  return `<svg class="viz" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="exGlow" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="${C.brass}" stop-opacity=".35"/><stop offset="1" stop-color="${C.brass}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g class="ex-building" opacity=".95">
      <path d="M620 720 L800 520 L980 720 Z" fill="url(#exGlow)" stroke="${C.brass}" stroke-width="2"/>
      <rect x="700" y="560" width="200" height="160" fill="${C.panel}" stroke="${C.harbor}" stroke-width="2"/>
      <rect x="730" y="590" width="40" height="50" fill="${C.harbor}" opacity=".35"/>
      <rect x="790" y="590" width="40" height="50" fill="${C.brass}" opacity=".3"/>
      <rect x="850" y="590" width="40" height="50" fill="${C.harbor}" opacity=".35"/>
      <rect x="760" y="660" width="80" height="60" fill="${C.ink}" stroke="${C.brass}" stroke-width="2"/>
      <text x="800" y="500" text-anchor="middle" fill="${C.brass}" font-size="22" font-family="JetBrains Mono,monospace" letter-spacing="4">EXCHANGE</text>
    </g>
    <g class="candles">${[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => candle(180 + i * 48, 780, 60 + (i % 5) * 28 + (i % 3) * 20, i % 2 === 0)).join("")}</g>
    <g class="tick-stream" font-family="JetBrains Mono,monospace" font-size="18" fill="${C.dim}">
      <text class="tick" x="120" y="160">BTC/USDT  +1.24%</text>
      <text class="tick" x="1180" y="200">ETH/USDT  -0.48%</text>
      <text class="tick" x="160" y="240">GOLD  +0.31%</text>
      <text class="tick" x="1220" y="280">SPX  +0.12%</text>
    </g>
    ${coin(240, 420, 42, "₿")}
    ${coin(1360, 460, 38, "Ξ", C.harbor)}
  </svg>`;
}

/** Five glowing capability orbs merging into columns */
export function artFiveLayers() {
  const labels = ["治理", "市场", "交易", "资金", "做市"];
  const colors = [C.jade, C.harbor, C.brass, C.dim, C.brass];
  return `<svg class="viz" viewBox="0 0 900 900">
    ${labels.map((lab, i) => {
      const y = 80 + i * 150;
      return `<g class="orb" style="--i:${i}">
        <circle cx="450" cy="${y}" r="52" fill="${colors[i]}" fill-opacity=".15" stroke="${colors[i]}" stroke-width="3"/>
        <circle cx="450" cy="${y}" r="28" fill="${colors[i]}" fill-opacity=".35"/>
        <text x="450" y="${y + 6}" text-anchor="middle" fill="${C.dim}" font-size="26" font-family="Songti SC,serif">${lab}</text>
        ${i < 4 ? `<line x1="450" y1="${y + 52}" x2="450" y2="${y + 98}" stroke="${C.harbor}" stroke-width="2" stroke-dasharray="6 4" opacity=".5"/>` : ""}
      </g>`;
    }).join("")}
  </svg>`;
}

/** Isometric OS module cube */
export function artOsModule() {
  return `<svg class="viz" viewBox="0 0 800 700">
    <g class="iso-cube">
      <path d="M400 80 L640 220 L400 360 L160 220 Z" fill="rgba(212,179,106,.2)" stroke="${C.brass}" stroke-width="3"/>
      <path d="M160 220 L400 360 L400 560 L160 420 Z" fill="rgba(111,163,220,.18)" stroke="${C.harbor}" stroke-width="3"/>
      <path d="M400 360 L640 220 L640 420 L400 560 Z" fill="rgba(111,194,160,.12)" stroke="${C.jade}" stroke-width="3"/>
      <text x="400" y="250" text-anchor="middle" fill="${C.brass}" font-size="42" font-family="Songti SC,serif">YesONO 3.0</text>
      <text x="400" y="295" text-anchor="middle" fill="${C.dim}" font-size="18" font-family="JetBrains Mono,monospace" letter-spacing="3">EXCHANGE OS</text>
    </g>
    ${[0,1,2,3,4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      const x = 400 + Math.cos(a) * 280;
      const y = 320 + Math.sin(a) * 180;
      return `<circle class="spark" cx="${x}" cy="${y}" r="6" fill="${C.brass}"/>`;
    }).join("")}
  </svg>`;
}

export function artSeal() {
  return `<svg class="viz seal-big" viewBox="0 0 420 420">
    <circle cx="210" cy="210" r="190" fill="none" stroke="${C.brass}" stroke-width="6"/>
    <circle cx="210" cy="210" r="155" fill="none" stroke="${C.brass}" stroke-width="2" stroke-dasharray="8 6" opacity=".6"/>
    <circle cx="210" cy="210" r="110" fill="rgba(212,179,106,.12)" stroke="${C.brass}" stroke-width="3"/>
    <text x="210" y="200" text-anchor="middle" fill="${C.brass}" font-size="36" font-family="Songti SC,serif">YesONO</text>
    <text x="210" y="240" text-anchor="middle" fill="${C.dim}" font-size="18" font-family="JetBrains Mono,monospace">3.0</text>
  </svg>`;
}

/** Six technical systems as illustrated engines (not PPT cards) */
export function artPainEngines(alert = false) {
  const stroke = alert ? C.alert : C.harbor;
  const items = [
    {x: 120, y: 120, title: "撮合引擎", draw: `<circle cx="90" cy="70" r="34" fill="none" stroke="${stroke}" stroke-width="3"/><circle cx="90" cy="70" r="14" fill="${stroke}" opacity=".4"/><path d="M90 30v18M90 92v18M50 70h18M112 70h18" stroke="${C.brass}" stroke-width="3"/>`},
    {x: 560, y: 120, title: "预交易风控", draw: `<path d="M90 28l48 16v40c0 28-20 48-48 56-28-8-48-28-48-56V44l48-16z" fill="rgba(111,194,160,.12)" stroke="${alert ? C.alert : C.jade}" stroke-width="3"/><path d="M70 78l14 14 28-30" fill="none" stroke="${alert ? C.alert : C.jade}" stroke-width="3"/>`},
    {x: 1000, y: 120, title: "资金账本", draw: `<rect x="40" y="30" width="100" height="90" rx="6" fill="${C.panel}" stroke="${stroke}" stroke-width="2"/><path d="M55 50h70M55 68h70M55 86h48" stroke="${C.dim}" stroke-width="2"/>`},
    {x: 120, y: 460, title: "链上清算", draw: `${block(30, 30, 70, 70, "B1")}${block(90, 50, 70, 70, "B2")}`},
    {x: 560, y: 460, title: "KYC合规", draw: `<circle cx="90" cy="55" r="22" fill="none" stroke="${C.brass}" stroke-width="3"/><path d="M50 120c8-28 24-40 40-40s32 12 40 40" fill="none" stroke="${stroke}" stroke-width="3"/><rect x="118" y="40" width="36" height="28" rx="4" fill="none" stroke="${C.jade}" stroke-width="2"/>`},
    {x: 1000, y: 460, title: "冷启动流动性", draw: `<path d="M30 110 Q70 30 110 110 T190 110" fill="none" stroke="${C.brass}" stroke-width="3"/><path d="M30 110h160" stroke="${C.faint}" stroke-width="2"/>`},
  ];
  return `<svg class="viz" viewBox="0 0 1400 780">
    ${items.map((it, i) => `<g class="engine" style="--i:${i}" transform="translate(${it.x} ${it.y})">
      <rect width="280" height="260" rx="16" fill="${C.panel}" stroke="${stroke}" stroke-width="${alert ? 3 : 1.5}" opacity=".95"/>
      <g transform="translate(50 40)">${it.draw}</g>
      <text x="140" y="230" text-anchor="middle" fill="${C.dim}" font-size="26" font-family="Songti SC,serif">${it.title}</text>
    </g>`).join("")}
  </svg>`;
}

export function artTrustAsh() {
  return `<svg class="viz" viewBox="0 0 900 500">
    <g class="broken-chain">
      ${block(80, 160, 120, 120, "TX")}
      <path d="M210 220 H300" stroke="${C.alert}" stroke-width="4" stroke-dasharray="10 8"/>
      ${block(320, 180, 120, 120, "??")}
      <path d="M450 240 H540" stroke="${C.alert}" stroke-width="4" stroke-dasharray="10 8"/>
      ${block(560, 150, 120, 120, "LED")}
      <circle class="ash" cx="700" cy="220" r="40" fill="${C.alert}" opacity=".25"/>
      <circle class="ash" cx="760" cy="280" r="24" fill="${C.alert}" opacity=".2"/>
      <circle class="ash" cx="820" cy="200" r="18" fill="${C.alert}" opacity=".15"/>
    </g>
  </svg>`;
}

/** Isometric capability tower */
export function artTower(mode = "stack") {
  const layers = [
    {y: 80, label: "做市", c: C.brass},
    {y: 160, label: "资金", c: C.jade},
    {y: 240, label: "交易", c: C.harbor},
    {y: 320, label: "市场", c: C.dim},
    {y: 400, label: "治理", c: C.harbor},
  ];
  if (mode === "sink") {
    return `<svg class="viz" viewBox="0 0 700 820">
      <g class="top-layer">
        <path d="M350 60 L520 150 L350 240 L180 150 Z" fill="rgba(212,179,106,.25)" stroke="${C.brass}" stroke-width="3"/>
        <text x="350" y="160" text-anchor="middle" fill="${C.brass}" font-size="32" font-family="Songti SC,serif">经营层</text>
      </g>
      <g class="sunk" opacity=".45">
        ${layers.map((l, i) => `<g transform="translate(0 ${120 + i * 70})">
          <path d="M350 40 L500 110 L350 180 L200 110 Z" fill="rgba(19,28,46,.9)" stroke="${l.c}" stroke-width="2"/>
          <text x="350" y="120" text-anchor="middle" fill="${C.faint}" font-size="20">${l.label}</text>
        </g>`).join("")}
      </g>
      <rect x="120" y="720" width="460" height="60" rx="8" fill="#0B1220" stroke="${C.harbor}" stroke-width="2"/>
      <text x="350" y="758" text-anchor="middle" fill="${C.harbor}" font-size="20" font-family="JetBrains Mono,monospace" letter-spacing="3">PLATFORM 平台层</text>
    </svg>`;
  }
  return `<svg class="viz" viewBox="0 0 700 700">
    ${layers.map((l, i) => `<g class="tower-layer" style="--i:${i}" transform="translate(0 ${l.y})">
      <path d="M350 0 L530 90 L350 180 L170 90 Z" fill="rgba(19,28,46,.95)" stroke="${l.c}" stroke-width="2.5"/>
      <path d="M170 90 L350 180 L350 210 L170 120 Z" fill="rgba(111,163,220,.12)" stroke="${l.c}" stroke-width="2"/>
      <path d="M350 180 L530 90 L530 120 L350 210 Z" fill="rgba(212,179,106,.08)" stroke="${l.c}" stroke-width="2"/>
      <text x="350" y="105" text-anchor="middle" fill="${C.dim}" font-size="28" font-family="Songti SC,serif">${l.label}</text>
    </g>`).join("")}
  </svg>`;
}

export function artOpsLayer() {
  return `<svg class="viz" viewBox="0 0 1000 600">
    <path d="M500 80 L780 240 L500 400 L220 240 Z" fill="rgba(212,179,106,.2)" stroke="${C.brass}" stroke-width="3"/>
    <text x="500" y="230" text-anchor="middle" fill="${C.brass}" font-size="48" font-family="Songti SC,serif">经营层</text>
    <text x="500" y="280" text-anchor="middle" fill="${C.dim}" font-size="22" font-family="JetBrains Mono,monospace">品牌 · 客户 · 玩法 · 增长</text>
    ${["品牌", "客户", "玩法", "增长"].map((t, i) => {
      const x = 180 + i * 180;
      return `<g class="ops-tag" transform="translate(${x} 480)">
        <rect width="140" height="48" rx="8" fill="${C.panel}" stroke="${C.brass}" stroke-width="1.5"/>
        <text x="70" y="30" text-anchor="middle" fill="${C.dim}" font-size="20">${t}</text>
      </g>`;
    }).join("")}
  </svg>`;
}

export function artTenantRing(multi = false) {
  return `<svg class="viz" viewBox="0 0 1100 800">
    <g class="tenant-core">
      <circle cx="550" cy="400" r="180" fill="rgba(212,179,106,.1)" stroke="${C.brass}" stroke-width="4"/>
      <circle cx="550" cy="400" r="140" fill="none" stroke="${C.brass}" stroke-width="1.5" stroke-dasharray="8 6" opacity=".6"/>
      <path d="M480 360 Q550 300 620 360 Q550 460 480 360" fill="rgba(212,179,106,.15)" stroke="${C.brass}" stroke-width="2"/>
      <text x="550" y="410" text-anchor="middle" fill="${C.brass}" font-size="36" font-family="Songti SC,serif">独立经营域</text>
    </g>
    ${[
      [220, 220, "你的客户"],
      [880, 220, "你的账务"],
      [220, 580, "你的数据"],
      [880, 580, "你的品牌"],
    ].map(([x, y, t], i) => `<g class="sat-lab" style="--i:${i}" transform="translate(${x} ${y})">
      <rect x="-90" y="-28" width="180" height="56" rx="10" fill="${C.panel}" stroke="${C.harbor}" stroke-width="2"/>
      <text text-anchor="middle" y="8" fill="${C.dim}" font-size="22">${t}</text>
      <line x1="${x < 550 ? 90 : -90}" y1="0" x2="${550 - x}" y2="${400 - y}" stroke="${C.harbor}" stroke-width="1.5" opacity=".4" transform="translate(${-x} ${-y})"/>
    </g>`).join("")}
    ${multi ? `
      <circle cx="200" cy="400" r="90" fill="none" stroke="${C.faint}" stroke-width="2" opacity=".35"/>
      <circle cx="900" cy="400" r="90" fill="none" stroke="${C.faint}" stroke-width="2" opacity=".35"/>
      <line x1="380" y1="200" x2="380" y2="600" stroke="${C.brass}" stroke-width="2" opacity=".7"/>
      <line x1="720" y1="200" x2="720" y2="600" stroke="${C.brass}" stroke-width="2" opacity=".7"/>
    ` : ""}
  </svg>`;
}

export function artMarketShelf() {
  const tickers = ["BTC", "ETH", "GOLD", "SPX", "OIL", "FX"];
  return `<svg class="viz" viewBox="0 0 1500 700">
    <text x="80" y="60" fill="${C.harbor}" font-size="28" font-family="Songti SC,serif">共享订单簿</text>
    ${tickers.map((t, i) => {
      const x = 60 + i * 230;
      return `<g class="shelf-item" style="--i:${i}" transform="translate(${x} 120)">
        <rect width="200" height="420" rx="12" fill="${C.panel}" stroke="${C.harbor}" stroke-width="1.5"/>
        <text x="100" y="50" text-anchor="middle" fill="${C.brass}" font-size="28" font-family="JetBrains Mono,monospace">${t}</text>
        ${[0,1,2,3,4,5,6].map((j) => {
          const h = 40 + ((i + j) % 5) * 22;
          return `<rect class="mini-bar" x="${24 + j * 22}" y="${380 - h}" width="16" height="${h}" fill="${j % 2 ? C.brass : C.harbor}" opacity=".55"/>`;
        }).join("")}
        <text x="100" y="400" text-anchor="middle" fill="${C.faint}" font-size="14" font-family="JetBrains Mono,monospace">DEPTH</text>
      </g>`;
    }).join("")}
  </svg>`;
}

export function artPropMarket() {
  return `<svg class="viz" viewBox="0 0 900 700">
    <g class="prop-card">
      <rect x="220" y="80" width="460" height="420" rx="16" fill="${C.panel}" stroke="${C.brass}" stroke-width="3"/>
      <rect x="220" y="80" width="460" height="70" rx="16" fill="rgba(212,179,106,.18)"/>
      <text x="450" y="128" text-anchor="middle" fill="${C.brass}" font-size="36" font-family="Songti SC,serif">专有市场</text>
      ${coin(450, 280, 70, "独家")}
      ${["独家题材", "独家规则", "独家定价"].map((t, i) => {
        const a = -60 + i * 60;
        const rad = (a * Math.PI) / 180;
        const x = 450 + Math.cos(rad) * 220;
        const y = 300 + Math.sin(rad) * 160;
        return `<g class="orbit-tag" transform="translate(${x} ${y})">
          <rect x="-70" y="-22" width="140" height="44" rx="8" fill="${C.panel}" stroke="${C.brass}" stroke-width="1.5"/>
          <text text-anchor="middle" y="7" fill="${C.dim}" font-size="18">${t}</text>
        </g>`;
      }).join("")}
    </g>
    <g class="progress-rail" transform="translate(150 580)">
      <rect width="600" height="10" rx="5" fill="rgba(159,176,199,.2)"/>
      <rect class="rail-fill" width="600" height="10" rx="5" fill="${C.brass}" transform="scale(0,1)" transform-origin="0 0"/>
      <text x="0" y="40" fill="${C.faint}" font-size="16" font-family="JetBrains Mono,monospace">定义</text>
      <text x="250" y="40" fill="${C.faint}" font-size="16" font-family="JetBrains Mono,monospace">门禁</text>
      <text x="520" y="40" fill="${C.faint}" font-size="16" font-family="JetBrains Mono,monospace">开市</text>
    </g>
  </svg>`;
}

export function artDualProducts(dense = false) {
  const left = dense
    ? ["体育赛果", "选举结果", "宏观数据", "天气", "赛事", "裁决事件"]
    : ["体育", "选举", "宏观数据"];
  const right = dense
    ? ["股票", "股指", "黄金", "外汇", "BTC", "ETH", "永续"]
    : ["股票", "黄金", "BTC"];
  return `<svg class="viz" viewBox="0 0 1500 700">
    <g class="pane-left">
      <rect x="40" y="60" width="660" height="560" rx="16" fill="rgba(212,179,106,.08)" stroke="${C.brass}" stroke-width="2"/>
      <text x="370" y="130" text-anchor="middle" fill="${C.brass}" font-size="40" font-family="Songti SC,serif">Outcome 预测市场</text>
      ${left.map((t, i) => `<g class="chip" transform="translate(${120 + (i % 3) * 180} ${200 + Math.floor(i / 3) * 90})">
        <rect width="150" height="50" rx="8" fill="${C.panel}" stroke="${C.brass}" stroke-width="1.5"/>
        <text x="75" y="32" text-anchor="middle" fill="${C.dim}" font-size="20">${t}</text>
      </g>`).join("")}
      <text x="370" y="520" text-anchor="middle" fill="${C.faint}" font-size="22" font-family="JetBrains Mono,monospace">YES / NO</text>
    </g>
    <g class="pane-right">
      <rect x="800" y="60" width="660" height="560" rx="16" fill="rgba(111,163,220,.08)" stroke="${C.harbor}" stroke-width="2"/>
      <text x="1130" y="130" text-anchor="middle" fill="${C.harbor}" font-size="40" font-family="Songti SC,serif">CFD 差价合约</text>
      ${right.map((t, i) => `<g class="chip" transform="translate(${880 + (i % 3) * 180} ${200 + Math.floor(i / 3) * 80})">
        <rect width="150" height="50" rx="8" fill="${C.panel}" stroke="${C.harbor}" stroke-width="1.5"/>
        <text x="75" y="32" text-anchor="middle" fill="${C.dim}" font-size="20">${t}</text>
      </g>`).join("")}
      ${coin(1050, 480, 36, "₿")}
      ${coin(1180, 500, 32, "Ξ", C.harbor)}
      ${coin(1280, 470, 28, "Au", C.brass)}
    </g>
  </svg>`;
}

export function artMergeX() {
  return `<svg class="viz" viewBox="0 0 900 500">
    <text x="200" y="240" text-anchor="middle" fill="${C.brass}" font-size="48" font-family="Songti SC,serif">Outcome</text>
    <text class="x-mark" x="450" y="260" text-anchor="middle" fill="${C.brass}" font-size="120" font-family="JetBrains Mono,monospace">×</text>
    <text x="700" y="240" text-anchor="middle" fill="${C.harbor}" font-size="48" font-family="Songti SC,serif">CFD</text>
    <circle class="burst-ring" cx="450" cy="220" r="40" fill="none" stroke="#fff" stroke-width="3" opacity="0"/>
  </svg>`;
}

export function artOrderPipeline(lit = false) {
  const nodes = ["风控准入", "撮合成交", "逐笔入账", "清算交割"];
  return `<svg class="viz" viewBox="0 0 1500 520">
    <g class="order-packet">
      <rect x="40" y="220" width="70" height="70" rx="10" fill="${C.brass}" fill-opacity=".25" stroke="${C.brass}" stroke-width="3"/>
      <text x="75" y="262" text-anchor="middle" fill="${C.brass}" font-size="18" font-family="JetBrains Mono,monospace">ORD</text>
    </g>
    ${nodes.map((n, i) => {
      const x = 220 + i * 300;
      return `<g class="pipe-node" style="--i:${i}" transform="translate(${x} 160)">
        <rect width="200" height="200" rx="14" fill="${C.panel}" stroke="${lit ? C.jade : C.harbor}" stroke-width="2.5"/>
        <circle cx="100" cy="70" r="28" fill="${lit ? C.jade : C.harbor}" fill-opacity=".2" stroke="${lit ? C.jade : C.harbor}" stroke-width="2"/>
        <text x="100" y="140" text-anchor="middle" fill="${C.dim}" font-size="24" font-family="Songti SC,serif">${n}</text>
        ${lit ? `<text class="pass" x="100" y="175" text-anchor="middle" fill="${C.jade}" font-size="18" font-family="JetBrains Mono,monospace">通过</text>` : ""}
      </g>
      ${i < 3 ? `<line class="pipe-link" x1="${x + 200}" y1="260" x2="${x + 300}" y2="260" stroke="${lit ? C.jade : C.harbor}" stroke-width="3" ${lit ? "" : 'stroke-dasharray="8 6"'}/>` : ""}`;
    }).join("")}
  </svg>`;
}

export function artBlockchain(zoom = false) {
  const blocks = ["0xA1", "0xB7", "0xC3", "0xD9", "0xE2"];
  return `<svg class="viz" viewBox="0 0 1500 700">
    <g class="ledger" opacity="${zoom ? 0.25 : 1}">
      ${[0,1,2,3,4,5].map((i) => `<g class="led-line" transform="translate(60 ${100 + i * 70})">
        <rect width="420" height="50" rx="6" fill="rgba(111,194,160,.08)" stroke="${C.jade}" stroke-width="1.5"/>
        <text x="20" y="32" fill="${C.jade}" font-size="18" font-family="JetBrains Mono,monospace">TX ${1000 + i * 17} · SETTLE · OK</text>
      </g>`).join("")}
    </g>
    <g class="chain" transform="translate(${zoom ? 350 : 560} ${zoom ? 180 : 220})">
      ${blocks.map((lab, i) => `
        ${i ? `<line x1="${i * 160 - 20}" y1="70" x2="${i * 160}" y2="70" stroke="${C.jade}" stroke-width="4"/>` : ""}
        ${block(i * 160, 0, 140, 140, lab)}
      `).join("")}
      ${zoom ? `<g class="verify" transform="translate(320 -40)">
        <circle cx="70" cy="70" r="50" fill="rgba(111,194,160,.2)" stroke="${C.jade}" stroke-width="3"/>
        <path d="M45 72l18 18 32-36" fill="none" stroke="${C.jade}" stroke-width="5"/>
        <text x="70" y="150" text-anchor="middle" fill="${C.jade}" font-size="28" font-family="Songti SC,serif">可验证</text>
      </g>` : ""}
    </g>
    ${!zoom ? `<g class="particles">${[0,1,2,3,4,5,6,7].map((i) => `<circle class="particle" cx="${480 + i * 8}" cy="${140 + i * 40}" r="4" fill="${C.jade}"/>`).join("")}</g>` : ""}
  </svg>`;
}

export function artOrderBook(full = false) {
  const asks = full ? [90, 120, 150, 180, 210, 160, 130] : [20, 24, 18, 22, 16, 20, 18];
  const bids = full ? [100, 140, 170, 200, 230, 190, 150] : [18, 22, 16, 20, 14, 18, 16];
  return `<svg class="viz" viewBox="0 0 1400 700">
    <text x="700" y="50" text-anchor="middle" fill="${C.faint}" font-size="22" font-family="JetBrains Mono,monospace">ORDER BOOK · BTC/USDT</text>
    <g class="asks" transform="translate(120 100)">
      ${asks.map((h, i) => `<rect class="depth-bar ask" x="${i * 70}" y="${480 - h * (full ? 1.6 : 4)}" width="50" height="${h * (full ? 1.6 : 4)}" fill="${C.harbor}" opacity="${full ? 0.55 : 0.25}" ${full ? "" : 'stroke-dasharray="4 3" stroke="' + C.harbor + '"'}/>`).join("")}
    </g>
    <g class="bids" transform="translate(780 100)">
      ${bids.map((h, i) => `<rect class="depth-bar bid" x="${i * 70}" y="${480 - h * (full ? 1.6 : 4)}" width="50" height="${h * (full ? 1.6 : 4)}" fill="${C.brass}" opacity="${full ? 0.55 : 0.25}" ${full ? "" : 'stroke-dasharray="4 3" stroke="' + C.brass + '"'}/>`).join("")}
    </g>
    <line x1="700" y1="120" x2="700" y2="620" stroke="${C.faint}" stroke-width="1" opacity=".4"/>
    ${full ? `<g class="mm-badge">
      <rect x="560" y="300" width="280" height="60" rx="10" fill="${C.panel}" stroke="${C.brass}" stroke-width="2"/>
      <text x="700" y="338" text-anchor="middle" fill="${C.brass}" font-size="22" font-family="JetBrains Mono,monospace">做市商工作台</text>
    </g>` : `<text x="700" y="360" text-anchor="middle" fill="${C.faint}" font-size="28" font-family="Songti SC,serif">无深度</text>`}
  </svg>`;
}

export function artBudgetBadge(text) {
  return `<svg class="viz" viewBox="0 0 700 300">
    <rect class="badge" x="120" y="80" width="460" height="120" rx="16" fill="rgba(212,179,106,.15)" stroke="${C.brass}" stroke-width="3"/>
    <text x="350" y="155" text-anchor="middle" fill="${C.brass}" font-size="42" font-family="JetBrains Mono,monospace">${text}</text>
  </svg>`;
}

export function artRevenueCurves() {
  const colors = [C.brass, C.harbor, C.jade, C.dim, "#E8EEF7"];
  return `<svg class="viz" viewBox="0 0 1400 600">
    ${colors.map((c, i) => `<path class="curve-path" style="--i:${i}" d="M40 ${480 - i * 35} C 320 ${420 - i * 50}, 700 ${500 - i * 60}, 1320 ${160 - i * 18}" fill="none" stroke="${c}" stroke-width="3"/>`).join("")}
    ${["交易手续费", "专有市场溢价", "做市点差协同", "数据产品", "客户资产服务"].map((t, i) => `<text class="curve-lab" x="80" y="${120 + i * 40}" fill="${colors[i]}" font-size="22" font-family="Songti SC,serif">${t}</text>`).join("")}
  </svg>`;
}

export function artBarSurge() {
  return `<svg class="viz" viewBox="0 0 600 600">
    <rect x="200" y="80" width="200" height="440" rx="8" fill="none" stroke="${C.brass}" stroke-width="2"/>
    <rect class="surge" x="200" y="80" width="200" height="440" fill="url(#sg)" transform="scale(1,0)" transform-origin="300 520"/>
    <defs><linearGradient id="sg" x1="0" y1="1" x2="0" y2="0"><stop stop-color="${C.brass}"/><stop offset="1" stop-color="${C.brass}" stop-opacity=".2"/></linearGradient></defs>
    ${[0,1,2,3,4,5].map((i) => `<circle class="spark" cx="${180 + (i % 3) * 120}" cy="${400 - i * 40}" r="5" fill="${C.brass}"/>`).join("")}
  </svg>`;
}

export function artCloseSplit() {
  return `<svg class="viz" viewBox="0 0 1500 700">
    <g class="left">
      <rect x="40" y="60" width="680" height="560" rx="16" fill="rgba(111,163,220,.1)" stroke="${C.harbor}" stroke-width="2"/>
      <text x="380" y="160" text-anchor="middle" fill="${C.harbor}" font-size="56" font-family="Songti SC,serif">平台扛</text>
      ${["权威", "安全", "清算", "审计"].map((t, i) => `<g transform="translate(${140 + (i % 2) * 240} ${240 + Math.floor(i / 2) * 140})">
        <circle r="40" fill="none" stroke="${C.harbor}" stroke-width="2"/>
        <text text-anchor="middle" y="8" fill="${C.dim}" font-size="24">${t}</text>
      </g>`).join("")}
    </g>
    <g class="right">
      <rect x="780" y="60" width="680" height="560" rx="16" fill="rgba(212,179,106,.1)" stroke="${C.brass}" stroke-width="2"/>
      <text x="1120" y="160" text-anchor="middle" fill="${C.brass}" font-size="56" font-family="Songti SC,serif">你专注</text>
      ${["客户", "玩法", "品牌", "增长"].map((t, i) => `<g transform="translate(${880 + (i % 2) * 240} ${240 + Math.floor(i / 2) * 140})">
        <circle r="40" fill="none" stroke="${C.brass}" stroke-width="2"/>
        <text text-anchor="middle" y="8" fill="${C.dim}" font-size="24">${t}</text>
      </g>`).join("")}
    </g>
  </svg>`;
}
