import { EditorView, keymap } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { openFile, saveFile, saveFileAs } from "./fileio";
import { newPad, nextPad, prevPad } from "./pads";

const STORAGE_KEY = "markdownpad-shortcuts";
const FONT_SIZE_KEY = "markdownpad-font-size";

export type ShortcutAction = {
  id: string;
  label: string;
  defaultKey: string;
  run: (view: EditorView) => boolean;
};

// Current font size (persisted to localStorage)
let fontSize = parseInt(localStorage.getItem(FONT_SIZE_KEY) || "14", 10);

function setFontSize(view: EditorView, size: number) {
  fontSize = Math.max(6, size);
  localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  const content = view.dom.querySelector(".cm-content") as HTMLElement;
  if (content) content.style.setProperty("font-size", `${fontSize}px`, "important");
}

function wrapSelection(view: EditorView, before: string, after: string): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  // If already wrapped, unwrap
  if (
    from >= before.length &&
    view.state.sliceDoc(from - before.length, from) === before &&
    view.state.sliceDoc(to, to + after.length) === after
  ) {
    view.dispatch({
      changes: [
        { from: from - before.length, to: from, insert: "" },
        { from: to, to: to + after.length, insert: "" },
      ],
    });
    return true;
  }

  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: to + before.length },
  });
  return true;
}

function insertAtLineStart(view: EditorView, prefix: string): boolean {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: prefix },
    selection: { anchor: line.from + prefix.length },
  });
  return true;
}

export const defaultShortcuts: ShortcutAction[] = [
  {
    id: "toggleBold",
    label: "Bold",
    defaultKey: "Mod-b",
    run: (view) => wrapSelection(view, "**", "**"),
  },
  {
    id: "toggleItalic",
    label: "Italic",
    defaultKey: "Mod-i",
    run: (view) => wrapSelection(view, "*", "*"),
  },
  {
    id: "insertTodo",
    label: "Insert Todo",
    defaultKey: "Mod-t",
    run: (view) => insertAtLineStart(view, "- [ ] "),
  },
  {
    id: "increaseFontSize",
    label: "Increase Font Size",
    defaultKey: "Mod-=",
    run: (view) => {
      setFontSize(view, fontSize + 3);
      return true;
    },
  },
  {
    id: "decreaseFontSize",
    label: "Decrease Font Size",
    defaultKey: "Mod--",
    run: (view) => {
      setFontSize(view, fontSize - 3);
      return true;
    },
  },
  {
    id: "openFile",
    label: "Open File",
    defaultKey: "Mod-o",
    run: (view) => {
      openFile(view);
      return true;
    },
  },
  {
    id: "saveFile",
    label: "Save",
    defaultKey: "Mod-s",
    run: (view) => {
      saveFile(view);
      return true;
    },
  },
  {
    id: "saveFileAs",
    label: "Save As",
    defaultKey: "Mod-Shift-s",
    run: (view) => {
      saveFileAs(view);
      return true;
    },
  },
  {
    id: "newPad",
    label: "New Pad",
    defaultKey: "Mod-n",
    run: () => {
      newPad();
      return true;
    },
  },
  {
    id: "nextPad",
    label: "Next Pad",
    defaultKey: "Alt-ArrowRight",
    run: () => {
      nextPad();
      return true;
    },
  },
  {
    id: "prevPad",
    label: "Previous Pad",
    defaultKey: "Alt-ArrowLeft",
    run: () => {
      prevPad();
      return true;
    },
  },
];

// --- Centered mode (Alt-c) ---
const CENTERED_KEY = "pad-centered";
let centered = localStorage.getItem(CENTERED_KEY) === "1";
let centerRAF = 0;

export function isCentered(): boolean {
  return centered;
}

export function updateCenterPadding(view: EditorView) {
  const content = view.contentDOM;
  if (!centered) {
    content.style.paddingTop = "";
    content.style.paddingBottom = "";
    return;
  }
  const first = content.firstElementChild as HTMLElement | null;
  const last = content.lastElementChild as HTMLElement | null;
  if (!first || !last) return;
  // Distance between first and last line is stable regardless of padding
  const textH = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
  const viewportH = view.scrollDOM.clientHeight;
  const pad = `${Math.max(0, Math.round((viewportH - textH) / 2))}px`;
  // Only update if changed to avoid infinite geometry loop
  if (content.style.paddingTop !== pad) {
    content.style.paddingTop = pad;
    content.style.paddingBottom = pad;
  }
}

export function scheduleCenterUpdate(view: EditorView) {
  cancelAnimationFrame(centerRAF);
  centerRAF = requestAnimationFrame(() => updateCenterPadding(view));
}

export function toggleCenter(view: EditorView) {
  centered = !centered;
  localStorage.setItem(CENTERED_KEY, centered ? "1" : "");
  view.dom.classList.toggle("centered-mode", centered);
  updateCenterPadding(view);
}

// Extra bindings injected by other modules (e.g. presentation mode)
let extraKeyBindings: { key: string; run: (view: EditorView) => boolean }[] = [];

export function setExtraBindings(bindings: typeof extraKeyBindings) {
  extraKeyBindings = bindings;
}

// Compartment for hot-swappable keymap
export const shortcutCompartment = new Compartment();

export function loadBindings(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveBinding(id: string, key: string) {
  const bindings = loadBindings();
  bindings[id] = key;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function resetBinding(id: string) {
  const bindings = loadBindings();
  delete bindings[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function getKeyForAction(id: string): string {
  const bindings = loadBindings();
  const action = defaultShortcuts.find((s) => s.id === id);
  return bindings[id] || action?.defaultKey || "";
}

export function buildKeymap() {
  const bindings = loadBindings();
  return keymap.of([
    ...defaultShortcuts.map((action) => ({
      key: bindings[action.id] || action.defaultKey,
      run: action.run,
    })),
    ...extraKeyBindings,
  ]);
}

export function reconfigureShortcuts(view: EditorView) {
  view.dispatch({
    effects: shortcutCompartment.reconfigure(buildKeymap()),
  });
}

// Apply saved font size on startup
export function applyFontSize(view: EditorView) {
  const saved = parseInt(localStorage.getItem(FONT_SIZE_KEY) || "14", 10);
  if (saved !== 14) {
    setFontSize(view, saved);
  }
}
