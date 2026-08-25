#!/usr/bin/env python3
"""Merge the first official Goethe A1 usage example into every word record."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from extract_goethe import extract_entries

PDF_PATH = ROOT / "data" / "goethe-a1-wortliste.pdf"
WORDS_PATH = ROOT / "data" / "words.json"


def main() -> None:
    words = json.loads(WORDS_PATH.read_text(encoding="utf-8"))
    examples = {entry["id"]: entry["exampleGerman"] for entry in extract_entries(PDF_PATH)}
    missing = [item["id"] for item in words if not examples.get(item["id"], "").strip()]
    if missing:
        raise RuntimeError(f"Official examples missing for {len(missing)} word IDs: {missing[:5]}")
    merged = [{**item, "exampleGerman": examples[item["id"]]} for item in words]
    WORDS_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"merged official examples: {len(merged)}/{len(words)}")


if __name__ == "__main__":
    main()
