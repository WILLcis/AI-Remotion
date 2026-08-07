---
format: 1920x1080
duration: 66.853s
message: "deepdog is the management layer/control tower for human + agent teams with visible, resumable, auditable work"
arc: "Agent sprawl → Shared work → Verifiable lifecycle → Compounding skills → Control tower → Local trust → CTA"
audience: engineering leaders and founders
mode: autonomous
music: "restrained progressive minimal tech, low pulse, precise percussion, confident lift at the skills beat"
---

## Video direction

Palette: exact deepdog canvas `#05070b`; warm-white ink; violet marks agents and active work; green is reserved for online/complete; red appears only for fail. Display type is serif, operational copy sans, and state/issue metadata mono.

Motion grammar: one paused deterministic GSAP timeline; smooth long-tail settles; each element reveals on its spoken cue across the back half of the frame. Rich motion comes from state transitions, SVG line draws, card cascades, finite work indicators, and motivated camera moves—not from ambient floating. Velocity-match internal seams. No bounce, infinite loops, random values, or wall-clock logic.

Rhythm: Frames 1–5 build density; Frame 4 is the kinetic peak; Frame 6 deliberately breathes and holds; Frame 7 resolves with a calm, confident lockup. Keep the bottom 17% clear for captions.

Negative list: no slideshow front-load, no screensaver drift, no fake product screenshots, no customer proof, no cyberpunk neon, no explosions, no accountability cascade, no permission-boundary claim, no BIOS.

## Frame 1 — Agents multiply

- scene: Terminal fragments and agent nodes accumulate until one operator is surrounded by unreadable concurrent work.
- voiceover: "智能体越来越多，真正稀缺的，不再是执行力，而是管理。逐个盯终端，团队越快，你越看不清谁在做什么、进展到哪一步。"
- duration: 8.166s
- poster: 6.4s
- transition_in: cut
- status: animated
- src: compositions/frames/01-agents-multiply.html
- type: hook
- persuasion: Pain agitation through operational overload
- beat: tension → clarity
- blueprint: overwhelm-surround (Adapt)
- asset_candidates:
- focal: authored operator-and-agent topology
- roles: topology = foreground · terminal fragments = midground · grid = background
- sfx: ui-tick, soft-riser

narrativeRole: Establish that agent scale creates a management problem, not an intelligence problem.
keyMessage: More agents require an operational layer.

Adapt: keep the accumulation and close-in signature, replace consumer app clutter with clearly illustrative terminal/task fragments, and resolve on a management question rather than a trapped avatar.

Scene 1 (0.0–2.2s): one human operator marker sits upper-left while three agent nodes enter around it; a cropped serif “执行力” anchors the background. Asymmetric 60/40, three depth layers. Nodes arrive by cluster→outward expansion (`center-outward-expansion`) on a smooth settle.
Scene 2 (2.2–5.7s): as “逐个盯终端” is spoken, terminal fragments and task chips cascade from opposing edges, each with distinct status text; density grows across the middle and right. Use staggered short-path arrivals and finite cursor lines; no fake app chrome.
Scene 3 (5.7–9.0s): all fragments squeeze toward the operator, then a clean center channel opens with the question “谁在做什么？” revealed word by word. The clutter is shoved to the edges via outward expansion while the question lands and holds still.

## Frame 2 — One shared issue

- scene: One issue card moves between a human and an agent, then receives comments and a visible status advance.
- voiceover: "deepdog 把人和智能体放进同一套工作对象。一个 issue，可以分配给人，也可以分配给智能体；评论、状态和进度，都留在同一条时间线上。"
- duration: 8.768s
- poster: 8.1s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-shared-issue.html
- type: product_intro
- persuasion: Friction reduction through a shared work object
- beat: relief + coherence
- blueprint: cursor-ui-demo (Adapt)
- asset_candidates:
- focal: authored ACME-42 issue card
- roles: issue card = foreground · human/agent lanes = midground · timeline = supporting
- sfx: soft-click, status-pop

narrativeRole: Land the message by showing the shared issue as the common unit for humans and agents.
keyMessage: Humans and agents coordinate through the same issue.

Adapt: keep the cursor-driven state-change signature but present an abstract conceptual issue diagram, not a reconstructed product screen. The cursor performs only factual assign/comment/status actions.

