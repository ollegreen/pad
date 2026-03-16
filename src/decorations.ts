import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  EditorView,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { Range, StateEffect } from "@codemirror/state";
import { readFile } from "@tauri-apps/plugin-fs";
import { getFolderPath } from "./pads";
import { isPresentationMode } from "./presentation";

// --- Image cache: path → blob URL ---
const imageCache = new Map<string, string>();
const imageLoading = new Set<string>();
let decorationView: EditorView | null = null;
const imageLoadedEffect = StateEffect.define<null>();

function resolveImageSrc(path: string): string | null {
  if (imageCache.has(path)) return imageCache.get(path)!;
  if (imageLoading.has(path)) return null;

  imageLoading.add(path);
  readFile(path).then((data) => {
    const ext = path.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
    const blob = new Blob([data], { type: mime });
    imageCache.set(path, URL.createObjectURL(blob));
    imageLoading.delete(path);
    if (decorationView) {
      decorationView.dispatch({ effects: imageLoadedEffect.of(null) });
    }
  }).catch(() => {
    imageLoading.delete(path);
  });
  return null;
}

// --- Checkbox Widget ---

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  toDOM(view: EditorView) {
    const box = document.createElement("span");
    box.className = `cm-checkbox ${this.checked ? "cm-checkbox-checked" : ""}`;

    box.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const pos = view.posAtDOM(box);
      const line = view.state.doc.lineAt(pos);
      const bracketIdx = line.text.indexOf(this.checked ? "[x]" : "[ ]");
      if (bracketIdx === -1) return;
      const from = line.from + bracketIdx;
      view.dispatch({ changes: { from, to: from + 3, insert: this.checked ? "[ ]" : "[x]" } });
    });

    return box;
  }

  eq(other: CheckboxWidget) {
    return this.checked === other.checked;
  }

  ignoreEvent() {
    return false;
  }
}

// --- Link Widget ---

class LinkWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super();
  }

  toDOM() {
    const a = document.createElement("span");
    a.className = "cm-rendered-link";
    a.textContent = this.text;
    a.title = this.url;
    a.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(this.url, "_blank");
    });
    return a;
  }

  eq(other: LinkWidget) {
    return this.text === other.text && this.url === other.url;
  }

  ignoreEvent() {
    return false;
  }
}

// --- Horizontal Rule Widget ---

// --- Bullet Widget ---

class BulletWidget extends WidgetType {
  toDOM() {
    const dot = document.createElement("span");
    dot.className = "cm-bullet";
    return dot;
  }
  eq() { return true; }
}

class HRWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement("div");
    hr.className = "cm-rendered-hr";
    return hr;
  }
  eq() { return true; }
}

// --- Arrow Widget ---

class ArrowWidget extends WidgetType {
  constructor(readonly arrow: string) { super(); }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.arrow;
    return span;
  }
  eq(other: ArrowWidget) { return this.arrow === other.arrow; }
}

// --- Image Widget ---

class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) { super(); }

  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-rendered-image-wrapper";
    const img = document.createElement("img");
    img.src = this.src;
    img.alt = this.alt;
    img.className = "cm-rendered-image";
    wrapper.appendChild(img);
    return wrapper;
  }

  eq(other: ImageWidget) {
    return this.src === other.src && this.alt === other.alt;
  }
}

// --- Helpers ---

function cursorOn(view: EditorView, from: number, to: number): boolean {
  if (isPresentationMode()) return false;
  const { head } = view.state.selection.main;
  return head >= from && head <= to;
}

