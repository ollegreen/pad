import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const REMOTE_CONFIG_URL =
  "https://raw.githubusercontent.com/ollegreen/pad/main/src-tauri/tauri.conf.json";

let toastEl: HTMLDivElement | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(
  message: string,
  options?: { autoDismiss?: number; action?: string; onAction?: () => void }
) {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }

  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "update-toast";
    document.body.appendChild(toastEl);
  }

  toastEl.innerHTML = `<span class="toast-message">${message}</span>`;

  if (options?.action && options.onAction) {
    const btn = document.createElement("button");
    btn.className = "toast-action";
    btn.textContent = options.action;
    btn.addEventListener("click", options.onAction);
    toastEl.appendChild(btn);
  }

  const close = document.createElement("button");
  close.className = "toast-dismiss";
  close.textContent = "\u00d7";
  close.addEventListener("click", dismissToast);
  toastEl.appendChild(close);

  // Trigger reflow then show
  toastEl.classList.remove("visible");
  void toastEl.offsetWidth;
  toastEl.classList.add("visible");

  if (options?.autoDismiss) {
    dismissTimer = setTimeout(dismissToast, options.autoDismiss);
  }
}

function dismissToast() {
  if (!toastEl) return;
  toastEl.classList.remove("visible");
  setTimeout(() => {
    toastEl?.remove();
    toastEl = null;
  }, 200);
}

async function checkForUpdates() {
  showToast("Checking for updates...");

  try {
    const [currentVersion, resp] = await Promise.all([
      getVersion(),
      fetch(REMOTE_CONFIG_URL),
    ]);

    if (!resp.ok) throw new Error("fetch failed");
    const remoteConfig = await resp.json();
    const remoteVersion: string = remoteConfig.version;

    if (currentVersion === remoteVersion) {
      showToast(`Up to date (v${currentVersion})`, { autoDismiss: 3000 });
    } else {
      showToast(`Update available: v${currentVersion} → v${remoteVersion}`, {
        action: "Update Now",
        onAction: performUpdate,
      });
    }
  } catch {
    showToast("Couldn't check for updates", { autoDismiss: 3000 });
  }
}

async function performUpdate() {
  showToast("Updating... this may take a few minutes");

  try {
    await invoke("run_update");
    showToast("Update complete! Restart Pad to apply.", { autoDismiss: 8000 });
  } catch {
    showToast("Update failed. Try again later.", { autoDismiss: 5000 });
  }
}

export function initUpdater() {
  listen("menu-check-updates", () => checkForUpdates());
}
