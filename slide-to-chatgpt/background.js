const defaultSettings = {
  autoCrop: true,
  autoSend: true,
  showCameraButton: true,
  promptText:
    "Hay giai thich bang tieng Viet noi dung trong buc anh bai giang nay. Neu can, huong dan tung buoc thuc hien.",
  targetService: "chatgpt",
};

const selectionResources = Object.freeze({
  css: ["selection.css"],
  scripts: ["selection.js"],
});

const autoInjectPatterns = [
  /https:\/\/docs\.google\.com\/presentation/i,
  /https:\/\/.*powerpoint\.office\.com/i,
  /https:\/\/www\.canva\.com\/design/i,
  /https:\/\/.*slides\.com\/.+\/edit/i,
  /https:\/\/.*prezi\.com/i,
  /https:\/\/.*gamma\.app\/docs/i,
  /https:\/\/drive\.google\.com\/file\/d\//i,
  /https:\/\/drive\.google\.com\/folders\/d\//i,
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
      source: "browser-action",
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
    case "open-options-page":
      if (typeof chrome.runtime.openOptionsPage === "function") {
        chrome.runtime.openOptionsPage();
      } else {
        chrome.tabs.create({
          url: chrome.runtime.getURL("options.html"),
        });
      }
      break;
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
      files: selectionResources.css,
    });

    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      files: selectionResources.scripts,
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

async function handleServiceSend(message, sendResponse = () => {}) {
  const service = (message?.service || "chatgpt").toLowerCase();
  const payload = {
    imageDataUrl: message?.imageDataUrl,
    promptText: message?.promptText,
    options: message?.options || {}
  };

  try {
    if (!payload.imageDataUrl) {
      throw new Error("Missing image data");
    }

    if (service === "gemini") {
      await sendImageToGemini(payload);
    } else {
      await sendImageToChatGPT(payload);
    }

    sendResponse({ ok: true, service });
  } catch (error) {
    console.error("Slide Snapshot: unable to deliver image.", error);
    sendResponse({
      ok: false,
      service,
      error: error?.message || "send-failed"
    });
  }
}

async function handleSelectionCapture(message, tab) {
  try {
    const imageUrl = await captureTabScreenshot(tab);

    await chrome.tabs.sendMessage(tab.id, {
      type: "selection-image",
      imageUrl,
      bounds: message.bounds,
      devicePixelRatio: message.devicePixelRatio,
    });
  } catch (error) {
    console.error("Slide Snapshot: failed to capture tab.", error);
    if (tab?.id) {
      await notifyCaptureFailed(tab.id, error);
    }
  }
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
  const matchUrls = [
    "https://gemini.google.com/*",
    "https://gemini.google.com/app*"
  ];
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

  await executeScriptWithRetry(tab.id, injectIntoChatGPT, [
    payload.imageDataUrl,
    payload.promptText,
    payload.options,
  ]);
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

  const results = await executeScriptWithRetry(tab.id, injectIntoGemini, [
    payload.imageDataUrl,
    payload.promptText,
    payload.options,
  ]);

  const injectionResult = Array.isArray(results) ? results[0]?.result : null;
  if (!injectionResult?.success) {
    throw new Error(injectionResult?.error || "Gemini injection failed");
  }
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

async function executeScriptWithRetry(tabId, func, args = [], attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await chrome.scripting.executeScript({
        target: { tabId },
        func,
        args,
      });
    } catch (error) {
      lastError = error;
      const shouldRetry = isTransientFrameError(error);
      if (!shouldRetry || attempt === attempts) {
        throw error;
      }
      await waitForTabReady(tabId);
      await delay(300 * attempt);
    }
  }

  throw lastError || new Error("script execution failed");
}

