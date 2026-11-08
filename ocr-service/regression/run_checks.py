#!/usr/bin/env python3
"""Offline regression for nickname postprocess (no model download)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from postprocess import clean_ocr_nickname, is_whole_badge  # noqa: E402

BODYISH = (
    "哈哈",
    "嘿嘿",
    "好耶",
    "冲了",
    "冲鸭",
    "支持",
    "加油",
    "谢谢",
    "喜欢",
    "求抽",
    "蹲一个",
)


def looks_like_body(text: str) -> bool:
    if any(ch in text for ch in "，。！？、,.!?;；：:…"):
        return True
    if any(text.startswith(p) for p in BODYISH) and len(text) >= 3:
        return True
    if len(text) >= 12:
        return True
    return False


def main() -> int:
    cases = json.loads((Path(__file__).parent / "cases.json").read_text(encoding="utf-8"))
    failed = 0
    for case in cases:
        cid = case["id"]
        raw = case["raw"]
        cleaned = clean_ocr_nickname(raw)
        cat = case.get("category")
        if "expectText" in case and cleaned["text"] != case["expectText"]:
            print(f"FAIL [{cid}] text={cleaned['text']!r} expect={case['expectText']!r}")
            failed += 1
            continue
        if case.get("expectIsBodyLike") and not looks_like_body(cleaned["text"]):
            print(f"FAIL [{cid}] expected body-like for {cleaned['text']!r}")
            failed += 1
            continue
        if cat == "suffix" and is_whole_badge(cleaned["text"]):
            print(f"FAIL [{cid}] cleaned to whole badge {cleaned['text']!r}")
            failed += 1
            continue
        print(f"OK   [{cid}] {raw!r} -> {cleaned['text']!r} ({cat})")
    if failed:
        print(f"\n{failed} failed")
        return 1
    print(f"\nAll {len(cases)} checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
