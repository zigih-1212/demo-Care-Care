"""Domain / unit tests for tracking + therapy business rules."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

pytestmark = pytest.mark.django_db


class TestRecordedAtValidation:
    def test_future_timestamp_rejected(self, patient_client):
        future = (timezone.now() + timedelta(days=1)).isoformat()
        resp = patient_client.post(
            reverse("tracking:symptom-list"),
            {"symptom_type": "bloating", "severity": 5, "recorded_at": future},
            format="json",
        )
        assert resp.status_code == 400

    def test_too_old_timestamp_rejected(self, patient_client, settings):
        old = (timezone.now() - timedelta(days=settings.SYMPTOM_MAX_BACKDATE_DAYS + 1)).isoformat()
        resp = patient_client.post(
            reverse("tracking:symptom-list"),
            {"symptom_type": "bloating", "severity": 5, "recorded_at": old},
            format="json",
        )
        assert resp.status_code == 400

    def test_recent_timestamp_accepted(self, patient_client):
        recent = (timezone.now() - timedelta(hours=2)).isoformat()
        resp = patient_client.post(
            reverse("tracking:symptom-list"),
            {"symptom_type": "bloating", "severity": 5, "recorded_at": recent},
            format="json",
        )
        assert resp.status_code == 201


class TestSeverityBounds:
    @pytest.mark.parametrize("severity", [0, 10])
    def test_boundary_severities_accepted(self, patient_client, severity):
        resp = patient_client.post(
            reverse("tracking:symptom-list"),
            {
                "symptom_type": "bloating",
                "severity": severity,
                "recorded_at": timezone.now().isoformat(),
            },
            format="json",
        )
        assert resp.status_code == 201

    @pytest.mark.parametrize("severity", [-1, 11, 100])
    def test_out_of_range_severity_rejected(self, patient_client, severity):
        resp = patient_client.post(
            reverse("tracking:symptom-list"),
            {
                "symptom_type": "bloating",
                "severity": severity,
                "recorded_at": timezone.now().isoformat(),
            },
            format="json",
        )
        assert resp.status_code == 400


class TestTrendAggregation:
    def test_trend_orders_by_day_and_averages(self, patient_client, patient):
        from apps.tracking.models import SymptomEntry

        today = timezone.now()
        yesterday = today - timedelta(days=1)
        SymptomEntry.objects.create(
            patient=patient, symptom_type="bloating", severity=2, recorded_at=yesterday
        )
        SymptomEntry.objects.create(
            patient=patient, symptom_type="bloating", severity=4, recorded_at=yesterday
        )
        SymptomEntry.objects.create(
            patient=patient, symptom_type="bloating", severity=8, recorded_at=today
        )

        resp = patient_client.get(reverse("tracking:symptom-trend"))
        assert resp.status_code == 200
        points = resp.data["points"]
        assert len(points) == 2
        assert points[0]["date"] < points[1]["date"], "points must be chronological"
        assert points[0]["avg_severity"] == pytest.approx(3.0)
        assert points[0]["count"] == 2
        assert points[1]["avg_severity"] == pytest.approx(8.0)

    def test_trend_filtered_by_symptom_type(self, patient_client, patient):
        from apps.tracking.models import SymptomEntry

        now = timezone.now()
        SymptomEntry.objects.create(
            patient=patient, symptom_type="bloating", severity=2, recorded_at=now
        )
        SymptomEntry.objects.create(
            patient=patient, symptom_type="nausea", severity=9, recorded_at=now
        )
        resp = patient_client.get(reverse("tracking:symptom-trend"), {"symptom_type": "bloating"})
        assert resp.data["total"] == 1
        assert resp.data["points"][0]["avg_severity"] == pytest.approx(2.0)

    def test_days_window_validation(self, patient_client):
        too_big = patient_client.get(reverse("tracking:symptom-trend"), {"days": 9999})
        assert too_big.status_code == 400


class TestMedicationTracking:
    def test_create_and_list_medication(self, patient_client):
        create = patient_client.post(
            reverse("tracking:medication-list"),
            {
                "medication_name": "Iberogast",
                "dosage": "20 drops",
                "taken": True,
                "recorded_at": timezone.now().isoformat(),
            },
            format="json",
        )
        assert create.status_code == 201
        listing = patient_client.get(reverse("tracking:medication-list"))
        assert len(listing.data["results"]) == 1
