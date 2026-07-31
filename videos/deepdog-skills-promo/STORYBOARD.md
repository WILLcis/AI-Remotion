---
format: 1920x1080
duration: 60s
message: "deepdog 把编码智能体变成可分派、可观测、可积累技能的真正队友"
arc: "PAS + feature-benefit progression"
audience: "engineering leaders and AI-native software teams"
mode: autonomous
music: none
---

## Video direction

使用 `frame.md` 的 code-editorial 系统：cream/tile 为主画布，ink 承载信息，
green 只作为每帧一次的 voltage，warm navy 只用于终端与运行状态。所有 frame
按旁白逐句揭示，重点内容延迟到后半段，不在前 25% 一次性铺满。主运动语法是
长尾平滑 settle、界面证据的方向性推进和明确的状态变化；第 7 帧是有意的静态
breather，第 8 帧长时间持有 CTA。禁止廉价 HUD、紫蓝 AI 渐变、无限循环、
随机粒子、lazy breathing、后半段无意义慢推，以及 front-load slideshow。
所有关键信息保持在顶部约 83%，为字幕带留出空间。

## Frame 1 — Nobody manages them

- scene: 终端、任务和状态提示从四周压迫中心，最后只留下“没人管它们”
- voiceover: "编码智能体已经很聪明了。可是，没人管它们。"
- duration: 4.3s
- transition_in: cut
- status: animated
- src: compositions/frames/01-nobody-manages.html
- type: hook
- persuasion: Pain validation
- beat: tension
- blueprint: overwhelm-surround (Adapt)
- asset_candidates:
- focal: typography
- roles: typography = cutout

narrativeRole: 用工程团队熟悉的失控感开场，立即建立观看理由。
keyMessage: 智能体的能力不是问题，缺少管理层才是问题。

Adapt: 保留从四周 close-in 的 signature move，把工具窗口替换为终端、任务和
session 状态；不使用头像 morph，中心主体直接是观众面前的“黑箱”。
Scene 1 (0.0–1.4s): warm-navy 终端表面和三条执行状态依次进入，asymmetric
60/40、三层深度；只显示“很聪明”对应的工作能力，平滑 stagger settle。
Scene 2 (1.4–3.0s): prompt、waiting、context missing 标签从八个方向 close-in，
由 `center-outward-expansion` 的反向构图实现；画面密度随旁白“可是”明显升高。
Scene 3 (3.0–4.3s): 所有外围元素推向边缘并降暗，中心大字“没人管它们”通过
per-word reveal 落下，持有到转场。

## Frame 2 — The management layer

- scene: 问题词组被 deepdog 品牌名接管，价值主张在第二个 beat 完整落地
- voiceover: "deepdog，把编码智能体变成真正的队友。你接下来要招的十个人，都不是人。"
- duration: 6.0s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-management-layer.html
- type: product_intro
- persuasion: Category creation
- beat: relief + intrigue
- blueprint: kinetic-type-beats (Adapt)
- asset_candidates:
- focal: deepdog wordmark
- roles: deepdog wordmark = cutout

narrativeRole: 在第二个 beat 明确产品价值，并建立新的“AI 员工”类别。
keyMessage: deepdog 是编码智能体的管理层。

Adapt: 保留 fixed-line token swap 与最后品牌 hold；交换槽从“工具”切换到
“队友 / 员工 / 团队”，不使用弹跳或彩色背景翻转。
Scene 1 (0.0–1.8s): cream 画布，固定句式“把编码智能体变成”先出现，变量槽
通过 hard-cut 依次切换“任务 / 队友”，上方 mono kicker 标记 MANAGEMENT LAYER。
Scene 2 (1.8–4.2s): “deepdog”从句子中独立成超大 display，后方 UI 线框沿
`center-outward-expansion` 向边缘展开；“真正的队友”按语音逐词揭示。
Scene 3 (4.2–6.0s): 画面收束为一句大字“Your next 10 hires won't be human.”，
数字 10 在旁白命名时 scale settle，随后静止持有。

## Frame 3 — Assign work like a teammate

- scene: Issue 看板和创建任务界面组成一次完整派单动作
- voiceover: "在同一个议题看板里，给智能体派单，就像派给同事。它会认领、执行、评论，也会主动建单。"
- duration: 7.2s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/03-assign-work.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: clarity + control
- blueprint: cursor-ui-demo (Adapt)
- asset_candidates: assets/issues-board.png — Issue 看板；assets/create-task.png — 创建任务界面
- focal: assets/issues-board.png
- roles: assets/issues-board.png = cutout · assets/create-task.png = supporting

