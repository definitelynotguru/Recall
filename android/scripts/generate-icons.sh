#!/usr/bin/env bash
# Generate launcher mipmaps from Recall SVG marks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="${RECALL_LOGO_ASSETS:-$ROOT/branding}"
RES="$ROOT/app/src/main/res"

MARK="$ASSETS/recall-logo-mark.svg"
FOREGROUND="$ASSETS/recall-logo-mark-transparent.svg"

if [[ ! -f "$MARK" || ! -f "$FOREGROUND" ]]; then
  echo "Missing SVG assets in $ASSETS" >&2
  exit 1
fi

command -v rsvg-convert >/dev/null || { echo "Install rsvg-convert (librsvg)" >&2; exit 1; }

render() {
  local svg="$1" size="$2" out="$3"
  mkdir -p "$(dirname "$out")"
  rsvg-convert -w "$size" -h "$size" "$svg" -o "$out"
}

# Legacy launcher icons (full mark with ink background)
declare -A LEGACY=(
  [mipmap-mdpi]=48
  [mipmap-hdpi]=72
  [mipmap-xhdpi]=96
  [mipmap-xxhdpi]=144
  [mipmap-xxxhdpi]=192
)

for folder in "${!LEGACY[@]}"; do
  size="${LEGACY[$folder]}"
  render "$MARK" "$size" "$RES/$folder/ic_launcher.png"
  cp "$RES/$folder/ic_launcher.png" "$RES/$folder/ic_launcher_round.png"
done

# Adaptive foreground layers (transparent mark, safe-zone padded)
declare -A ADAPTIVE=(
  [mipmap-mdpi]=108
  [mipmap-hdpi]=162
  [mipmap-xhdpi]=216
  [mipmap-xxhdpi]=324
  [mipmap-xxxhdpi]=432
)

for folder in "${!ADAPTIVE[@]}"; do
  size="${ADAPTIVE[$folder]}"
  render "$FOREGROUND" "$size" "$RES/$folder/ic_launcher_foreground.png"
done

echo "Generated Recall launcher icons under $RES"
