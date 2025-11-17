(function () {
  if (window.__slideSnapshotBundleLoaded) {
    return;
  }
  window.__slideSnapshotBundleLoaded = true;

  const defaultSettings = {
    autoCrop: true,
    autoSend: true,
    showCameraButton: true,
    promptText:
      "Hay giai thich bang tieng Viet noi dung trong buc anh bai giang nay. Neu can, huong dan tung buoc thuc hien.",
    targetService: "chatgpt",
  };

  (async function bootstrap() {
    if (window.__slideSnapshotInitialized) {
      return;
    }

    window.__slideSnapshotInitialized = true;

    const settings = await loadSettings();
    initSlideSnapshot(settings);
  })();

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(defaultSettings, (result) => resolve(result));
    });
  }

  function createCameraButton(onClick) {
    const existing = document.getElementById("stc-camera-button");
    if (existing) {
      existing.remove();
    }

    const button = document.createElement("button");
    button.type = "button";
    button.id = "stc-camera-button";
    button.innerHTML = getCameraSvg();
    button.title = "Ch?p nhanh slide v� g?i sang d?ch v? AI ?? ch?n";
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
    return button;
  }

  function getCameraSvg() {
    return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4.5 7.5 6h-2A2.5 2.5 0 0 0 3 8.5v7A2.5 2.5 0 0 0 5.5 18h13a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 18.5 6h-2L15 4.5H9Zm3 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 1.8a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z"></path>
    </svg>
  `;
  }

  function createSettingsButton() {
    const existing = document.getElementById("stc-settings-button");
    if (existing) {
      existing.remove();
    }

    const button = document.createElement("button");
    button.type = "button";
    button.id = "stc-settings-button";
    button.innerHTML = getSettingsSvg();
    button.title = "Mo cai dat Slide Snapshot";
    button.addEventListener("click", () => {
      if (
        chrome.runtime &&
        typeof chrome.runtime.openOptionsPage === "function"
      ) {
        chrome.runtime.openOptionsPage();
      } else {
        runtimeSendMessage({ type: "open-options-page" }).catch((error) => {
          console.warn("Slide Snapshot: cannot open options.", error);
          showToast("Tien ich dang tai tu?i l?i, tai lai trang nhe.", 3000);
        });
      }
    });
    document.body.appendChild(button);
    return button;
  }

  function getSettingsSvg() {
    return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.4A3.6 3.6 0 1 1 8.4 12 3.61 3.61 0 0 1 12 8.4m6.69 2.27-.73-.12a5.66 5.66 0 0 0-.52-1.23l.44-.59a.93.93 0 0 0-.09-1.21l-.86-.86a.93.93 0 0 0-1.21-.09l-.6.44a5.73 5.73 0 0 0-1.23-.52l-.12-.73A.94.94 0 0 0 12.82 5h-1.64a.94.94 0 0 0-.92.78l-.12.73a5.66 5.66 0 0 0-1.23.52l-.59-.44a.93.93 0 0 0-1.21.09l-.86.86a.93.93 0 0 0-.09 1.21l.44.6a5.73 5.73 0 0 0-.52 1.23l-.73.12a.94.94 0 0 0-.78.92v1.64a.94.94 0 0 0 .78.92l.73.12a5.66 5.66 0 0 0 .52 1.23l-.44.59a.93.93 0 0 0 .09 1.21l.86.86a.93.93 0 0 0 1.21.09l.6-.44a5.73 5.73 0 0 0 1.23.52l.12.73a.94.94 0 0 0 .92.78h1.64a.94.94 0 0 0 .92-.78l.12-.73a5.66 5.66 0 0 0 1.23-.52l.59.44a.93.93 0 0 0 1.21-.09l.86-.86a.93.93 0 0 0 .09-1.21l-.44-.6a5.73 5.73 0 0 0 .52-1.23l.73-.12a.94.94 0 0 0 .78-.92v-1.64a.94.94 0 0 0-.78-.92Z"></path>
    </svg>
  `;
  }

  function initSlideSnapshot(settings) {
    const state = {
      settings,
      startX: 0,
      startY: 0,
      selectionBox: null,
      overlay: null,
      toastTimer: null,
      capturing: false,
      cameraButton: null,
      settingsButton: null,
      keyDownHandler: null,
    };

    window.__slideSnapshotStartCapture = (source = "action") =>
      startCaptureFlow(state, source);

    if (settings.showCameraButton) {
      state.cameraButton = createCameraButton(() =>
        startCaptureFlow(state, "button")
      );
    }
    state.settingsButton = createSettingsButton();
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !state.settings) {
        return;
      }
      Object.entries(changes).forEach(([key, change]) => {
        if (
          !Object.prototype.hasOwnProperty.call(state.settings, key) ||
          typeof change?.newValue === "undefined"
        ) {
          return;
        }
        state.settings[key] = change.newValue;
      });
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (!message?.type) {
        return;
      }

      if (message.type === "capture-failed") {
        state.capturing = false;
        showToast(
          getCaptureFailedMessage(message.reason, message.message),
          3500
        );
        return;
      }

      if (message.type === "selection-image") {
        copySelectionToClipboard(state, message)
          .then(() => {
            const label = getServiceLabel(state.settings.targetService);
            const suffix = state.settings.autoSend
              ? ""
              : " (chờ bạn bấm Gửi nhé)";
            showToast(
              `Đã sao chép ảnh & chuyển sang ${label}${suffix}.`,
              4000
            );
            state.capturing = false;
          })
          .catch((error) => {
            const service = error?.service || state.settings.targetService;
            const label = getServiceLabel(service);
            if (error?.code === "context") {
              showToast(
                "Tien ich vua duoc cap nhat, tai lai trang roi thu lai nhe.",
                4000
              );
            } else if (error?.code === "service") {
              showToast(
                `Khong gui duoc sang ${label}, thu mo tab ${label} va dan tay nhe.`,
                4000
              );
            } else {
              showToast("Khong thao tac duoc anh, thu lai nhe.", 4000);
            }
            state.capturing = false;
          });
        return;
      }

      if (message.type === "start-capture") {
        startCaptureFlow(state, message.source || "action");
      }
    });
  }
  function startCaptureFlow(state, source) {
    if (state.capturing) {
      showToast("Đang xử lý ảnh trước đó, đợi xíu nhé.", 2500);
      return;
    }
    state.capturing = true;
    cleanupOverlay(state);

    if (state.settings.autoCrop) {
      const autoBounds = detectSlideBounds();
      if (autoBounds) {
        showToast("Đang tự căn khung slide và chụp...", 0);
        requestCapture(state, autoBounds);
        return;
      }
    }

    showToast(
      state.settings.autoCrop
        ? "Tự tìm khung không được, kéo chuột chọn vùng nhé."
        : "Kéo chuột để chọn vùng muốn hỏi nhé.",
      4000
    );
    createOverlay(state);
  }

  function requestCapture(state, bounds) {
    runtimeSendMessage({
      type: "capture-selection",
      bounds,
      devicePixelRatio: window.devicePixelRatio || 1,
    }).catch((error) => {
      console.warn("Slide Snapshot: cannot request capture.", error);
      showToast("Tien ich dang tai tu?i l?i, tai lai trang nhe.", 3000);
      state.capturing = false;
    });
  }

  function createOverlay(state) {
    if (state.overlay) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "stc-overlay";
    overlay.addEventListener("mousedown", (event) =>
      startSelection(state, event)
    );
    document.body.appendChild(overlay);
    state.keyDownHandler = (event) => onKeyDown(state, event);
    document.addEventListener("keydown", state.keyDownHandler);
    state.overlay = overlay;
  }

  function startSelection(state, event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.selectionBox = document.createElement("div");
    state.selectionBox.id = "stc-selection-box";
    document.body.appendChild(state.selectionBox);

    const moveHandler = (e) => onPointerMove(state, e);
    const upHandler = (e) => onPointerUp(state, e, moveHandler, upHandler);
    document.addEventListener("mousemove", moveHandler);
    document.addEventListener("mouseup", upHandler);
  }

  function onPointerMove(state, event) {
    if (!state.selectionBox) {
      return;
    }

    const currentX = event.clientX;
    const currentY = event.clientY;
    const left = Math.min(state.startX, currentX);
    const top = Math.min(state.startY, currentY);
    const width = Math.abs(currentX - state.startX);
    const height = Math.abs(currentY - state.startY);

    Object.assign(state.selectionBox.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  function onPointerUp(state, event, moveHandler, upHandler) {
    if (event.button !== 0) {
      return;
    }

    document.removeEventListener("mousemove", moveHandler);
    document.removeEventListener("mouseup", upHandler);

    if (!state.selectionBox) {
      return;
    }

    const endX = event.clientX;
    const endY = event.clientY;
    const bounds = {
      x: Math.min(state.startX, endX),
      y: Math.min(state.startY, endY),
      width: Math.abs(endX - state.startX),
      height: Math.abs(endY - state.startY),
    };

    if (bounds.width < 5 || bounds.height < 5) {
      showToast("Vùng chọn quá nhỏ, thử lại nhé.", 2500);
      cleanupOverlay(state);
      state.capturing = false;
      return;
    }

    cleanupOverlay(state);
    showToast("Đang chụp & xử lý ảnh...", 0);
    requestCapture(state, bounds);
  }

  function onKeyDown(state, event) {
    if (event.key === "Escape") {
      cleanupOverlay(state);
      state.capturing = false;
      showToast("Đã hủy thao tác chụp.", 2000);
    }
  }

  function cleanupOverlay(state) {
    state.overlay?.remove();
    state.overlay = null;
    state.selectionBox?.remove();
    state.selectionBox = null;
    if (state.keyDownHandler) {
      document.removeEventListener("keydown", state.keyDownHandler);
      state.keyDownHandler = null;
    }
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async function copySelectionToClipboard(state, message) {
    const { imageUrl, bounds, devicePixelRatio } = message;
    const ratio = devicePixelRatio || window.devicePixelRatio || 1;

    const image = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      Math.round(bounds.x * ratio),
      Math.round(bounds.y * ratio),
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Empty blob"));
        }
      }, "image/png");
    });

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    } catch (error) {
      console.warn("Slide Snapshot: clipboard write failed.", error);
    }

    const dataUrl = canvas.toDataURL("image/png");
    await sendImageToTarget(state, dataUrl);
  }

  async function sendImageToTarget(state, dataUrl, source = "capture") {
    const targetService =
      (state.settings.targetService || "chatgpt").toLowerCase();
    let response;
    try {
      response = await withTimeout(
        runtimeSendMessage({
          type: "send-to-service",
          service: targetService,
          imageDataUrl: dataUrl,
          promptText: state.settings.promptText,
          options: { autoSend: state.settings.autoSend, source },
        }),
        15000,
        targetService
      );
    } catch (error) {
      console.warn("Slide Snapshot: unable to reach background.", error);
      const serviceError = new Error(error?.message || "send-message");
      serviceError.code = "service";
      serviceError.service = targetService;
      throw serviceError;
    }

    if (!response?.ok) {
      const serviceError = new Error(response?.error || "send-failed");
      serviceError.code = "service";
      serviceError.service = response?.service || targetService;
      throw serviceError;
    }

    return response;
  }

