"""Background tasks for the audit domain.

In a regulated deployment the audit trail must survive a database loss, so a
scheduled job ships new rows to an append-only sink (object storage / SIEM).
The demo implements the seam and the checkpointing logic; the actual sink client
is provided by deployment configuration.
"""

from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.core.cache import cache

from .models import AuditLog

logger = logging.getLogger(__name__)

AUDIT_SHIP_CHECKPOINT_KEY = "audit:ship:last_created_at"


@shared_task(bind=True, max_retries=5, default_retry_delay=120)
def ship_audit_logs(self, batch_limit: int = 1000) -> dict:
    """Ship audit rows created since the last checkpoint to the durable sink.

    The checkpoint is the ``created_at`` of the last shipped row. ``created_at``
    is monotonic per insert, and the model forbids updates, so rows are immutable
    and never need re-shipping.
    """
    sink = getattr(settings, "AUDIT_SINK_URL", None)
    if not sink:
        logger.info("ship_audit_logs: no AUDIT_SINK_URL configured; nothing to do")
        return {"status": "disabled"}

    checkpoint = cache.get(AUDIT_SHIP_CHECKPOINT_KEY)
    qs = AuditLog.objects.order_by("created_at")
    if checkpoint:
        qs = qs.filter(created_at__gt=checkpoint)
    batch = list(qs[:batch_limit])

    if not batch:
        return {"status": "ok", "shipped": 0}

    # Deployment provides the concrete exporter; we keep the task transport-shape
    # agnostic so the same job works for S3, GCS or a SIEM HTTP endpoint.
    from common.audit_sink import export_to_sink  # local import: optional dependency

    export_to_sink(sink, batch)
    cache.set(AUDIT_SHIP_CHECKPOINT_KEY, batch[-1].created_at, timeout=None)
    logger.info("ship_audit_logs: shipped %d entries", len(batch))
    return {"status": "ok", "shipped": len(batch)}
