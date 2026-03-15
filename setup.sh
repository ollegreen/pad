#!/bin/bash
set -e

echo ""
echo "  pad installer"
echo "  ────────────────"
echo ""

# If not inside the pad repo, clone into a temp dir (cleaned up at the end)
CLEANUP=""
if [ ! -f "src-tauri/tauri.conf.json" ]; then
  CLONE_DIR=$(mktemp -d)
  CLEANUP="$CLONE_DIR"
  echo "  Cloning pad..."
  git clone --depth 1 https://github.com/ollegreen/pad.git "$CLONE_DIR"
  cd "$CLONE_DIR"
fi

# Homebrew
if ! command -v brew &>/dev/null; then
  echo "  Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi
echo "  ✓ Homebrew"

# Rust
if ! command -v rustc &>/dev/null; then
  echo "  Installing Rust..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi
echo "  ✓ Rust"

# Node.js
if ! command -v node &>/dev/null; then
  echo "  Installing Node.js..."
  brew install node
fi
echo "  ✓ Node.js"

# pnpm
if ! command -v pnpm &>/dev/null; then
  echo "  Installing pnpm..."
  npm install -g pnpm
fi
echo "  ✓ pnpm"

echo ""
echo "  Building pad..."
echo ""

pnpm install
pnpm tauri build

# Copy to Applications
cp -rf src-tauri/target/release/bundle/macos/Pad.app /Applications/Pad.app

# Clean up temp build dir
if [ -n "$CLEANUP" ]; then
  rm -rf "$CLEANUP"
fi

echo ""
echo "  ✓ Done! Pad is in your Applications folder."
echo "  Open it from Spotlight (Cmd+Space → Pad) or /Applications."
echo ""