narrativeRole: 用实机界面证明“智能体是一等公民”，而不是抽象口号。
keyMessage: 给智能体派单，和派给同事一样自然。

Adapt: 保留 cursor-as-actor 和每次操作带来界面响应的 signature move；使用真实
截图做 fixed-stage tour，不伪造复杂交互或移动相机。
Scene 1 (0.0–2.2s): issues-board 作为大幅 hero window 从右侧进入，create-task
作为左下 supporting panel；光标滑到 assignee 区域，hairline focus 框同步出现。
Scene 2 (2.2–5.0s): 光标点击后产生 restrained ripple，create-task panel scale
settle 到前景；“认领 / 执行 / 评论”三个状态按旁白顺序逐一打勾。
Scene 3 (5.0–7.2s): 界面切回看板，新增 issue 行从空位 waterfall-entry，
光标停在结果旁；画面完全静止，给“主动建单”留下阅读时间。

## Frame 4 — No silent failure

- scene: 控制塔、验证队列和事件流共同展示完整任务生命周期
- voiceover: "完整的任务生命周期，加上实时进度流，让每一次工具调用、文件改动和状态变化都清晰可见。没有静默失败。"
- duration: 9.3s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/04-no-silent-failure.html
- type: feature_showcase
- persuasion: Risk reduction
- beat: trust + visibility
- blueprint: agent-progress-theater (Adapt)
- asset_candidates: assets/control-tower.png — 控制塔总览；assets/verification.png — 验证队列；assets/time-state.png — 时间与状态视图
- focal: assets/control-tower.png
- roles: assets/control-tower.png = background · assets/verification.png = cutout · assets/time-state.png = supporting

narrativeRole: 把“可观测”变成具体证据，降低让智能体无人值守执行的风险。
keyMessage: 每一步都可见，失败不会静默。

Adapt: 保留 trigger → working theater → receipt 的 signature move，把扫描结果替换为
真实任务生命周期与验证队列；背景截图只做证据，不模拟不存在的数据。
Scene 1 (0.0–2.4s): control-tower 全幅但降暗，enqueue → claim → start → complete
沿顶部规则线按旁白逐步点亮，当前状态使用唯一 green voltage。
Scene 2 (2.4–6.7s): time-state 事件流在右侧逐行 waterfall-entry，左侧
verification panel 随“文件改动 / 状态变化”命名而进入；两块证据保持 asymmetric 60/40。
Scene 3 (6.7–9.3s): 所有状态汇聚成一张 receipt 卡，“NO SILENT FAILURE”以
mono stamp 落下，其他元素降为背景并静态持有。

## Frame 5 — Skills compound

- scene: 一个技能从 DAY 1 扩散到整个智能体团队
- voiceover: "每个解法，都能沉淀为团队技能。第一天，你教会一个智能体部署。第三十天，整个团队都会部署、写测试、做代码审查。"
- duration: 9.5s
- transition_in: squeeze
- status: animated
- src: compositions/frames/05-skills-compound.html
- type: benefit_highlight
- persuasion: Future pacing
- beat: power + compounding
- blueprint: grid-card-assemble (Adapt)
- asset_candidates: assets/knowledge.png — 技能与知识界面；assets/agents.png — Agent 管理界面
- focal: assets/knowledge.png
- roles: assets/knowledge.png = cutout · assets/agents.png = supporting

narrativeRole: 展示 deepdog 的复利效应，而不是只展示一次执行。
keyMessage: 教会一次，能力会成为团队资产。

Adapt: 保留能力卡片从单个到阵列的 self-assemble signature move；阵列元素是
真实的部署、测试、审查技能，不使用虚构指标。
Scene 1 (0.0–2.5s): knowledge screenshot 在左侧进入，单张技能卡“deploy”从界面
中放大成为焦点，DAY 1 mono 标签沿顶部出现。
Scene 2 (2.5–6.3s): agents screenshot 在右侧铺开，deploy 卡沿连接线复制到多个
agent 节点；节点按语音“一个智能体”逐一激活，使用 cluster→outward expansion。
Scene 3 (6.3–9.5s): DAY 30 替换 DAY 1，deploy / test / code review 三张卡依次
waterfall-entry 并形成紧凑阵列；最后状态静态持有。

