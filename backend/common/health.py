"""Liveness and readiness probes.

Kept separate from business URLs so that Kubernetes probes stay cheap and do not
require authentication. Readiness additionally checks the database and cache:
a pod that cannot reach Postgres must not receive traffic.
"""

from __future__ import annotations

from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(exclude=True)  # infrastructure probe; not part of the public API
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def liveness(request):
    """Process is up. No dependencies touched."""
    return Response({"status": "ok"})


@extend_schema(exclude=True)  # infrastructure probe; not part of the public API
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def readiness(request):
    """Dependencies reachable. Used by the readiness probe / load balancer."""
    checks: dict[str, str] = {}
    healthy = True

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception:  # noqa: BLE001 - probe must not raise
        checks["database"] = "down"
        healthy = False

    try:
        cache.set("readiness", "1", timeout=5)
        checks["cache"] = "ok" if cache.get("readiness") == "1" else "down"
        healthy = healthy and checks["cache"] == "ok"
    except Exception:  # noqa: BLE001
        checks["cache"] = "down"
        healthy = False

    code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response({"status": "ready" if healthy else "degraded", "checks": checks}, status=code)