function isTransientFrameError(error) {
  if (!error?.message) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("frame with id") ||
    message.includes("no frame with id") ||
    message.includes("execution context was destroyed") ||
    message.includes("document was detached")
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    message: error?.message || "",
  };

  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch (sendError) {
    console.warn(
      "Slide Snapshot: unable to notify capture failure.",
      sendError
    );
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
    const selectors = Array.isArray(selector) ? selector : [selector];
    return new Promise((resolve) => {
      let tries = 0;
      const lookup = () => {
        const candidate = findVisibleElement(selectors);
        if (candidate || tries >= attempts) {
          resolve(candidate);
          return;
        }
        tries += 1;
        setTimeout(lookup, delayMs);
      };
      lookup();
    });
  }

  async function ensureChatGPTComposer() {
    return waitForElement([
      "textarea[data-id='prompt-textarea']",
      "textarea[aria-label='Send a message.']",
      "textarea"
    ]);
  }

  async function attachImage() {
    try {
      const file = await createImageFile(imageDataUrl);

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
      (await waitForElement([
        "textarea[data-id='prompt-textarea']",
        "textarea[aria-label='Send a message.']",
        "textarea"
      ]));

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
        ? "Đã chuyển sang chatGPT"
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

  function waitForElement(selector, attempts = 18, delayMs = 350) {
    return new Promise((resolve) => {
      let tries = 0;
      const lookup = () => {
        const element = queryDeep(selector);
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

  async function ensureComposer() {
    return (
      (await waitForElement(".ql-editor.textarea")) ||
      (await waitForElement("[contenteditable='true'][role='textbox']")) ||
      (await waitForElement("[contenteditable='true']")) ||
      (await waitForElement("textarea"))
    );
  }

  async function createImageFile(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], `slide-${Date.now()}.png`, {
      type: blob.type || "image/png",
    });
  }

  function createDataTransfer(file) {
    if (typeof DataTransfer === "undefined") {
      return null;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    try {
      dt.effectAllowed = "copy";
      dt.dropEffect = "copy";
    } catch (error) {
      // ignore
    }
    return dt;
  }

  function pasteFileIntoComposer(target, file) {
    if (typeof ClipboardEvent !== "function") {
      return false;
    }
    const dt = createDataTransfer(file);
    if (!dt) {
      return false;
    }
    target.focus();
    const event = new ClipboardEvent("paste", {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    });
    return target.dispatchEvent(event);
  }

  function findVisibleElement(selectors) {
    for (const sel of selectors) {
      const matches = document.querySelectorAll(sel);
      for (const element of matches) {
        if (isVisible(element)) {
          return element;
        }
      }
    }
    return null;
  }

  function isVisible(element) {
    if (!element) {
      return false;
    }
    if (element.offsetParent !== null) {
      return true;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  async function waitForFileInput() {
    const primary = await waitForElement(
      "input[type='file'][accept*='image' i]"
    );
    if (primary) {
      return primary;
    }
    return waitForElement("input[type='file']");
  }

  async function ensureFileInput() {
    let input = await waitForFileInput();
    if (input) {
      return input;
    }

    const triggerSelectors = [
      "button[aria-label*='upload' i]",
      "button[aria-label*='image' i]",
      "button[aria-label*='file' i]",
      "button[aria-label*='tai' i]",
      "button[aria-label*='hinh' i]",
      "[aria-label*='image' i] button",
      "button[data-test-id='hidden-local-image-upload-button']",
      "[xapfileselectortrigger]"
    ];

    for (const selector of triggerSelectors) {
      const trigger = queryDeep(selector);
      if (trigger) {
        trigger.click();
        input = await waitForFileInput();
        if (input) {
          return input;
        }
      }
    }
    return null;
  }

  async function createImageFile() {
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const mime =
      blob.type && blob.type !== "application/octet-stream"
        ? blob.type
        : "image/png";
    return new File([blob], `slide-${Date.now()}.png`, { type: mime });
  }

  function createDataTransfer(file) {
    if (typeof DataTransfer === "undefined") {
      return null;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    try {
      dt.effectAllowed = "copy";
      dt.dropEffect = "copy";
    } catch (error) {
      // ignore
    }
    return dt;
  }

  function assignFilesToInput(input, file) {
    const dt = createDataTransfer(file);
    if (!dt) {
      return false;
    }
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function pasteFileIntoComposer(target, file) {
    if (typeof ClipboardEvent !== "function") {
      return false;
    }
    const dt = createDataTransfer(file);
    if (!dt) {
      return false;
    }
    target.focus();
    const event = new ClipboardEvent("paste", {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    return true;
  }

  function dispatchDrop(target, file) {
    if (typeof DragEvent !== "function") {
      return false;
    }
    const dt = createDataTransfer(file);
    if (!dt) {
      return false;
    }
    const rect = typeof target.getBoundingClientRect === "function"
      ? target.getBoundingClientRect()
      : { left: 0, top: 0, width: 0, height: 0 };
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const eventInit = {
      dataTransfer: dt,
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    };
    target.dispatchEvent(new DragEvent("dragenter", eventInit));
    target.dispatchEvent(new DragEvent("dragover", eventInit));
    target.dispatchEvent(new DragEvent("drop", eventInit));
    return true;
  }

  async function attachImage(composer) {
    try {
      const file = await createImageFile();
      if (composer && pasteFileIntoComposer(composer, file)) {
        return true;
      }
      const input = await ensureFileInput();
      if (input && assignFilesToInput(input, file)) {
        return true;
      }
      let dropTarget =
        composer ||
        (await waitForElement("[xapfileselectordropzone]")) ||
        (await waitForElement("[aria-label*='drop' i]")) ||
        (await waitForElement("[data-drop-target='true']")) ||
        queryDeep("[role='textbox']");
      if (!dropTarget) {
        dropTarget = queryDeep("main") || document.body;
      }
      if (dropTarget && dispatchDrop(dropTarget, file)) {
        return true;
      }
      return false;
    } catch (error) {
      console.warn("Slide Snapshot: unable to attach file in Gemini.", error);
      return false;
    }
  }

  async function setPromptText(composer) {
    const textarea = composer || (await ensureComposer());
    if (!textarea) {
      return false;
    }

    if ("value" in textarea) {
      textarea.value = prompt;
    } else {
      textarea.textContent = prompt;
    }
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    textarea.focus();
    return true;
  }

  async function clickSendButton() {
    const sendButton =
      (await waitForElement("button[aria-label='Send message']")) ||
      (await waitForElement("button[aria-label='Send']")) ||
      (await waitForElement("button[aria-label*='send' i]")) ||
      (await waitForElement("button[aria-label*='gui' i]")) ||
      (await waitForElement("button[data-testid='send-button']")) ||
      (await waitForElement("button[type='submit']"));

    if (!sendButton) {
      return;
    }

    sendButton.removeAttribute("disabled");
    sendButton.click();
  }

  function postStatusBanner(text) {
    const host =
      queryDeep('[aria-live="polite"]') || queryDeep("main") || document.body;

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

  try {
    const composer = await ensureComposer();
    const attached = await attachImage(composer);
    await setPromptText(composer);
    postStatusBanner(
      attached
        ? autoSend
          ? "Da chuyen sang Google Gemini"
          : "Anh da tai len Gemini, kiem tra roi bam Gui nhe."
        : "Khong dinh kem duoc anh vao Gemini, thu tai tay nhe."
    );

    if (attached && autoSend) {
      await clickSendButton();
    }

    return { success: attached };
  } catch (error) {
    console.warn("Slide Snapshot: Gemini automation failed.", error);
    postStatusBanner(
      "Khong the chuyen anh sang Google Gemini, thu lai nhe."
    );
    return { success: false, error: error?.message || "inject-error" };
  }
}

  function queryDeep(selector) {
    if (!selector) {
      return null;
    }
    const direct = document.querySelector(selector);
    if (direct) {
      return direct;
    }
    const elements = document.querySelectorAll("*");
    for (const element of elements) {
      if (!element.shadowRoot) {
        continue;
      }
      const match = queryWithinShadow(element.shadowRoot, selector);
      if (match) {
        return match;
      }
    }
    return null;
  }

  function queryWithinShadow(root, selector) {
    if (!root) {
      return null;
    }
    const direct = root.querySelector(selector);
    if (direct) {
      return direct;
    }
    const descendants = root.querySelectorAll("*");
    for (const node of descendants) {
      if (!node.shadowRoot) {
        continue;
      }
      const match = queryWithinShadow(node.shadowRoot, selector);
      if (match) {
        return match;
      }
    }
    return null;
  }

