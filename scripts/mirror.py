#!/usr/bin/env python3
"""Stage the repository's static portfolio for GitHub Pages."""

from pathlib import Path
from shutil import copy2, copytree


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist"
SITE_FILES = (
    ".nojekyll",
    "404.html",
    "index.html",
    "profil.html",
    "travaux.html",
    "parcours.html",
    "competences.html",
    "contact.html",
    "site.js",
    "style.css",
)


def main():
    OUTPUT.mkdir(exist_ok=True)
    for filename in SITE_FILES:
        copy2(ROOT / filename, OUTPUT / filename)
    for directory in ("assets", "documents"):
        copytree(ROOT / directory, OUTPUT / directory, dirs_exist_ok=True)


if __name__ == "__main__":
    main()
