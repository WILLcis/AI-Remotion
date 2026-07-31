# AI-Remotion 项目接力包

## 项目定位

仓库：`WILLcis/AI-Remotion`
本地路径：使用当前 checkout 根目录，不在仓库记录个人绝对路径。

AI-Remotion 是一个 **AI + Remotion 图文讲解类视频 Agent**，核心流程是：

```text
brief -> script -> storyboard -> render-plan -> voiceover -> captions -> Remotion MP4 -> QA report
它不是剪映/CapCut 草稿生成器，也不是爆款混剪工具。当前重点是做结构化、可审稿、可复现、可局部修改的图文讲解视频，比如知识科普、产品讲解、软件教程、资讯解读、盘点类内容。
当前产品决策
已确定：
短期继续 CLI/Agent-first
暂不做浏览器 UI。
等 artifact workflow、revision loop、provider 配置稳定后再考虑 UI。
渲染继续 本地 Remotion
暂不接云渲染。
不引入队列、对象存储、云账号、费用模型。
Canonical Demo 已确定
默认样片在 episodes/sample
主题：
普通人如何理解 Remotion，以及 AI-Remotion 如何生成图文讲解视频
Seedance 暂不作为主渲染层
未来可作为局部素材 provider，比如 B-roll、背景动效、插画片段。
主渲染仍用 Remotion，因为需要字幕、排版、安全区、确定性、QA 可控。
当前版本状态
最新已发布版本：v0.11.1
已完成：
ffprobe 已在本机 Mac 安装并验证：
/opt/homebrew/bin/ffprobe
ffprobe version 8.1.2
QA 已能使用 ffprobe 做真实媒体检查。
本地 QA 结果：
8 pass / 0 warn / 0 fail
已新增中文使用说明书：
docs/USER_MANUAL.md
README 已链接使用说明书。
GitHub CI 已跑绿。
本地工作区最后确认是干净的。
注意：尚未确认 cornerstone 服务器上是否已安装 ffprobe。之前 SSH 到 cornerstone 失败：
Connection closed by 198.18.0.79 port 22
服务器上需要单独确认：
command -v ffprobe
ffprobe -version
如果没有：
sudo apt-get update
sudo apt-get install -y ffmpeg
快速启动
cd <ai-remotion-checkout>
npm install
npm run demo:canonical
完整 demo 会执行：
validate -> render -> qa
输出：
episodes/sample/out/final.mp4
episodes/sample/qa-report.md
episodes/sample/out/qa-frames/
只渲染样片：
npm run render:sample
只做 QA：
npm run episode:qa -- --episode sample --render-frames
新建一条视频
npm run episode:new -- --id remotion-intro --topic "普通人如何理解 Remotion"
npm run episode:script -- --episode remotion-intro
npm run episode:storyboard -- --episode remotion-intro
npm run episode:render-plan -- --episode remotion-intro
npm run episode:captions -- --episode remotion-intro
npm run episode:voice -- --episode remotion-intro --provider silent
npm run episode:render -- --episode remotion-intro
npm run episode:qa -- --episode remotion-intro --render-frames
常用检查命令
npm run config:check
npm run validate:sample
npm run check
npm run demo:canonical
npm run check 包含：
typecheck -> lint -> validate sample -> tests -> npm audit
LLM / TTS 当前状态
当前不配置真实 provider，也不会默认外部调用。
默认：
LLM: deterministic
TTS: silent
已有配置框架：
openai-compatible
silent
macos-say
pending providers:
edge-tts
doubao
azure
elevenlabs
检查配置：
npm run config:check
复制 env 示例：
cp config/.env.dev.example .env.local
AI_REMOTION_ENV_FILE=.env.local npm run config:check
不要提交真实 API key。
关键文档
README.md
AGENTS.md
docs/USER_MANUAL.md
docs/RPD.md
docs/decisions/ADR-001-cli-first-local-rendering-canonical-demo.md
docs/workflows/AGENT_WORKFLOW.md
docs/workflows/REVISION_ROUTING.md
开发规则
进入项目后先读：
AGENTS.md
.agents/skills/agent-coding-discipline/SKILL.md
核心纪律：
先读文件再改。
小步修改，不做无关重构。
保留用户编辑过的 brief/script/storyboard/render-plan。
能局部修改就局部修改。
渲染前 validate。
渲染后 QA。
不提交生成视频、音频、QA 输出、.env。
Git / Release 规则
用户已允许推送到 main。
但每次推 main 都要：
本地跑检查。
commit。
push main。
打 tag。
创建 GitHub Release。
等 CI 跑绿。
当前最近发布：
v0.11.1
当前建议下一步
优先级建议：
在 cornerstone 服务器确认并安装 ffprobe/ffmpeg。
在服务器上 clone/pull 项目并跑：
npm install
npm run check
npm run demo:canonical
接真实 LLM provider 前，先实现 OpenAI-compatible adapter，保留 deterministic fallback。
TTS 可以先选一个最容易稳定落地的 provider，但不要默认启用真实外部调用。
继续完善 canonical demo 的视觉质量和 QA 自动检查。

---

## YES-549 父工单下的开发计划

### 计划目标

在 `YES-549` 父工单下，完成 AI-Remotion 的 AI-First + BIOS 治理接入，并按“先治理、后功能；先窄检查、后总门禁”的顺序推进后续开发。项目保持 CLI/Agent-first、本地 Remotion、确定性 artifact workflow，不因治理接入引入浏览器 UI、云渲染、队列、对象存储或自动发布。

### 当前基线

- 已有 `AGENTS.md`、纪律 skill、state 约定、PR 模板、CI、`make check` 和 `make verify-harness`。
- 已有通用规范 `docs/ai-first-project-governance.md` 与接入模板 `docs/ai-first-project-onboarding-template.md`。
- 项目化事实、质量矩阵、受保护状态和 BIOS 降级规则落在 `docs/AI_FIRST_PROJECT_PROFILE.md`。
- BIOS CLI、workspace、daemon、实际 health endpoint 和写权限尚未验证；当前不得声称已创建或回填子工单。
- 工作树在制定本计划时已有外部变更：`package-lock.json` 修改及若干未跟踪 docs 文件，后续不得覆盖或擅自清理。

### 阶段计划

#### P0 — 治理接入与基线冻结

- **范围**：补齐项目接入档案；将 BIOS 入口、父工单 `YES-549`、不可用降级和交付证据要求接入 `AGENTS.md` / `docs/HARNESS.md`；本计划作为执行入口。
- **验收**：所有项目命令、目录、敏感状态和发布规则均有仓库依据；文档无 token、PII、猜测 endpoint 或伪造 issue；治理文档之间链接一致。
- **验证**：`git diff --check`、Markdown 链接/占位符检查、`make verify-harness`。
- **回滚**：只回滚本阶段新增/修改的治理文档，不触碰 episode artifact、业务代码或已有 `package-lock.json` 变更。

#### P1 — BIOS 只读验证与工单闭环

- **范围**：确认 BIOS CLI 版本、正确 workspace、daemon loopback 监听、实际 health endpoint，以及 MCP `initialize` / `tools/list` 只读握手；复用或创建 `YES-549` 下的可追溯子工单。
- **验收**：有实际命令输出或明确 blocker；工单包含目标、范围、验收标准、风险、测试和上下文文件；状态/阶段按真实结果回填中文证据。
- **验证**：仅运行实际 BIOS 文档允许的只读命令；无权限时记录待调用 payload，不反复探测、不伪造成功。
- **回滚**：撤销未执行的待调用记录；不得删除 BIOS 历史评论或覆盖状态。

#### P2 — Canonical demo 服务器可复现

- **范围**：在目标服务器确认 `ffprobe` / `ffmpeg`，clone/pull 项目，安装 npm 依赖并运行 canonical demo；保持 `episodes/sample` 用户工件不被无关重生成。
- **验收**：服务器具备所需媒体工具；`npm install`、`npm run check`、`npm run demo:canonical` 的实际结果有日志/报告；失败时能定位到具体 lane。
- **验证**：`command -v ffprobe`、`ffprobe -version`、`npm run check`、`npm run demo:canonical`。
- **回滚**：不提交生成视频、音频、QA 输出；服务器失败只记录环境 blocker，不修改渲染逻辑绕过检查。

#### P3 — Provider adapter 与确定性 fallback

- **范围**：优先实现 OpenAI-compatible adapter，保留 deterministic fallback；随后选择一个稳定 TTS provider。真实 provider 默认不启用，API key 只走 `AI_REMOTION_*` 环境变量。
- **验收**：mock/fixture 覆盖请求形状、错误形态、fallback 和配置缺失；无 provider 配置时现有 deterministic/silent 路径行为不变；真实调用有凭证时再做 live baseline。
- **验证**：对应 Vitest、`npm run config:check`、`npm run check`；涉及 provider 时附 live blocker 或证据。
- **回滚**：关闭 provider 配置回到 deterministic/silent；不迁移或覆盖用户编辑的脚本、storyboard、render-plan。

#### P4 — Canonical demo 视觉与 QA 增强

- **范围**：只改模板、render-plan、时长计算、字幕分段或 QA 所需的最小文件；维持安全区、可读性、确定性和人工 review gate。
- **验收**：结构化数据先 validate；视觉变更至少有 sample render/still frame；QA 报告能识别缺失资源、媒体时长/分辨率/音频问题。
- **验证**：窄范围单测、`make check`、`make test-integration`。
- **回滚**：按 artifact 依赖链回滚到上一个可渲染 render-plan/template；不生成或提交无关媒体产物。

### 通用验收门槛

1. 任何行为变更都有同区域测试；跨进程、网络、provider 或用户流程有集成/E2E 证据或明确 live blocker。
2. 每次交付报告改动文件、用户影响、命令结果、剩余风险、回滚边界和 BIOS 实际状态。
3. 进入 `main` 前运行 `make check`；Remotion/template 变更额外运行 `make test-integration`；harness 变更运行 `make verify-harness`。
4. 发布仍遵守 tag + GitHub Release 双审计锚点；未获明确授权不直接推送 `main`。

### 当前建议执行顺序

1. 完成 P0 文档接入并冻结治理基线。
2. 在 BIOS 权限可用后执行 P1；权限不可用则保留待调用 payload 和精确 blocker。
3. 执行 P2，先确认服务器媒体工具和完整门禁，再进入 provider 或视觉工作。
4. 按 P3 → P4 推进，每个阶段独立关联 `YES-549` 子工单并回填证据。

### P1 / P2 本次执行状态

- **P1 BIOS 只读验证：通过**。`deepdog v0.3.32`、daemon health、bridge help，以及 MCP `initialize` / `tools/list` 均已通过。
- **P1 BIOS 建单：blocked**。已通过 MCP 调用 `bios_create_issue`，并传入 `parent_key=YES-549`；Deepdog 返回 `deepdog daemon tool endpoint not wired yet (M2-B2)`，未生成子工单号。
- **P2 本机依赖：通过**。本机 `/opt/homebrew/bin/ffprobe` 和 `/opt/homebrew/bin/ffmpeg` 可用，版本均为 8.1.1。
- **P2 服务器连通性：通过**。按 `docs/ssh.md` 使用本地安全配置中的 Tailscale 目标连接成功，SSH key 非交互登录成功。
- **P2 服务器环境：blocked**。服务器 `ffprobe/ffmpeg` 为 6.1.1，但 Node 为 18.19.1、npm 为 9.2.0，不满足项目 Node.js 20+；只读查找远端用户目录未发现项目工作树，因此未执行 `npm install`、`npm run check` 或 `npm run demo:canonical`。
- **安全边界**：`docs/ssh.md` 已移除明文密码和 `sshpass` 示例；本次未修改远端文件。
- **下一步入口**：Deepdog daemon 接通 tool endpoint 后重试 P1 建单；服务器准备 Node.js 20+ 并部署项目工作树后，再继续 P2。

### 本地调试与 QA 优化记录（2026-07-20）

- **样片基线**：`npm run validate:sample`、`npm run render:sample` 和 `npm run episode:qa -- --episode sample --render-frames` 均通过；QA 结果为 `8 pass / 0 warn / 0 fail`。
- **已修复的 QA 可读性问题**：QA 截图原本截取首帧和中点帧，恰好落在场景淡入起始处，无法作为可靠的人工视觉检查依据。现在改为截取首场景、中间场景和末场景的内部帧，并为取帧逻辑补充单测。
- **本地配置**：LLM 仍为 `deterministic`，TTS 仍为 `silent`；外部 LLM/TTS Provider 未启用，避免引入凭证、费用和网络依赖。
- **验证**：`make check` 通过（12 个测试文件、40 个测试）；`make test-integration` 的样片渲染通过；`git diff --check` 与编辑文件 lint 无报错。
- **遗留注意项**：npm 会提示未知环境配置 `devdir`，但当前不影响验证或渲染；后续可在本机 npm 配置中单独清理，勿写入项目配置。

### DeepSeek 与 CosyVoice Provider 接入记录（YES-593）

- **BIOS**：已在 `YES-549` 下创建子工单 `YES-593`，范围为 DeepSeek OpenAI-compatible LLM、CosyVoice 本地 FastAPI TTS、测试和操作文档；FunASR 转写、云渲染和 sample 用户工件均不在本期范围。
- **DeepSeek**：`AI_REMOTION_LLM_PROVIDER=openai-compatible` 配合 `AI_REMOTION_LLM_BASE_URL=https://api.deepseek.com`、API Key 与模型即可启用。配置不完整、超时、HTTP 错误或返回非脚本内容时，`AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC=true` 会回退到本地确定性脚本；关闭 fallback 则明确失败。
- **CosyVoice**：由用户独立启动本地 FastAPI 服务；配置 `AI_REMOTION_TTS_PROVIDER=cosyvoice`、`AI_REMOTION_TTS_BASE_URL` 与 `AI_REMOTION_TTS_VOICE` 后，CLI 调用 `/inference_sft` 并只在返回有效 WAV 时更新 episode 的 voiceover 与时长元数据。服务不可达或返回无效音频时不回退为静音，避免误以为已生成真实旁白。
- **FunASR**：它是 ASR（语音转文字），不作为 TTS 使用；后续另立工单实现转写和字幕时间轴对齐。
- **验证**：mock 覆盖 DeepSeek 请求、HTTP 失败、无效脚本与超时，以及 CosyVoice 请求、配置缺失、HTTP 错误、无效 WAV 与超时。`make check` 通过（12 个测试文件、46 个测试）；默认 `npm run config:check` 仍显示 `deterministic` / `silent`。未配置真实密钥或启动 CosyVoice 服务，因此本次没有 live Provider 调用证据。
- **回滚**：删除 Provider 配置或设回 `AI_REMOTION_LLM_PROVIDER=deterministic` 与 `AI_REMOTION_TTS_PROVIDER=silent`，即可恢复全离线默认路径。

