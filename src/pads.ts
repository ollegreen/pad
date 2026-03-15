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
  mkdir,
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
  // pad_1 — Welcome
  `### Welcome to Pad

A minimal markdown editor. Let's get you started.

Press **Option + →** to continue.
`,
  // pad_2 — Writing basics
  `### Writing

Just type — it's markdown.

**Bold**, *italic*, ~~strikethrough~~, # headings, > quotes.

Your work auto-saves. Click formatted text to see the raw markdown.

\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`

**Option + →** to continue.
`,
  // pad_3 — Keyboard overview
  `### Keyboard shortcuts

**Option + ←/→** — navigate between pads
**Cmd + N** — new pad
**Cmd + T** — insert todo
**Cmd + B / I** — bold / italic
**Option + C** — centered mode
**Cmd + P** — presentation mode
**Cmd + ,** — settings

Let's walk through each of these. **Option + →** to continue.
`,
  // pad_4 — Pads & navigation
  `### Pads

Each pad is a separate markdown file.

**Cmd + N** — create a new pad
**Option + ←/→** — move between pads

They auto-save to your pad folder. **Option + →** to continue.
`,
  // pad_5 — Todos
  `### Todos

- [ ] Click this checkbox
- [x] This one is done
- [ ] Great for tracking tasks

**Cmd + T** inserts a new todo.

**Option + →** to continue.
`,
  // pad_6 — Images
  `### Images

Paste images directly from your clipboard.

They save as files in your pad folder.

## This is Lars enjoying some ostbågar.

![](lars_image.jpg)

**Option + →** to continue.
`,
  // pad_7 — Centered mode
  `### Centered mode

**Option + C** toggles centered mode.

Centers text, images, the lot. Try it now.

Press **Option + C** again to toggle back.

**Option + →** to continue.
`,
  // pad_8 — Presentation mode
  `### Presentation mode

**Cmd + P** turns your pads into slides.

Arrow keys navigate. **Cmd + P** again to exit.

**Option + →** to continue.
`,
  // pad_9 — You're all set
  `### Make it yours

**Cmd + ,** opens settings — change colors, fonts, and rebind any shortcut.

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
      <p>Name your pad folder to get started.</p>
      <input type="text" id="welcome-folder-name" placeholder="pads" spellcheck="false" />
      <button id="welcome-create-folder">Choose Location</button>
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

  const input = document.getElementById("welcome-folder-name") as HTMLInputElement;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") pickLocationAndCreate(overlay, false);
  });

  document.getElementById("welcome-create-folder")!.addEventListener("click", () => {
    pickLocationAndCreate(overlay, false);
  });

  document.getElementById("welcome-onboarding")!.addEventListener("click", () => {
    const checkbox = document.getElementById("welcome-onboarding")!;
    checkbox.classList.add("checked");
    setTimeout(() => pickLocationAndCreate(overlay, true), 400);
  });

  input.focus();
}

async function pickLocationAndCreate(overlay: HTMLElement, withOnboarding: boolean): Promise<void> {
  const input = document.getElementById("welcome-folder-name") as HTMLInputElement;
  const name = input.value.trim() || "pads";

  const selected = await open({ directory: true });
  if (!selected) {
    // User cancelled the picker — reset onboarding checkbox if needed
    document.getElementById("welcome-onboarding")?.classList.remove("checked");
    return;
  }

  const parentPath = typeof selected === "string" ? selected : selected;
  const path = `${parentPath}/${name}`;

  if (!(await exists(path))) {
    await mkdir(path);
  }

  folderPath = path;
  localStorage.setItem(FOLDER_KEY, path);

  if (withOnboarding) {
    try {
      const resp = await fetch("/lars_image.jpg");
      const buf = await resp.arrayBuffer();
      await writeFile(`${path}/lars_image.jpg`, new Uint8Array(buf));
    } catch {}

    for (let i = 0; i < ONBOARDING_PADS.length; i++) {
      await writeTextFile(`${path}/pad_${i + 1}.md`, ONBOARDING_PADS[i]);
    }
  } else {
    const firstPad = `${path}/pad_1.md`;
    if (!(await exists(firstPad))) {
      await writeTextFile(firstPad, ONBOARDING);
    }
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
  if (folderPath && editorView) {
    await saveCurrent();
    clearSaveTimer();
  }

  const overlay = document.createElement("div");
  overlay.id = "new-padset-overlay";
  overlay.innerHTML = `
    <div class="welcome-card">
      <h1>New Pad Set</h1>
      <p>Name your new pad folder.</p>
      <input type="text" id="new-padset-name" placeholder="pads" spellcheck="false" />
      <div class="new-padset-actions">
        <button id="new-padset-cancel" class="btn-secondary">Cancel</button>
        <button id="new-padset-create">Choose Location</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById("new-padset-name") as HTMLInputElement;

  const create = async () => {
    const name = input.value.trim() || "pads";
    const selected = await open({ directory: true });
    if (!selected) return;

    const parentPath = typeof selected === "string" ? selected : selected;
    const path = `${parentPath}/${name}`;

    if (!(await exists(path))) {
      await mkdir(path);
    }

    const firstPad = `${path}/pad_1.md`;
    if (!(await exists(firstPad))) {
      await writeTextFile(firstPad, ONBOARDING);
    }

    overlay.remove();
    await switchToFolder(path);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") create();
    if (e.key === "Escape") overlay.remove();
  });

  document.getElementById("new-padset-create")!.addEventListener("click", create);
  document.getElementById("new-padset-cancel")!.addEventListener("click", () => overlay.remove());

  input.focus();
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
