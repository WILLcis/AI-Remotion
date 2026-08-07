#!/usr/bin/env python3
"""Generate the eleven deterministic YesONO HyperFrames sub-compositions."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRAMES_DIR = ROOT / "compositions" / "frames"

SCENES = [
    {
        "slug": "01-operator-open",
        "eyebrow": "YESONO 3.0 · OPERATOR EDITION",
        "title": "把一座交易所，<em>变成你的生意。</em>",
        "lede": "写给经营者，而不是工程师。你带客户与玩法，交易所级底座由平台承载。",
        "kind": "aperture",
        "labels": ["品牌", "客户", "玩法", "增长"],
        "stamp": "EXCHANGE-GRADE INFRASTRUCTURE",
    },
    {
        "slug": "02-hidden-cost",
        "eyebrow": "01 · THE HIDDEN COST",
        "title": "真正的门槛，<em>都在前台之外。</em>",
        "lede": "撮合、风控、账本、清算、合规与流动性；出错的代价，是客户的信任。",
        "kind": "cost",
        "labels": ["撮合与定价", "风控与资金", "清算与托管", "合规审批", "流动性", "数据监控"],
        "stamp": "TEAM · YEARS · TRUST",
    },
    {
        "slug": "03-exchange-os",
        "eyebrow": "02 · EXCHANGE OPERATING SYSTEM",
        "title": "五层能力下沉，<em>一层生意归你。</em>",
        "lede": "平台承担治理、市场、交易、资金与做市；你保留品牌、客户、玩法和增长。",
        "kind": "layers",
        "labels": ["治理 GOVERNANCE", "市场 MARKET", "交易 TRADING", "资金 FUNDS", "做市 LIQUIDITY"],
        "stamp": "YOU / 品牌 · 客户 · 玩法 · 增长",
    },
    {
        "slug": "04-tenant-boundary",
        "eyebrow": "03 · TENANT SOVEREIGNTY",
        "title": "客户是你的，账是你的，<em>牌子是你的。</em>",
        "lede": "账户、结算与数据按租户隔离。平台不越界，其他租户也碰不到。",
        "kind": "tenant",
        "labels": ["你的客户", "你的账务", "你的数据", "你的品牌"],
        "stamp": "独立 · 隔离 · 可审计",
    },
    {
        "slug": "05-shared-private",
        "eyebrow": "04 · MARKET LAUNCH",
        "title": "共享流动性，<em>专有差异化。</em>",
        "lede": "热门标的接共享订单簿；面向你的客群，创建别人抄不走的专有市场。",
        "kind": "markets",
        "labels": ["SHARED / 共享订单簿", "PRIVATE / 专有市场"],
        "stamp": "定义市场 → 风控门禁 → 开市交易 · 1 DAY",
    },
    {
        "slug": "06-outcome-cfd",
        "eyebrow": "05 · TWO PRODUCT DOMAINS",
        "title": "事件的世界 + 资产的世界，<em>都能开。</em>",
        "lede": "Outcome 把明确事件变成 Yes/No 市场；CFD 覆盖股票、外汇、黄金与数字资产。",
        "kind": "domains",
        "labels": ["OUTCOME / 预测市场", "CFD / 差价合约"],
        "stamp": "同一客户 · 同一账户体系 · 两倍经营面",
    },
    {
        "slug": "07-order-flow",
        "eyebrow": "06 · ORDER LIFECYCLE",
        "title": "每一笔订单，<em>平台替你跑完全程。</em>",
        "lede": "从准入到交割，机构级处理链逐笔留痕；这个团队，你不用自己养。",
        "kind": "flow",
        "labels": ["风控准入", "撮合成交", "逐笔入账", "清算交割"],
        "stamp": "INSTITUTIONAL · AUDITABLE · PLATFORM OPERATED",
    },
    {
        "slug": "08-verifiable-finality",
        "eyebrow": "07 · VERIFIABLE FINALITY",
        "title": "资金安全不是承诺，<em>是一条可验证的链。</em>",
        "lede": "资金事实逐笔入账，在链上取得最终性；不可篡改，可以查证。",
        "kind": "chain",
        "labels": ["交易与资金事件", "托管与支付执行", "链上最终性", "对账与差异闭环"],
        "stamp": "VERIFIABLE · IMMUTABLE · RECONCILED",
    },
    {
        "slug": "09-liquidity",
        "eyebrow": "08 · DAY-ONE LIQUIDITY",
        "title": "开市第一天，<em>就有对手盘。</em>",
        "lede": "资格、额度与保证金由工作台管理；专业做市与 AI 策略随市接入。",
        "kind": "depth",
        "labels": ["BID / 买盘深度", "ASK / 卖盘深度"],
        "stamp": "USD 10,000 → 投行级做市策略",
    },
    {
        "slug": "10-revenue-surfaces",
        "eyebrow": "09 · REVENUE SURFACES",
        "title": "一套底座，<em>多条收入曲线。</em>",
        "lede": "手续费、专有市场、做市协同、数据产品与客户资产服务，在双产品域上共同增长。",
        "kind": "revenue",
        "labels": ["交易手续费", "专有市场溢价", "做市协同", "数据产品", "客户资产服务"],
        "stamp": "千万级自建投入 → 可控接入成本",
    },
    {
        "slug": "11-close",
        "eyebrow": "YESONO 3.0 · OPERATE WITH CLARITY",
        "title": "边界清晰，<em>才敢放手经营。</em>",
        "lede": "平台承担权威、安全、清算与审计；你专注客户、玩法、品牌与增长。",
        "kind": "close",
        "labels": ["平台承担 / 权威 · 安全 · 清算 · 审计", "你专注 / 客户 · 玩法 · 品牌 · 增长"],
        "stamp": "你负责生意，交易所交给我们。",
    },
]


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def grid_markup() -> str:
    lines = "".join(
        f'<span class="grid-line grid-h" style="top:{80 + index * 86}px"></span>'
        for index in range(10)
    )
    lines += "".join(
        f'<span class="grid-line grid-v" style="left:{70 + index * 128}px"></span>'
        for index in range(15)
    )
    particles = "".join(
        f'<i class="particle" style="left:{90 + (index * 137) % 1740}px;top:{110 + (index * 83) % 650}px"></i>'
        for index in range(18)
    )
    return f'<div class="grid" data-layout-ignore>{lines}</div><div class="particles" data-layout-ignore>{particles}</div>'


def visual_markup(scene: dict[str, object]) -> str:
    labels = [str(label) for label in scene["labels"]]
    kind = scene["kind"]
    if kind == "aperture":
        nodes = "".join(
            f'<div class="orbit-node reveal"><b>{esc(label)}</b><small>OPERATOR OWNED</small></div>'
            for label in labels
        )
        return f'<div class="aperture-viz"><div class="ring ring-a"></div><div class="ring ring-b"></div><div class="core">YESONO<br><b>3.0</b></div>{nodes}</div>'
    if kind == "cost":
        cards = "".join(
            f'<div class="cost-card reveal"><span>0{index + 1}</span><b>{esc(label)}</b><small>长期专业投入</small></div>'
            for index, label in enumerate(labels)
        )
        return f'<div class="cost-grid">{cards}</div><div class="liability reveal"><small>PRIMARY LIABILITY</small><b>客户信任</b></div>'
    if kind == "layers":
        layers = "".join(
            f'<div class="platform-layer reveal" style="--i:{index}"><span>0{index + 1}</span><b>{esc(label)}</b><i>PLATFORM</i></div>'
            for index, label in enumerate(labels)
        )
        return f'<div class="layer-stack">{layers}<div class="operator-layer reveal">YOU / OPERATOR</div></div>'
    if kind == "tenant":
        nodes = "".join(
            f'<div class="tenant-node reveal"><b>{esc(label)}</b><small>ISOLATED</small></div>'
            for label in labels
        )
        return f'<div class="tenant-domain"><svg viewBox="0 0 700 510"><rect class="draw" x="48" y="40" width="604" height="420" rx="150"></rect></svg><div class="tenant-core reveal">TENANT<br><b>独立经营域</b></div>{nodes}</div>'
    if kind in {"markets", "domains"}:
        panels = "".join(
            f'<div class="market-panel reveal {"brass-panel" if index else "harbor-panel"}"><small>0{index + 1}</small><h3>{esc(label)}</h3><div class="mini-bars">'
            + "".join(f'<i class="bar" style="height:{36 + ((j * 23 + index * 17) % 100)}px"></i>' for j in range(9))
            + "</div></div>"
            for index, label in enumerate(labels)
        )
        return f'<div class="market-split">{panels}</div><div class="account-rail reveal">ONE ACCOUNT SYSTEM</div>'
    if kind in {"flow", "chain"}:
        nodes = ""
        for index, label in enumerate(labels):
            nodes += f'<div class="flow-node reveal"><small>0{index + 1}</small><b>{esc(label)}</b><i>VERIFIED</i></div>'
            if index < len(labels) - 1:
                nodes += '<div class="flow-link"><span class="line-grow"></span><i class="packet"></i></div>'
        return f'<div class="flow-row">{nodes}</div><div class="ledger reveal">TX / 8F2A · STATUS / FINAL · AUDIT / PASS</div>'
    if kind == "depth":
        bars = "".join(
            f'<i class="depth-bar {"ask" if index >= 10 else ""}" style="height:{48 + (9 - abs(9 - index)) * 16}px"></i>'
            for index in range(20)
        )
        return f'<div class="depth-book">{bars}<div class="mid-price reveal">MARKET OPEN<br><b>DAY 1</b></div></div><div class="depth-labels"><span>{esc(labels[0])}</span><span>{esc(labels[1])}</span></div>'
    if kind == "revenue":
        curves = "".join(
            f'<div class="revenue-row reveal"><span>REV {index + 1}</span><b>{esc(label)}</b><i class="revenue-fill" style="--fill:{42 + index * 11}%"></i></div>'
            for index, label in enumerate(labels)
        )
        return f'<div class="revenue-field">{curves}</div><div class="multiplier reveal">OUTCOME <b>×</b> CFD</div>'
    panels = "".join(
        f'<div class="close-panel reveal {"you-panel" if index else ""}"><small>{"YOU" if index else "PLATFORM"}</small><b>{esc(label)}</b></div>'
        for index, label in enumerate(labels)
    )
    return f'<div class="close-split">{panels}</div><div class="brand-lock reveal">YESONO <b>3.0</b></div>'


CSS = r"""
      :root { --ink:#0A101C; --letter:#05080F; --panel:#131C2E; --panel2:#0F1727; --text:#E8EEF7; --dim:#AEBED2; --faint:#8798B0; --jade:#78CEAB; --harbor:#78ADE4; --brass:#D4B36A; }
      * { box-sizing:border-box; }
      #root { position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; color:var(--text); font-family:sans-serif; }
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
      h1 { margin:0; font-family:serif; font-size:86px; line-height:1.14; font-weight:600; letter-spacing:.02em; }
      h1 em { color:var(--brass); font-style:normal; }
      .lede { max-width:700px; margin:32px 0 0; color:var(--dim); font-size:30px; line-height:1.65; }
      .stamp { display:inline-flex; margin-top:36px; padding:12px 18px; border:1px solid rgba(212,179,106,.55); background:rgba(212,179,106,.09); color:var(--brass); font-family:"JetBrains Mono",monospace; font-size:16px; letter-spacing:.13em; }
      .visual { position:relative; height:660px; min-width:0; }
      .aperture-viz,.tenant-domain { position:absolute; inset:30px 20px 20px 20px; display:flex; align-items:center; justify-content:center; }
      .ring { position:absolute; border:1px solid rgba(111,163,220,.4); border-radius:50%; } .ring-a{width:470px;height:470px}.ring-b{width:610px;height:610px;border-style:dashed}
      .core,.tenant-core { width:210px; height:210px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; border:1px solid var(--brass); background:rgba(212,179,106,.10); font-family:"JetBrains Mono",monospace; font-size:22px; letter-spacing:.12em; }
      .core b,.tenant-core b { margin-top:8px; color:var(--brass); font-family:serif; font-size:34px; letter-spacing:.02em; }
      .orbit-node,.tenant-node { position:relative; width:170px; padding:16px; margin:0 -6px; border:1px solid rgba(159,176,199,.25); background:rgba(19,28,46,.92); }
      .orbit-node b,.tenant-node b { display:block; font-size:24px; }.orbit-node small,.tenant-node small { display:block; margin-top:8px; color:var(--faint); font-family:"JetBrains Mono",monospace; font-size:11px; }
      .cost-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; padding:18px 0; }
      .cost-card { min-height:122px; padding:20px; border:1px solid rgba(159,176,199,.19); background:var(--panel); }
      .cost-card span,.platform-layer span,.flow-node small,.market-panel small,.revenue-row span { color:var(--faint); font-family:"JetBrains Mono",monospace; font-size:13px; letter-spacing:.14em; }
      .cost-card b { display:block; margin-top:11px; font-size:24px; }.cost-card small { display:block; margin-top:10px; color:var(--dim); }
      .liability { position:absolute; right:18px; bottom:2px; padding:18px 26px; border:1px solid var(--brass); background:rgba(212,179,106,.10); }.liability small{color:var(--faint)}.liability b{display:block;margin-top:6px;font-family:serif;font-size:32px;color:var(--brass)}
      .layer-stack { position:absolute; inset:48px 50px; perspective:1200px; }
      .platform-layer { height:78px; margin-bottom:14px; padding:0 24px; display:grid; grid-template-columns:70px 1fr auto; align-items:center; border:1px solid rgba(111,163,220,.28); background:var(--panel); box-shadow:calc(var(--i) * 7px) calc(var(--i) * 4px) 0 rgba(111,163,220,.04); }
      .platform-layer b { font-size:25px; }.platform-layer i { color:var(--harbor); font-family:"JetBrains Mono",monospace; font-size:13px; font-style:normal; letter-spacing:.12em; }
      .operator-layer { height:80px; padding:0 24px; display:flex; align-items:center; justify-content:center; border:1px solid var(--brass); background:rgba(212,179,106,.12); color:var(--brass); font-family:"JetBrains Mono",monospace; font-size:18px; letter-spacing:.15em; }
      .tenant-domain svg { position:absolute; inset:0; width:100%; height:100%; }.tenant-domain rect { fill:rgba(212,179,106,.04); stroke:var(--brass); stroke-width:2; stroke-dasharray:420; }
      .tenant-node { width:155px; }.tenant-node:nth-of-type(2){margin-left:18px}.tenant-node:nth-of-type(4){margin-left:18px}
      .market-split { display:grid; grid-template-columns:1fr 1fr; gap:20px; padding:64px 0 0; }
      .market-panel { min-height:410px; padding:30px; border:1px solid; background:var(--panel); }.harbor-panel{border-color:rgba(111,163,220,.55)}.brass-panel{border-color:rgba(212,179,106,.55);background:rgba(212,179,106,.07)}
      .market-panel h3 { margin:18px 0 34px; font-family:serif; font-size:33px; }
      .mini-bars { height:205px; display:flex; align-items:flex-end; gap:9px; }.mini-bars i { flex:1; display:block; background:rgba(111,163,220,.35); border-top:2px solid var(--harbor); transform-origin:bottom; }.brass-panel .mini-bars i{background:rgba(212,179,106,.25);border-top-color:var(--brass)}
      .account-rail { position:absolute; left:72px; right:72px; bottom:24px; padding:14px; border:1px solid rgba(111,194,160,.5); color:var(--jade); text-align:center; font-family:"JetBrains Mono",monospace; letter-spacing:.18em; }
      .flow-row { position:absolute; left:0; right:0; top:190px; display:flex; align-items:center; }
      .flow-node { width:180px; min-height:180px; padding:24px; border:1px solid rgba(111,163,220,.42); background:var(--panel); }.flow-node b{display:block;margin-top:24px;font-size:26px}.flow-node i{display:block;margin-top:24px;color:var(--jade);font-family:"JetBrains Mono",monospace;font-size:12px;font-style:normal}
      .flow-link { flex:1; position:relative; height:2px; background:rgba(111,163,220,.2); overflow:visible; }.line-grow{position:absolute;inset:0;background:var(--harbor);transform-origin:left}.packet{position:absolute;width:9px;height:9px;top:-4px;left:44%;border-radius:50%;background:var(--brass);box-shadow:0 0 16px var(--brass)}
      .ledger { position:absolute; left:70px; right:70px; bottom:70px; padding:16px 22px; border:1px solid rgba(111,194,160,.45); background:rgba(111,194,160,.08); color:var(--jade); font-family:"JetBrains Mono",monospace; font-size:15px; letter-spacing:.13em; }
      .depth-book { position:absolute; inset:80px 12px 100px; display:flex; align-items:center; gap:8px; }.depth-bar{flex:1;display:block;background:rgba(111,163,220,.28);border-top:3px solid var(--harbor);transform-origin:bottom}.depth-bar.ask{background:rgba(212,179,106,.22);border-top-color:var(--brass)}
      .mid-price { position:absolute; left:50%; top:45%; width:190px; margin-left:-95px; padding:18px; background:var(--letter); border:1px solid rgba(232,238,247,.24); text-align:center; color:var(--dim); font-family:"JetBrains Mono",monospace; }.mid-price b{display:block;margin-top:6px;font-size:28px;color:var(--text)}
      .depth-labels { position:absolute; left:12px; right:12px; bottom:70px; display:flex; justify-content:space-between; color:var(--faint); font-family:"JetBrains Mono",monospace; letter-spacing:.12em; }
      .revenue-field { padding:62px 0 0; }.revenue-row{position:relative;height:82px;margin-bottom:14px;padding:0 22px;display:grid;grid-template-columns:76px 190px 1fr;align-items:center;border:1px solid rgba(159,176,199,.17);background:var(--panel);overflow:hidden}.revenue-row b{font-size:22px}.revenue-fill{height:12px;width:var(--fill);background:linear-gradient(90deg,var(--brass),rgba(212,179,106,.18));transform-origin:left}
      .multiplier { position:absolute; right:16px; bottom:22px; padding:16px 22px; border:1px solid var(--brass); background:rgba(212,179,106,.08); font-family:"JetBrains Mono",monospace; letter-spacing:.14em; }.multiplier b{color:var(--brass);margin:0 12px}
      .close-split { display:grid; grid-template-columns:1fr 1fr; gap:22px; padding-top:118px; }.close-panel{min-height:260px;padding:36px;border:1px solid rgba(111,163,220,.45);background:var(--panel)}.close-panel.you-panel{border-color:var(--brass);background:rgba(212,179,106,.08)}.close-panel small{color:var(--faint);font-family:"JetBrains Mono",monospace;letter-spacing:.18em}.close-panel b{display:block;margin-top:40px;font-family:serif;font-size:30px;line-height:1.55}
      .brand-lock { position:absolute; left:80px; right:80px; bottom:35px; text-align:center; font-family:serif; font-size:66px; letter-spacing:.12em; }.brand-lock b{color:var(--brass)}
