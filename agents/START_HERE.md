# 给人粘贴（Agent 从 AGENTS.md 进）

**Agent 统一入口是仓库根目录 [`AGENTS.md`](../AGENTS.md)。** 本文件只给人复制提示词。Agent 必须先读完 `AGENTS.md`，再按其中「必读清单」把列出的文档**一次读完**，然后才干活。

非技术用户一页纸：[`docs/GIVE_TO_AGENT.md`](../docs/GIVE_TO_AGENT.md)。

把下面整段发给 Agent，然后用一句话说要做什么。

```text
先读 AGENTS.md 全文，再按里面的「必读清单」把列出的文档按顺序一次读完，然后 npm run setup。不要从其它文件当入口，也不要跳过清单。
不要改仓库源码（src、tests、flags、文档）。只跑 CLI 出片/发布。除非我当次明确说「改代码」。
不要让我敲 brew、npm 或 FLAG_ 命令。
setup 打印 JSON：ready 就继续；needs_human 只用人话问 ask 里的那几句；failed 就停。
由你跑 CLI。合成前若还没选定 generation.service，问我选 remotion / hyperframes / heygen / dreamina，禁止默认。
只有缺字段、审核门、付费 HeyGen、或当次要自动发视频号/小红书（我说「批准RPA」）时再问我。
选了即梦：直接生成并写发布 Pack，不要再要批准；自动点「发表/发布」仍须我当次说「批准RPA」。

我的需求：<一句话；有本地素材请写出路径>
```

English:

```text
Read AGENTS.md in full, then read every document in its required reading list in order, then npm run setup. Do not skip the list. Do not use another file as the entry.
Do not edit repository source (src, tests, flags, docs). Run the CLI only, unless I explicitly ask to change code this session.
Do not ask me to run brew, npm, or FLAG_ commands.
You run the CLI. If generation.service is missing, ask me to choose remotion | hyperframes | heygen | dreamina. Never invent a default.
Ask me only for missing fields, review gates, paid HeyGen, or Weixin/XHS auto-post (I must say 批准RPA this session). Dreamina skips storyboard/paid/publish gates but does not enable RPA.

My request: <one sentence; include local media paths if any>
```

You only need these reply types later:

1. Answer short clarifying questions (时长 / 画幅 / 语言 / 本地文件 / **合成服务** / **热点类型与口播格式**).
2. Confirm the Job draft.
3. Say `批准 storyboard` or `批准 final_render` when ready (or say what to change). Paid `heygen` needs `批准使用付费服务`. Selecting `dreamina` skips those gates and writes publish packs after generation.
4. For 热点口播: say 类型 + `真人口播`（只要文案）或 `数字人口播`（即梦出片并发布）+ 现在/定时。要自动点视频号「发表」和小红书「发布」时，再说 `批准RPA`（第一次在弹出的 Chrome 里扫码）。

Finished files usually land under `videos/<project>/` or `episodes/<id>/out/`. Source videos are not overwritten.