### DeepSeek 真实冒烟记录（2026-07-20）

- **成功证据**：使用用户在本机环境中提供的 DeepSeek 配置创建 `episodes/provider-smoke`，`episode:script` 返回 `llm: openai-compatible (configured)`，证明真实 API 调用成功；密钥未写入仓库或本文件。
- **发现并修复**：DeepSeek 会用 Markdown 列表与加粗字段输出 `- **Spoken:**` 等格式，原有分镜解析器只接受纯 `Spoken:`，导致空分镜。现已补充解析兼容与回归测试。
- **下游验证**：修复后 `episode:storyboard`、`episode:render-plan`、`episode:captions` 和 `episode:validate` 均通过；该 smoke episode 含 7 个场景、1800 帧。
- **CosyVoice blocker**：尚未提供已运行的本机 CosyVoice FastAPI 地址和可用 speaker ID，因此未执行真实 TTS 调用、音频时长同步或最终 MP4 渲染；不使用 silent 或 macOS voice 冒充 CosyVoice 成功。

### CosyVoice 本地部署与真实配音记录（2026-07-20）

- **本机服务**：通过 Homebrew 安装 Miniforge，在 CosyVoice 源码树的 `.conda` 中创建 Python 3.10.20 环境，安装官方 `requirements.txt`；初始化缺失的 `third_party/Matcha-TTS` 子模块后，以 `CosyVoice-300M-SFT` 在 `http://127.0.0.1:50000` 启动 FastAPI。模型实际本地占用约 5.4GB；首次启动另下载 wetext 文本规范化资源。
- **协议兼容**：官方 `/inference_sft` 返回 22050Hz、单声道、signed 16-bit 原始 PCM。AI-Remotion 现在拒绝空响应与不完整采样帧，将有效 PCM 封装为 WAV 后原子写入 voiceover；单测覆盖真实协议形态、配置缺失、HTTP 错误、损坏数据与超时。
- **模板音轨**：修复 `ExplainerVideo` 未消费 `audio.voiceover_path` 的问题。通用 episode renderer 会在渲染期间把本地 voiceover 临时放入 Remotion `public` 资源路径，模板通过 `<Audio>` 引用，渲染结束后删除临时副本；避免生成音频被提交或遗留。
- **镜头对齐**：CosyVoice 现在逐镜头合成、合并 PCM WAV，并以每段实测时长重新分配连续帧数；`ai-remotion-product-intro` 的 8 段旁白合计 35.817s、时间轴为 1075 帧（35.833s），避免长句还未播完便切镜头。
- **真实验证**：本机以 speaker ID `中文女` 对短文本调用成功（124,928 bytes PCM）。`ai-remotion-product-intro` 使用本地 `.env.local`（未提交）生成真实 `voiceover.wav`，时长 33.924s；按人工选择将 8 个场景压缩为 1018 帧（33.933s），重建字幕并渲染 1080×1920 H.264/AAC MP4（33.984s），QA 结果为 `8 pass / 0 warn / 0 fail`。
- **质量门禁**：`npm test -- voiceover.test.ts`、`npm run typecheck`、`npm run lint` 与 `make check` 均通过；完整门禁结果为 12 个测试文件、47 个测试通过，`npm audit --audit-level=low` 无漏洞。
- **限制与回滚**：视频与旁白时长仅相差约 9ms，但 QA 仍只验证旁白存在与容器音轨，发布前应人工试听。删除本地 `.env.local` 或设回 `AI_REMOTION_TTS_PROVIDER=silent` 即可回滚；模型、音频、MP4、QA 文件及密钥均不提交。BIOS MCP 在本次会话中未提供可用 server/tool，因此无法回填 `YES-593`，需在 MCP 恢复后补记上述命令和证据。

