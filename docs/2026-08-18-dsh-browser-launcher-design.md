# DeepSeek Harness 浏览器启动器

- 日期：2026-08-18
- 状态：已定稿，按此实现
- 平台：Windows + Tabbit（Chromium，兼容 Chrome 扩展）

## 目标

在 Tabbit 工具栏点一下，就能启动、停止、重启本机 DeepSeek Harness，并打开 `http://127.0.0.1:3080`。

## 范围

包含：

- 工具栏弹层：状态、固定地址、启动服务、停止、重启、打开
- 开关「启动后打开界面」（默认开）
- Native Messaging 本机宿主真正拉起 / 结束进程
- 一次安装脚本（当前用户，无需管理员）

不包含：

- 改命令、改端口、端口被占用时自动换端口
- 开机自启、弹层操作日志
- 停止别人拉起的进程

## 默认启动命令

```
npx --yes @deepseek-ai/dsh web
```

地址固定 `http://127.0.0.1:3080`。走现有 `~/.dsh/profiles/web`。

## 结构

```
Tabbit popup → background service worker → Native Messaging
    → host/native-host.js
        → 分离进程启动 npx
        → ~/.dsh/launcher-state.json 记录本扩展 PID
        → 探活 127.0.0.1:3080
```

- 本扩展拉起且端口通：运行中，可停止 / 重启 / 打开
- 本扩展 PID 还在、端口未通：启动中
- 端口通但不是本扩展拉起：外部运行中，只能打开
- 都没有：未运行

## 失败

- 未登记宿主：提示先运行 `scripts/install.ps1`
- 启动超过 60 秒仍探不到：启动超时
- 3080 被非本扩展占用：不杀、不换端口

## 安装

1. 运行 `scripts/install.ps1`
2. Tabbit 扩展页 → 开发者模式 → 加载 `extension/`
3. 钉到工具栏
