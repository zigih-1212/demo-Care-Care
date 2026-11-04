"""Unified API error envelope.

Clients (and React Native in particular) benefit from a single, predictable error
shape. We also normalise DRF's default 500 response so that no stack trace or
internal path ever leaks to a patient-facing app.
"""

from __future__ import annotations

import logging

from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def _envelope(code: str, message: str, details=None, status_code: int = 400) -> Response:
    payload = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return Response(payload, status=status_code)


def exception_handler(exc, context) -> Response | None:
    response = drf_exception_handler(exc, context)

    if response is not None:
        # Preserve field errors for forms while wrapping in the envelope.
        details = response.data
        code = getattr(exc, "default_code", "error")
        # DRF converts Django's Http404 into a 404 response, but the original
        # exception is still a Django Http404 (no default_code). Normalise it so
        # clients always see the stable "not_found" code.
        if isinstance(exc, Http404):
            code = "not_found"
        message = "Request could not be processed."
        if isinstance(details, dict) and "detail" in details:
            message = str(details["detail"])
        elif isinstance(details, list):
            message = " ".join(str(d) for d in details)
        response.data = {"error": {"code": code, "message": message, "details": details}}
        return response

    if isinstance(exc, DjangoValidationError):
        return _envelope("validation_error", "Validation failed.", exc.messages)
    if isinstance(exc, Http404):
        return _envelope("not_found", "Resource not found.", status_code=status.HTTP_404_NOT_FOUND)
    if isinstance(exc, PermissionDenied):
        return _envelope(
            "permission_denied",
            "You do not have permission.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # Unhandled: log with correlation id, return an opaque message.
    logger.exception("Unhandled exception in API: %s", exc)
    return _envelope(
        "internal_error",
        "An unexpected error occurred.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
