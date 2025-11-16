const defaultSettings = {
  autoCrop: true,
  autoSend: true,
  showCameraButton: true,
  promptText:
    "Hay giai thich bang tieng Viet noi dung trong buc anh bai giang nay. Neu can, huong dan tung buoc thuc hien.",
  targetService: "chatgpt"
};

document.addEventListener("DOMContentLoaded", async () => {
  const formControls = {
    autoCrop: document.getElementById("autoCrop"),
    autoSend: document.getElementById("autoSend"),
    showCameraButton: document.getElementById("showCameraButton"),
    promptText: document.getElementById("promptText"),
    targetService: document.getElementById("targetService")
  };
  const modeButtons = Array.from(
    document.querySelectorAll("[data-mode-option]")
  );

  const resetBtn = document.getElementById("reset");
  const statusEl = document.getElementById("status");

  const settings = await loadSettings();
  applySettingsToForm(formControls, settings);
  syncModeSwitcher(modeButtons, formControls.targetService?.value);
  bindModeSwitcher(modeButtons, formControls.targetService);

  Object.entries(formControls).forEach(([key, input]) => {
    if (!input) {
      return;
    }
    input.addEventListener("change", () => {
      persistSettings(readFormValues(formControls))
        .then(() => showStatus("Da luu cai dat", statusEl))
        .catch(() => showStatus("Khong luu duoc, thu lai", statusEl));
    });
  });
  formControls.targetService?.addEventListener("change", () => {
    syncModeSwitcher(modeButtons, formControls.targetService.value);
  });

  resetBtn.addEventListener("click", async () => {
    await persistSettings(defaultSettings);
    applySettingsToForm(formControls, defaultSettings);
    syncModeSwitcher(modeButtons, defaultSettings.targetService);
    showStatus("Da khoi phuc mac dinh", statusEl);
  });
});

function applySettingsToForm(controls, settings) {
  controls.autoCrop.checked = settings.autoCrop;
  controls.autoSend.checked = settings.autoSend;
  controls.showCameraButton.checked = settings.showCameraButton;
  controls.promptText.value = settings.promptText;
  if (controls.targetService) {
    controls.targetService.value =
      settings.targetService || defaultSettings.targetService;
  }
}

function readFormValues(controls) {
  return {
    autoCrop: controls.autoCrop.checked,
    autoSend: controls.autoSend.checked,
    showCameraButton: controls.showCameraButton.checked,
    promptText: controls.promptText.value.trim() || defaultSettings.promptText,
    targetService:
      controls.targetService?.value || defaultSettings.targetService
  };
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(defaultSettings, (settings) => resolve(settings));
  });
}

function persistSettings(settings) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function showStatus(message, element) {
  element.textContent = message;
  setTimeout(() => (element.textContent = ""), 2500);
}

function bindModeSwitcher(buttons, selectEl) {
  if (!buttons.length || !selectEl) {
    return;
  }
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.modeOption;
      if (!mode) {
        return;
      }
      if (selectEl.value !== mode) {
        selectEl.value = mode;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      syncModeSwitcher(buttons, mode);
    });
  });
}

function syncModeSwitcher(buttons, activeMode) {
  if (!buttons.length || !activeMode) {
    return;
  }
  buttons.forEach((btn) => {
    const isActive = btn.dataset.modeOption === activeMode;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}
