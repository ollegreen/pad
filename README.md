<p align="center"><strong>Pad</strong> is a minimal markdown editor and presentation app for macOS.</p>
<p align="center">
  <img src="screenshots/0_landing_pic.png" alt="Pad" width="80%" />
</p>

---

## Quickstart

**[download the latest .dmg here](https://github.com/ollegreen/pad/releases/latest)**, open it, drag Pad into Applications. that's it.

a few things worth knowing:

- **Apple Silicon Macs only** (any Mac from 2021 or later with an M-chip). on an Intel Mac, build from source below instead.
- **first launch:** macOS will complain that Pad is from an unidentified developer. right-click the app → **Open** → **Open**. you only need to do this once (Pad is unsigned — signing requires a paid Apple developer account).
- the .dmg is a stable release so it can lag behind the newest features. build from source if you want the latest.

## Features

- **distraction-free editor** — live markdown rendering as you type (headings, checkboxes, bold, italic, links, code blocks)
- **presentation mode** — your pads become fullscreen slides with `Cmd+P`
- **AI-native** — pads are plain markdown files. make a few slides in your style, then let your AI of choice write new decks following that structure — most of the work automates itself
- **multi-pad workflow** — create pads with `Cmd+N`, hop between them with `Alt+←/→`
- **customizable** — accent colors, fonts, rebindable shortcuts
- **auto-save** — your work is always saved
- **tiny footprint** — ~5 MB native app

![Taking notes in Pad](screenshots/1_notes.png)

*[placeholder — a line about everyday note-taking: checkboxes, live markdown, no chrome]*

![Presenting your notes](screenshots/2_presentation_of_notes.png)

*[placeholder — a line about hitting Cmd+P and your notes becoming a slide]*

![A title slide](screenshots/3_slide_page_w_titles.png)

*[placeholder — a line about title slides / how headings turn into big centered text]*

![Sketching and laser pointer](screenshots/4_simple_diagrams_and_highligter.png)

*[placeholder — a line about drawing quick diagrams and the laser highlighter while presenting]*

## Shortcuts (reprogrammable in settings)

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

## Build from source

for the very latest version (or an Intel Mac). open Terminal (Cmd+Space → type "Terminal") and paste:

```shell
curl -fsSL https://raw.githubusercontent.com/ollegreen/pad/main/setup.sh | bash
```

the script installs its own tools (Homebrew, Rust, Node.js, pnpm) if you don't have them, builds the app and copies it to Applications. takes a few minutes the first time — it's compiling a whole app. macOS might ask to install its command line developer tools along the way, just say yes.

prefer doing it by hand? requires [Rust](https://rustup.rs/), Node.js and pnpm:

```shell
git clone https://github.com/ollegreen/pad.git
cd pad
pnpm install
pnpm tauri build --bundles app
cp -r src-tauri/target/release/bundle/macos/Pad.app /Applications/
```

for development with hot reload: `pnpm tauri dev`

## Stack (for the little geeks out there)

TypeScript, [CodeMirror 6](https://codemirror.net/), [Tauri 2](https://v2.tauri.app/), Vite. Tauri uses the web view already built into macOS instead of bundling a whole browser engine like Electron apps do — that's why Pad is ~5 MB while your average Electron app is 100+ MB.