function buildDecorations(view: EditorView): DecorationSet {
  decorationView = view;
  const decs: Range<Decoration>[] = [];
  const docLen = view.state.doc.length;

  try {
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          // --- Headings: line class + hide # prefix ---
          if (/^ATXHeading[1-6]$/.test(node.name)) {
            const level = parseInt(node.name.slice(-1));
            const cls = level <= 3 ? `cm-h${level}` : "cm-h3";
            const lineFrom = view.state.doc.lineAt(node.from).from;
            decs.push(Decoration.line({ class: cls }).range(lineFrom));

            if (!cursorOn(view, node.from, node.to)) {
              // Hide "# " prefix using text scan (safer than getChildren)
              const text = view.state.sliceDoc(node.from, node.to);
              const match = text.match(/^#{1,6}\s/);
              if (match) {
                decs.push(
                  Decoration.replace({}).range(node.from, node.from + match[0].length)
                );
              }
            }
          }

          // --- Blockquote: line class + hide > ---
          else if (node.name === "Blockquote") {
            const startLine = view.state.doc.lineAt(node.from).number;
            const endLine = view.state.doc.lineAt(node.to).number;
            for (let i = startLine; i <= endLine; i++) {
              const line = view.state.doc.line(i);
              decs.push(Decoration.line({ class: "cm-blockquote-line" }).range(line.from));
            }
          }
          else if (node.name === "QuoteMark") {
            const line = view.state.doc.lineAt(node.from);
            if (!cursorOn(view, line.from, line.to)) {
              // Hide "> " but don't cross line boundary
              const end = Math.min(node.to + 1, line.to);
              decs.push(Decoration.replace({}).range(node.from, end));
            }
          }

          // --- Fenced code blocks: background on all lines ---
          else if (node.name === "FencedCode") {
            const startLine = view.state.doc.lineAt(node.from).number;
            const endLine = view.state.doc.lineAt(node.to).number;
            const editing = cursorOn(view, node.from, node.to);
            for (let i = startLine; i <= endLine; i++) {
              const line = view.state.doc.line(i);
              let cls = "cm-codeblock-line";
              if (i === startLine) cls += " cm-codeblock-first";
              if (i === endLine) cls += " cm-codeblock-last";
              decs.push(Decoration.line({ class: cls }).range(line.from));
            }
            if (!editing) {
              // Hide opening fence line content (but not the newline — CM6 forbids cross-line replace from plugins)
              const first = view.state.doc.line(startLine);
              if (first.text.length > 0) {
                decs.push(Decoration.replace({}).range(first.from, first.to));
              }
              // Hide closing fence line content
              const last = view.state.doc.line(endLine);
              if (last.text.length > 0) {
                decs.push(Decoration.replace({}).range(last.from, last.to));
              }
            }
          }

          // --- Bold: hide ** ---
          else if (node.name === "StrongEmphasis") {
            if (!cursorOn(view, node.from, node.to)) {
              const text = view.state.sliceDoc(node.from, node.to);
              const marker = text.startsWith("__") ? "__" : "**";
              const mLen = marker.length;
              if (text.startsWith(marker) && text.endsWith(marker) && text.length > mLen * 2) {
                decs.push(Decoration.replace({}).range(node.from, node.from + mLen));
                decs.push(Decoration.replace({}).range(node.to - mLen, node.to));
              }
            }
          }

          // --- Italic: hide * ---
          else if (node.name === "Emphasis") {
            if (!cursorOn(view, node.from, node.to)) {
              const text = view.state.sliceDoc(node.from, node.to);
              const marker = text.startsWith("_") ? "_" : "*";
              if (text.startsWith(marker) && text.endsWith(marker) && text.length > 2) {
                decs.push(Decoration.replace({}).range(node.from, node.from + 1));
                decs.push(Decoration.replace({}).range(node.to - 1, node.to));
              }
            }
          }

          // --- Inline code: hide backticks ---
          else if (node.name === "InlineCode") {
            if (!cursorOn(view, node.from, node.to)) {
              const text = view.state.sliceDoc(node.from, node.to);
              if (text.startsWith("`") && text.endsWith("`") && text.length > 2) {
                decs.push(Decoration.replace({}).range(node.from, node.from + 1));
                decs.push(Decoration.replace({}).range(node.to - 1, node.to));
              }
            }
          }

          // --- Strikethrough: hide ~~ ---
          else if (node.name === "Strikethrough") {
            if (!cursorOn(view, node.from, node.to)) {
              const text = view.state.sliceDoc(node.from, node.to);
              if (text.startsWith("~~") && text.endsWith("~~") && text.length > 4) {
                decs.push(Decoration.replace({}).range(node.from, node.from + 2));
                decs.push(Decoration.replace({}).range(node.to - 2, node.to));
              }
            }
          }

          // --- Task checkboxes ---
          else if (node.name === "TaskMarker") {
            const line = view.state.doc.lineAt(node.from);
            if (!cursorOn(view, line.from, node.to)) {
              const markerText = view.state.sliceDoc(node.from, node.to);
              const checked = /x/i.test(markerText);
              decs.push(
                Decoration.replace({ widget: new CheckboxWidget(checked) })
                  .range(node.from, node.to)
              );
              // Hide "- " before checkbox
              const lineText = line.text;
              const match = lineText.match(/^(\s*[-*+]\s)/);
              if (match) {
                decs.push(
                  Decoration.replace({}).range(line.from, line.from + match[1].length)
                );
              }
            }
          }

          // --- List bullets: replace *, -, + with round dot ---
          else if (node.name === "ListMark") {
            const line = view.state.doc.lineAt(node.from);
            if (!cursorOn(view, line.from, line.to)) {
              const marker = view.state.sliceDoc(node.from, node.to);
              // Only for unordered list markers, and skip if line has a task marker
              if (/^[*+]$/.test(marker) && !line.text.match(/\[[ xX]\]/)) {
                const end = Math.min(node.to + 1, line.to); // +1 for space after marker
                decs.push(
                  Decoration.replace({ widget: new BulletWidget() })
                    .range(node.from, end)
                );
              }
            }
          }

          // --- Links ---
          else if (node.name === "Link") {
            if (!cursorOn(view, node.from, node.to)) {
              const full = view.state.sliceDoc(node.from, node.to);
              const m = full.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
              if (m) {
                decs.push(
                  Decoration.replace({ widget: new LinkWidget(m[1], m[2]) })
                    .range(node.from, node.to)
                );
              }
            }
          }

          // --- Images ---
          else if (node.name === "Image") {
            if (!cursorOn(view, node.from, node.to)) {
              const full = view.state.sliceDoc(node.from, node.to);
              const m = full.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
              if (m) {
                let src: string | null = m[2];
                if (src.startsWith("http") || src.startsWith("data:")) {
                  // external/data URLs used as-is
                } else {
                  const folder = getFolderPath();
                  if (folder) {
                    const abs = src.startsWith("/") ? src : `${folder}/${src}`;
                    src = resolveImageSrc(abs);
                  } else {
                    src = null;
                  }
                }
                if (src) {
                  // Hide the markdown text
                  decs.push(Decoration.replace({}).range(node.from, node.to));
                  // Collapse the now-empty source line
                  const imgLine = view.state.doc.lineAt(node.from);
                  decs.push(Decoration.line({ class: "cm-image-source" }).range(imgLine.from));
                  // Render image as a block widget (outside .cm-line, avoids contenteditable centering)
                  decs.push(
                    Decoration.widget({
                      widget: new ImageWidget(src, m[1]),
                      block: true,
                      side: 1,
                    }).range(imgLine.from)
                  );
                }
              }
            }
          }

          // --- Horizontal rule ---
          else if (node.name === "HorizontalRule") {
            if (!cursorOn(view, node.from, node.to)) {
              decs.push(
                Decoration.replace({ widget: new HRWidget() })
                  .range(node.from, node.to)
              );
            }
          }
        },
      });
    }
    // --- Text replacements: -> →, => ⇒, <- ←, <= (not comparison) ---
    const arrows: [string, string][] = [["->", "\u2192"], ["<-", "\u2190"], ["=>", "\u21D2"]];
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.sliceDoc(from, to);
      for (const [pat, arrow] of arrows) {
        let idx = 0;
        while ((idx = text.indexOf(pat, idx)) !== -1) {
          const absFrom = from + idx;
          const absTo = absFrom + pat.length;
          if (!cursorOn(view, absFrom, absTo)) {
            decs.push(
              Decoration.replace({ widget: new ArrowWidget(arrow) })
                .range(absFrom, absTo)
            );
          }
          idx += pat.length;
        }
      }
    }
  } catch (e) {
    console.error("decoration error:", e);
  }

  // Filter out any invalid ranges and sort
  const valid = decs.filter((d) => d.from >= 0 && d.to <= docLen && d.from <= d.to);
  valid.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);

  try {
    return Decoration.set(valid, true);
  } catch (e) {
    console.error("Decoration.set error:", e);
    return Decoration.none;
  }
}

export const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        syntaxTree(update.state) !== syntaxTree(update.startState) ||
        update.transactions.some(t => t.effects.some(e => e.is(imageLoadedEffect)))
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
