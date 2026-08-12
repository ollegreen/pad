import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Excalidraw-style dashed pill frame, used as a border-image so the dashes,
// stroke, and corners scale with font size (Cmd+/- zoom, presentation mode).
// Corners are solid arcs, edges hand-placed dashes; slice 50 + repeat round.
const inlineCodePillSvg = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='210' height='160' viewBox='0 0 210 160'>" +
    "<g fill='none' stroke='#f28b82' stroke-width='10' stroke-linecap='round'>" +
    "<path d='M 5 29 A 24 24 0 0 1 29 5'/>" +
    "<path d='M 181 5 A 24 24 0 0 1 205 29'/>" +
    "<path d='M 205 131 A 24 24 0 0 1 181 155'/>" +
    "<path d='M 29 155 A 24 24 0 0 1 5 131'/>" +
    "<path d='M 60 5 H 150'/>" +
    "<path d='M 60 155 H 150'/>" +
    "<path d='M 5 65 V 95'/>" +
    "<path d='M 205 65 V 95'/>" +
    "</g></svg>"
);

export const padTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#ffffff",
      height: "100%",
    },
    ".cm-content": {
      fontFamily: "var(--pad-font, 'SF Mono', Menlo, Monaco, 'Courier New', monospace)",
      fontSize: "14px",
      lineHeight: "1.55",
      padding: "4px 8px",
      caretColor: "#ffffff",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#264f78 !important",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#ffffff",
    },
    ".cm-gutters": {
      display: "none",
    },
    // Heading line decorations
    ".cm-h1": {
      fontSize: "1.6em",
      fontWeight: "bold",
    },
    ".cm-h2": {
      fontSize: "1.3em",
      fontWeight: "bold",
    },
    ".cm-h3": {
      fontSize: "1.1em",
      fontWeight: "bold",
    },
    // Blockquote line decoration
    ".cm-blockquote-line": {
      borderLeft: "2px solid #3a3a3a",
      paddingLeft: "10px",
    },
    // Code block line decoration
    ".cm-codeblock-line": {
      backgroundColor: "var(--pad-code-bg, #2d2d2d)",
    },
    // Excalidraw-style arrow widget (from `->` / `u` / `d` / `l` / `r`)
    ".cm-arrow-widget": {
      display: "inline-block",
      width: "1.6em",
      height: "2.9em",
      verticalAlign: "middle",
      margin: "0.35em 0.6em",
    },
    ".cm-arrow-widget svg": {
      width: "100%",
      height: "100%",
    },
    // Checkbox widget — sized relative to font, accent via CSS var
    ".cm-checkbox": {
      display: "inline-block",
      width: "0.85em",
      height: "0.85em",
      border: "1.5px solid #555",
      borderRadius: "5px",
      verticalAlign: "-0.05em",
      cursor: "pointer",
      position: "relative",
      marginLeft: "0.5em",
      marginRight: "0.3em",
      transition: "border-color 0.15s, background 0.15s",
    },
    ".cm-checkbox:hover": {
      borderColor: "#888",
    },
    ".cm-checkbox-checked": {
      backgroundColor: "transparent",
      borderColor: "#555",
    },
    ".cm-checkbox-checked::after": {
      content: "''",
      position: "absolute",
      left: "50%",
      top: "45%",
      width: "28%",
      height: "55%",
      border: "solid var(--pad-accent, #39e75f)",
      borderWidth: "0 3px 3px 0",
      transform: "translate(-50%, -50%) rotate(45deg)",
    },
    // Bullet point dot
    ".cm-bullet": {
      display: "inline-block",
      width: "0.35em",
      height: "0.35em",
      borderRadius: "50%",
      backgroundColor: "var(--pad-text, #ffffff)",
      verticalAlign: "0.15em",
      marginRight: "0.4em",
    },
    // Rendered link widget
    ".cm-rendered-link": {
      color: "#e8912d",
      cursor: "pointer",
      textDecoration: "none",
      borderBottom: "1px solid transparent",
      transition: "border-color 0.15s",
    },
    ".cm-rendered-link:hover": {
      borderBottom: "1px solid #e8912d",
    },
    // Image widget
    ".cm-rendered-image": {
      maxWidth: "100%",
      maxHeight: "28em",
      borderRadius: "4px",
      display: "block",
      margin: "4px 0",
    },
    // Horizontal rule widget
    ".cm-rendered-hr": {
      borderTop: "1px solid #3a3a3a",
      margin: "8px 0",
    },
    // Search panel
    ".cm-panels": {
      backgroundColor: "#252525",
      color: "#ffffff",
    },
    ".cm-searchMatch": {
      backgroundColor: "#515c6a",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "#264f78",
    },
    // Scrollbar
    ".cm-scroller::-webkit-scrollbar": {
      width: "8px",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      background: "#1e1e1e",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "#3a3a3a",
      borderRadius: "4px",
    },
  },
  { dark: true }
);

// All text same color (#d4d4d4) — only links get orange.
// Bold/italic get weight/style but same color. Code in blocks gets subtle highlighting.
export const padHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading1, fontSize: "1.6em", fontWeight: "bold", color: "var(--pad-text, #ffffff)" },
    { tag: tags.heading2, fontSize: "1.3em", fontWeight: "bold", color: "var(--pad-text, #ffffff)" },
    { tag: tags.heading3, fontSize: "1.1em", fontWeight: "bold", color: "var(--pad-text, #ffffff)" },
    { tag: tags.heading4, fontWeight: "bold", color: "var(--pad-text, #ffffff)" },
    { tag: tags.heading5, fontWeight: "bold", color: "var(--pad-text, #ffffff)" },
    { tag: tags.heading6, fontWeight: "bold", color: "var(--pad-text, #ffffff)" },
    { tag: tags.strong, fontWeight: "bold", color: "var(--pad-text, #ffffff)" },
    { tag: tags.emphasis, fontStyle: "italic", color: "var(--pad-text, #ffffff)" },
    { tag: tags.strikethrough, textDecoration: "line-through", color: "#808080" },
    { tag: tags.monospace, fontFamily: "var(--pad-code-font, 'Comic Sans MS', cursive)", color: "#f28b82", display: "inline-block", border: "0.35em solid transparent", borderImageSource: `url("data:image/svg+xml,${inlineCodePillSvg}")`, borderImageSlice: "35", borderImageRepeat: "round", padding: "0 0.45em", margin: "0.45em 0" },
    { tag: tags.link, color: "#e8912d" },
    { tag: tags.url, color: "#e8912d" },
    { tag: tags.quote, color: "var(--pad-text, #ffffff)" },
    { tag: tags.list, color: "var(--pad-text, #ffffff)" },
    { tag: tags.processingInstruction, color: "#666666" },
    { tag: tags.meta, color: "#666666" },
    // Code block internals — subtle syntax coloring
    { tag: tags.comment, color: "var(--pad-syn-comment, #6a9955)" },
    { tag: tags.string, color: "var(--pad-syn-string, #ce9178)" },
    { tag: tags.keyword, color: "var(--pad-syn-keyword, #569cd6)" },
    { tag: tags.number, color: "var(--pad-syn-number, #b5cea8)" },
  ])
);
