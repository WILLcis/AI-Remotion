# HeyGen Skills 工作流记忆

## 已安装能力

- 官方 Skills：`~/.cursor/skills/heygen-skills`
- Skills 版本：`3.2.0`
- HeyGen CLI：`~/.local/bin/heygen`
- CLI 版本：`v0.5.0`
- 已验证 Skills：
  - `heygen-avatar`：持久化角色身份、头像与声音。
  - `heygen-video`：v3 Video Agent 产品视频生产流程。
  - `heygen-translate`：现有视频的翻译、配音、口型同步与校对流程。

## 当前传输选择

- 当前 Cursor 工具集中没有 HeyGen MCP。
- 项目通过 `.env.local` 提供 `HEYGEN_API_KEY`，且 CLI 可用，因此按官方优先级选择 CLI。
- CLI 网络请求需要显式继承本机代理：

```bash
set -a && source .env.local && set +a
export HTTPS_PROXY=http://127.0.0.1:7897
export HTTP_PROXY=http://127.0.0.1:7897
~/.local/bin/heygen auth status
```

- 不把 API Key 复制到命令、日志、仓库或全局凭证文件。

## 必须遵守的生产规则

1. HeyGen 新视频优先使用 `heygen-video`，不用裸 HTTP 调用 v1/v2/v3 视频端点。
2. 创建人物身份时先运行 `heygen-avatar`，保存稳定的 `group_id`；每次生成前重新解析临时 `look_id`。
3. 本地截图、视频和品牌素材采用 A+B 路由：先理解内容，再通过 `heygen asset create` 上传给 Video Agent。
4. 脚本内容使用目标语言；风格、动效动词、构图修正等技术指令保持英文。
5. Prompt 按“内容在前、STYLE block 在后”组织，并明确 `CRITICAL ON-SCREEN TEXT`。
6. 头像视频生成前必须执行构图检查；横竖比例不匹配时在 prompt 末尾追加 framing note。
7. 使用 Video Agent 时先做 dry-run 创意预览，再提交；生成命令使用 `--wait --timeout 45m`。
8. 多语言成片使用 `heygen-translate`，默认 `precision`、动态时长、保留源格式；品牌/技术内容优先走 proofread。
9. 外部轮询保持静默；仅在完成、硬失败或超过 5 分钟异常停滞时通知用户。
10. 每次 Video Agent 生成后追加 `heygen-video-log.jsonl`，记录时长准确率、风格、素材与问题，不记录密钥。

## AI-Remotion 的混合工作流

### 适合 Skills / Video Agent

- 有可见主持人的产品介绍、培训、团队更新。
- 需要快速尝试 HeyGen curated style。
- 需要自动完成脚本、场景编排、B-roll 与主持人合成。
- 需要多语言翻译、配音与口型同步。

### 适合保留 Hyperframes

- 需要像素级复现实机截图、固定字幕时间、确定性 UI 动效。
- 需要复杂 HTML/GSAP 特效并要求每次渲染一致。
- 需要本地 FFmpeg 音效混音或严格 60 秒输出。

### 当前边界

- HeyGen CLI `v0.5.0` 暂无 `hyperframes` 命令。
- 因此 Hyperframes 渲染仍由项目内 `src/hyperframes/heygen.ts` 适配器负责；这是当前唯一保留的直接 API 边界。
- TTS、素材上传、Video Agent、头像、翻译、账户检查应迁移到 CLI / 官方 Skills。

## deepdog 推荐路径

1. Brief 与截图：本地主流程分析，截图按 A+B 分类。
2. 旁白：`heygen voice speech create`，保留逐字时间戳。
3. 确定性主版本：Hyperframes + GSAP + FFmpeg。
4. 可选主持人版本：`heygen-video`，使用完整脚本、`Digital Grid` / `Swiss Pulse` / `Data Drift` 风格指令。
5. 可选快速风格实验：通过 CLI 浏览 curated styles；当前可用的 16:9 retro-tech 示例包括 `OS X`、`Cyber-Analog VHS`、`Calculator`、`PowerPoint`。
6. 国际化：将已完成的主版本交给 `heygen-translate`，品牌名与技术词汇先走 proofread。

## 回滚

- 删除 `~/.cursor/skills/heygen-skills` 可移除 Skills。
- 删除 `~/.local/bin/heygen` 可移除 CLI。
- 以上操作不影响项目现有 Hyperframes、Remotion 或已生成视频。

## HyperFrames 官方 Skills 与模式库

- 已安装官方 `hyperframes`、`hyperframes-cli`、`hyperframes-core`、
  `hyperframes-animation`、`hyperframes-registry` 和
  `remotion-to-hyperframes` Skills。
- 新视频先由 `hyperframes` 做意图路由；只有明确的 Remotion 迁移请求才使用
  `remotion-to-hyperframes`。
- 项目内可复用起始模板位于 `templates/hyperframes/product-promo/`。
- 详细收录边界与模式索引见 `docs/HYPERFRAMES_PATTERN_LIBRARY.md`。
- `hyperframes-launches` 仅作为公开案例研究来源；因本地副本没有 LICENSE，
  不直接复制其品牌素材、音乐、成片或 composition 源码。
