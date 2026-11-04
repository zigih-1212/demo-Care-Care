"""Authorization / privacy tests: the heart of a regulated health product.

Every test here encodes an access-control rule from the domain:
 - a patient sees only their own data (BOLA protection);
 - a clinician sees only patients with an *active* care relationship;
 - end-of-relationship revokes access immediately;
 - analytics aggregates respect the same scoping.
"""

from __future__ import annotations

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.therapy.models import Enrollment, TherapyProgram
from apps.tracking.models import SymptomEntry

pytestmark = pytest.mark.django_db


def _entry(patient, severity=5, **kw):
    kw.setdefault("recorded_at", timezone.now())
    return SymptomEntry.objects.create(
        patient=patient, symptom_type="bloating", severity=severity, **kw
    )


class TestPatientDataIsolation:
    def test_patient_cannot_list_other_patients_symptoms(self, patient_client, other_patient):
        _entry(other_patient, severity=9)
        resp = patient_client.get(reverse("tracking:symptom-list"))
        assert resp.status_code == 200
        assert resp.data["results"] == [], "must not leak another patient's entries"

    def test_patient_cannot_fetch_entry_by_id(self, patient_client, other_patient):
        entry = _entry(other_patient)
        resp = patient_client.get(reverse("tracking:symptom-detail", args=[entry.id]))
        assert resp.status_code == 404, "cross-patient object access must 404, not 403"

    def test_patient_sees_own_entries(self, patient_client, patient):
        _entry(patient, severity=3)
        _entry(patient, severity=7)
        resp = patient_client.get(reverse("tracking:symptom-list"))
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_create_forces_entry_onto_requesting_patient(
        self, patient_client, other_patient, patient
    ):
        """A patient cannot create an entry attributed to someone else."""
        resp = patient_client.post(
            reverse("tracking:symptom-list"),
            {
                "patient": str(other_patient.id),
                "symptom_type": "nausea",
                "severity": 4,
                "recorded_at": timezone.now().isoformat(),
            },
            format="json",
        )
        assert resp.status_code == 201
        created = SymptomEntry.objects.get(id=resp.data["id"])
        assert created.patient_id == patient.id, "server must ignore client-supplied patient"


class TestCareTeamAccess:
    def test_doctor_with_active_relationship_can_read(
        self, doctor_client, patient, care_relationship
    ):
        _entry(patient, severity=6)
        resp = doctor_client.get(reverse("tracking:symptom-list"), {"patient": str(patient.id)})
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1

    def test_doctor_without_relationship_is_denied(self, doctor_client, other_patient):
        _entry(other_patient)
        resp = doctor_client.get(
            reverse("tracking:symptom-list"), {"patient": str(other_patient.id)}
        )
        assert resp.status_code in (403, 404)

    def test_revoked_relationship_removes_access(self, doctor_client, patient, care_relationship):
        _entry(patient)
        care_relationship.ended_at = timezone.now()
        care_relationship.save(update_fields=["ended_at"])
        resp = doctor_client.get(reverse("tracking:symptom-list"), {"patient": str(patient.id)})
        assert resp.status_code in (403, 404), "ended relationship must revoke access"

    def test_admin_can_read_any_patient(self, admin_client, other_patient):
        _entry(other_patient)
        resp = admin_client.get(
            reverse("tracking:symptom-list"), {"patient": str(other_patient.id)}
        )
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1


class TestAnalyticsScoping:
    def test_patient_trend_uses_own_data_only(self, patient_client, patient, other_patient):
        _entry(patient, severity=2)
        _entry(other_patient, severity=10)
        resp = patient_client.get(reverse("tracking:symptom-trend"))
        assert resp.status_code == 200
        assert resp.data["total"] == 1
        assert resp.data["points"][0]["avg_severity"] == pytest.approx(2.0)

    def test_doctor_analytics_requires_patient_param(self, doctor_client, care_relationship):
        resp = doctor_client.get(reverse("tracking:symptom-trend"))
        assert resp.status_code == 400

    def test_summary_reflects_only_scoped_entries(self, patient_client, patient):
        _entry(patient, severity=2)
        _entry(patient, severity=8)
        resp = patient_client.get(reverse("tracking:symptom-summary"))
        assert resp.status_code == 200
        assert resp.data["total_entries"] == 2
        assert resp.data["avg_severity"] == pytest.approx(5.0)
        assert resp.data["worst_entry"]["severity"] == 8


class TestTherapyAccess:
    def test_patient_can_enroll_in_active_program(self, patient_client, patient):
        program = TherapyProgram.objects.create(slug="ibs-101", title="IBS 101", condition="IBS")
        resp = patient_client.post(
            reverse("therapy:enrollment-list"), {"program": str(program.id)}, format="json"
        )
        assert resp.status_code == 201
        assert Enrollment.objects.filter(patient=patient, program=program).exists()

    def test_duplicate_active_enrollment_rejected(self, patient_client, patient):
        program = TherapyProgram.objects.create(slug="ibs-102", title="IBS 102", condition="IBS")
        payload = {"program": str(program.id)}
        first = patient_client.post(reverse("therapy:enrollment-list"), payload, format="json")
        second = patient_client.post(reverse("therapy:enrollment-list"), payload, format="json")
        assert first.status_code == 201
        assert second.status_code == 400

    def test_doctor_cannot_complete_patient_enrollment(
        self, doctor_client, patient, care_relationship
    ):
        program = TherapyProgram.objects.create(slug="ibs-103", title="IBS 103", condition="IBS")
        enrollment = Enrollment.objects.create(patient=patient, program=program)
        resp = doctor_client.post(
            reverse("therapy:enrollment-complete", args=[enrollment.id]), {}, format="json"
        )
        assert resp.status_code == 403, "completion is the patient's action only"

    def test_patient_completes_own_enrollment(self, patient_client, patient):
        program = TherapyProgram.objects.create(slug="ibs-104", title="IBS 104", condition="IBS")
        enrollment = Enrollment.objects.create(patient=patient, program=program)
        resp = patient_client.post(
            reverse("therapy:enrollment-complete", args=[enrollment.id]), {}, format="json"
        )
        assert resp.status_code == 200
        enrollment.refresh_from_db()
        assert enrollment.status == Enrollment.Status.COMPLETED
        assert enrollment.progress_percent == 100


class TestAuditVisibility:
    def test_audit_logs_admin_only(self, patient_client, admin_client, patient):
        _entry(patient)
        admin_resp = admin_client.get(reverse("audit:log-list"))
        patient_resp = patient_client.get(reverse("audit:log-list"))
        assert admin_resp.status_code == 200
        assert patient_resp.status_code == 403

    def test_reading_patient_data_writes_audit_entry(
        self, doctor_client, patient, care_relationship
    ):
        from apps.audit.models import AuditLog

        doctor_client.get(reverse("tracking:symptom-list"), {"patient": str(patient.id)})
        assert AuditLog.objects.filter(action="read", patient=patient).exists()
