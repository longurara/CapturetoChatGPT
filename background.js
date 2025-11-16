const defaultSettings = {
  autoCrop: true,
  autoSend: true,
  showCameraButton: true,
  promptText:
    "Hay giai thich bang tieng Viet noi dung trong buc anh bai giang nay. Neu can, huong dan tung buoc thuc hien.",
  targetService: "chatgpt"
};

const selectionResources = Object.freeze({
  css: ["selection.css"],
  scripts: ["selection.js"]
});

const autoInjectPatterns = [
  /https:\/\/docs\.google\.com\/presentation/i,
  /https:\/\/.*powerpoint\.office\.com/i,
  /https:\/\/www\.canva\.com\/design/i,
  /https:\/\/.*slides\.com\/.+\/edit/i,
  /https:\/\/.*prezi\.com/i,
  /https:\/\/.*gamma\.app\/docs/i,
  /https:\/\/drive\.google\.com\/file\/d\//i,
  /https:\/\/drive\.google\.com\/folders\/d\//i
];

const injectedTabs = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, (current) => {
    const missing = {};
    Object.entries(defaultSettings).forEach(([key, value]) => {
      if (current[key] === undefined) {
        missing[key] = value;
      }
    });
    if (Object.keys(missing).length) {
      chrome.storage.sync.set(missing);
    }
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) {
    return;
  }

  const alreadyInjected = injectedTabs.has(tab.id);
  if (!alreadyInjected) {
    await injectSelectionResources(tab.id, tab.url || "");
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "start-capture",
      source: "browser-action"
    });
  } catch (error) {
    console.warn("Slide Snapshot: unable to trigger capture.", error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    case "capture-selection":
      if (!sender.tab?.id || sender.tab.windowId === undefined) {
        return;
      }
      handleSelectionCapture(message, sender.tab);
      break;
    case "open-chatgpt":
      openChatGPTTab();
      break;
    case "send-to-service":
      handleServiceSend(message, sendResponse);
      return true;
    default:
      break;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    injectedTabs.delete(tabId);
  }

  if (!tab || !tab.url) {
    return;
  }

  const shouldInject =
    (changeInfo.status === "complete" || changeInfo.url) &&
    shouldAutoInject(tab.url);

  if (!shouldInject) {
    return;
  }

  const previousUrl = injectedTabs.get(tabId);
  if (previousUrl === tab.url) {
    return;
  }

  injectSelectionResources(tabId, tab.url);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

async function injectSelectionResources(tabId, url) {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId, frameIds: [0] },
      files: selectionResources.css
    });

    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      files: selectionResources.scripts
    });

    if (url) {
      injectedTabs.set(tabId, url);
    }
  } catch (error) {
    console.error("Slide Snapshot: unable to inject selection UI.", error);
  }
}

function shouldAutoInject(url) {
  return autoInjectPatterns.some((pattern) => pattern.test(url));
}

async function handleSelectionCapture(message, tab) {
  try {
    const imageUrl = await captureTabScreenshot(tab);

    await chrome.tabs.sendMessage(tab.id, {
      type: "selection-image",
      imageUrl,
      bounds: message.bounds,
      devicePixelRatio: message.devicePixelRatio
    });
  } catch (error) {
    console.error("Slide Snapshot: failed to capture tab.", error);
    if (tab?.id) {
      await notifyCaptureFailed(tab.id, error);
    }
  }
}

function handleServiceSend(message, sendResponse) {
  const target = (message?.service || "chatgpt").toLowerCase();
  const handler = target === "gemini" ? sendImageToGemini : sendImageToChatGPT;

  handler(message)
    .then(() => sendResponse?.({ ok: true }))
    .catch((error) => {
      console.error("Slide Snapshot: failed to push payload.", error);
      sendResponse?.({ ok: false });
    });
}

async function openChatGPTTab() {
  await ensureChatGPTTab(true);
}

async function ensureChatGPTTab(activate = false) {
  const matchUrls = ["https://chatgpt.com/*", "https://chat.openai.com/*"];
  const existing = await chrome.tabs.query({ url: matchUrls });

  if (existing.length > 0) {
    if (activate) {
      await chrome.tabs.update(existing[0].id, { active: true });
    }
    return existing[0];
  }

  return chrome.tabs.create({ url: "https://chatgpt.com/" });
}

