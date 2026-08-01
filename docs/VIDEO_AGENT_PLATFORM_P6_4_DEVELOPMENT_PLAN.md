# P6.4 — 审计收口与无付费试运行计划

状态：Executed locally；BIOS 建单被本机 daemon blocker 阻止，待恢复后用记录的幂等 token 补建
日期：2026-08-01
父工单：`YES-549`；关联平台：`YES-1909`、P5：`YES-1920`、P6：`YES-1923`

## 1. 背景与问题

P6 已完成 7 个 specialist 的契约、路由、fixture、测试和文档接入，但尚未对每条路径要求真实出片。

当前 P5 存在审计矛盾：`state/tasks/YES-1920-p5-controlled-trial.md` 记录 no-render 试运行，而本地 `videos/heygen-out-recut-trial/GATE_STATUS.json` 与未跟踪工作目录显示实际本地 HyperFrames render 已发生。该目录包含生成的 MP4、音频、复制源片、日志和中间产物；根 `AGENTS.md` 禁止提交这类生成媒体和本地输出。

P6.4 不新增 workflow、schema enum、renderer、provider 或浏览器 UI。它只收口证据、明确生成媒体边界，并执行一个不付费、不渲染的 P6 specialist 试运行。

## 2. 目标

1. 让 P5 的记录与已存在的本地构建事实一致，但不伪造缺失的用户批准记录。
2. 将 `videos/heygen-out-recut-trial/` 明确为本地生成试运行工作目录，不纳入 Git。
3. 统一 P6 的“契约完成”与 BIOS/计划状态表述。
4. 用 `embedded-captions` 执行一个 fixture 驱动的只读/no-render trial，证明路由、源片不可变性、审核门暂停和恢复边界。
5. 为后续 PR 提供可复现的测试和回滚证据。

## 3. 范围

### In

- 更新 P5 证据，加入真实本地构建的事实、源片哈希、无云/无付费 provider 边界和批准记录缺口。
- 通过精确 `.gitignore` 规则排除 `videos/heygen-out-recut-trial/` 的生成工作目录。
- 对齐 P6/P6.4 的状态与交接文档。
- 路由 `tests/fixtures/video-jobs/embedded-captions.yaml`：flag on 成功、flag off 拒绝。
- 在 source MP4 与 transcript 已存在的前提下，以只读方式记录 source SHA-256、pending gates、`needs_approval` 结果及前后不变性。
- 运行相应 Vitest、TypeScript、lint 和不写入媒体的检查。

### Out

- 不调用 HyperFrames render、Remotion render、云 HyperFrames、HeyGen、翻译 provider 或任何付费 API。
- 不批准或修改 `script`、`storyboard`、`final_render` gate。
- 不生成字幕、转写、预览、MP4、音频或新 `videos/<project>/` 工作目录。
- 不修改源片、已有 transcript、用户维护的 episode artifact。
- 不开展 P7、Codex 宿主封装或 schema 扩展。

## 4. 执行顺序与验收

### P6.4.0 — 计划与 BIOS

- 创建或记录一个以 `YES-1909` 为父级的 BIOS 子工单。
- 将本计划作为工单上下文，写明范围、风险、验收和回滚。

验收：存在真实 BIOS 工单号；若写权限不可用，记录精确 blocker 和待创建 payload，且不虚构已创建状态。

### P6.4.1 — P5 审计收口

- 盘点 `videos/heygen-out-recut-trial/` 中的文件及其生成性质。
- 更新 P5 evidence：区分已发生的本地 render、未发生的云/付费调用，以及批准记录未知这一事实。
- 精确忽略该试运行工作目录，避免提交 `output.mp4`、音频、复制源片、日志和中间产物。
- 统一 P6 的计划/交接状态为“契约层完成；真实 trials 另行选择”。

验收：`git status` 不再展示该工作目录；所有文档不再把已发生的本地 render 记为 no-render；不声称获得未验证的批准。

### P6.4.2 — Embedded captions no-render trial

- 验证 fixture 与 `VIDEO_AGENT_PLATFORM`：on 路由到 `embedded-captions-producer` / HyperFrames，off 被 kill switch 拒绝。
- 只读检查 fixture 引用的本地视频及可用 transcript；记录 SHA-256 前后值。
- 保持三个 review gates 为 pending；返回 `needs_approval`，不写工作目录、不生成字幕、不渲染。
- 记录最小后续变更边界：审核 caption plan 后才写 `videos/<project>/`；最终 render 仍需另一次明文批准。

验收：无 provider 调用、无新媒体、无源片变更、无 gate 自动批准；证据可复核。

### P6.4.3 — 验证与交付

```bash
npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts
npm run typecheck
npm run lint -- --quiet
FLAG_video_agent_platform='{"enabled":true}' npm run video:route -- --job tests/fixtures/video-jobs/embedded-captions.yaml
npm run video:route -- --job tests/fixtures/video-jobs/embedded-captions.yaml
```

验收：测试、typecheck、lint 通过；flag-off 命令以平台关闭错误退出；`git diff --check` 通过。`npm audit` 的 12 个上游 high 漏洞继续如实记录，不降门禁。

## 5. 风险与控制

| 风险 | 控制 |
| --- | --- |
| 将本地 render 误写为获批准的 render | 仅记录可验证事实；批准记录未知时明确标注，不能倒推批准 |
| 把 44 MB 生成媒体提交进仓库 | 精确 `.gitignore`；提交前检查 staged files |
| 试运行触发渲染或 provider | 不调用 render/provider 命令；pending gate 立即停住 |
| 修改用户源片或 transcript | 只读哈希前后比对；不执行写命令 |
| P6.4 顺手加入 P7 | 明确禁止 schema/workflow 扩展；任何 P7 另建工单 |

## 6. 回滚

- 删除 P6.4 计划、trial evidence 和状态对齐文字。
- 删除仅针对 `videos/heygen-out-recut-trial/` 的 ignore 规则；该目录保留为本地未跟踪产物。
- 不改动 P0–P6 已有 schema/router/Agent profile、用户源片、episode artifacts 或任何媒体。
