# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Pad

A minimal markdown editor and presentation app for macOS, built with TypeScript + CodeMirror 6 + Tauri 2 (Rust) + Vite.

## Development Commands

```bash
pnpm tauri dev       # Full app dev with hot reload
pnpm tauri build     # Production build (DMG)
pnpm dev             # Frontend-only Vite server (port 5199)
pnpm build           # Frontend TypeScript + Vite bundle only
```

No test framework or linter is configured.

## Architecture

**Frontend** (`src/`): TypeScript with CodeMirror 6. Entry point is `main.ts` which initializes the editor, pad system, shortcuts, and settings.

**Backend** (`src-tauri/`): Rust via Tauri 2. `src/lib.rs` sets up the app window and native menu. Menu actions emit events that the frontend listens to via `@tauri-apps/api/event`.

Key modules:
- `pads.ts` — Multi-pad system (pad_1.md, pad_2.md, etc.) with auto-save to localStorage + disk
- `presentation.ts` — Fullscreen presentation mode where each pad is a slide
- `shortcuts.ts` — Rebindable keyboard shortcuts using CodeMirror Compartments for hot-swapping keymaps
- `decorations.ts` — Custom CodeMirror widgets (checkboxes, links, images) built on Lezer syntax tree parsing
- `settings.ts` — Settings modal (accent color, font, key rebinding, pain mode)
- `images.ts` — Paste-to-insert images with blob URL caching
**Patterns to know:**
- `suppressDirty` flag prevents marking editor as dirty during programmatic content changes (e.g., loading a file)
- Presentation mode toggles via CSS class (`.presentation-mode`) rather than separate components
- State persistence uses localStorage (current pad number, folder path, settings)

## Distribution

No CI/CD pipeline. Users install by building from source via `setup.sh` (one-liner curl command). This avoids macOS Gatekeeper/code signing issues that require a paid Apple Developer account.
