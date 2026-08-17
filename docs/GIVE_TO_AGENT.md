# 把这个项目交给 Agent

给不会写代码的人：不要装「安装包」，也不要打开任何软件界面。把这个文件夹交给 Cursor（或同类能读文件夹、能跑命令的 Agent），让它干活。

## 你要做的

1. 安装 [Cursor](https://cursor.com)（或你已经在用的同类 Agent）。
2. 用「打开文件夹」打开本仓库（GitHub 上下载的 zip 解压后也可以，不必会用 git）。
3. 把下面整段发给 Agent，然后用一句话说你要做什么，例如：「出一条商业消费数字人」。

```text
请先读 AGENTS.md 全文，再按里面的「必读清单」把列出的文档按顺序一次读完，然后 npm run setup。不要跳过清单。
不要改仓库源码，只跑 CLI 出片/发布。除非我当次明确说「改代码」。
不要让我敲 brew、npm 或 FLAG_ 命令。
setup 打印 JSON：ready 就继续；needs_human 只用人话问 ask 里的那几句；failed 就停。
要自动点视频号/小红书「发表/发布」时等我说「批准RPA」，第一次在弹出的 Chrome 里扫码。

我的需求：<一句话，例如：出一条商业消费数字人>
```

4. 只有 Agent 用普通人能懂的话问你时，你才需要动手：
   - 登录即梦（通常会弹出二维码或浏览器）。
   - 把 DeepSeek（或兼容接口）的 API 密钥发给 Agent，它会写入这台电脑的 `.env.local`，**不要**把这个文件发给别人或提交到 git。
   - 即梦积分不够时，去即梦账号里充值或领取。
   - 若要自动发到视频号 / 小红书：对 Agent 说「批准RPA」；第一次在弹出的 Google Chrome 里扫码登录创作者账号（不是无痕窗口）。
5. 成品一般在 `videos/` 里。不要把 `.env.local` 和生成的 MP4 当成源码发出去。

## Agent 会做的

Node、FFmpeg、`npm install`、即梦命令行安装、环境模板、出片和发布包，都由 Agent 执行。`npm run setup` 是给 Agent 的体检，**不能代替**仓库质量门禁 `make check`。

## 不要做的

- 不要找 `.dmg` / 安装包 / 网页后台。
- 不要自己敲 `npm`、`brew` 或一长串 FLAG 命令。
- 不要在 Windows 上指望第一版开箱流程能装成功（请用 Mac）。
