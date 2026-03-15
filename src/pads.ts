import { EditorView } from "@codemirror/view";
import { isCentered, updateCenterPadding } from "./shortcuts";
import { open } from "@tauri-apps/plugin-dialog";
import {
  readTextFile,
  writeTextFile,
  writeFile,
  readDir,
  rename,
  remove,
  exists,
} from "@tauri-apps/plugin-fs";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { modePrefix } from "./presentation";

const FOLDER_KEY = "pad-folder";
const PAD_KEY = "pad-current-pad";
const PAD_REGEX = /^pad_(\d+)\.md$/;

const ONBOARDING = `### Welcome
Press Cmd + N for a new pad.
`;

let folderPath: string | null = null;
let currentPadNum = 1;
let totalPads = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let editorView: EditorView | null = null;
let padOpLock = false;
let suppressDirty = false;

export function isSuppressingDirty(): boolean {
  return suppressDirty;
}

export function getFolderPath(): string | null {
  return folderPath;
}

function padPath(n: number): string {
  return `${folderPath}/pad_${n}.md`;
}

function updatePadTitle() {
  getCurrentWebviewWindow().setTitle(`${modePrefix()} · pad_${currentPadNum} — Pad`);
}

export function refreshPadTitle() {
  updatePadTitle();
}

async function withLock(fn: () => Promise<void>): Promise<void> {
  if (padOpLock) return;
  padOpLock = true;
  try {
    await fn();
  } finally {
    padOpLock = false;
  }
}

async function scanPads(): Promise<void> {
  if (!folderPath) return;
  const entries = await readDir(folderPath);
  let count = 0;
  for (const entry of entries) {
    if (entry.name && PAD_REGEX.test(entry.name)) {
      count++;
    }
  }
  totalPads = count;
}

async function loadPad(n: number): Promise<void> {
  if (!editorView || !folderPath) return;

  const path = padPath(n);
  if (!(await exists(path))) {
    if (n !== 1) {
      await loadPad(1);
      return;
    }
    return;
  }

  const content = await readTextFile(path);

  suppressDirty = true;
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: content },
  });
  suppressDirty = false;
  if (isCentered()) updateCenterPadding(editorView);

  currentPadNum = n;
  localStorage.setItem(PAD_KEY, String(n));
  updatePadTitle();
}

export async function saveCurrent(): Promise<void> {
  if (!folderPath || !editorView) return;
  const content = editorView.state.doc.toString();
  await writeTextFile(padPath(currentPadNum), content);
}

export function scheduleSave(): void {
  if (!folderPath) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCurrent(), 1500);
}

