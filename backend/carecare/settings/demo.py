"""Local demo settings - run the whole stack with no external services.

This is for a laptop demo only. It is deliberately NOT a production profile:
SQLite instead of Postgres, in-process cache instead of Redis, eager Celery
instead of a worker, permissive throttling and open CORS. Everything here is
tuned so `runserver` starts a fully working API + web app on one machine.

Usage:
    DJANGO_SETTINGS_MODULE=carecare.settings.demo python manage.py migrate
    DJANGO_SETTINGS_MODULE=carecare.settings.demo python manage.py seed_demo
    DJANGO_SETTINGS_MODULE=carecare.settings.demo python manage.py runserver
"""

from __future__ import annotations

from .base import *  # noqa: F403,F401

DEBUG = True

ALLOWED_HOSTS = ["*"]

# File-backed SQLite so demo data survives a server restart.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
        "ATOMIC_REQUESTS": True,
    }
}

# No Redis in the demo: keep cache and Celery in-process.
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"

# A demo never needs brute-force protection, and the browser hits the API
# directly (no reverse proxy), so trust the dev origin explicitly.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "auth": "1000/min",
    "password_reset": "1000/min",
    "write_burst": "10000/min",
    "burst": "10000/min",
}

# The exported web build runs on a different origin (e.g. :8088), so allow it.
CORS_ALLOW_ALL_ORIGINS = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

LOGGING = {**LOGGING, "root": {**LOGGING.get("root", {}), "level": "INFO"}}  # type: ignore[dict-item]  # noqa: F405
