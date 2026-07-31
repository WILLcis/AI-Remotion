# deepdog BIOS · MCP 工具对接文档

> 面向:要在任意 MCP 客户端(Claude Desktop / Claude Code / Cursor / Windsurf / Zed / 自研 agent)里接入 BIOS 工单工具的开发者。 版本:dev 分支(work-tracking M2);协议实现 `server/cmd/deepdog/mcp_server.go`,daemon 端点 `server/internal/daemon/bios_tools.go`。

------

## 1. 架构与安全模型

```
MCP 客户端(Claude/Cursor/自研)
   │  stdio(JSON-RPC 2.0,一行一消息)
   ▼
deepdog observe-bridge          ← MCP server 子进程,零凭证
   │  HTTP POST http://127.0.0.1:{healthPort}/bios/tool/{name}
   ▼
deepdog daemon(本机)           ← 持 daemon token,补 workspace 上下文
   │  HTTPS(Authorization: Bearer <daemon token> + X-Workspace-ID)
   ▼
BIOS server(如 https://poly.yesono.trade)
```

- **MCP 子进程不持有任何 secret**:server 地址、token、workspace 全在 daemon 一侧;bridge 只是协议翻译层。
- **信任边界 = 本机 localhost**:daemon 端点只绑 `127.0.0.1`;同机任意进程可调用(多用户共享机器场景暂不隔离,已知限制)。
- daemon 注册多个 workspace 时,工具路由到其主 workspace(单 workspace 部署无感知)。

## 2. 前置条件

1. 本机安装 `deepdog` CLI(桌面客户端 dmg 自带同版本二进制;或独立分发)。
2. daemon 已配置并运行:`deepdog setup self-host`(Server URL 指向目标 BIOS 环境)→ 登录 → daemon 启动。
   - **注意**:裸 CLI 读 `~/.deepdog/config.json`,桌面 app 用 `~/.deepdog/profiles/desktop-<server>/`——两套配置,先 `deepdog config` 确认指向。
3. daemon health 端口默认 **19514**(`DefaultHealthPort`)。

## 3. 客户端接入配置

MCP server 启动命令统一为:

```
command: deepdog
args:    ["observe-bridge", "--provider", "<你的客户端标识>"]
env:     MULTICA_OBSERVER_ENDPOINT=http://127.0.0.1:19514/observer/events
```

- `--provider` 是客户端标识(claude/cursor/自定义均可),用于 observer 事件归属,不影响工具功能。
- bridge 从 `MULTICA_OBSERVER_ENDPOINT`(优先)或 `DEEPDOG_OBSERVER_ENDPOINT`(兜底)剥掉 `/observer/events` 后缀得到 daemon 基址;**env 缺失时工具仍会列出但一律返回占位错误**(isError:"deepdog daemon tool endpoint not wired yet")。
- `deepdog` 不在 PATH 时写绝对路径(macOS 桌面版:`/Applications/deepdog.app/Contents/Resources/app.asar.unpacked/resources/bin/deepdog`)。

### 3.1 Claude Desktop(`claude_desktop_config.json`)

> daemon 运行时会**自动注入**这段(key 固定 `deepdog-observer`,幂等 merge);手动配置等价于:

```json
{
  "mcpServers": {
    "deepdog-observer": {
      "command": "deepdog",
      "args": ["observe-bridge", "--provider", "claude"],
      "env": { "MULTICA_OBSERVER_ENDPOINT": "http://127.0.0.1:19514/observer/events" }
    }
  }
}
```

### 3.2 Cursor(`~/.cursor/mcp.json`)

同上结构(daemon 也会自动注入),`--provider` 用 `cursor`。

### 3.3 Claude Code(暂不在自动注入面,手动加)

```bash
claude mcp add deepdog-observer \
  --env MULTICA_OBSERVER_ENDPOINT=http://127.0.0.1:19514/observer/events \
  -- deepdog observe-bridge --provider claude-code
```

或项目级 `.mcp.json`:

```json
{
  "mcpServers": {
    "deepdog-observer": {
      "command": "deepdog",
      "args": ["observe-bridge", "--provider", "claude-code"],
      "env": { "MULTICA_OBSERVER_ENDPOINT": "http://127.0.0.1:19514/observer/events" }
    }
  }
}
```

### 3.4 自研客户端

spawn 上述命令,stdin/stdout 走 MCP stdio 协议(§4);stderr 是诊断日志,不要当协议流解析。

## 4. 协议细节(自研客户端必读)

- **传输**:stdio,**newline-delimited JSON-RPC 2.0**(一行一个完整 JSON 消息;无 Content-Length 帧)。stdout 只有协议消息;日志全在 stderr。
- **模式自检**:bridge 按 stdin **首行**是否为 `{"jsonrpc":"2.0",...}` 决定进 MCP 模式(否则回落旧 JSONL 事件中继)。首包必须是合法 `initialize` 请求。
- **initialize**:
  - 请求版本在白名单 `["2024-11-05","2025-03-26","2025-06-18"]` 内 → 原样回显;未知/缺失 → 回退最新 `2025-06-18`。
  - 响应:`{"protocolVersion": "...", "capabilities": {"tools": {}}, "serverInfo": {"name": "deepdog-bios", "version": "<cli version>"}}`。仅 tools 能力(无 resources/prompts)。
- **notifications/initialized**:接受,无响应;其他 notification 一律静默忽略。
- **ping** → `{}`。
- **错误码**:非法 JSON → `-32700`(`id: null`);合法 JSON 但请求形状坏(如 method 非字符串)→ `-32600`(能恢复 id 则回显);未知 method → `-32601`;内部序列化失败 → `-32603`。
- **id**:字节级直通,string/number 均可。
- **行长上限 4MB**;超限 server 会记 stderr 并退出。
- **tools/call 结果**:`{"content":[{"type":"text","text":"..."}], "isError": <bool>}`——业务失败(缺参/工单不存在/daemon 不可达)都是 **isError:true + 可读文本**,不是 JSON-RPC error。