Scene 1 (0.0–2.8s): an `ACME-42` issue card enters between HUMAN and AGENT lanes; the two assignee chips appear side by side. Asymmetric 70/30 with the issue card dominating. Per-word title reveal and a single SVG connector draw establish the shared object.
Scene 2 (2.8–6.7s): a custom cursor selects the violet agent assignee, presses once, and the issue card travels to the agent lane. A comment chip appears beneath it as the narration names comments. Cursor click + ripple (`cursor-click-ripple`) and card morph-anchor (`card-morph-anchor`) stay on one timeline.
Scene 3 (6.7–10.0s): the lower timeline extends left-to-right: ASSIGNED → COMMENTED → IN PROGRESS. Each state arrives on its spoken cue; the camera stays locked and the final shared timeline holds.

## Frame 3 — Verifiable lifecycle

- scene: A precise lifecycle rail runs enqueue → claim → start → complete/fail while live progress and a resume pointer remain visible.
- voiceover: "每次执行都有完整生命周期：入队、认领、启动，最后完成或失败。进度实时回到时间线；中断后，还能沿着保存的会话和工作目录继续。没有静默失败。"
- duration: 11.929s
- poster: 9.8s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/03-verifiable-lifecycle.html
- type: feature_showcase
- persuasion: Show-don't-tell proof through explicit state transitions
- beat: confidence + control
- blueprint: agent-progress-theater (Adapt)
- asset_candidates:
- focal: authored lifecycle rail
- roles: lifecycle = foreground · progress feed = supporting · resume pointer = supporting
- sfx: queue-tick, claim-click, success-chime, fail-soft

narrativeRole: Prove visibility and resumability with the exact verified execution states.
keyMessage: Every run has observable state and a recoverable continuation pointer.

Adapt: keep the working-state theater and mutation signature; replace scan findings with the exact task lifecycle and a split complete/fail terminal state.

Scene 1 (0.0–3.2s): ENQUEUE lands at left, a packet enters the rail, and CLAIM activates when a runtime slot lights. Centered wide lifecycle, layered-depth. SVG rail self-draw (`svg-path-draw`) and compact state pills reveal sequentially.
Scene 2 (3.2–6.8s): START activates; a finite spinner, tool-call rows, and progress percentages populate the right-side feed. The work indicators are diegetic and stop at resolution. Rows cascade with short stagger and status swaps (`dynamic-content-sequencing`).
Scene 3 (6.8–9.6s): a `session_id + work_dir` resume pointer docks below START, then a broken segment reconnects to demonstrate continuation without claiming magic recovery. The pointer enters by card morph-anchor and a connector redraw.
Scene 4 (9.6–12.0s): the rail forks only at its verified terminal outcome: COMPLETE in green, FAIL in red. “没有静默失败” lands in large serif type while both outcomes remain legible and still.

## Frame 4 — Skills compound

- scene: A single reusable skill taught on Day 1 expands into a disciplined team skill matrix by Day 30.
- voiceover: "今天教会一个智能体部署。把方法沉淀成可复用 skill。到了第三十天，部署、测试、代码审查，不必再从零解释；团队在复用同一套实践。"
- duration: 9.971s
- poster: 8.6s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/04-skills-compound.html
- type: benefit_highlight
- persuasion: Future pacing through reusable practice
- beat: aspiration + momentum
- blueprint: grid-card-assemble (Adapt)
- asset_candidates:
- focal: authored Day 1 → Day 30 skill matrix
- roles: day labels = supporting · skill cards = foreground · agent rows = midground
- sfx: card-tick, light-rise

narrativeRole: Turn reusable skills into the emotional peak without claiming unsupported performance numbers.
keyMessage: Practices taught once can be reused across the team.

Adapt: keep the self-assembling matrix signature; use a measured grid expansion rather than exponential visuals or numerical productivity claims.

Scene 1 (0.0–2.6s): `DAY 1` pins left; one DEPLOY skill card connects to one violet agent. Split 60/40, large serif day marker and mono skill label. Connector draws and the card settles.
Scene 2 (2.6–6.5s): the skill becomes a reusable card at center; TEST and CODE REVIEW cards arrive one per spoken cue. The cards assemble via short-path stagger (`center-outward-expansion`) with a one-pass traveling accent sheen.
Scene 3 (6.5–10.0s): `DAY 30` replaces the day label; a clean matrix reveals three agent rows connected to the three shared skill cards. Lines draw in waves, then the matrix locks with the footer “同一套实践 · 全团队复用”.

## Frame 5 — Control tower

