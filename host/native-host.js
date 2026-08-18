"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const net = require("net");
const { spawn, spawnSync } = require("child_process");
const { classifyStatus } = require("./status");

const URL = "http://127.0.0.1:3080";
const HOST = "127.0.0.1";
const PORT = 3080;
const STATE_PATH = path.join(os.homedir(), ".dsh", "launcher-state.json");
const LOG_PATH = path.join(os.homedir(), ".dsh", "launcher.log");

function log(line) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`);
  } catch {
    // ignore
  }
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function clearState() {
  try {
    fs.unlinkSync(STATE_PATH);
  } catch {
    // ignore
  }
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probeOnce(host, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => {
      req.destroy();
      done(false);
    }, timeoutMs);
    const req = http.get({ host, port: PORT, path: "/", timeout: timeoutMs }, (res) => {
      res.resume();
      clearTimeout(timer);
      done(true);
    });
    req.on("error", () => {
      clearTimeout(timer);
      done(false);
    });
    req.on("timeout", () => {
      req.destroy();
      clearTimeout(timer);
      done(false);
    });
  });
}

async function probe(timeoutMs = 2000) {
  return probeOnce(HOST, timeoutMs);
}

function portOpen(timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: HOST, port: PORT });
    const done = (value) => {
      socket.removeAllListeners();
      socket.on("error", () => {});
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(value);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.on("connect", () => done(true));
    socket.on("error", () => done(false));
  });
}

function isRecentStart(saved, windowMs = 45_000) {
  if (!saved || !saved.startedAt) return false;
  const startedAt = Date.parse(saved.startedAt);
  return Number.isFinite(startedAt) && Date.now() - startedAt < windowMs;
}

function findListenPid(port) {
  if (process.platform !== "win32") return null;
  const result = spawnSync("netstat", ["-ano", "-p", "TCP"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (!result.stdout) return null;
  const re = new RegExp(String.raw`:${port}\s+\S+\s+LISTENING\s+(\d+)`, "i");
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(re);
    if (match) return Number(match[1]);
  }
  return null;
}

async function getStatus() {
  const saved = readState();
  const savedPid = saved && saved.pid;
  const savedAlive = isPidAlive(savedPid);
  const listenPid = findListenPid(PORT);
  const open = listenPid ? true : await portOpen();
  const httpReady = open ? await probe() : false;
  const ready = httpReady || open;
  const recentStart = isRecentStart(saved);
  const state = classifyStatus({ ready, savedAlive, recentStart });

  if (state === "stopped" && saved) clearState();
  log(`status state=${state} http=${httpReady} port=${open} pid=${listenPid || savedPid || "-"} savedAlive=${savedAlive}`);
  return {
    ok: true,
    state,
    pid: listenPid || (savedAlive ? savedPid : null),
    url: URL,
    managed: Boolean(savedAlive || recentStart),
  };
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function startDetached() {
  const env = { ...process.env, npm_config_yes: "true" };
  if (process.platform !== "win32") {
    const child = spawn("npx", ["--yes", "@deepseek-ai/dsh", "web"], {
      detached: true,
      stdio: "ignore",
      env,
      cwd: os.homedir(),
    });
    child.unref();
    return child.pid;
  }

  // detached cmd.exe on Windows always gets its own console.
  // Start-Process -WindowStyle Hidden keeps npx/node in the background.
  const home = os.homedir();
  const outLog = path.join(home, ".dsh", "dsh-web.out.log");
  const errLog = path.join(home, ".dsh", "dsh-web.err.log");
  fs.mkdirSync(path.dirname(outLog), { recursive: true });
  const ps = [
    "-NoProfile",
    "-WindowStyle",
    "Hidden",
    "-Command",
    [
      "Start-Process",
      `-FilePath ${psQuote(process.env.ComSpec || "cmd.exe")}`,
      `-ArgumentList @('/d','/s','/c','npx --yes @deepseek-ai/dsh web')`,
      `-WorkingDirectory ${psQuote(home)}`,
      "-WindowStyle Hidden",
      `-RedirectStandardOutput ${psQuote(outLog)}`,
      `-RedirectStandardError ${psQuote(errLog)}`,
      "-PassThru | Select-Object -ExpandProperty Id",
    ].join(" "),
  ];
  const result = spawnSync("powershell.exe", ps, {
    encoding: "utf8",
    windowsHide: true,
    env,
    windowsVerbatimArguments: false,
  });
  const pid = parseInt(String(result.stdout || "").trim(), 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    log(`start hidden failed stdout=${result.stdout} stderr=${result.stderr} status=${result.status}`);
    return null;
  }
  return pid;
}

async function start(options = {}) {
  const current = await getStatus();
  if (!options.force && current.state === "running") {
    return current;
  }
  const pid = startDetached();
  if (!pid) {
    log("start failed: no pid");
    return { ok: false, state: "stopped", url: URL, error: "未能拉起启动命令" };
  }
  writeState({
    pid,
    startedAt: new Date().toISOString(),
    command: "npx --yes @deepseek-ai/dsh web",
    url: URL,
  });
  log(`started pid=${pid}`);
  return { ok: true, state: "starting", pid, url: URL, managed: true };
}

function killPid(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore
    }
  }
}

function collectStopPids(status) {
  const pids = new Set();
  if (status && status.pid) pids.add(status.pid);
  const saved = readState();
  if (saved && saved.pid) pids.add(saved.pid);
  const listenPid = findListenPid(PORT);
  if (listenPid) pids.add(listenPid);
  return [...pids];
}

async function stop() {
  const current = await getStatus();
  if (current.state === "stopped") return current;

  const pids = collectStopPids(current);
  log(`stopping pids=${pids.join(",") || "none"}`);
  for (const pid of pids) killPid(pid);

  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const listenPid = findListenPid(PORT);
    const open = await portOpen(400);
    if (!listenPid && !open) break;
    if (listenPid) killPid(listenPid);
    await sleep(250);
  }
  clearState();
  const after = await getStatus();
  if (after.state === "stopped") return after;
  return { ...after, ok: false, error: "停止后端口仍被占用" };
}

async function restart() {
  await stop();
  await sleep(800);
  return start({ force: true });
}

async function handle(message) {
  const action = message && message.action;
  if (action === "status") return getStatus();
  if (action === "start") return start({ force: Boolean(message.force) });
  if (action === "stop") return stop();
  if (action === "restart") return restart();
  return { ok: false, error: "未知操作" };
}

function send(payload) {
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(header);
  process.stdout.write(json);
}

async function main() {
  let buf = Buffer.alloc(0);
  process.stdin.on("data", async (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 4) {
      const len = buf.readUInt32LE(0);
      if (buf.length < 4 + len) break;
      const raw = buf.subarray(4, 4 + len).toString("utf8");
      buf = buf.subarray(4 + len);
      let parsed = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        send({ ok: false, error: "无效消息" });
        continue;
      }
      try {
        send(await handle(parsed));
      } catch (err) {
        log(`handle error: ${err && err.stack ? err.stack : err}`);
        send({ ok: false, error: String(err && err.message ? err.message : err) });
      }
    }
  });
  process.stdin.on("end", () => {
    setTimeout(() => process.exit(0), 30);
  });
  process.stdin.resume();
}

main();
