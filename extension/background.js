const HOST = "com.dsh.launcher";
const DEFAULT_URL = "http://127.0.0.1:3080/";

function native(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(HOST, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          code: "NO_HOST",
          error: chrome.runtime.lastError.message,
        });
        return;
      }
      resolve(response || { ok: false, error: "本机助手无响应" });
    });
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message && message.action === "open") {
      await chrome.tabs.create({ url: message.url || DEFAULT_URL });
      sendResponse({ ok: true, state: "opened", url: message.url || DEFAULT_URL });
      return;
    }
    if (message && (message.action === "start" || message.action === "stop")) {
      sendResponse(await native(message));
      return;
    }
    sendResponse({ ok: false, error: "未知操作" });
  })();
  return true;
});
