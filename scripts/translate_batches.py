#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "data" / "words-raw.json"
OUTPUT_PATH = ROOT / "data" / "words.json"


def clean_query_word(value: str) -> str:
    return re.sub(r",.*$", "", value).strip()


def parse_json_array(text: str) -> list[dict]:
    decoder = json.JSONDecoder()
    arrays: list[list[dict]] = []
    for match in re.finditer(r"\[", text):
        try:
            value, _ = decoder.raw_decode(text[match.start():])
        except json.JSONDecodeError:
            continue
        if isinstance(value, list):
            arrays.append(value)
    if not arrays:
        raise ValueError("No JSON array in model response")
    return arrays[-1]


def translate_batch(batch: list[dict], attempts: int = 3) -> list[dict]:
    source = [{"id": item["id"], "german": clean_query_word(item["german"])} for item in batch]
    prompt = f"""다음은 Goethe-Zertifikat A1 공식 독일어 표제어다.
각 항목에 초급 학습자가 외우기 좋은 핵심 한국어 뜻과 영어 뜻을 각각 1~2개만 붙여라.
명사는 관사 의미를 번역하지 말고, 동사는 기본형 의미로, 전치사·기능어는 A1에서 가장 흔한 뜻을 쓴다.
설명이나 Markdown 없이 정확히 같은 순서와 id를 유지한 JSON 배열만 출력한다.
형식: [{{"id":"...","korean":"뜻/다른 뜻","english":"meaning/other meaning"}}]
입력: {json.dumps(source, ensure_ascii=False)}"""
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            proc = subprocess.run(
                ["hermes", "-p", "germanybot", "-z", prompt],
                capture_output=True, text=True, timeout=180, check=True,
            )
            translated = parse_json_array(proc.stdout)
            expected = [item["id"] for item in source]
            actual = [item.get("id") for item in translated]
            if actual != expected or any(not item.get("korean") or not item.get("english") for item in translated):
                raise ValueError("Translated IDs or meanings do not match input")
            return translated
        except Exception as exc:
            last_error = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Batch translation failed: {last_error}")


def main() -> None:
    words = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    existing: dict[str, dict[str, str]] = {}
    if OUTPUT_PATH.exists():
        for item in json.loads(OUTPUT_PATH.read_text(encoding="utf-8")):
            existing[item["id"]] = {
                "korean": item.get("korean", ""),
                "english": item.get("english", ""),
            }
    pending = [
        item for item in words
        if not existing.get(item["id"], {}).get("korean")
        or not existing.get(item["id"], {}).get("english")
    ]
    for offset in range(0, len(pending), 50):
        batch = pending[offset:offset + 50]
        translated = translate_batch(batch)
        existing.update({
            item["id"]: {
                "korean": existing.get(item["id"], {}).get("korean") or item["korean"],
                "english": item["english"],
            }
            for item in translated
        })
        merged = [
            {
                **item,
                "korean": existing.get(item["id"], {}).get("korean", ""),
                "english": existing.get(item["id"], {}).get("english", ""),
            }
            for item in words
        ]
        OUTPUT_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"translated {min(offset + len(batch), len(pending))}/{len(pending)}", flush=True)
    output = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    if any(not item.get("korean") or not item.get("english") for item in output):
        raise RuntimeError("Translation output contains blank meanings")
    print(f"complete: {len(words)} words", flush=True)


if __name__ == "__main__":
    main()