"""


def build_html(scene: dict[str, object], duration: float, number: int) -> str:
    comp_id = str(scene["slug"])
    visual = visual_markup(scene)
    return f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"></head><body>
<template>
  <style>{CSS}</style>
  <div id="root" data-composition-id="{comp_id}" data-start="0" data-duration="{duration}" data-width="1920" data-height="1080">
    <div id="ground-{comp_id}" class="clip ground" data-layout-allow-overlap data-start="0" data-duration="{duration}" data-track-index="0">
      {grid_markup()}
      <div class="chrome"><span>YESONO / {number:02d}</span><div class="progress"><div class="progress-fill"></div></div><span>OPERATOR BUSINESS</span></div>
      <div class="content">
        <section class="copy">
          <div class="eyebrow reveal">{scene["eyebrow"]}</div>
          <h1 class="reveal">{scene["title"]}</h1>
          <p class="lede reveal">{scene["lede"]}</p>
          <div class="stamp reveal">{scene["stamp"]}</div>
        </section>
        <section class="visual">{visual}</section>
      </div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    (function () {{
      var D = {duration};
      var tl = gsap.timeline({{ paused: true }});
      var reveals = Array.from(document.querySelectorAll('[data-composition-id="{comp_id}"] .reveal'));
      reveals.forEach(function (el, i) {{
        var start = 0.18 + (Math.min(i, 9) / Math.max(1, Math.min(reveals.length - 1, 9))) * D * 0.67;
        var mode = i % 4;
        var from = mode === 0 ? {{ opacity:0, x:-34 }} : mode === 1 ? {{ opacity:0, y:28 }} : mode === 2 ? {{ opacity:0, x:34 }} : {{ opacity:0, scale:0.94 }};
        var to = {{ opacity:1, x:0, y:0, scale:1, duration:Math.min(0.72, D * 0.075), ease:i % 3 === 0 ? "power4.out" : i % 3 === 1 ? "expo.out" : "power3.out", immediateRender:false }};
        tl.fromTo(el, from, to, start);
      }});
      Array.from(document.querySelectorAll('[data-composition-id="{comp_id}"] .bar, [data-composition-id="{comp_id}"] .depth-bar')).forEach(function (el, i) {{
        tl.fromTo(el, {{ scaleY:0 }}, {{ scaleY:1, duration:0.55, ease:"power3.out", immediateRender:false }}, D * 0.24 + i * 0.055);
      }});
      Array.from(document.querySelectorAll('[data-composition-id="{comp_id}"] .revenue-fill, [data-composition-id="{comp_id}"] .line-grow')).forEach(function (el, i) {{
        tl.fromTo(el, {{ scaleX:0 }}, {{ scaleX:1, duration:0.68, ease:"power3.out", immediateRender:false }}, D * 0.28 + i * 0.32);
      }});
      Array.from(document.querySelectorAll('[data-composition-id="{comp_id}"] .draw')).forEach(function (el) {{
        tl.fromTo(el, {{ strokeDashoffset:420 }}, {{ strokeDashoffset:0, duration:Math.min(2.4,D*.24), ease:"power2.inOut", immediateRender:false }}, D * 0.14);
      }});
      Array.from(document.querySelectorAll('[data-composition-id="{comp_id}"] .particle')).forEach(function (el, i) {{
        tl.fromTo(el, {{ opacity:0.05, y:10 }}, {{ opacity:0.28, y:-10-(i%4)*4, duration:D*0.72, ease:"sine.inOut", immediateRender:false }}, 0.2 + (i%6)*0.08);
      }});
      tl.fromTo('[data-composition-id="{comp_id}"] .progress-fill', {{ scaleX:0 }}, {{ scaleX:1, duration:D-0.2, ease:"none", immediateRender:false }}, 0.1);
      tl.to({{}}, {{ duration:D }}, 0);
      window.__timelines = window.__timelines || {{}};
      window.__timelines["{comp_id}"] = tl;
    }})();
  </script>
</template>
</body></html>
"""


def update_storyboard(durations: list[float]) -> None:
    path = ROOT / "STORYBOARD.md"
    lines = path.read_text(encoding="utf-8").splitlines()
    current: int | None = None
    for index, line in enumerate(lines):
        match = re.match(r"^## Frame (\d+)", line)
        if match:
            current = int(match.group(1))
            continue
        if current and line.startswith("- duration:"):
            lines[index] = f"- duration: {durations[current - 1]}s"
        elif current and line.startswith("- status:"):
            lines[index] = "- status: animated"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    metadata = json.loads((ROOT / "audio_meta.json").read_text(encoding="utf-8"))
    voices = sorted(metadata["voices"], key=lambda voice: voice["frame"])
    if len(voices) != 11:
        raise RuntimeError(f"Expected 11 voice segments, got {len(voices)}")
    durations = [float(voice["duration_s"]) for voice in voices]
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    for number, (scene, duration) in enumerate(zip(SCENES, durations), start=1):
        target = FRAMES_DIR / f"{scene['slug']}.html"
        target.write_text(build_html(scene, duration, number), encoding="utf-8")
    update_storyboard(durations)
    print(f"Generated {len(SCENES)} frame compositions, {sum(durations):.3f}s total.")


if __name__ == "__main__":
    main()
