# Production image for the Cara Care API.
#
# Multi-stage: build wheels in a throwaway layer, run as a non-root user on a
# slim base. We ship no build toolchain or dev deps in the final image to keep
# the attack surface and size down.
FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /build

# Build tooling for wheels that need compilation (psycopg, argon2, etc.).
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY carecare ./carecare
COPY apps ./apps
COPY common ./common
COPY manage.py ./

RUN pip install --upgrade pip build \
    && pip wheel --no-deps --wheel-dir /wheels -e .


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=carecare.settings.prod

# libpq for psycopg runtime; curl for the container healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser

WORKDIR /app

COPY --from=builder /wheels /wheels
RUN pip install --upgrade pip && pip install --no-cache-dir /wheels/* && rm -rf /wheels

COPY --chown=appuser:appuser . .

RUN chmod +x /app/docker-entrypoint.sh

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/healthz || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "carecare.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "2", "--timeout", "60", "--access-logfile", "-"]
