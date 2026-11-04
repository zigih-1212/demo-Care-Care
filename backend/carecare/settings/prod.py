"""Production settings.

Hardening that must not be forgotten in a regulated (MDR/IEC 62304) context:
transport security, HSTS, strict hosts, no browsable API, JSON-only renderer,
and fail-fast if required secrets are absent.
"""

from __future__ import annotations

from .base import *  # noqa: F403,F401
from .base import env

DEBUG = False

# Fail fast: never boot production with a placeholder key.
if SECRET_KEY in ("", "insecure-dev-key-change-me"):  # noqa: F405
    raise RuntimeError("DJANGO_SECRET_KEY must be set in production")

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")  # noqa: F405
if not ALLOWED_HOSTS:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS must be set in production")

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

# --- Transport security -----------------------------------------------------
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# JSON only in production: no browsable API leaks schema/shape to internal users.
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = ("rest_framework.renderers.JSONRenderer",)  # noqa: F405

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"

# --- Observability ----------------------------------------------------------
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:  # pragma: no cover - requires external service
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        environment=env("SENTRY_ENVIRONMENT", default="production"),
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.1),
        send_default_pii=False,  # never ship patient data to a third party
    )
