const URL = "http://127.0.0.1:3080/";
const START_TIMEOUT_MS = 60_000;

const el = {
  dot: document.getElementById("dot"),
  statusText: document.getElementById("statusText"),
  url: document.getElementById("url"),
  hint: document.getElementById("hint"),
  autoOpen: document.getElementById("autoOpen"),
  start: document.getElementById("btnStart"),
  stop: document.getElementById("btnStop"),
  restart: document.getElementById("btnRestart"),
  open: document.getElementById("btnOpen"),
};

let phase = null;
let busy = false;

function send(message, timeoutMs = 20_000) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => done({ ok: false, error: "本机助手响应超时" }), timeoutMs);
    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        done({
          ok: false,
          code: "NO_HOST",
          error: chrome.runtime.lastError.message,
        });
        return;
      }
      done(response || { ok: false, error: "空响应" });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showHint(text, info) {
  if (!text) {
    el.hint.hidden = true;
    el.hint.textContent = "";
    return;
  }
  el.hint.hidden = false;
  el.hint.textContent = text;
  el.hint.classList.toggle("info", Boolean(info));
}

async function probeReady(timeoutMs = 2000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(URL, { method: "GET", cache: "no-store", signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function paint(state) {
  const labels = {
    stopped: "未运行",
    starting: "启动中",
    running: "运行中",
    stopping: "停止中",
  };
  el.statusText.textContent = labels[state] || "检查中…";
  el.url.textContent = "http://127.0.0.1:3080";
  el.dot.className = "dot";
  if (state === "running") el.dot.classList.add("ok");
  if (state === "starting" || state === "stopping") el.dot.classList.add("wait");

  const live = state === "running";
  el.start.disabled = busy || live || state === "starting";
  el.stop.disabled = busy || state === "stopping" || state === "stopped";
  el.restart.disabled = busy || !live;
  el.open.disabled = false;

  if (state === "starting") showHint("正在启动，页面通了之后会变成运行中。", true);
  else if (state === "stopping") showHint("正在停止本地服务。", true);
  else if (state === "running") showHint("服务已在运行。", true);
  else showHint("");
}

async function currentState() {
  const ready = await probeReady();
  if (ready) {
    phase = null;
    return "running";
  }
  if (phase === "starting" || phase === "stopping") return phase;
  return "stopped";
}

async function refresh() {
  const state = await currentState();
  paint(state);
  return state;
}

async function waitFor(wanted, timeoutMs) {
  const startAt = Date.now();
  let last = await refresh();
  while (Date.now() - startAt < timeoutMs) {
    if (last === wanted) return last;
    await sleep(600);
    last = await refresh();
  }
  return last;
}

async function run(action) {
  if (busy) return;
  busy = true;
  try {
    if (action === "stop" || action === "restart") {
      phase = "stopping";
      paint("stopping");
      const stopResult = await send({ action: "stop" });
      if (stopResult.code === "NO_HOST") {
        showHint("未连接到本机助手，请先运行 scripts/install.ps1");
        return;
      }
      await waitFor("stopped", 15_000);
    }

    if (action === "start" || action === "restart") {
      phase = "starting";
      paint("starting");
      send({ action: "start", force: true }).then((startResult) => {
        if (startResult && startResult.code === "NO_HOST") {
          showHint("未连接到本机助手，请先运行 scripts/install.ps1");
        }
      });
      const started = await waitFor("running", START_TIMEOUT_MS);
      if (started !== "running") {
        phase = null;
        paint(await currentState());
        showHint("启动超时，请确认本机已安装 Node.js，并查看 ~/.dsh/launcher.log");
        return;
      }
      if (el.autoOpen.checked) await send({ action: "open", url: URL });
    }
  } finally {
    busy = false;
    await refresh();
  }
}

el.start.addEventListener("click", () => run("start"));
el.stop.addEventListener("click", () => run("stop"));
el.restart.addEventListener("click", () => run("restart"));
el.open.addEventListener("click", () => send({ action: "open", url: URL }));

el.autoOpen.addEventListener("change", () => {
  chrome.storage.local.set({ autoOpen: el.autoOpen.checked });
});

chrome.storage.local.get({ autoOpen: true }, (stored) => {
  el.autoOpen.checked = stored.autoOpen !== false;
});

refresh();
setInterval(() => {
  if (!busy) refresh();
}, 2000);