function showToast(message, durationMs = 3000) {
  const existing = document.getElementById("stc-toast");
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.id = "stc-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  if (showToast.timer) {
    clearTimeout(showToast.timer);
  }

  if (durationMs > 0) {
    showToast.timer = window.setTimeout(() => toast.remove(), durationMs);
  }
}

function getServiceLabel(service) {
  if ((service || "").toLowerCase() === "gemini") {
    return "Google Gemini";
  }
  return "ChatGPT";
}

function withTimeout(promise, ms, service) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      const error = new Error("service-timeout");
      error.code = "service";
      error.service = service;
      settled = true;
      reject(error);
    }, ms);

    promise
      .then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

function runtimeSendMessage(payload) {
  if (!chrome.runtime || !chrome.runtime.id) {
    return Promise.reject(createContextError());
  }
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          if (isContextError(error)) {
            reject(createContextError(error));
          } else {
            reject(error);
          }
          return;
        }
        resolve(response);
      });
    } catch (error) {
      if (isContextError(error)) {
        reject(createContextError(error));
      } else {
        reject(error);
      }
    }
  });
}

function isContextError(error) {
  return (
    error?.message?.includes("Extension context invalidated") ||
    error?.message?.includes("context invalidated")
  );
}

function createContextError(originalError) {
  const error = new Error(
    originalError?.message || "extension-context-invalidated"
  );
  error.code = "context";
  return error;
}

