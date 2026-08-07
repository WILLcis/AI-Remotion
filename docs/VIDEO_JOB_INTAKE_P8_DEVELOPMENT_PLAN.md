# P8 — 白话视频请求 Intake Agent 开发计划

状态：Complete (contract + CLI + tests)
日期：2026-08-04
父工单：`YES-549`；P8：`YES-2031`

## 1. 目标

增加一个宿主无关的外层 Intake Agent，把用户白话描述转换为：

1. 可验证、但所有 review gate 均 pending 的 Video Job 草案；或
2. `needs_clarification`，列出阻止生成安全草案的缺失字段。

Intake 只负责收集与规范化；既不绕过 `VIDEO_AGENT_PLATFORM` 选择 specialist，也不调用媒体、provider、preview、render 或发布能力。

## 2. 工作流

```text
用户白话请求
  -> video-job-intake Agent
  -> draft Job | needs_clarification
  -> videoJobSchema validation
  -> FLAG_video_agent_platform enabled
  -> npm run video:route
  -> video-producer / one primary specialist
```

只有完整 Draft Job 才能进入 `video:route`。route JSON 仍是 workflow/primary/renderer 的唯一机器真相。

## 3. 契约

### Intake Request

```json
{
  "request_id": "optional-kebab-id",
  "description": "用户原始白话描述",
  "known_refs": ["可选的已知本地相对路径"],
  "defaults": {
    "duration_seconds": 60,
    "aspect_ratio": "16:9",
    "language": "zh"
  }
}
```

`defaults` 只能由调用方明确提供；Intake 不得自行发明默认值。

### Intake Decision

```json
{
  "status": "draft_ready | needs_clarification | blocked",
  "draft_job": null,
  "missing_fields": [],
  "questions": [],
  "assumptions": [],
  "next_action": ""
}
```

- `draft_ready`：`draft_job` 必须通过 `videoJobSchema`，并将全部 review gate 设为 `pending`。
- `needs_clarification`：不得包含可路由的 draft Job；必须明确列出问题。
- `blocked`：rights、输入权限或安全边界不满足时使用。

## 4. Intake 规则

- `description` 不是 source ref；不得把 URL、产品名、人物、音频或视频的存在假定为已授权或本地可用。
- 对 existing-video、music、deck、github-pr、remotion-project 等需要具体 ref 的 source，缺少 `known_refs` 时返回 `needs_clarification`。
- 请求数字人时，缺少明确 provider 时返回 `needs_clarification`；不设 HeyGen 等默认值。
- 请求 translation/provider、付费、云能力或最终 render 时标记为后续审批项；不得调用。
- 不明确时不猜 workflow，可保留 `workflow: auto`，但仍须有 schema-required output/source 字段。
- `review_gates.script`、`storyboard`、`final_render` 一律为 `pending`。
- 在用户确认 draft 前，不写 Job 文件；只返回 JSON 草案。

## 5. 实施范围

### In

- `src/schemas/videoIntake.ts`：request/decision schema 与纯函数 `createVideoIntakeDecision`。
- `src/schemas/index.ts` export。
- `agents/video-job-intake/AGENT.md`、`README.md`：任意 Agent 的入口契约。
- `.devin/skills/video-job-intake/SKILL.md`：仅指向中立入口的薄发现适配。
- `src/cli/intakeVideoJob.ts`：读取 JSON request，输出 decision JSON；不写 Job 文件、不调用 route/provider。
- `npm run video:intake`、fixture 和 Vitest。
- 更新 host-neutral video producer 文档，使其说明 Intake 是可选前置层。

### Out

- 不新增 LLM SDK/provider、数据库、浏览器 UI、队列或云服务。
- 不自动创建 Job YAML 文件或目录。
- 不直接 dispatch specialist、不创建媒体、不调用 provider、不执行 preview/render。
- 不修改 Video Job schema、router 或现有 workflows。

## 6. 验收

1. 结构完整的 topic/product-brief 请求可生成 schema-valid draft，所有 gates pending。
2. existing-video 缺少 local ref、数字人缺少 provider、缺少 output defaults 的请求返回清晰 `needs_clarification`。
3. Intake 无法产生 provider approval 或 final render approval。
4. `video:intake` 只输出 JSON，不写 artifact；需显式下一步 route。
5. 中立 Agent package 与 Devin adapter 均可发现，且不重复既有 route 逻辑。
6. 聚焦测试、typecheck、lint、`make check` 通过。

## 7. 回滚

删除 intake schema/function/CLI/package/fixture/test/docs/adapter 即可；现有 `video:route`、specialists、feature flag 和 media 不受影响。
