"""Development settings - convenience over hardening, never used in production."""

from __future__ import annotations

from .base import *  # noqa: F403,F401
from .base import env

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Local docker-compose provides Postgres; fall back to the same URL as base.
# SQLite is deliberately NOT the default so that dev matches prod's SQL engine.
INSTALLED_APPS += ["django_extensions"] if env.bool("WITH_EXTENSIONS", default=False) else []  # noqa: F405

# Browsable API is handy while developing.
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
)

CORS_ALLOWED_ORIGINS = env.list(  # noqa: F405
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:8081", "http://localhost:19006", "exp://localhost:8081"],
)

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Serve static/media without a webserver in dev.
INTERNAL_IPS = ["127.0.0.1"]
