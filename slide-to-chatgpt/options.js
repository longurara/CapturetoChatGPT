const defaultSettings = {
  autoCrop: true,
  autoSend: true,
  showCameraButton: true,
  promptText:
    "Hay giai thich bang tieng Viet noi dung trong buc anh bai giang nay. Neu can, huong dan tung buoc thuc hien."
};

document.addEventListener("DOMContentLoaded", async () => {
  const formControls = {
    autoCrop: document.getElementById("autoCrop"),
    autoSend: document.getElementById("autoSend"),
    showCameraButton: document.getElementById("showCameraButton"),
    promptText: document.getElementById("promptText")
  };

  const resetBtn = document.getElementById("reset");
  const statusEl = document.getElementById("status");

  const settings = await loadSettings();
  applySettingsToForm(formControls, settings);

  Object.entries(formControls).forEach(([key, input]) => {
    input.addEventListener("change", () => {
      persistSettings(readFormValues(formControls))
        .then(() => showStatus("Đã lưu cài đặt", statusEl))
        .catch(() => showStatus("Không lưu được, thử lại", statusEl));
    });
  });

  resetBtn.addEventListener("click", async () => {
    await persistSettings(defaultSettings);
    applySettingsToForm(formControls, defaultSettings);
    showStatus("Đã khôi phục mặc định", statusEl);
  });
});

function applySettingsToForm(controls, settings) {
  controls.autoCrop.checked = settings.autoCrop;
  controls.autoSend.checked = settings.autoSend;
  controls.showCameraButton.checked = settings.showCameraButton;
  controls.promptText.value = settings.promptText;
}

function readFormValues(controls) {
  return {
    autoCrop: controls.autoCrop.checked,
    autoSend: controls.autoSend.checked,
    showCameraButton: controls.showCameraButton.checked,
    promptText: controls.promptText.value.trim() || defaultSettings.promptText
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
