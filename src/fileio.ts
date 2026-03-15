import { EditorView } from "@codemirror/view";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getFolderPath, saveCurrent, isSuppressingDirty } from "./pads";
import { modePrefix } from "./presentation";

let currentFilePath: string | null = null;
let isDirty = false;
let suppressDirty = false;

function updateTitle() {
  if (getFolderPath()) return; // pad mode — title managed by pads.ts
  const name = currentFilePath
    ? currentFilePath.split("/").pop()
    : "Untitled";
  const dirty = isDirty ? "● " : "";
  getCurrentWebviewWindow().setTitle(`${modePrefix()} · ${dirty}${name} — Pad`);
}

export function markDirty() {
  if (suppressDirty || isSuppressingDirty()) return;
  if (!isDirty) {
    isDirty = true;
    updateTitle();
  }
}

export function markClean() {
  isDirty = false;
  updateTitle();
}

async function confirmDiscard(): Promise<boolean> {
  if (!isDirty) return true;
  return await ask("You have unsaved changes. Discard them?", {
    title: "Unsaved Changes",
    kind: "warning",
  });
}

export async function openFile(view: EditorView) {
  if (!(await confirmDiscard())) return;

  const selected = await open({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "txt", "markdown"] }],
  });

  if (!selected) return;

  const path = typeof selected === "string" ? selected : selected;
  const content = await readTextFile(path);

  suppressDirty = true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  });
  suppressDirty = false;

  currentFilePath = path;
  isDirty = false;
  updateTitle();
}

export async function saveFile(view: EditorView) {
  if (getFolderPath()) {
    await saveCurrent();
    return;
  }
  if (currentFilePath) {
    await writeTextFile(currentFilePath, view.state.doc.toString());
    isDirty = false;
    updateTitle();
  } else {
    await saveFileAs(view);
  }
}

export async function saveFileAs(view: EditorView) {
  const path = await save({
    filters: [{ name: "Markdown", extensions: ["md", "txt", "markdown"] }],
    defaultPath: currentFilePath || "untitled.md",
  });

  if (!path) return;

  await writeTextFile(path, view.state.doc.toString());
  currentFilePath = path;
  isDirty = false;
  updateTitle();
}

export function initCloseHandler() {
  const win = getCurrentWebviewWindow();
  win.onCloseRequested(async (event) => {
    event.preventDefault();
    if (getFolderPath()) {
      await saveCurrent();
    }
    await win.hide();
  });
}