async function ensureGeminiTab(activate = false) {
  const matchUrls = ["https://gemini.google.com/*"];
  const existing = await chrome.tabs.query({ url: matchUrls });

  if (existing.length > 0) {
    if (activate) {
      await chrome.tabs.update(existing[0].id, { active: true });
    }
    return existing[0];
  }

  return chrome.tabs.create({ url: "https://gemini.google.com/app" });
}

async function sendImageToChatGPT(payload) {
  if (!payload?.imageDataUrl) {
    throw new Error("Missing image data");
  }

  const tab = await ensureChatGPTTab(true);
  if (!tab?.id) {
    throw new Error("ChatGPT tab missing");
  }

  await waitForTabReady(tab.id);

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: injectIntoChatGPT,
    args: [payload.imageDataUrl, payload.promptText, payload.options]
  });
}

async function sendImageToGemini(payload) {
  if (!payload?.imageDataUrl) {
    throw new Error("Missing image data");
  }

  const tab = await ensureGeminiTab(true);
  if (!tab?.id) {
    throw new Error("Gemini tab missing");
  }

  await waitForTabReady(tab.id);

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: injectIntoGemini,
    args: [payload.imageDataUrl, payload.promptText, payload.options]
  });
}

function waitForTabReady(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (!tab) {
        resolve(null);
        return;
      }
      if (tab.status === "complete") {
        resolve(tab);
        return;
      }

      const listener = (updatedId, info, updatedTab) => {
        if (updatedId === tabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(updatedTab);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

async function captureTabScreenshot(tab) {
  const targetWindowId =
    typeof tab?.windowId === "number" ? tab.windowId : undefined;

  try {
    return await captureVisibleArea(targetWindowId);
  } catch (error) {
    if (
      typeof targetWindowId === "number" &&
      targetWindowId !== chrome.windows.WINDOW_ID_CURRENT
    ) {
      return captureVisibleArea(chrome.windows.WINDOW_ID_CURRENT);
    }
    throw error;
  }
}

function captureVisibleArea(windowId) {
  const target =
    typeof windowId === "number" ? windowId : chrome.windows.WINDOW_ID_CURRENT;

  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(target, { format: "png" }, (imageUrl) => {
      if (chrome.runtime.lastError || !imageUrl) {
        reject(new Error(chrome.runtime.lastError?.message || "capture"));
        return;
      }
      resolve(imageUrl);
    });
  });
}

async function notifyCaptureFailed(tabId, error) {
  const payload = {
    type: "capture-failed",
    reason: classifyCaptureError(error?.message),
    message: error?.message || ""
  };

  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch (sendError) {
    console.warn("Slide Snapshot: unable to notify capture failure.", sendError);
  }
}

function classifyCaptureError(message) {
  if (!message) {
    return "generic";
  }
  const normalized = message.toLowerCase();
  if (normalized.includes("permission") || normalized.includes("allow")) {
    return "permission";
  }
  if (
    normalized.includes("visible tab") ||
    normalized.includes("active tab") ||
    normalized.includes("current tab") ||
    normalized.includes("focused window")
  ) {
    return "inactive";
  }
  if (normalized.includes("another capture") || normalized.includes("busy")) {
    return "busy";
  }
  if (normalized.includes("maximum") || normalized.includes("rate")) {
    return "rate";
  }
  return normalized;
}

async function injectIntoChatGPT(imageDataUrl, promptText, options = {}) {
  const prompt =
    promptText || "Hay giai thich bang tieng Viet noi dung trong anh nay.";
  const autoSend =
    typeof options.autoSend === "boolean" ? options.autoSend : true;
  const source = options.source || "capture";

  function waitForElement(selector, attempts = 15, delayMs = 400) {
    return new Promise((resolve) => {
      let tries = 0;
      const lookup = () => {
        const element = document.querySelector(selector);
        if (element || tries >= attempts) {
          resolve(element);
          return;
        }
        tries += 1;
        setTimeout(lookup, delayMs);
      };
      lookup();
    });
  }

  async function attachImage() {
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `slide-${Date.now()}.png`, {
        type: blob.type || "image/png"
      });

      const input =
        (await waitForElement('input[type="file"][accept*="image"]')) ||
        (await waitForElement('input[type="file"]'));

      if (!input) {
        return false;
      }

      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (error) {
      console.warn("Slide Snapshot: unable to attach file.", error);
      return false;
    }
  }

  async function setPromptText() {
    const textarea =
      (await waitForElement("textarea")) ||
      (await waitForElement("[contenteditable='true']"));

    if (!textarea) {
      return;
    }

    textarea.value = prompt;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
  }

  await setPromptText();
  const attached = await attachImage();
  postStatusBanner(
    attached
      ? autoSend
        ? "Ảnh đã chuyển sang ChatGPT"
        : "Ảnh đã tải lên, kiểm tra rồi gửi nhé."
      : "Không đính kèm được ảnh, thử lại."
  );
  if (attached && autoSend) {
    await clickSendButton();
  }

  async function clickSendButton() {
    const sendButton =
      (await waitForElement("#composer-submit-button")) ||
      (await waitForElement('button[aria-label="Send message"]')) ||
      (await waitForElement('button[data-testid="send-button"]')) ||
      (await waitForElement('button[type="submit"]'));

    if (!sendButton) {
      return;
    }

    sendButton.removeAttribute("disabled");
    sendButton.click();
  }

  function postStatusBanner(text) {
    const host =
      document.querySelector('[data-testid="conversation-turns"]') ||
      document.querySelector('[data-testid="chat-view"]') ||
      document.querySelector("main") ||
      document.body;

    if (!host) {
      return;
    }

    const existing = document.getElementById("slide-snapshot-banner");
    if (existing) {
      existing.remove();
    }

    const banner = document.createElement("div");
    banner.id = "slide-snapshot-banner";
    banner.textContent = text;
    banner.style.cssText =
      "margin:12px auto;padding:10px 16px;border-radius:10px;background:#e0ecff;color:#0f172a;font-family:inherit;font-size:0.9rem;max-width:360px;text-align:center;";

    host.prepend(banner);
    setTimeout(() => banner.remove(), 5000);
  }
}

