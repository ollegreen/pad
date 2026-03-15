# Pad

A minimal text editor and markdown presentation app for Mac.

Hop between pads — jot notes, present slides, or just blow off some keyboard steam. Each pad is a small surface to land on, think on, and leap from to the next.

<!-- screenshots go here -->

## Two modes, one app

**Writing mode** — a distraction-free dark editor with live markdown rendering. Headings, checkboxes, bold, italic, links, code blocks — all styled inline as you type. Your work auto-saves.

**Presentation mode** — hit `Cmd+P` and your pads become fullscreen slides. Navigate with arrow keys. Hit `Cmd+P` again to go back to editing.

Each file is a pad. Create as many as you want (`Cmd+N`) and hop between them (`Alt+←/→`). In presentation mode, each pad is a slide.

## Install

Mac only. One command — installs dependencies, builds from source, and copies to Applications:

```
curl -fsSL https://raw.githubusercontent.com/ollegreen/pad/main/setup.sh | bash
```

> Requires macOS with git. The script will install Homebrew, Rust, Node.js, and pnpm if needed.

## Shortcuts

**Pads**

| Shortcut | Action |
|---|---|
| `Cmd+N` | New pad |
| `Alt+←/→` | Switch between pads |

**Writing**

| Shortcut | Action |
|---|---|
| `Cmd+B` | Bold |
| `Cmd+I` | Italic |
| `Cmd+T` | Insert todo checkbox |
| `Cmd+F` | Find |
| `Cmd++/−` | Font size |
| `Alt+C` | Center text vertically |

**Presenting**

| Shortcut | Action |
|---|---|
| `Cmd+P` | Toggle presentation mode |
| `←/→` | Previous / next slide |

**Files & settings**

| Shortcut | Action |
|---|---|
| `Cmd+S` | Save |
| `Cmd+Shift+S` | Save as |
| `Cmd+O` | Open file |
| `Cmd+,` | Settings (accent color, font, rebind keys) |

All shortcuts are rebindable in settings.

## Built with

- **TypeScript** + **CodeMirror 6** — the editor
- **Tauri 2** (Rust) — native Mac app wrapper, ~5MB binary
- **Vite** — bundler

## Build from source

Requires Rust, Node.js, and pnpm.

```
git clone https://github.com/ollegreen/pad.git
cd pad
pnpm install
pnpm tauri build
```

The `.dmg` lands in `src-tauri/target/release/bundle/dmg/`.

For development with hot reload:

```
pnpm tauri dev
```
