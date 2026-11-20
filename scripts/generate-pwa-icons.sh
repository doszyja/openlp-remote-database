#!/usr/bin/env bash
# Regenerate PWA / favicon PNGs from the raster embedded in favicon.svg (black logo on white).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/apps/web/public"
cd "$PUBLIC"

python3 << 'PY'
import base64, pathlib, re
svg = pathlib.Path("favicon.svg").read_text()
# Prefer standalone logo-source.png if present; else extract from legacy SVG embed.
src = pathlib.Path("logo-source.png")
if not src.exists():
    m = re.search(r"base64,([^\"]+)", svg)
    if not m:
        raise SystemExit("No embedded logo in favicon.svg and no logo-source.png")
    src.write_bytes(base64.b64decode(m.group(1)))
PY

convert logo-source.png -alpha on -fill '#000000' -colorize 100% logo-black.png

gen_icon() {
  local s=$1 out=$2
  local inner=$((s * 90 / 100))
  convert -size "${s}x${s}" xc:'#ffffff' logo-black.png -resize "${inner}x${inner}" \
    -gravity center -composite "$out"
}

gen_mask() {
  local s=$1 out=$2
  local inner=$((s * 68 / 100))
  convert -size "${s}x${s}" xc:'#ffffff' logo-black.png -resize "${inner}x${inner}" \
    -gravity center -composite "$out"
}

gen_icon 16 favicon-16x16.png
gen_icon 32 favicon-32x32.png
gen_icon 96 favicon-96x96.png
gen_icon 180 apple-touch-icon.png
gen_icon 192 web-app-manifest-192x192.png
gen_icon 512 web-app-manifest-512x512.png
gen_mask 192 web-app-manifest-192x192-maskable.png
gen_mask 512 web-app-manifest-512x512-maskable.png
convert favicon-16x16.png favicon-32x32.png favicon-96x96.png favicon.ico

rm -f logo-black.png
echo "PWA icons written under $PUBLIC"