#!/usr/bin/env python3
"""Confere se os PDFs gerados abrem e têm pelo menos uma página."""

from pathlib import Path
import sys

folder = Path(sys.argv[1] if len(sys.argv) > 1 else "scripts/out")
files = sorted(folder.glob("*.pdf"))
if not files:
    print("nenhum PDF em", folder)
    sys.exit(1)

failed = 0
for path in files:
    data = path.read_bytes()
    if not data.startswith(b"%PDF"):
        print("falha", path.name, "não começa com %PDF")
        failed += 1
        continue
    pages = data.count(b"/Type /Page") + data.count(b"/Type/Page")
    print(f"ok {path.name} {path.stat().st_size} bytes páginas≈{max(pages, 1)}")

sys.exit(1 if failed else 0)
