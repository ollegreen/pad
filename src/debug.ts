/// <reference types="vite/client" />
// Dev-only file logger: tail /tmp/pad-debug.log to watch app internals.
// No-ops entirely in production builds.
import { writeTextFile } from "@tauri-apps/plugin-fs";

export const IS_DEV = import.meta.env.DEV;

const LOG = "/tmp/pad-debug.log";
let buf: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function dbg(msg: string): void {
  if (!import.meta.env.DEV) return;
  buf.push(`${new Date().toISOString().slice(11, 23)} ${msg}`);
  if (!timer) timer = setTimeout(flush, 200);
}

function flush(): void {
  timer = null;
  const chunk = buf.join("\n") + "\n";
  buf = [];
  writeTextFile(LOG, chunk, { append: true }).catch(() => {});
}

if (import.meta.env.DEV) {
  window.addEventListener("error", (e) =>
    dbg(`WINDOW-ERROR ${e.message} @ ${e.filename}:${e.lineno}`)
  );
  window.addEventListener("unhandledrejection", (e) =>
    dbg(`UNHANDLED-REJECTION ${String(e.reason)}`)
  );
  dbg("=== app boot ===");
}
