#!/bin/sh
# Rebuild userscript + distribution zip from extension/overlay.js
set -e
ROOT=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "$ROOT"

python3 - "$ROOT" << 'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
header = (root / "detective-agency-overlay.meta.js").read_text()
overlay = (root / "extension" / "overlay.js").read_text()
(root / "detective-agency-overlay.user.js").write_text(header.rstrip() + "\n\n" + overlay)
print("wrote detective-agency-overlay.user.js")
PY

rm -f "$ROOT/detective-agency-overlay.zip" "$ROOT/detective-agency-overlay.xpi"
(
  cd "$ROOT/extension"
  zip -r -X "$ROOT/detective-agency-overlay.zip" . -x "*.DS_Store" "*/.DS_Store"
)
cp "$ROOT/detective-agency-overlay.zip" "$ROOT/detective-agency-overlay.xpi"
echo "wrote detective-agency-overlay.zip and .xpi"
unzip -l "$ROOT/detective-agency-overlay.zip"
