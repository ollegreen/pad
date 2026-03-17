import { EditorView } from "@codemirror/view";
import { mkdir, readDir, writeFile } from "@tauri-apps/plugin-fs";
import { getFolderPath } from "./pads";

const SCREENSHOTS_DIR = "screenshots";
const SCREENSHOT_REGEX = /^screenshot_(\d+)\.png$/;

async function screenshotsPath(): Promise<string | null> {
  const folder = getFolderPath();
  if (!folder) return null;
  const dir = `${folder}/${SCREENSHOTS_DIR}`;
  await mkdir(dir, { recursive: true });
  return dir;
}

async function nextScreenshotNum(): Promise<number> {
  const dir = await screenshotsPath();
  if (!dir) return 1;

  const entries = await readDir(dir);
  let max = 0;
  for (const e of entries) {
    const m = e.name?.match(SCREENSHOT_REGEX);
    if (m) max = Math.max(max, parseInt(m[1]));
  }
  return max + 1;
}

export function initImagePaste(view: EditorView): void {
  view.dom.addEventListener("paste", async (e) => {
    const items = (e as ClipboardEvent).clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      e.preventDefault();

      const blob = item.getAsFile();
      if (!blob) return;

      const dir = await screenshotsPath();
      if (!dir) return;

      const num = await nextScreenshotNum();
      const filename = `screenshot_${num}.png`;

      const buffer = await blob.arrayBuffer();
      await writeFile(`${dir}/${filename}`, new Uint8Array(buffer));

      const pos = view.state.selection.main.head;
      const insert = `![](${SCREENSHOTS_DIR}/${filename})`;
      view.dispatch({
        changes: { from: pos, insert },
        selection: { anchor: pos + insert.length },
      });
      return;
    }
  });
}