### 会话示例

```
→ {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"my-agent","version":"1.0"}}}
← {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{}},"serverInfo":{"name":"deepdog-bios","version":"v0.3.x"}}}
→ {"jsonrpc":"2.0","method":"notifications/initialized"}
→ {"jsonrpc":"2.0","id":2,"method":"tools/list"}
← {"jsonrpc":"2.0","id":2,"result":{"tools":[ ...4 个工具定义... ]}}
→ {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"bios_create_issue","arguments":{"title":"登录鉴权","type":"task","client_token":"my-agent-20260707-001"}}}
← {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Created TES-121: 登录鉴权"}],"isError":false}}
```

## 5. 工具参考

### 5.1 `bios_create_issue` — 建工单

> 何时调:需求分析产出 / 计划分解完成 / bug 根因确认(写代码**之前**)。

| 参数           | 类型                 | 必填 | 说明                                                         |
| -------------- | -------------------- | ---- | ------------------------------------------------------------ |
| `title`        | string               | ✅    | 工单标题                                                     |
| `body`         | string               |      | 描述 / bug 根因分析(bug 建议含 file:line 证据、复现、可证伪断言) |
| `type`         | enum `spec|task|bug` |      | 工单类型                                                     |
| `project_id`   | string               |      | 目标项目 ID;**不传会落到 workspace 默认项目**(可能不在你盯的看板上) |
| `client_token` | string               |      | **幂等键**:同 token 重放返回既有单(≤255 字节;缺省由 bridge 生成) |
| `cwd`          | string               |      | 工作目录——daemon 解析 `git remote` 写入工单 metadata `deepdog_origin_repo` 作归因锚点 |

返回文本:`Created TES-xxx: <title>`(新建)/ `Existing TES-xxx: <title>`(幂等命中)。type=bug 且 body 缺根因证据时附软提醒(不拒绝)。

### 5.2 `bios_update_stage` — 推进阶段

> 何时调:离散阶段转移(开工/进入验证等)。**这是显式操作,允许直写任意阶段(含回退)**——区别于 GitHub 自动通道的只进不退。

| 参数        | 类型                                    | 必填 | 说明                            |
| ----------- | --------------------------------------- | ---- | ------------------------------- |
| `issue_key` | string                                  | ✅    | 工单号,如 `TES-42`(也接受 UUID) |
| `stage`     | enum `plan_assign|execute|verify|close` | ✅    | 目标阶段                        |

⚠️ 直写 stage metadata **不联动 status**——看板列(按 status 分组)不会移动,只有阶段徽标变化;status 由前端阶段控件或 GitHub 自动通道(PR merge → done)驱动。

### 5.3 `bios_report_progress` — 进度备注

| 参数        | 类型   | 必填 |
| ----------- | ------ | ---- |
| `issue_key` | string | ✅    |
| `note`      | string | ✅    |

写为工单评论。可选工具,不做纪律要求。

### 5.4 `bios_link_repo` — 关联仓库锚点

> 何时调:建了功能分支 / 在某 repo 上开工但工单还没关联仓库时。

| 参数        | 类型   | 必填 | 说明     |
| ----------- | ------ | ---- | -------- |
| `issue_key` | string | ✅    |          |
| `repo_url`  | string | ✅    | 仓库 URL |
| `branch`    | string |      | 分支名   |

写入工单 metadata `deepdog_linked_repo`(值 `url#branch` 或 `url`),upsert 幂等。

## 6. 与 GitHub 自动通道的配合(何时**不用**调工具)

分支命名带工单号(`<type>/<service>/<ISSUE-KEY>-<slug>`,如 `feat/web/TES-120-auth-login`)后,以下全自动、**禁止手动汇报**:

- 建分支 → 阶段推进到 `execute`;
- push(分支名或 commit trailer `BIOS-ISSUE: <KEY>`)→ `execute` 兜底;
- 开 PR(非 draft)→ `verify`;
- merge + CI 绿 + 依赖满足 → status done + 阶段 `close`。

(需 workspace 开启 `github_stage_sync_enabled` 且 GitHub App 订阅 create/push 事件。)

## 7. 排障

| 症状                                                    | 原因与处理                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| 工具列表里没有 bios_*                                   | daemon 没运行 / 客户端没重启 / 配置没注入——起 daemon 后重启客户端;Claude Code 需手动配置(§3.3) |
| 工具存在但一调就 isError "not wired yet"                | env `MULTICA_OBSERVER_ENDPOINT` 缺失——检查客户端配置的 env 块 |
| isError "deepdog daemon is not running on this machine" | daemon 停了或端口不对(默认 19514)                            |
| 建单成功但前端看不到                                    | 三连查:① 前端开的是不是 daemon 指向的那套环境(`deepdog config` 看 server_url,poly 与 [dev.deepdog.org](http://dev.deepdog.org) 是两套库);② 没传 project_id 落到默认项目了;③ status 还在待办列,只是阶段徽标变了 |
| "issue not found"                                       | issue_key 前缀与 workspace 不符(如 TES vs YES),或工单在别的 workspace |
| initialize 后无响应                                     | 检查是否**一行一个完整 JSON**(不能有 Content-Length 帧/多行 pretty JSON) |

## 8. CLI 等价命令(无 MCP 时的兜底)

```bash
deepdog issue create --title "..." [--description "..."]
deepdog issue metadata set <ISSUE-KEY> --key deepdog_work_stage --value <plan_assign|execute|verify|close>
```