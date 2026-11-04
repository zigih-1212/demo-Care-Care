"""Test settings - fast, hermetic, no external services required.

SQLite in-memory + locmem cache + eager Celery, so the suite runs in CI (and on
a developer laptop) without Postgres/Redis. Postgres-specific behaviour is
covered by the integration pipeline which runs against a real Postgres service.
"""

from __future__ import annotations

from .base import *  # noqa: F403,F401
from .base import env

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        # ATOMIC_REQUESTS is intentionally off in tests: distinguishing a real
        # transaction from the test wrapper is impossible otherwise.
        "ATOMIC_REQUESTS": False,
    }
}

# Allow CI to point tests at Postgres to catch Postgres-only issues.
if env.bool("TEST_USE_POSTGRES", default=False):  # noqa: F405
    DATABASES["default"] = env.db("DATABASE_URL")  # noqa: F405
    DATABASES["default"]["ATOMIC_REQUESTS"] = False

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Deterministic throttling off by default; security tests turn it on explicitly.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "auth": "1000/min",
    "password_reset": "1000/min",
    "write_burst": "10000/min",
    "burst": "10000/min",
}

LOGGING = {**LOGGING, "root": {**LOGGING.get("root", {}), "level": "WARNING"}}  # type: ignore[dict-item]  # noqa: F405
