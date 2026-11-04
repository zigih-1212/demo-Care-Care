"""Tracking services - analytics computed in the database, not in Python.

Rationale: a patient can have tens of thousands of entries. Pulling rows into
Python to average them would not scale and would waste memory. Aggregation via
``.values()/.annotate()`` becomes a single SQL ``GROUP BY`` over the composite
index, which the database optimises well.
"""

from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Avg, Count
from django.db.models.functions import TruncDate

from .models import SymptomEntry


def symptom_trend(patient, *, days: int = 30, symptom_type: str | None = None) -> list[dict]:
    """Return daily average severity for the last ``days`` days.

    Uses ``recorded_at`` (patient-reported time), truncating to date so multiple
    entries on one day collapse into a single trend point.
    """
    since = date.today() - timedelta(days=days - 1)
    qs = (
        SymptomEntry.objects.filter(patient=patient, recorded_at__date__gte=since)
        .annotate(day=TruncDate("recorded_at"))
        .values("day")
        .annotate(avg_severity=Avg("severity"), count=Count("id"))
        .order_by("day")
    )
    if symptom_type:
        qs = qs.filter(symptom_type=symptom_type)

    return [
        {
            "date": row["day"],
            "avg_severity": round(float(row["avg_severity"]), 2),
            "count": row["count"],
        }
        for row in qs
    ]


def symptom_summary(patient, *, days: int = 30) -> dict:
    """High-level numbers for the patient dashboard.

    Returned as a single dict so the mobile app needs one request, not four.
    """
    since = date.today() - timedelta(days=days - 1)
    qs = SymptomEntry.objects.filter(patient=patient, recorded_at__date__gte=since)
    agg = qs.aggregate(total=Count("id"), avg=Avg("severity"))
    worst = qs.order_by("-severity").values("symptom_type", "severity", "recorded_at").first()
    return {
        "window_days": days,
        "total_entries": agg["total"] or 0,
        "avg_severity": round(float(agg["avg"]), 2) if agg["avg"] is not None else None,
        "worst_entry": worst,
    }