## Frame 6 — One control plane

- scene: Runtime、Agent 和会话状态三块真实界面在同一控制平面展开
- voiceover: "一块面板，管理本地机器和云端算力、混合小队，以及你自己的会话上下文。"
- duration: 6.7s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/06-control-plane.html
- type: benefit_highlight
- persuasion: Friction reduction
- beat: clarity + command
- blueprint: device-surface-showcase (Adapt)
- asset_candidates: assets/runtimes.png — Runtime 管理；assets/agents.png — Agent 管理；assets/time-state.png — 会话上下文
- focal: assets/runtimes.png
- roles: assets/runtimes.png = cutout · assets/agents.png = supporting · assets/time-state.png = supporting

narrativeRole: 将分散能力收束为一个可管理的控制平面。
keyMessage: 本地、云端、团队和上下文都在同一处。

Adapt: 保留 hero surface 逐步切换的 signature move；三张真实截图形成 triptych，
不添加设备外壳或模拟浏览器 chrome。
Scene 1 (0.0–2.0s): runtimes 作为 60% hero window 从左侧进入，LOCAL / CLOUD
两个 mono 标签在旁白命名时分别点亮。
Scene 2 (2.0–4.5s): agents 和 time-state 从右侧分层进入，形成 60/40 → triptych
的布局演进；每张界面只在对应语音 cue 到来时显现。
Scene 3 (4.5–6.7s): 三块界面沿共同基线对齐，顶部“一块面板”标题出现，
section-rule 从左到右画完后静态持有。

## Frame 7 — Trust by design

- scene: 开源、自有机器、自有云三条事实以编辑式声明出现
- voiceover: "deepdog 完全开源。执行发生在你自己的机器或自有云，代码不经过 deepdog 服务器。"
- duration: 6.5s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/07-trust-by-design.html
- type: benefit_highlight
- persuasion: Risk reversal
- beat: trust + peace of mind
- blueprint: titlecard-reveal (Adapt)
- asset_candidates:
- focal: trust statement
- roles: trust statement = cutout

narrativeRole: 在 CTA 前建立信任，消除代码与基础设施归属顾虑。
keyMessage: 执行和代码留在用户控制的环境里。

Adapt: 保留 restrained titlecard 和长 hold；把单一两行价值标题拆成三条可核验事实，
不加入锁、盾牌等陈词滥调图标。
Scene 1 (0.0–1.8s): cream 画布只显示 mono kicker“TRUST BY DESIGN”，随后
“完全开源”以大号 display slide-up crossfade。
Scene 2 (1.8–4.6s): “你的机器 / 你的云”在左右两个 hairline 区域依次出现，
中间 section-rule 在旁白 cue 上画开。
Scene 3 (4.6–6.5s): “代码不经过 deepdog 服务器”成为唯一焦点，其余内容降淡；
这一帧完全静止持有，作为全片 breather。

## Frame 8 — Hire the first AI employee

- scene: 所有系统线索收束为 deepdog 品牌和一个明确行动
- voiceover: "现在，雇佣你的第一位 AI 员工。"
- duration: 10.5s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/08-hire-first-agent.html
- type: cta
- persuasion: Urgency to act
- beat: motivation + inevitability
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates:
- focal: deepdog wordmark
- roles: deepdog wordmark = cutout

narrativeRole: 将前面的产品证据转化为一个清晰、可记住的行动邀请。
keyMessage: 现在就把第一位 AI 员工加入团队。

Adapt: 保留系统碎片汇聚成品牌 lockup 的 signature move；没有独立 logo 文件，
使用规范的小写 deepdog wordmark 和 green spike，不伪造品牌图标。
Scene 1 (0.0–2.4s): 前七帧的 mono 词组 ASSIGN / OBSERVE / COMPOUND / CONTROL
从四边向中心 depth-scatter assemble，随后压缩成一条细规则线。
Scene 2 (2.4–4.8s): 规则线展开为小写 deepdog wordmark，green spike 在旁白
“现在”落下时一次性 bloom；下方 CTA“Hire your first AI employee”逐词出现。
Scene 3 (4.8–10.5s): 品牌和 CTA 静态持有，附加“Open source · Runs on your
machines”作为低权重 mono receipt；最后 0.8 秒允许整体淡出。
