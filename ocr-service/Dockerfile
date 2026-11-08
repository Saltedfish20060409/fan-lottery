FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PADDLE_PDX_CACHE_HOME=/models \
    HOME=/tmp

WORKDIR /app

# China-friendly apt mirrors (VPS pulls from Debian CDN too slowly)
RUN set -eux; \
  if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources; \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources; \
  fi; \
  if [ -f /etc/apt/sources.list ]; then \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list; \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list; \
  fi; \
  apt-get update && apt-get install -y --no-install-recommends \
      libgomp1 \
      libgl1 \
      libglib2.0-0 \
      curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip -i https://mirrors.aliyun.com/pypi/simple/ \
 && pip install paddlepaddle==3.0.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/ \
 && pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

COPY app.py postprocess.py ./

RUN mkdir -p /models && chmod 777 /models /tmp

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=300s --retries=8 \
  CMD curl -fsS http://127.0.0.1:8080/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
