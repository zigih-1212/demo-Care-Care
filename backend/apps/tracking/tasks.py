"""Background tasks for the tracking domain.

Only non-clinical, best-effort work runs here (see carecare/celery.py). The
nightly aggregate is idempotent and safe to re-run, which matters because Celery
gives at-least-once delivery under ``acks_late``.
"""

from __future__ import annotations

import logging

from celery import shared_task
from django.core.cache import cache

logger = logging.getLogger(__name__)

DAILY_SUMMARY_CACHE_PREFIX = "tracking:daily_summary"


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def compute_daily_summary(self, patient_id: str) -> dict:
    """Precompute a patient's 30-day symptom summary into the cache.

    Rationale: the dashboard summary is the most-requested read. Precomputing it
    nightly (and invalidating on write) keeps the interactive endpoint cheap even
    as a patient's history grows, instead of aggregating over years of rows on
    every app open.
    """
    from apps.patients.models import Patient
    from apps.tracking.services import symptom_summary

    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        logger.warning("compute_daily_summary: unknown patient %s", patient_id)
        return {"patient_id": patient_id, "status": "not_found"}

    summary = symptom_summary(patient, days=30)
    cache.set(f"{DAILY_SUMMARY_CACHE_PREFIX}:{patient_id}", summary, timeout=60 * 60 * 26)
    return {"patient_id": patient_id, "status": "ok", "summary": summary}
