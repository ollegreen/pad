import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdown, markdownKeymap } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { bracketMatching } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { GFM } from "@lezer/markdown";
import { padTheme, padHighlighting } from "./theme";
import { markdownDecorations } from "./decorations";
import { markDirty, initCloseHandler } from "./fileio";
import {
  shortcutCompartment,
  buildKeymap,
  applyFontSize,
  isCentered,
  scheduleCenterUpdate,
  toggleCenter,
} from "./shortcuts";
import { openSettingsModal, applyAccentColor, applyFont } from "./settings";
import { initPadSystem, scheduleSave, isSuppressingDirty, deletePad, undoDeletePad } from "./pads";
import {
  readOnlyCompartment,
  togglePresentationMode,
  isPresentationMode,
} from "./presentation";
import { initImagePaste } from "./images";
import { initUpdater } from "./updater";

const state = EditorState.create({
  doc: "",
  extensions: [
    padTheme,
    padHighlighting,
    markdownDecorations,
    markdown({ extensions: [GFM], codeLanguages: languages }),
    EditorView.lineWrapping,
    history(),
    bracketMatching(),
    highlightSelectionMatches(),
    // Read-only state (toggled by presentation mode)
    readOnlyCompartment.of(EditorState.readOnly.of(false)),
    // Customizable shortcuts (hot-swappable via compartment)
    shortcutCompartment.of(buildKeymap()),
    // Settings shortcut (Cmd+,)
    keymap.of([
      {
        key: "Mod-,",
        run: (view) => {
          openSettingsModal(view);
          return true;
        },
      },
    ]),
    // Default keymaps
    keymap.of([...markdownKeymap, indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    // Dirty tracking + auto-save
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !isSuppressingDirty()) {
        markDirty();
        scheduleSave();
      }
      if ((isCentered() || isPresentationMode()) && (update.docChanged || update.geometryChanged)) {
        scheduleCenterUpdate(update.view);
      }
    }),
  ],
});

const view = new EditorView({
  state,
  parent: document.getElementById("editor")!,
});

applyFontSize(view);
applyAccentColor();
applyFont();
if (isCentered()) {
  document.documentElement.classList.add("centered-mode");
}
initCloseHandler();
initImagePaste(view);
initPadSystem(view).catch(console.error);
initUpdater();

// Keep centered/presentation mode padding in sync with window resizes
new ResizeObserver(() => {
  if (isCentered() || isPresentationMode()) scheduleCenterUpdate(view);
}).observe(view.scrollDOM);

// Prevent webview defaults and handle global shortcuts
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "p") {
    e.preventDefault();
    togglePresentationMode(view);
  }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
    e.preventDefault();
    undoDeletePad();
  } else if ((e.metaKey || e.ctrlKey) && e.key === "d") {
    e.preventDefault();
    deletePad();
  }
  if (e.altKey && e.code === "KeyC") {
    e.preventDefault();
    toggleCenter(view);
  }
}, true);
