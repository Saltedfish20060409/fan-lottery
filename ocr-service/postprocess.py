"""Badge / UI chrome post-processing for comment-screenshot OCR lines."""

from __future__ import annotations

import re
from typing import Any

MIN_NICK_LEN = 2

# Whole-box UI / badge — drop from candidates entirely
WHOLE_BADGE_RE = re.compile(
    r"^(?:"
    r"Lv\.?\s*[0-6]?|等级[0-6]?|"
    r"UL\.?\s*\d{0,2}|UP\.?\s*\d{0,2}|VIP\d*|"
    r"大会员|年费大会员|硬核会员|粉丝团|灯牌|博主|笔记作者|会员|"
    r"[lI1|][vV]?[0-6]?|"
    r"[一二三四五六零]|"
    r"[A-Za-z]|[A-Za-z][0-9]|[0-9][A-Za-z]"
    r")$",
    re.I,
)

STRUCTURED_BADGE_SUFFIXES = [
    re.compile(r"Lv\.?\s*[0-6]$", re.I),
    re.compile(r"L[vV]\.?\s*[0-6]$"),
    re.compile(r"[lI|][vV]\.?\s*[0-6]$"),
    # OCR 把 1 认成 I/l/|
    re.compile(r"Lv\.?\s*[Il|]$", re.I),
    # 无数字粘连：昵称LV
    re.compile(r"Lv\.?$", re.I),
    re.compile(r"等级[0-6]$"),
    re.compile(r"等级$"),
    re.compile(r"UL\.?\s*\d{1,2}$", re.I),
    re.compile(r"UL\.?$", re.I),
    re.compile(r"UP\.?\s*\d{1,2}$", re.I),
    re.compile(r"UP\.?$", re.I),
    re.compile(r"年费大会员$"),
    re.compile(r"大会员$"),
    re.compile(r"硬核会员$"),
    re.compile(r"VIP\d*$", re.I),
]

BADGE_OCR_JUNK_RE = re.compile(
    r"^(?:[A-Za-z]|[0-9]|[A-Za-z][0-9]|[0-9][A-Za-z]|"
    r"[lI1|][vV]|[lI|][vV]?[0-6]?|Lv\.?[0-6]?|等级[0-6]?|[一二三四五六零])$",
    re.I,
)

LEVEL_IDEOGRAPH_RE = re.compile(r"^(.*?)([四五六零])$")


def to_halfwidth_alnum(raw: str) -> str:
    out: list[str] = []
    for ch in raw:
        code = ord(ch)
        if 0xFF10 <= code <= 0xFF19 or 0xFF21 <= code <= 0xFF3A or 0xFF41 <= code <= 0xFF5A:
            out.append(chr(code - 0xFEE0))
        else:
            out.append(ch)
    return "".join(out)


def basic_clean(raw: str) -> str:
    s = re.sub(r"\s+", "", raw or "")
    s = s.replace("|", "").replace("丨", "").replace("｜", "")
    return to_halfwidth_alnum(s).strip()


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

    # LV 图标误读成「四/五/六」：去掉后仍 ≥2 字才剥（「李四」会保留）
    m = LEVEL_IDEOGRAPH_RE.match(s)
    if m:
        next_s, ideo = m.group(1), m.group(2)
        if len(next_s) >= MIN_NICK_LEN:
            stripped_parts.append(ideo)
            s = next_s

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

    m = re.match(r"^([A-Za-z0-9_.\-]{2,})([四五六零])$", s)
    if m:
        stripped = m.group(2) + stripped
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
