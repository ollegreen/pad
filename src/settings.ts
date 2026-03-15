import { EditorView } from "@codemirror/view";
import {
  defaultShortcuts,
  getKeyForAction,
  saveBinding,
  resetBinding,
  reconfigureShortcuts,
} from "./shortcuts";

const ACCENT_KEY = "pad-accent-color";
const ACCENT_OPTIONS: { label: string; value: string }[] = [
  { label: "Neon Green", value: "#39e75f" },
  { label: "Neon Orange", value: "#e8912d" },
  { label: "White", value: "#ffffff" },
];

const FONT_KEY = "pad-font";
const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "SF Mono", value: "'SF Mono', Menlo, Monaco, 'Courier New', monospace" },
  { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
];

export function getAccentColor(): string {
  return localStorage.getItem(ACCENT_KEY) || "#39e75f";
}

export function getFont(): string {
  return localStorage.getItem(FONT_KEY) || FONT_OPTIONS[0].value;
}

export function applyAccentColor() {
  document.documentElement.style.setProperty("--pad-accent", getAccentColor());
}

export function applyFont() {
  const font = getFont();
  document.documentElement.style.setProperty("--pad-font", font);
  // Force override on all CM6 content elements
  document.querySelectorAll(".cm-content, .cm-editor, .cm-line").forEach((el) => {
    (el as HTMLElement).style.setProperty("font-family", font, "important");
  });
}

let overlay: HTMLElement | null = null;

function keyEventToString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("Mod");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");

  const key = e.key;
  if (["Meta", "Control", "Shift", "Alt"].includes(key)) return "";

  const keyMap: Record<string, string> = {
    "=": "=", "-": "-",
    ArrowUp: "ArrowUp", ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight",
    Enter: "Enter", Escape: "Escape",
    Backspace: "Backspace", Delete: "Delete", Tab: "Tab",
  };

  const normalized = keyMap[key] || (key.length === 1 ? key.toLowerCase() : key);
  parts.push(normalized);
  return parts.join("-");
}

function formatKeyForDisplay(key: string): string {
  return key
    .replace("Mod", "\u2318")
    .replace("Shift", "\u21E7")
    .replace("Alt", "\u2325")
    .replace(/-/g, " ");
}