function clearSaveTimer(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

// --- Onboarding Pad Content ---

const ONBOARDING_PADS: string[] = [
  // pad_1 — Welcome & first navigation
  `### Welcome to Pad

This quick tour will show you everything you need to know.

Navigate to the next slide with **Alt + →**

Go ahead, try it now.
`,
  // pad_2 — Creating new pads
  `### Creating a new pad

Press **Cmd + N** to create a new pad.

It gets inserted right after the one you're on.

Don't try it now though — press **Alt + →** to continue.
`,
  // pad_3 — Navigation
  `### Navigating between pads

You already know this one:

**Alt + →** — next pad
**Alt + ←** — previous pad

Your pads auto-save as you type. No need to hit save.
`,
  // pad_4 — Markdown formatting
  `### Writing with markdown

# This is a heading
## This is a smaller heading

**Bold text** with double asterisks
*Italic text* with single asterisks
~~Strikethrough~~ with double tildes

> Blockquotes start with >

Click on any formatted text to see the raw markdown.
`,
  // pad_5 — Checklists & todos
  `### Checklists & todos

- [ ] Click this checkbox
- [x] This one is already done
- [ ] Great for tracking tasks

Press **Cmd + T** to quickly insert a todo.

Tip: you can click the checkboxes directly.
`,
  // pad_6 — Centered mode
  `### Centered mode

Press **Alt + C** to toggle centered mode.

Everything gets centered — text, images, the lot.

Perfect for focused writing or presenting ideas.

Try it now, then press **Alt + C** again to toggle back.
`,
  // pad_7 — Images & Lars
  `### Images

You can paste images directly from your clipboard.

They auto-save as screenshots in your pad folder.

Here's Lars:

![](lars_image.jpg)

Hi Lars.
`,
  // pad_8 — Presentation mode
  `### Presentation mode

Press **Cmd + P** to enter presentation mode.

Your pads become slides. Arrow keys navigate between them.

Press **Cmd + P** again to exit.

Great for walkthroughs just like this one.
`,
  // pad_9 — Settings & customization
  `### Make it yours

Press **Cmd + ,** to open settings.

You can change:

- Accent colors for checkboxes
- Fonts
- Every keyboard shortcut
`,
  // pad_10 — You're all set
  `### You're all set

Here's everything at a glance:

**Cmd + N** — new pad
**Alt + ←/→** — navigate pads
**Alt + C** — centered mode
**Cmd + P** — presentation mode
**Cmd + ,** — settings
**Cmd + B** — bold
**Cmd + I** — italic
**Cmd + T** — insert todo

Press **Cmd + N** to create your first pad. Happy writing.
`,
];

// --- Welcome Screen ---

function showWelcome(): void {
  const editorEl = document.getElementById("editor")!;
  editorEl.style.display = "none";

  const overlay = document.createElement("div");
  overlay.id = "welcome-overlay";
  overlay.innerHTML = `
    <div class="welcome-card">
      <h1>Welcome to Pad</h1>
      <p>Create or select a folder for your pads to get started.</p>
      <button id="welcome-choose-folder">Choose Folder</button>
      <div class="welcome-divider"></div>
      <p class="welcome-hint">First time?</p>
      <label class="welcome-checkbox" id="welcome-onboarding">
        <span class="welcome-check-box"></span>
        Enable onboarding
      </label>
    </div>
    <p class="welcome-footer">By: <a href="https://github.com/ollegreen/pad" target="_blank">Olle Green</a></p>
  `;
  document.body.appendChild(overlay);

  document.getElementById("welcome-choose-folder")!.addEventListener("click", () => {
    selectFolder(overlay);
  });

  document.getElementById("welcome-onboarding")!.addEventListener("click", () => {
    startOnboarding(overlay);
  });
}

async function selectFolder(overlay: HTMLElement): Promise<void> {
  const selected = await open({ directory: true });
  if (!selected) return;

  const path = typeof selected === "string" ? selected : selected;
  folderPath = path;
  localStorage.setItem(FOLDER_KEY, path);

  // Create pad_1.md with onboarding if it doesn't exist
  const firstPad = `${path}/pad_1.md`;
  if (!(await exists(firstPad))) {
    await writeTextFile(firstPad, ONBOARDING);
  }

  await scanPads();

  // Remove welcome, show editor
  overlay.remove();
  document.getElementById("editor")!.style.display = "";

  await loadPad(1);
  editorView?.focus();
}

async function startOnboarding(overlay: HTMLElement): Promise<void> {
  const checkbox = document.getElementById("welcome-onboarding")!;
  checkbox.classList.add("checked");

  await new Promise((r) => setTimeout(r, 400));

  const selected = await open({ directory: true });
  if (!selected) {
    checkbox.classList.remove("checked");
    return;
  }

  const path = typeof selected === "string" ? selected : selected;
  folderPath = path;
  localStorage.setItem(FOLDER_KEY, path);

  // Copy lars_image.jpg into the folder
  try {
    const resp = await fetch("/lars_image.jpg");
    const buf = await resp.arrayBuffer();
    await writeFile(`${path}/lars_image.jpg`, new Uint8Array(buf));
  } catch {
    // Non-critical — the image pad will just show a broken image
  }

  // Generate onboarding pads
  for (let i = 0; i < ONBOARDING_PADS.length; i++) {
    await writeTextFile(`${path}/pad_${i + 1}.md`, ONBOARDING_PADS[i]);
  }

  await scanPads();

  overlay.remove();
  document.getElementById("editor")!.style.display = "";

  await loadPad(1);
  editorView?.focus();
}

// --- Pad Operations ---

export async function newPad(): Promise<void> {
  await withLock(async () => {
    await saveCurrent();
    clearSaveTimer();

    const insertAt = currentPadNum + 1;
    await scanPads();

    // Rename from highest down to insertAt to avoid overwrites
    for (let i = totalPads; i >= insertAt; i--) {
      await rename(padPath(i), padPath(i + 1));
    }

    // Create the new empty pad
    await writeTextFile(padPath(insertAt), "");
    totalPads += 1;

    await loadPad(insertAt);
  });
}

export async function deletePad(): Promise<void> {
  await withLock(async () => {
    if (totalPads <= 1) return; // don't delete the last pad
    clearSaveTimer();

    await remove(padPath(currentPadNum));

    // Shift pads after the deleted one down
    for (let i = currentPadNum + 1; i <= totalPads; i++) {
      await rename(padPath(i), padPath(i - 1));
    }
    totalPads -= 1;

    const target = currentPadNum > totalPads ? totalPads : currentPadNum;
    await loadPad(target);
  });
}

export async function nextPad(): Promise<void> {
  await withLock(async () => {
    if (currentPadNum >= totalPads) return;
    await saveCurrent();
    clearSaveTimer();
    await loadPad(currentPadNum + 1);
  });
}

export async function prevPad(): Promise<void> {
  await withLock(async () => {
    if (currentPadNum <= 1) return;
    await saveCurrent();
    clearSaveTimer();
    await loadPad(currentPadNum - 1);
  });
}

// --- Pad Set Operations ---

async function switchToFolder(path: string): Promise<void> {
  if (folderPath && editorView) {
    await saveCurrent();
    clearSaveTimer();
  }

  folderPath = path;
  localStorage.setItem(FOLDER_KEY, path);
  await scanPads();

  if (totalPads === 0) {
    await writeTextFile(`${path}/pad_1.md`, ONBOARDING);
    await scanPads();
  }

  await loadPad(1);
  editorView?.focus();
}

async function newPadSet(): Promise<void> {
  const selected = await open({ directory: true });
  if (!selected) return;
  const path = typeof selected === "string" ? selected : selected;

  // Create first pad in the new folder
  const firstPad = `${path}/pad_1.md`;
  if (!(await exists(firstPad))) {
    await writeTextFile(firstPad, ONBOARDING);
  }

  await switchToFolder(path);
}

async function openPadSet(): Promise<void> {
  const selected = await open({ directory: true });
  if (!selected) return;
  const path = typeof selected === "string" ? selected : selected;
  await switchToFolder(path);
}

async function addOnboardingPads(): Promise<void> {
  if (!folderPath || !editorView) return;
  await saveCurrent();
  clearSaveTimer();
  await scanPads();

  // Copy lars image
  try {
    const resp = await fetch("/lars_image.jpg");
    const buf = await resp.arrayBuffer();
    await writeFile(`${folderPath}/lars_image.jpg`, new Uint8Array(buf));
  } catch {}

  // Append onboarding pads after existing ones
  for (let i = 0; i < ONBOARDING_PADS.length; i++) {
    await writeTextFile(`${folderPath}/pad_${totalPads + i + 1}.md`, ONBOARDING_PADS[i]);
  }

  await scanPads();
  await loadPad(totalPads - ONBOARDING_PADS.length + 1);
}

// --- Init ---

export async function initPadSystem(view: EditorView): Promise<void> {
  editorView = view;

  listen("menu-new-pad-set", () => newPadSet());
  listen("menu-open-pad-set", () => openPadSet());
  listen("menu-add-onboarding", () => addOnboardingPads());
  listen("menu-pain-mode", () => {
    document.documentElement.classList.toggle("pain-mode");
    const on = document.documentElement.classList.contains("pain-mode");
    localStorage.setItem("pad-pain-mode", on ? "1" : "");
  });

  if (localStorage.getItem("pad-pain-mode")) {
    document.documentElement.classList.add("pain-mode");
  }

  const saved = localStorage.getItem(FOLDER_KEY);
  if (saved && (await exists(saved))) {
    folderPath = saved;
    await scanPads();

    if (totalPads === 0) {
      // Folder exists but no pads — create initial pad
      await writeTextFile(`${saved}/pad_1.md`, ONBOARDING);
      await scanPads();
    }

    const savedPad = parseInt(localStorage.getItem(PAD_KEY) || "1", 10);
    const target = savedPad > 0 && savedPad <= totalPads ? savedPad : 1;
    await loadPad(target);
  } else {
    showWelcome();
  }
}
