# P6.5 — Motion Graphics 免费 No-Render Trial 计划

状态：Executed locally；BIOS `YES-1962` 已创建并进入 `in_review`
日期：2026-08-01
父工单：`YES-549`；关联平台：`YES-1909`；P6：`YES-1923`、P6.5：`YES-1962`

## 1. 目标

对 P6 已接入的 `motion-graphics` specialist 执行第二个受控试运行，验证短时、无旁白、本地 motion brief 可稳定经过 Video Job schema、flag、auto route、唯一 primary 和审核门协议。

选用 `motion-graphics` 的理由：fixture 是 3 秒本地 brief，不需要外部媒体、GitHub 凭据、云服务或 provider；router 返回 HyperFrames，但本阶段不执行任何 HyperFrames composition、preview 或 render。

## 2. 范围

### In

- 使用 `tests/fixtures/video-jobs/motion-graphics.yaml` 验证 `workflow: auto` 与 `source.type: motion-brief` 的 auto route。
- 验证 `FLAGS.VIDEO_AGENT_PLATFORM` on/off 矩阵。
- 验证 route 没有 provider requirements、唯一 primary 为 `motion-graphics-producer`、renderer 为 `hyperframes`。
- 保持 `storyboard` 与 `final_render` 为 pending，并记录 `needs_approval` 停止协议。
- 记录不会创建 `videos/motion-graphics-trial/`、不会生成媒体和不会调用 provider 的证据。
- 更新交接文档和本地 BIOS 降级记录。

### Out

- 不调用 `npx hyperframes skills update`、`hyperframes check`、preview、render 或任何 composition authoring 命令。
- 不创建 `videos/<project>/`、`BRIEF.md`、storyboard、HTML、媒体、截图或输出 MP4。
- 不调用付费 API、云 HyperFrames、HeyGen、TTS、图像生成、素材搜索或外部网页。
- 不批准 `storyboard` 或 `final_render`。
- 不修改 Video Job schema、router、Agent profile，亦不开始 P7 或 Codex 封装。

## 3. 执行顺序

### P6.5.0 — 文档和 BIOS

- 创建本计划。
- 在 `YES-1909` 下创建 BIOS 子工单；若 daemon 不可用，记录实际错误与可幂等重试 payload。

### P6.5.1 — Route 与 gate 试运行

```bash
FLAG_video_agent_platform='{"enabled":true}' \
  npm run video:route -- --job tests/fixtures/video-jobs/motion-graphics.yaml
npm run video:route -- --job tests/fixtures/video-jobs/motion-graphics.yaml
```

预期：on 路由至 `motion-graphics-producer` / `hyperframes`，仅 `storyboard` 和 `final_render` pending；off 由 kill switch 拒绝。

### P6.5.2 — Specialist 停止边界

根据 validated Job、route 和 profile 记录 `needs_approval`：不写 artifact，下一步必须由用户明确批准 storyboard；最终 render 另需明确批准。

### P6.5.3 — 验证与交付

```bash
npx vitest run tests/video-agent-platform.test.ts tests/feature-flags.test.ts
npm run typecheck
npm run lint -- --quiet
git diff --check
```

## 4. 验收

- Auto route 使用 `motion-brief`，且不依赖显式 workflow。
- Flag off 拒绝路由；flag on 返回唯一 primary、HyperFrames renderer、空 provider requirements。
- `storyboard`、`final_render` 未被自动批准，结果停在 `needs_approval`。
- 没有 `videos/motion-graphics-trial/` 或任何生成媒体。
- 没有 provider、网络、render 或外部 skill 安装调用。
- 测试、typecheck、lint、diff check 通过；已知 audit blocker 仅如实记录。

## 5. 风险与控制

| 风险 | 控制 |
| --- | --- |
| 将 route 验证误表述为已出片 | evidence 明确标为 no-render / no-composition trial |
| agent 在未批准时创建 work directory | 不调用 specialist authoring 命令；检查目标目录不存在 |
| 触发外部/付费能力 | 不执行安装、媒体、provider 或 render 命令 |
| 与 P7 或 Codex 封装混范围 | 不改 schema、workflow 或宿主配置 |

## 6. 回滚

删除 P6.5 计划、BIOS 降级记录、trial evidence 和交接中的 P6.5 行即可；不影响 P0–P6 实现、媒体、fixture、schema、router 或 Agent profile。
