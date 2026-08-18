# DeepSeek Harness Browser Launcher

[中文](README.md) · [English](README.en.md)

Start, stop, and restart local [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) from the Tabbit toolbar (or any Chromium browser), then open `http://127.0.0.1:3080`.

The popup checks the local page itself. The native host only starts and stops the process.

## Requirements

- Windows
- [Node.js](https://nodejs.org/) installed, with `node` and `npx` on PATH
- Tabbit, or another Chromium browser that can load unpacked Chrome extensions

## Install

1. Clone this repository, or download the source and unzip the whole folder (do not copy `extension` alone)
2. Double-click `安装.bat` (choose Run anyway if Windows blocks it), or run:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\install.ps1"
```

The script copies the native host to `%LOCALAPPDATA%\dsh-browser-launcher` and writes the current-user registry keys.

3. Open `chrome://extensions`
4. Enable Developer mode
5. Load unpacked and select the `extension` folder
6. If the browser was already running, quit and reopen it so it picks up the native host
7. Pin DeepSeek Harness to the toolbar

The machine also needs to be able to run:

```text
npx --yes @deepseek-ai/dsh web
```

The first run downloads the official package. After that, use **Start** in the extension.

See [安装说明.txt](安装说明.txt) for a shorter checklist.

## Usage

- **Start**: runs `npx --yes @deepseek-ai/dsh web` in the background, using the existing `~/.dsh` web profile
- **Stop / Restart**: stops whatever is listening on port `3080` and starts it again if you restart
- **Open**: opens `http://127.0.0.1:3080` in a new tab
- **Open UI after start**: on by default; opens the page after a successful start or restart
- Status follows the local page: **Running** when it responds, otherwise **Stopped** or **Starting**

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\uninstall.ps1"
```

Then remove the extension in the browser. This does not delete `~/.dsh` sessions or plugins.

## Pack

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\pack.ps1"
```

This writes `dist\dsh-browser-launcher.zip`. The zip must include both the extension and the native host. Do not ship `extension` by itself.

## Troubleshooting

- Popup says the native host is missing: run the installer, then restart the browser
- Start never becomes Running: check `%USERPROFILE%\.dsh\launcher.log`
- You moved the extension folder: no need to reinstall the host; the extension ID is fixed

## License

MIT