function render(view: EditorView) {
  if (overlay) { overlay.remove(); overlay = null; }

  overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    background: #252525; border-radius: 10px;
    width: 500px; max-height: 70vh; overflow-y: auto;
    padding: 24px; color: #d4d4d4;
    font-family: 'SF Mono', Menlo, Monaco, monospace;
    font-size: 13px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  `;

  // --- Accent color section ---
  const accentTitle = document.createElement("div");
  accentTitle.textContent = "Checkbox Accent";
  accentTitle.style.cssText = `
    font-size: 16px; font-weight: bold; margin-bottom: 14px;
    padding-bottom: 12px; border-bottom: 1px solid #3a3a3a;
  `;
  card.appendChild(accentTitle);

  const accentRow = document.createElement("div");
  accentRow.style.cssText = "display: flex; gap: 10px; margin-bottom: 20px;";

  const current = getAccentColor();
  for (const opt of ACCENT_OPTIONS) {
    const swatch = document.createElement("div");
    const isSelected = current === opt.value;
    swatch.style.cssText = `
      width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
      background: ${opt.value};
      border: 2px solid ${isSelected ? "#ffffff" : "#3a3a3a"};
      transition: border-color 0.15s;
    `;
    swatch.title = opt.label;
    swatch.addEventListener("click", () => {
      localStorage.setItem(ACCENT_KEY, opt.value);
      applyAccentColor();
      // Update all swatch borders
      accentRow.querySelectorAll("div").forEach((s, i) => {
        (s as HTMLElement).style.borderColor = ACCENT_OPTIONS[i].value === opt.value ? "#ffffff" : "#3a3a3a";
      });
    });
    accentRow.appendChild(swatch);
  }
  card.appendChild(accentRow);

  // --- Font section ---
  const fontTitle = document.createElement("div");
  fontTitle.textContent = "Font";
  fontTitle.style.cssText = `
    font-size: 16px; font-weight: bold; margin-bottom: 14px;
    padding-bottom: 12px; border-bottom: 1px solid #3a3a3a;
  `;
  card.appendChild(fontTitle);

  const fontRow = document.createElement("div");
  fontRow.style.cssText = "display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px;";

  const currentFont = getFont();
  for (const opt of FONT_OPTIONS) {
    const btn = document.createElement("div");
    const isSelected = currentFont === opt.value;
    btn.textContent = opt.label;
    btn.style.cssText = `
      padding: 8px 12px; border-radius: 6px; cursor: pointer;
      font-family: ${opt.value}; font-size: 13px;
      background: ${isSelected ? "#3a3a3a" : "#1e1e1e"};
      border: 1px solid ${isSelected ? "#666" : "#2a2a2a"};
      color: #d4d4d4; transition: background 0.15s, border-color 0.15s;
    `;
    btn.addEventListener("click", () => {
      localStorage.setItem(FONT_KEY, opt.value);
      applyFont();
      fontRow.querySelectorAll("div").forEach((b, i) => {
        const sel = FONT_OPTIONS[i].value === opt.value;
        (b as HTMLElement).style.background = sel ? "#3a3a3a" : "#1e1e1e";
        (b as HTMLElement).style.borderColor = sel ? "#666" : "#2a2a2a";
      });
    });
    fontRow.appendChild(btn);
  }
  card.appendChild(fontRow);

  // --- Shortcuts section ---
  const title = document.createElement("div");
  title.textContent = "Keyboard Shortcuts";
  title.style.cssText = `
    font-size: 16px; font-weight: bold; margin-bottom: 14px;
    padding-bottom: 12px; border-bottom: 1px solid #3a3a3a;
  `;
  card.appendChild(title);

  for (const action of defaultShortcuts) {
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid #2a2a2a;
    `;

    const label = document.createElement("span");
    label.textContent = action.label;
    label.style.color = "#d4d4d4";

    const right = document.createElement("div");
    right.style.cssText = "display: flex; align-items: center; gap: 8px;";

    const keyDisplay = document.createElement("span");
    const currentKey = getKeyForAction(action.id);
    keyDisplay.textContent = formatKeyForDisplay(currentKey);
    keyDisplay.style.cssText = `
      background: #1a1a1a; padding: 4px 10px; border-radius: 4px;
      border: 1px solid #3a3a3a; cursor: pointer; min-width: 80px;
      text-align: center; transition: border-color 0.15s;
    `;

    let recording = false;
    const startRecording = () => {
      if (recording) return;
      recording = true;
      keyDisplay.textContent = "Press keys...";
      keyDisplay.style.borderColor = "#e8912d";

      const handler = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "Escape") {
          recording = false;
          keyDisplay.textContent = formatKeyForDisplay(getKeyForAction(action.id));
          keyDisplay.style.borderColor = "#3a3a3a";
          document.removeEventListener("keydown", handler, true);
          return;
        }
        const keyStr = keyEventToString(e);
        if (!keyStr) return;
        saveBinding(action.id, keyStr);
        reconfigureShortcuts(view);
        keyDisplay.textContent = formatKeyForDisplay(keyStr);
        keyDisplay.style.borderColor = "#3a3a3a";
        recording = false;
        document.removeEventListener("keydown", handler, true);
      };
      document.addEventListener("keydown", handler, true);
    };
    keyDisplay.addEventListener("click", startRecording);

    const resetBtn = document.createElement("span");
    resetBtn.textContent = "\u21BA";
    resetBtn.title = "Reset to default";
    resetBtn.style.cssText = `cursor: pointer; color: #666; font-size: 16px; padding: 2px; transition: color 0.15s;`;
    resetBtn.addEventListener("mouseenter", () => (resetBtn.style.color = "#d4d4d4"));
    resetBtn.addEventListener("mouseleave", () => (resetBtn.style.color = "#666"));
    resetBtn.addEventListener("click", () => {
      resetBinding(action.id);
      reconfigureShortcuts(view);
      keyDisplay.textContent = formatKeyForDisplay(action.defaultKey);
    });

    right.appendChild(keyDisplay);
    right.appendChild(resetBtn);
    row.appendChild(label);
    row.appendChild(right);
    card.appendChild(row);
  }

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  const closeHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && overlay) { close(); document.removeEventListener("keydown", closeHandler); }
  };
  document.addEventListener("keydown", closeHandler);

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function close() {
  if (overlay) { overlay.remove(); overlay = null; }
}

export function openSettingsModal(view: EditorView) {
  render(view);
}

export function isSettingsOpen(): boolean {
  return overlay !== null;
}
