"""Build image-generation-skill.zip for Claude Desktop skill upload."""

import os
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL_DIR = ROOT / "skills" / "image-generation"
OUT_DIR = ROOT / "dist"
OUT_ZIP = OUT_DIR / "image-generation-skill.zip"

# Explicit file list (no glob — only known files are packaged)
FILES = [
    ("SKILL.md", "image-generation/SKILL.md"),
    ("references/providers.md", "image-generation/references/providers.md"),
]


def main() -> None:
    # Verify all source files exist
    missing = []
    for src_rel, _ in FILES:
        src = SKILL_DIR / src_rel
        if not src.is_file():
            missing.append(str(src))
    if missing:
        print("ERROR: Missing source files:", file=sys.stderr)
        for m in missing:
            print(f"  {m}", file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for src_rel, arc_name in FILES:
            src = SKILL_DIR / src_rel
            # arc_name uses forward slashes (hardcoded above)
            zf.write(src, arc_name)

    print(f"Created {OUT_ZIP} ({OUT_ZIP.stat().st_size} bytes)")

    # Verify: list contents and check paths
    with zipfile.ZipFile(OUT_ZIP, "r") as zf:
        for info in zf.infolist():
            if "\\" in info.filename:
                print(f"ERROR: Backslash in ZIP path: {info.filename}", file=sys.stderr)
                sys.exit(1)
            print(f"  {info.filename}  ({info.file_size} bytes)")

    print("OK")


if __name__ == "__main__":
    main()