function getCaptureFailedMessage(reason, rawMessage) {
  if (reason === "permission") {
    return "Chrome chưa cho phép chụp tab này, hãy bấm vào icon tiện ích rồi thử lại nhé.";
  }
  if (reason === "inactive") {
    return "Hãy chuyển sang tab trình chiếu rồi gọi lệnh chụp lại nhé.";
  }
  if (reason === "busy" || reason === "rate") {
    return "Chrome đang bận xử lý lần chụp trước, đợi 1-2 giây rồi thử lại nhé.";
  }
  if (rawMessage) {
    return `Không thể chụp màn hình (${rawMessage}), thử lại nhé.`;
  }
  return "Không thể chụp màn hình, thử lại nhé.";
}

function detectSlideBounds() {
  const selectors = [
    ".punch-viewer-content .punch-viewer-frame",
    ".punch-viewer-content .punch-viewer-canvas-holder",
    ".punch-viewer-content .punch-viewer-container",
    ".punch-viewer-frame canvas",
    "div[aria-label='Slide']",
    "div[aria-label='Trang chiếu']",
    "div[aria-label='Trang chieu']",
    "canvas[aria-label='Slide']",
    "canvas[aria-label='Trang chiếu']",
    "canvas[aria-label='Trang chieu']",
    "[data-testid='deck-canvas'] canvas",
    "[data-test='slide'] canvas",
    "div[data-officejs='true'] canvas",
    "div[data-testid='presenter-present-slide']",
    "section[data-testid='present-canvas']",
    "svg.punch-viewer-svg-page",
    "svg.punch-viewer-svg-page image",
    "svg image[xlink\\:href^='blob:']",
    "svg image[xlink\\:href*='docs.google.com']",
    "svg image[href^='blob:']",
    "svg image[href*='docs.google.com']",
    "svg image[preserveAspectRatio]",
    "svg image",
    "canvas.webgl-content",
    "div[data-canvas='true']",
    "img.a-b-ta-Ua",
    "div[jscontroller='ox8G5'] img",
  ];

  const candidates = [];
  const seenHosts = new WeakSet();

  selectors.forEach((selector) => {
    let elements;
    try {
      elements = document.querySelectorAll(selector);
    } catch (error) {
      return;
    }

    elements.forEach((element) => {
      const host = getCandidateHost(element);
      if (!host || seenHosts.has(host) || !isVisible(host)) {
        return;
      }

      const rect = host.getBoundingClientRect();
      if (
        rect.width < 200 ||
        rect.height < 200 ||
        !overlapsViewport(rect)
      ) {
        return;
      }

      seenHosts.add(host);
      candidates.push({ rect });
    });
  });

  if (!candidates.length) {
    document
      .querySelectorAll("canvas, img, div[role='presentation'], svg, svg image")
      .forEach((element) => {
        const host = getCandidateHost(element);
        if (!host || seenHosts.has(host) || !isVisible(host)) {
          return;
        }

        const rect = host.getBoundingClientRect();
        if (rect.width > 200 && rect.height > 200 && overlapsViewport(rect)) {
          seenHosts.add(host);
          candidates.push({ rect });
        }
      });
  }

  if (!candidates.length) {
    return null;
  }

  const scored = candidates
    .map(({ rect }) => ({
      rect,
      score: computeScore(rect),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) {
    return null;
  }

  const padding = 8;
  return normalizeBounds(best.rect, padding);
}

function computeScore(rect) {
  const area = rect.width * rect.height;
  const ratio = rect.width / rect.height;
  const ratios = [16 / 9, 4 / 3, 3 / 2];
  const ratioBoost =
    1 / (1 + Math.min(...ratios.map((target) => Math.abs(ratio - target))));

  const horizontalCenterBoost =
    1 /
    (1 + Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2) / 250);

  const verticalCenterBoost =
    1 /
    (1 + Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2) / 250);

  return area * ratioBoost * horizontalCenterBoost * verticalCenterBoost;
}

function normalizeBounds(rect, padding = 0) {
  const x = clamp(rect.left + padding, 0, window.innerWidth);
  const y = clamp(rect.top + padding, 0, window.innerHeight);
  const width = clamp(rect.right - padding - x, 1, window.innerWidth - x);
  const height = clamp(
    rect.bottom - padding - y,
    1,
    window.innerHeight - y
  );

  return { x, y, width, height };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.display === "none") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function overlapsViewport(rect, minOverlap = 120) {
  const horizontalOverlap = Math.max(
    0,
    Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
  );
  const verticalOverlap = Math.max(
    0,
    Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
  );
  return horizontalOverlap > minOverlap && verticalOverlap > minOverlap;
}

function getCandidateHost(element) {
  if (!element) {
    return null;
  }
  const tagName = element.tagName ? element.tagName.toLowerCase() : "";
  if (tagName === "image" && element.ownerSVGElement) {
    return element.ownerSVGElement;
  }
  return element;
}
})();
