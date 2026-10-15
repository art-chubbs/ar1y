#!/usr/bin/env python3
"""Two-pass build: render once to learn where every TOC target lands, inject
page numbers into the contents, render again, then prepend the cover."""
import json
import os
import subprocess
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).parent
VOL = os.environ.get("BOOK_VOL", "1")
DIST = ROOT / "dist" if VOL == "1" else ROOT / "dist" / f"vol{VOL}"
OUT = ROOT / ("System-Design-From-First-Principles.pdf" if VOL == "1"
              else f"System-Design-Vol{VOL}-Case-Studies.pdf")
TITLE = ("System Design: From First Principles to Planet Scale" if VOL == "1"
         else "System Design, Volume 2: Ten Case Studies")


def run(*cmd):
    subprocess.run(cmd, check=True, cwd=ROOT)


def target_pages(pdf_path, ids):
    """Map element id -> 1-based page via the PDF's named destinations."""
    r = PdfReader(pdf_path)
    pages = {}
    for name, dest in r.named_destinations.items():
        name = name.lstrip("/")
        if name in ids:
            pages[name] = r.get_destination_page_number(dest) + 1
    return pages


def main():
    body, cover = DIST / "body.pdf", DIST / "cover.pdf"
    run(sys.executable, "build.py")
    ids = set(json.loads((DIST / "toc-ids.json").read_text()))
    run("node", "render.mjs", str(body), str(cover))
    pages = target_pages(body, ids)
    missing = ids - pages.keys()
    if missing:
        print(f"warning: {len(missing)} toc targets without page: {sorted(missing)[:5]}")
    (DIST / "pages.json").write_text(json.dumps(pages))
    run(sys.executable, "build.py", "--with-pages")
    run("node", "render.mjs", str(body), str(cover))
    again = target_pages(body, ids)
    if again != pages:
        print("warning: pagination shifted between passes")

    w = PdfWriter()
    w.append(str(cover), import_outline=False)
    w.append(str(body))
    w.add_metadata({
        "/Title": TITLE,
        "/Subject": "A complete course on designing large-scale systems",
        "/Keywords": "system design, distributed systems, scalability, architecture",
    })
    w.page_mode = "/UseOutlines"
    with open(OUT, "wb") as f:
        w.write(f)
    n = len(PdfReader(OUT).pages)
    print(f"wrote {OUT.name}: {n} pages")


if __name__ == "__main__":
    main()
