你需要 SSH 到香港的 cornerstone 服务器。通过 Tailscale 网络连接（不依赖局域网，从任何地方都能连）。

设备信息由本地安全配置提供，不写入仓库：
- `<tailscale-host>`：Tailscale 主机名或 MagicDNS 名称
- `<tailscale-ip>`：Tailscale 私有地址
- `<ssh-user>`：系统用户
- 密码：如需密码认证，从安全渠道交互输入
- SSH 端口：默认 22，非默认值由本地配置提供

请按以下步骤操作：

1. 检查本机 Tailscale 是否运行：
   - macOS：`tailscale status`
   - Linux：`tailscale status` 或 `sudo tailscale status`
   - 如果输出 "Tailscale is stopped" → 执行 `tailscale up` 启动（macOS 客户端需打开 Tailscale.app）
   - 如果未安装 → 提示用户安装：https://tailscale.com/download
   - 必须看到 `<tailscale-ip> <tailscale-host>` 对应的设备记录才算连通

2. 测试 Tailscale 连通性：
   `tailscale ping <tailscale-ip>`
   - 看到 `pong from <tailscale-host>` 即通
   - DERP 中继也算通（香港中继延迟 ~170ms）
   - 不通则报错，提示用户检查 Tailscale ACL 或重新登录

3. SSH 连接（任选一种地址形式）：
   ssh -o StrictHostKeyChecking=accept-new <ssh-user>@<tailscale-ip>

   或用 MagicDNS（更易记）：
   ssh -o StrictHostKeyChecking=accept-new <ssh-user>@<tailscale-host>

   - 首次连接会提示 host key，accept-new 自动接受
   - 如需密码认证，在 SSH 提示符中从安全渠道交互输入；不要将密码写入命令、shell history 或仓库

4. 连接成功后，验证：
   whoami && hostname && uptime

   预期输出包含本地安全配置中的 `<ssh-user>` 和目标主机名

要求输出：
- Tailscale 状态检查的命令和结果
- ping 测试的延迟和路径（直连/DERP）
- 连接成功后的 whoami/hostname/uptime 验证

注意：
- Tailscale 通过加密 mesh 网络连接，不需要在同一局域网，从国内/国外/任何 WiFi 都可以
- 不要把密码硬编码到 git 仓库，仅本次使用
- 如果已配置 SSH key，优先用 key 登录（跳过密码）
- 不要修改远程任何文件，只做连接验证
- 如果对方启用了 Tailscale SSH，可能完全不需要密码（直接靠 Tailscale 身份认证）