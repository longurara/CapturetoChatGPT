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
    button.appendChild(createCameraLogo());
    button.title = "Chụp hình nhanh slide";
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
    return button;
  }

  function createCameraLogo() {
    const template = document.createElement("template");
    template.innerHTML = getChatGPTLogoSvg().trim();
    const svg = template.content.firstElementChild;
    if (svg) {
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      return svg;
    }
    return createFallbackIcon();
  }

  function createFallbackIcon() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = getCameraSvg();
    return wrapper.firstElementChild;
  }

  function getChatGPTLogoSvg() {
    return `
    <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z"
        fill="#fff"
      />
    </svg>
  `;
  }

  function getCameraSvg() {
    return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4.5 7.5 6h-2A2.5 2.5 0 0 0 3 8.5v7A2.5 2.5 0 0 0 5.5 18h13a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 18.5 6h-2L15 4.5H9Zm3 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 1.8a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z"></path>
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
      keyDownHandler: null,
    };

    window.__slideSnapshotStartCapture = (source = "action") =>
      startCaptureFlow(state, source);

    if (settings.showCameraButton) {
      state.cameraButton = createCameraButton(() =>
        startCaptureFlow(state, "button")
      );
    }

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
            showToast("Đã chụp và copy ảnh.", 4000);
            state.capturing = false;
          })
          .catch(() => {
            showToast("Không thao tác được ảnh, thử lại nhé.", 4000);
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
        requestCapture(autoBounds);
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

  function requestCapture(bounds) {
    chrome.runtime.sendMessage({
      type: "capture-selection",
      bounds,
      devicePixelRatio: window.devicePixelRatio || 1,
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
    requestCapture(bounds);
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
    await sendImageToChatGPT(state, dataUrl);
  }

  async function sendImageToChatGPT(state, dataUrl, source = "capture") {
    try {
      await chrome.runtime.sendMessage({
        type: "send-to-chatgpt",
        imageDataUrl: dataUrl,
        promptText: state.settings.promptText,
        options: { autoSend: state.settings.autoSend, source },
      });
    } catch (error) {
      console.warn("Slide Snapshot: unable to push to ChatGPT.", error);
      showToast("Không gửi được sang ChatGPT, thử dán tay nhé.", 4000);
    }
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
        if (rect.width < 200 || rect.height < 200 || !overlapsViewport(rect)) {
          return;
        }

        seenHosts.add(host);
        candidates.push({ rect });
      });
    });

    if (!candidates.length) {
      document
        .querySelectorAll(
          "canvas, img, div[role='presentation'], svg, svg image"
        )
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
    const height = clamp(rect.bottom - padding - y, 1, window.innerHeight - y);

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
