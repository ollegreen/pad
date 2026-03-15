import { check } from "@tauri-apps/plugin-updater";
import { listen } from "@tauri-apps/api/event";

export function initUpdater() {
  listen("menu-check-for-updates", async () => {
    try {
      const update = await check();
      if (update) {
        const yes = confirm(
          `A new version (${update.version}) is available. Download and install?`
        );
        if (yes) {
          await update.downloadAndInstall();
          const { relaunch } = await import("@tauri-apps/plugin-process");
          await relaunch();
        }
      } else {
        alert("You're on the latest version.");
      }
    } catch (e) {
      alert(`Update check failed: ${e}`);
    }
  });
}