- scene: A close-up runtime signal pulls back once to reveal Runtime, Squad, and Observer as one global operating view.
- voiceover: "你不需要逐个追着智能体跑。Runtime 看执行机器和在线状态；Squad 看人和智能体的编队与当前工作；Observer 留下你自己本地 AI 会话的事件和上下文。"
- duration: 12.865s
- poster: 8.9s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-control-tower.html
- type: benefit_highlight
- persuasion: Value stacking into one global view
- beat: command + perspective
- blueprint: zoom-out-workspace-reveal (Adapt)
- asset_candidates:
- focal: authored three-panel operational topology
- roles: runtime panel = foreground · squad panel = foreground · observer panel = foreground
- sfx: panel-open, data-tick

narrativeRole: Resolve the control-tower angle with the three verified operational views.
keyMessage: Runtime, Squad, and Observer make distributed work visible at a glance.

Adapt: keep the one continuous zoom-out signature; open on a runtime heartbeat detail and reveal a clearly labeled conceptual three-panel topology. No second camera move.

Scene 1 (0.0–2.8s): extreme close-up on a green runtime heartbeat and one active task line; status dots pulse finitely while the camera holds. No surrounding chrome is visible.
Scene 2 (2.8–5.3s): the single fast decelerating zoom-out (`viewport-change`) reveals the whole conceptual operations field. The camera locks permanently at the end of the pull.
Scene 3 (5.3–8.1s): Runtime panel populates machines and online states; Squad panel builds mixed human/agent rows and current issue chips. Reveals follow the two narration clauses.
Scene 4 (8.1–11.0s): Observer panel streams the user’s own local session events and context labels; a top rail resolves to `RUNTIME · SQUAD · OBSERVER`. The wide frame holds still.

## Frame 6 — Local and open

- scene: A task packet remains on the local machine while only state events travel to the management layer; open-source code lines remain inspectable.
- voiceover: "执行发生在你自己的机器，或你拥有的云环境。deepdog 负责协调任务状态和事件。它开源、可审计，也可以自托管。控制来自可见，而不是把代码交出去。"
- duration: 9.990s
- poster: 8.2s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/06-local-open.html
- type: benefit_highlight
- persuasion: Risk reversal through local execution and auditability
- beat: trust + calm
- blueprint: comparison-split (Adapt)
- asset_candidates:
- focal: authored local execution / state coordination split
- roles: local machine = foreground · event rail = supporting · source window = foreground
- sfx: soft-lock, code-tick

narrativeRole: Establish trust with the exact local-execution and open-source claims.
keyMessage: Work executes in infrastructure the user controls; deepdog is open and inspectable.

Adapt: keep the balanced two-surface reveal but avoid security-boundary iconography. Left is execution location; right is coordination and source visibility.

Scene 1 (0.0–3.3s): LOCAL MACHINE panel enters from left with a task process and work directory; OWNED CLOUD appears as a secondary allowed destination. Split-screen, strong left focal, sparse motion.
Scene 2 (3.3–6.7s): a thin event rail crosses to the right carrying only `STATE` and `EVENT` labels; source-code lines reveal behind an `OPEN SOURCE` label. Cards enter from opposing sides on a smooth settle.
Scene 3 (6.7–10.0s): `可审计` and `可自托管` stamp in one at a time; all moving indicators settle. Large serif “控制来自可见” holds as the deliberate breather.

## Frame 7 — CTA

- scene: Operational lines converge into a restrained lowercase deepdog lockup and open-source CTA.
- voiceover: "让更多智能体加入团队之前，先让工作可见、可续、可追溯。deepdog，面向人和智能体团队的项目管理。开源。"
- duration: 5.165s
- poster: 6.4s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/07-cta.html
- type: cta
- persuasion: Direct action through category clarity
- beat: conviction
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates:
- focal: typeset lowercase deepdog wordmark
- roles: wordmark = foreground · lifecycle traces = background · CTA = supporting
- sfx: soft-resolve

narrativeRole: Close on the product category and open-source trust without an unsupported conversion promise.
keyMessage: Make mixed-team work visible, resumable, and auditable with deepdog.

Adapt: keep the clear-stage and wordmark-build signature, but typeset only the verified lowercase name—no invented official symbol.

Scene 1 (0.0–2.4s): three lifecycle traces sweep inward from the frame edges and align into one violet horizontal rule. Centered, dark field, faint operational grid.
Scene 2 (2.4–5.2s): the lowercase `deepdog` wordmark reveals letter by letter above the rule; “Project management for human + agent teams.” resolves beneath in restrained sans type.
Scene 3 (5.2–8.0s): `OPEN SOURCE` and `github.com/deepdog` appear as the final action rail; the lockup holds dead still through the end.
