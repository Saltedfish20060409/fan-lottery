"""Fan-lottery OCR API — in-memory PaddleOCR, no disk persistence."""

import io
import logging
import os
import threading
import time
from typing import Any, Dict, List

import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from postprocess import normalize_box

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("fan-lottery-ocr")

MAX_BYTES = int(os.getenv("OCR_MAX_BYTES", str(8 * 1024 * 1024)))
# 评论截图不需要 2K；更小边长对 CPU 推理提速很明显
MAX_SIDE = int(os.getenv("OCR_MAX_SIDE", "1440"))
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "OCR_CORS_ORIGINS",
        "https://saltedfish20060409.github.io,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if o.strip()
]

limiter = Limiter(key_func=get_remote_address, default_limits=[])
app = FastAPI(title="fan-lottery-ocr", docs_url=None, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


_ocr = None
_ocr_lock = threading.Lock()
_ocr_ready = False


def get_ocr():
    global _ocr, _ocr_ready
    if _ocr is not None:
        return _ocr
    with _ocr_lock:
        if _ocr is not None:
            return _ocr
        log.info("Loading PaddleOCR models …")
        from paddleocr import PaddleOCR

        # CPU 机器：det 用 mobile 提速；rec 仍用 rec_doc 保生僻字
        _ocr = PaddleOCR(
            text_detection_model_name=os.getenv(
                "OCR_DET_MODEL", "PP-OCRv5_mobile_det"
            ),
            text_recognition_model_name=os.getenv(
                "OCR_REC_MODEL", "PP-OCRv4_server_rec_doc"
            ),
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            text_det_box_thresh=0.65,
            text_det_unclip_ratio=1.4,
            text_det_thresh=0.3,
        )
        _ocr_ready = True
        log.info("PaddleOCR ready")
        return _ocr


def decode_image(data: bytes) -> np.ndarray:
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"图片过大（上限 {MAX_BYTES // 1024 // 1024}MB）")
    try:
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"无法解析图片：{e}") from e

    w, h = img.size
    longest = max(w, h)
    if longest > MAX_SIDE:
        scale = MAX_SIDE / float(longest)
        img = img.resize(
            (max(1, int(w * scale)), max(1, int(h * scale))),
            Image.Resampling.LANCZOS,
        )
    return np.asarray(img)


def extract_items(result: Any, width: int, height: int) -> List[Dict[str, Any]]:
    """Normalize PaddleOCR 3.x predict() output into our JSON items."""
    items: List[Dict[str, Any]] = []
    if not result:
        return items

    page = result[0] if isinstance(result, list) else result
    # PaddleX OCRResult behaves like a dict
    if hasattr(page, "keys") or isinstance(page, dict):
        data = page if isinstance(page, dict) else dict(page)
        rec_texts = data.get("rec_texts") or data.get("texts") or []
        rec_scores = data.get("rec_scores") or data.get("scores") or []
        rec_polys = (
            data.get("rec_polys")
            or data.get("dt_polys")
            or data.get("rec_boxes")
            or data.get("boxes")
            or []
        )
        for i, text in enumerate(rec_texts):
            score = float(rec_scores[i]) if i < len(rec_scores) else 0.0
            poly = rec_polys[i] if i < len(rec_polys) else None
            if poly is None:
                continue
            arr = np.asarray(poly, dtype=float)
            if arr.ndim == 1 and arr.size >= 4:
                # xyxy
                xs = [arr[0], arr[2]]
                ys = [arr[1], arr[3]]
            else:
                xs = arr[:, 0].tolist()
                ys = arr[:, 1].tolist()
            box = normalize_box(str(text), score, xs, ys, float(width), float(height))
            if box:
                items.append(box)
        return items

    # Legacy list-of-lines fallback
    for line in page or []:
        try:
            box_pts, (text, score) = line
            arr = np.asarray(box_pts, dtype=float)
            xs = arr[:, 0].tolist()
            ys = arr[:, 1].tolist()
            box = normalize_box(str(text), float(score), xs, ys, float(width), float(height))
            if box:
                items.append(box)
        except Exception:  # noqa: BLE001
            continue
    return items


@app.get("/health")
def health():
    return {"ok": True, "ocrReady": _ocr_ready}


@app.on_event("startup")
def warmup():
    # Eager load in background so first user request is not ice-cold
    def _run():
        try:
            get_ocr()
        except Exception:  # noqa: BLE001
            log.exception("OCR warmup failed")

    threading.Thread(target=_run, daemon=True).start()


@app.post("/recognize", response_model=None)
@limiter.limit(os.getenv("OCR_RATE_LIMIT", "20/minute"))
async def recognize(request: Request, file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")

    data = await file.read()
    # Ensure we never keep the UploadFile buffer around
    await file.close()

    img = decode_image(data)
    # Drop raw bytes ASAP
    del data

    height, width = img.shape[:2]
    ocr = get_ocr()
    t0 = time.time()
    try:
        result = ocr.predict(
            img,
            text_det_box_thresh=0.65,
            text_det_unclip_ratio=1.4,
            text_det_limit_side_len=MAX_SIDE,
            text_det_limit_type="max",
        )
    except Exception as e:  # noqa: BLE001
        log.exception("OCR failed")
        raise HTTPException(status_code=500, detail=f"识别失败：{e}") from e
    finally:
        del img

    items = extract_items(result, width, height)
    elapsed_ms = int((time.time() - t0) * 1000)
    log.info("recognized %s items in %sms", len(items), elapsed_ms)
    return {
        "width": width,
        "height": height,
        "elapsedMs": elapsed_ms,
        "items": items,
    }
