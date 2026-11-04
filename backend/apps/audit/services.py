"""Audit-writing service.

The service is the *only* sanctioned way to write audit rows: it pulls actor,
ip and request id from the request context centrally so individual views cannot
forget a field (a common source of incomplete compliance trails).
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from .models import AuditLog

logger = logging.getLogger(__name__)


def record(
    *,
    action: str,
    resource_type: str,
    request=None,
    actor=None,
    resource_id: str | int | uuid.UUID | None = None,
    patient=None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog | None:
    """Write an audit entry.

    Never raises into the caller: a failure to audit must be logged but must not
    take down the clinical workflow. In production this would additionally push
    to a durable sink (e.g. append-only object storage) so a database hiccup
    cannot lose the trail - see docs/COMPLIANCE.md.
    """
    try:
        if actor is None and request is not None:
            user = getattr(request, "user", None)
            actor = user if (user and user.is_authenticated) else None

        ctx = getattr(request, "audit_context", {}) if request is not None else {}

        return AuditLog.objects.create(
            actor=actor,
            actor_email=getattr(actor, "email", "") or "",
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else "",
            patient=patient,
            ip_address=ctx.get("ip"),
            user_agent=ctx.get("user_agent", ""),
            request_id=ctx.get("request_id") or "",
            metadata=metadata or {},
        )
    except Exception:  # noqa: BLE001 - auditing must never break the request
        logger.exception(
            "Failed to write audit entry action=%s resource=%s:%s",
            action,
            resource_type,
            resource_id,
        )
        return None
