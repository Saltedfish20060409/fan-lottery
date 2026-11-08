"""Badge / UI chrome post-processing for comment-screenshot OCR lines."""

from __future__ import annotations

import re
from typing import Any

MIN_NICK_LEN = 2

# Whole-box UI / badge — drop from candidates entirely
WHOLE_BADGE_RE = re.compile(
    r"^(?:"
    r"Lv\.?\s*[0-6]|LV\.?\s*[0-6]|[lI|][vV]\.?\s*[0-6]|等级[0-6]|"
    r"UL\.?\s*\d{1,2}|UP\.?\s*\d{1,2}|VIP\d*|"
    r"大会员|年费大会员|硬核会员|粉丝团|灯牌|博主|笔记作者|会员|作者|来了|"
    r"[A-Za-z]|[A-Za-z][0-9]|[0-9][A-Za-z]|[lI1][vV]?[0-6]?"
    r")$",
    re.I,
)

STRUCTURED_BADGE_SUFFIXES = [
    re.compile(r"Lv\.?\s*[0-6]$", re.I),
    re.compile(r"LV\.?\s*[0-6]$", re.I),
    re.compile(r"[lI|][vV]\.?\s*[0-6]$"),
    re.compile(r"等级[0-6]$"),
    re.compile(r"UL\.?\s*\d{1,2}$", re.I),
    re.compile(r"UP\.?\s*\d{1,2}$", re.I),
    re.compile(r"年费大会员$"),
    re.compile(r"大会员$"),
    re.compile(r"硬核会员$"),
    re.compile(r"VIP\d*$", re.I),
]

BADGE_OCR_JUNK_RE = re.compile(
    r"^(?:[A-Za-z]|[0-9]|[A-Za-z][0-9]|[0-9][A-Za-z]|"
    r"[lI1][vV]|[lI|][vV]?[0-6]?|Lv\.?[0-6]?|LV\.?[0-6]?|等级[0-6]?)$",
    re.I,
)


def basic_clean(raw: str) -> str:
    s = re.sub(r"\s+", "", raw or "")
    return s.replace("|", "").replace("丨", "").replace("｜", "").strip()


def is_whole_badge(text: str) -> bool:
    return bool(WHOLE_BADGE_RE.match(text))


def is_badge_ocr_junk(suffix: str) -> bool:
    return bool(BADGE_OCR_JUNK_RE.match(suffix))


def strip_structured_badges(raw: str) -> tuple[str, str | None]:
    s = raw
    stripped_parts: list[str] = []
    changed = True
    while changed:
        changed = False
        for re_pat in STRUCTURED_BADGE_SUFFIXES:
            m = re_pat.search(s)
            if not m:
                continue
            next_s = s[: m.start()]
            if len(next_s) < MIN_NICK_LEN:
                continue
            stripped_parts.append(s[m.start() :])
            s = next_s
            changed = True
            break
    suffix = "".join(reversed(stripped_parts)) if stripped_parts else None
    return s, suffix


def strip_trailing_ocr_junk(raw: str) -> tuple[str, str | None]:
    s = raw
    stripped = ""
    if re.search(r"[\u4e00-\u9fff]", s):
        for _ in range(3):
            m = re.match(r"^(.+[\u4e00-\u9fff])([A-Za-z0-9]{1,2})$", s)
            if not m or len(m.group(1)) < MIN_NICK_LEN:
                break
            suf = m.group(2)
            if re.fullmatch(r"\d{2}", suf):
                break
            if not is_badge_ocr_junk(suf):
                break
            stripped = suf + stripped
            s = m.group(1)
    return (s, stripped or None) if stripped else (s, None)


def clean_ocr_nickname(raw: str) -> dict[str, Any]:
    raw_text = basic_clean(raw)
    structured, struct_suf = strip_structured_badges(raw_text)
    text, junk_suf = strip_trailing_ocr_junk(structured)
    parts = [p for p in (struct_suf, junk_suf) if p]
    stripped = "".join(parts) if parts else None
    return {
        "text": text or raw_text,
        "rawText": raw_text,
        "strippedSuffix": stripped,
    }


def normalize_box(
    text: str,
    score: float,
    xs: list[float],
    ys: list[float],
    width: float,
    height: float,
) -> dict[str, Any] | None:
    if width <= 0 or height <= 0 or not xs or not ys:
        return None
    cleaned = clean_ocr_nickname(text)
    raw = cleaned["rawText"]
    if not raw:
        return None
    if is_whole_badge(raw) or is_whole_badge(cleaned["text"]):
        return None

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return {
        "text": cleaned["text"],
        "rawText": cleaned["rawText"],
        "strippedSuffix": cleaned["strippedSuffix"],
        "score": float(score),
        "minX": min_x / width,
        "maxX": max_x / width,
        "minY": min_y / height,
        "maxY": max_y / height,
    }
