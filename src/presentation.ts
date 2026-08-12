import { EditorView } from "@codemirror/view";
import { Compartment, EditorState } from "@codemirror/state";
import {
  shortcutCompartment,
  buildKeymap,
  setExtraBindings,
  updateCenterPadding,
} from "./shortcuts";
import { nextPad, prevPad, refreshPadTitle } from "./pads";
import { enableLaser, disableLaser } from "./laser";

let presentationMode = false;

export const readOnlyCompartment = new Compartment();

export function isPresentationMode(): boolean {
  return presentationMode;
}

export function modePrefix(): string {
  return presentationMode ? "P" : "E";
}

export function togglePresentationMode(view: EditorView): void {
  presentationMode = !presentationMode;

  if (presentationMode) {
    setExtraBindings([
      { key: "ArrowRight", run: () => { nextPad(); return true; } },
      { key: "ArrowLeft", run: () => { prevPad(); return true; } },
    ]);
  } else {
    setExtraBindings([]);
  }

  view.dispatch({
    effects: [
      readOnlyCompartment.reconfigure(EditorState.readOnly.of(presentationMode)),
      shortcutCompartment.reconfigure(buildKeymap()),
    ],
  });

  if (presentationMode) {
    enableLaser();
  } else {
    disableLaser();
  }

  view.dom.classList.toggle("presentation-mode", presentationMode);
  updateCenterPadding(view);
  refreshPadTitle();

  if (!presentationMode) {
    view.focus();
  }
}
