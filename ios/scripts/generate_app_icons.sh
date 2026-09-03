#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$IOS_DIR/DaedongYeosuFoodMap/Assets.xcassets/AppIcon.appiconset"
MASTER_ICON="$OUTPUT_DIR/AppIcon-1024.png"

mkdir -p "$OUTPUT_DIR"
rsvg-convert -w 1024 -h 1024 "$IOS_DIR/AppIcon.svg" -o "$MASTER_ICON"

while IFS=' ' read -r filename size; do
  sips -z "$size" "$size" "$MASTER_ICON" --out "$OUTPUT_DIR/$filename" >/dev/null
done <<'SIZES'
AppIcon-20@2x.png 40
AppIcon-20@3x.png 60
AppIcon-29@2x.png 58
AppIcon-29@3x.png 87
AppIcon-40@2x.png 80
AppIcon-40@3x.png 120
AppIcon-60@2x.png 120
AppIcon-60@3x.png 180
SIZES

echo "Generated iOS app icons in $OUTPUT_DIR"

