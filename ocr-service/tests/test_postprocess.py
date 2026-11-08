from postprocess import clean_ocr_nickname, is_whole_badge, normalize_box


def test_strip_structured_lv():
    r = clean_ocr_nickname("小明Lv6")
    assert r["text"] == "小明"
    assert r["rawText"] == "小明Lv6"
    assert r["strippedSuffix"]


def test_strip_ocr_junk_letter():
    r = clean_ocr_nickname("花开G")
    assert r["text"] == "花开"
    assert r["strippedSuffix"] == "G"


def test_keep_nickname_ending_with_author():
    r = clean_ocr_nickname("超级作者")
    assert r["text"] == "超级作者"
    assert not r["strippedSuffix"]


def test_keep_two_digit_tail():
    r = clean_ocr_nickname("粉丝88")
    assert r["text"] == "粉丝88"


def test_drop_whole_badge_box():
    assert is_whole_badge("Lv6")
    assert is_whole_badge("大会员")
    box = normalize_box("Lv6", 0.9, [10, 40], [20, 40], 100, 100)
    assert box is None


def test_normalize_keeps_coords():
    box = normalize_box("小明G", 0.95, [10, 50], [20, 40], 100, 200)
    assert box is not None
    assert box["text"] == "小明"
    assert box["rawText"] == "小明G"
    assert 0 <= box["minX"] < box["maxX"] <= 1
