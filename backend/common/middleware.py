"""Request-scoped middleware.

Two responsibilities:
1. ``RequestIDMiddleware`` - assign/propagate a correlation id.
2. ``AuditContextMiddleware`` - remember the acting user/ip/request id on the
   request so the audit service can attribute accesses without threading
   arguments through every layer.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from contextvars import ContextVar

# ContextVar instead of thread-locals: safe under ASGI/async and Celery.
_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)

REQUEST_ID_HEADER = "X-Request-ID"


def get_current_request_id() -> str | None:
    return _request_id_ctx.get()


class RequestIDMiddleware:
    """Accept an upstream request id or generate one; echo it back."""

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.META.get("HTTP_X_REQUEST_ID")
        # Only trust a bounded, safe upstream id; otherwise mint our own so a
        # client cannot inject arbitrary content into logs.
        if incoming and 0 < len(incoming) <= 128 and incoming.isascii():
            request_id = incoming
        else:
            request_id = uuid.uuid4().hex
        request.request_id = request_id
        token = _request_id_ctx.set(request_id)
        try:
            response = self.get_response(request)
        finally:
            _request_id_ctx.reset(token)
        response[REQUEST_ID_HEADER] = request_id
        return response


def client_ip(request) -> str | None:
    """Best-effort client IP, trusting exactly one proxy hop.

    In production the app sits behind an ingress/load balancer; X-Forwarded-For
    is a comma-separated chain and the left-most value is client-controlled, so
    we take the last hop added by our own edge.
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[-1].strip()[:45]
    return request.META.get("REMOTE_ADDR")


class AuditContextMiddleware:
    """Attach audit-relevant context to the request.

    Kept deliberately dumb: it does not write audit rows itself (that happens in
    the service layer where we know *which* patient record was touched). It only
    makes actor/ip/request-id cheaply available.
    """

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request):
        request.audit_context = {
            "ip": client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", "")[:512],
            "request_id": getattr(request, "request_id", None),
        }
        return self.get_response(request)
