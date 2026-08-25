#!/usr/bin/env python3
"""Extract the alphabetic headword column from Goethe's official A1 PDF."""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

import pymupdf

IGNORED = {
    "Alphabetische Wortliste", "Inventare", "Wortliste",
}
LETTER_RE = re.compile(r"^[A-ZÄÖÜ]$")


def _clean_headword(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"\s+,", ",", value)
    return value


def extract_entries(pdf_path: str | Path) -> list[dict[str, str]]:
    doc = pymupdf.open(str(pdf_path))
    raw: list[tuple[str, str]] = []
    # Alphabetic list occupies printed pages 9–27 (zero-based PDF pages 8–26).
    for page in doc[8:27]:
        rows: dict[float, list[tuple[float, str]]] = {}
        for item in page.get_text("words"):
            x0, y0, text = float(item[0]), round(float(item[1]), 1), str(item[4])
            if 100 <= y0 <= 760:
                rows.setdefault(y0, []).append((x0, text))
        ordered = [(y0, sorted(items)) for y0, items in sorted(rows.items())]
        pending = ""
        pending_example = ""
        for index, (_, items) in enumerate(ordered):
            left = [text for x0, text in items if 140 <= x0 < 230]
            if not left:
                continuation = _clean_headword(" ".join(text for x0, text in items if 230 <= x0 < 500))
                if raw and continuation and not re.search(r"[.!?…]\s*$", raw[-1][1]):
                    previous_headword, previous_example = raw[-1]
                    raw[-1] = (previous_headword, _clean_headword(f"{previous_example} {continuation}"))
                continue
            headword = _clean_headword(" ".join(left))
            if not headword or headword in IGNORED or LETTER_RE.fullmatch(headword):
                continue
            right_words = [text for x0, text in items if 230 <= x0 < 500]
            right_present = bool(right_words)
            example_german = _clean_headword(" ".join(right_words))
            next_has_left = False
            next_left_text = ""
            if index + 1 < len(ordered):
                next_left = [text for x0, text in ordered[index + 1][1] if 140 <= x0 < 230]
                next_has_left = bool(next_left)
                next_left_text = _clean_headword(" ".join(next_left))
            if pending:
                separator = " "
                if re.search(r"\w-$", pending):
                    pending = pending[:-1]
                    separator = ""
                headword = pending + separator + headword
                example_german = _clean_headword(f"{pending_example} {example_german}")
                pending = ""
                pending_example = ""
            wrapped_compound = bool(
                re.match(r"^(?:der|die|das)\s+.+\w-$", headword, re.I)
                and next_left_text[:1].islower()
            )
            if (not right_present and next_has_left) or wrapped_compound:
                pending = headword
                pending_example = example_german
            else:
                raw.append((headword, example_german))
        if pending:
            raw.append((pending, pending_example))

    entries: list[dict[str, str]] = []
    seen: set[str] = set()
    for headword, example_german in raw:
        if headword.endswith(","):
            example_german = re.sub(r"^[–-][a-zäöüß]+\s+", "", example_german, flags=re.I)
        normalized = re.sub(r"[^a-zäöüß0-9]+", "", headword.casefold())
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        entries.append({
            "id": hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:12],
            "german": headword,
            "korean": "",
            "exampleGerman": example_german,
            "source": "Goethe-Zertifikat A1 Start Deutsch 1 Wortliste",
        })
    return entries