### 多语言 Product Intro 验证记录（2026-07-21）

- **原生 speaker 冒烟**：本机 `CosyVoice-300M-SFT` 验证 `英文女`、`日语男`、`韩语女`、`粤语女` 四个 speaker 均可返回非空、完整采样帧的 PCM；未使用中文 speaker 冒充外语。
- **产物**：新增英语、日语、韩语和粤语四个独立 product-intro episode。脚本由 DeepSeek `deepseek-v4-flash` 生成翻译初稿，必须人工审校其语义和本地化表达；每个版本均逐镜头生成配音并按实测时长对齐 scenes/captions。
- **渲染与 QA**：英语 45.151s / 1355 帧、日语 44.176s / 1325 帧、韩语 55.055s / 1652 帧、粤语 43.061s / 1292 帧；四个 MP4 均有音轨且结构验证通过。QA 为粤语 `8 pass / 0 warn / 0 fail`，英语、日语、韩语分别因字幕移动端长度启发式产生 1 个 warning，均无 fail。
- **门禁**：四个 episode 的 `episode:validate`、类型检查、lint 和 49 个单测均通过。`make check` 最终被 npm audit 新报告的 `brace-expansion` 高危 DoS（transitive dependency）阻断；未自动执行 `npm audit fix`，避免无授权依赖升级。