async function injectIntoGemini(imageDataUrl, promptText, options = {}) {
  const prompt =
    promptText || "Hay giai thich bang tieng Viet noi dung trong anh nay.";
  const autoSend =
    typeof options.autoSend === "boolean" ? options.autoSend : true;

  function waitForElement(selector, attempts = 15, delayMs = 400) {
    return new Promise((resolve) => {
      let tries = 0;
      const lookup = () => {
        const element = document.querySelector(selector);
        if (element || tries >= attempts) {
          resolve(element);
          return;
        }
        tries += 1;
        setTimeout(lookup, delayMs);
      };
      lookup();
    });
  }

  async function attachImage() {
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `slide-${Date.now()}.png`, {
        type: blob.type || "image/png"
      });

      const input =
        (await waitForElement('input[type="file"][accept*="image"]')) ||
        (await waitForElement('input[type="file"]'));

      if (!input) {
        return false;
      }

      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (error) {
      console.warn("Slide Snapshot: unable to attach file on Gemini.", error);
      return false;
    }
  }

  async function setPromptText() {
    const textarea =
      (await waitForElement("textarea")) ||
      (await waitForElement("[contenteditable='true']"));

    if (!textarea) {
      return;
    }

    textarea.value = prompt;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
  }

  await setPromptText();
  const attached = await attachImage();
  postStatusBanner(
    attached
      ? autoSend
        ? "Ảnh đã chuyển sang Gemini"
        : "Ảnh đã tải lên, kiểm tra rồi gửi nhé."
      : "Gemini không nhận được ảnh, thử lại."
  );
  if (attached && autoSend) {
    await clickSendButton();
  }

  async function clickSendButton() {
    const sendButton =
      (await waitForElement('button[aria-label="Send message"]')) ||
      (await waitForElement('button[data-testid="send-button"]')) ||
      (await waitForElement('button[type="submit"]'));

    if (!sendButton) {
      return;
    }
    sendButton.removeAttribute("disabled");
    sendButton.click();
  }

  function postStatusBanner(text) {
    const host =
      document.querySelector('main[role="main"]') ||
      document.querySelector("main") ||
      document.body;

    if (!host) {
      return;
    }

    const existing = document.getElementById("slide-snapshot-banner");
    if (existing) {
      existing.remove();
    }

    const banner = document.createElement("div");
    banner.id = "slide-snapshot-banner";
    banner.textContent = text;
    banner.style.cssText =
      "margin:12px auto;padding:10px 16px;border-radius:10px;background:#e0ecff;color:#0f172a;font-family:inherit;font-size:0.9rem;max-width:360px;text-align:center;";

    host.prepend(banner);
    setTimeout(() => banner.remove(), 5000);
  }
}