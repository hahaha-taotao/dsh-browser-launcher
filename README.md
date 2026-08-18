# DeepSeek Harness 浏览器启动器

[中文](README.md) · [English](README.en.md)

在 Tabbit（或其他 Chromium 内核浏览器）工具栏里启动、停止、重启本机 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，并打开 `http://127.0.0.1:3080`。

面板自己探测本地页面是否已通，本机助手只负责拉起和结束进程。

## 需要

- Windows
- 已安装 [Node.js](https://nodejs.org/)，命令行里能跑 `node` 和 `npx`
- Tabbit，或其它可加载 Chrome 扩展的 Chromium 浏览器

## 安装

1. 克隆本仓库，或下载源码后解压整个文件夹（不要只拷 `extension`）
2. 双击 `安装.bat`（若被拦截，选仍要运行），或执行：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\install.ps1"
```

安装脚本会把本机助手拷到 `%LOCALAPPDATA%\dsh-browser-launcher`，并写入当前用户注册表。

3. 打开扩展页 `chrome://extensions`
4. 打开右上角「开发者模式」
5. 「加载已解压的扩展程序」，选仓库里的 `extension` 目录
6. 若浏览器已经开着，关掉再开一次，让它读到新登记的本机助手
7. 把 DeepSeek Harness 钉到工具栏

本机还要能跑：

```text
npx --yes @deepseek-ai/dsh web
```

第一次会下载官方包。之后即可用扩展里的「启动服务」。

更短的步骤见 [安装说明.txt](安装说明.txt)。

## 使用

- **启动服务**：后台执行 `npx --yes @deepseek-ai/dsh web`，走本机已有的 `~/.dsh` web profile
- **停止 / 重启**：停止监听 `3080` 的本地服务并按需重新拉起
- **打开**：新标签打开 `http://127.0.0.1:3080`
- **启动后打开界面**：默认开启；启动或重启成功后自动打开页面
- 状态以页面是否探通为准：通了显示「运行中」，否则显示「未运行」或「启动中」

## 卸装

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\uninstall.ps1"
```

然后在浏览器扩展页移除扩展。不会删除 `~/.dsh` 里的会话和插件。

## 打包

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\pack.ps1"
```

生成 `dist\dsh-browser-launcher.zip`。压缩包里需同时包含扩展和本机助手，不要只发 `extension`。

## 排查

- 弹层提示未连接本机助手：先跑安装脚本，再重启浏览器
- 启动很久仍未变成运行中：看 `%USERPROFILE%\.dsh\launcher.log`
- 扩展换了目录：不用重装助手，扩展 ID 已固定

## 许可

MIT
