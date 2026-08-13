<p align="center"><strong>Pad</strong> is a minimal markdown editor and presentation app for macOS.</p>
<p align="center">
  <img src="screenshots/1_notes.png" alt="Taking notes in Pad" width="80%" />
</p>

---

## 📦 Install

**[Download the latest .dmg here](https://github.com/ollegreen/pad/releases/latest)**, open it, and drag Pad into Applications. That's it.

A few things worth knowing:

- **Apple Silicon Macs only** (any Mac from 2021 or later with an M-series chip). On an Intel Mac, build from source below instead.
- **First launch:** macOS will warn that Pad is from an unidentified developer. Right-click the app → **Open** → **Open**. You only need to do this once. (Pad is unsigned — signing requires a paid Apple developer account.)
- The .dmg is a stable release, so it can lag behind the newest features. Build from source if you want the latest.

## 🐱 Features

- **Distraction-free editor** — live markdown rendering as you type (headings, checkboxes, bold, italic, links, code blocks)
- **Presentation mode** — your pads become fullscreen slides with `Cmd+P`
- **AI-native** — pads are plain markdown files. Make a few slides in your style, then let your AI of choice write new decks following that structure — most of the work automates itself
- **Multi-pad workflow** — create pads with `Cmd+N`, hop between them with `Alt+←/→`
- **Customizable** — accent colors, fonts, rebindable shortcuts
- **Auto-save** — your work is always saved
- **Tiny footprint** — ~5 MB native app

![Presenting your notes](screenshots/2_presentation_of_notes.png)

*[placeholder — a line about hitting Cmd+P and your notes becoming a slide]*

![A title slide](screenshots/3_slide_page_w_titles.png)

*[placeholder — a line about title slides / how headings turn into big centered text]*

![Sketching and laser pointer](screenshots/4_simple_diagrams_and_highligter.png)

*[placeholder — a line about drawing quick diagrams and the laser highlighter while presenting]*

## ⌨️ Shortcuts (reprogrammable in settings)

| Shortcut | Action |
|---|---|
| `Cmd+N` | New pad |
| `Alt+←/→` | Switch pads |
| `Cmd+P` | Toggle presentation mode |
| `←/→` | Navigate slides |
| `Cmd+B` / `Cmd+I` | Bold / italic |
| `Cmd+T` | Insert checkbox |
| `Cmd+F` | Find |
| `Cmd++/−` | Font size |
| `Cmd+,` | Settings |

## 🛠 Build from source

For the very latest version (or an Intel Mac). Open Terminal (find it with Cmd+Space → type "Terminal") and paste:

```
curl -fsSL https://raw.githubusercontent.com/ollegreen/pad/main/setup.sh | bash
```

The script installs its own tools (Homebrew, Rust, Node.js, pnpm) if you don't have them, builds the app, and copies it to Applications. Expect it to take several minutes the first time — it's compiling a whole app. macOS may also ask to install its command line developer tools along the way; say yes.

Prefer to do it by hand? Requires [Rust](https://rustup.rs/), Node.js, and pnpm:

```
git clone https://github.com/ollegreen/pad.git
cd pad
pnpm install
pnpm tauri build --bundles app
cp -r src-tauri/target/release/bundle/macos/Pad.app /Applications/
```

For development with hot reload: `pnpm tauri dev`

## Stack (for the little geeks out there)

TypeScript, [CodeMirror 6](https://codemirror.net/), [Tauri 2](https://v2.tauri.app/), Vite. Tauri uses the web view already built into macOS instead of bundling a whole browser engine like Electron apps do — that's why Pad is ~5 MB while your average Electron app is 100+ MB.
