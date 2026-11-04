"""Tests for the clinician roster and the admin account directory.

Both endpoints expose cross-patient information, so the interesting assertions
are about who is *not* allowed in and about how much a caseload list reveals.
"""

from __future__ import annotations

import pytest
from django.utils import timezone

from apps.tracking.models import SymptomEntry
from tests.conftest import auth

pytestmark = pytest.mark.django_db


def _entry(patient, severity=5):
    return SymptomEntry.objects.create(
        patient=patient,
        symptom_type="bloating",
        severity=severity,
        recorded_at=timezone.now(),
    )


class TestRoster:
    def test_patient_cannot_access_roster(self, patient_client):
        response = patient_client.get("/api/v1/patients/roster/")
        assert response.status_code == 403

    def test_doctor_sees_only_active_patients(
        self, doctor_user, patient, other_patient, care_relationship
    ):
        response = auth(doctor_user).get("/api/v1/patients/roster/")
        assert response.status_code == 200
        ids = [row["id"] for row in response.data]
        assert str(patient.id) in ids
        # ``other_patient`` has no relationship with this doctor.
        assert str(other_patient.id) not in ids

    def test_roster_aggregates_last_30_days(self, doctor_user, patient, care_relationship):
        _entry(patient, severity=2)
        _entry(patient, severity=8)
        response = auth(doctor_user).get("/api/v1/patients/roster/")
        assert response.status_code == 200
        row = next(r for r in response.data if r["id"] == str(patient.id))
        assert row["entries_30d"] == 2
        assert row["avg_severity_30d"] == 5.0
        assert row["last_recorded_at"] is not None

    def test_revoked_relationship_drops_patient_from_roster(
        self, doctor_user, patient, care_relationship
    ):
        care_relationship.ended_at = timezone.now()
        care_relationship.save(update_fields=["ended_at"])
        response = auth(doctor_user).get("/api/v1/patients/roster/")
        assert response.status_code == 200
        assert response.data == []

    def test_admin_sees_all_patients(self, admin_user, patient, other_patient):
        response = auth(admin_user).get("/api/v1/patients/roster/")
        assert response.status_code == 200
        ids = [row["id"] for row in response.data]
        assert str(patient.id) in ids
        assert str(other_patient.id) in ids


class TestAccountDirectory:
    def test_patient_forbidden(self, patient_client):
        assert patient_client.get("/api/v1/auth/users/").status_code == 403

    def test_doctor_forbidden(self, doctor_client):
        assert doctor_client.get("/api/v1/auth/users/").status_code == 403

    def test_admin_lists_accounts_without_secrets(self, admin_user, patient_user, doctor_user):
        response = auth(admin_user).get("/api/v1/auth/users/")
        assert response.status_code == 200
        emails = {row["email"] for row in response.data}
        assert patient_user.email in emails
        assert doctor_user.email in emails
        # The serializer must never leak credential material.
        for row in response.data:
            assert "password" not in row
