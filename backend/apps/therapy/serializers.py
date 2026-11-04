"""Therapy serializers."""

from __future__ import annotations

from rest_framework import serializers

from apps.patients.models import Patient

from .models import Enrollment, TherapyProgram


class TherapyProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = TherapyProgram
        fields = (
            "id",
            "slug",
            "title",
            "description",
            "condition",
            "duration_weeks",
            "version",
            "is_active",
        )
        read_only_fields = fields


class EnrollmentSerializer(serializers.ModelSerializer):
    program_detail = TherapyProgramSerializer(source="program", read_only=True)

    class Meta:
        model = Enrollment
        fields = (
            "id",
            "program",
            "program_detail",
            "status",
            "progress_percent",
            "started_at",
            "completed_at",
        )
        read_only_fields = ("id", "status", "started_at", "completed_at")

    def validate_program(self, program: TherapyProgram) -> TherapyProgram:
        if not program.is_active:
            raise serializers.ValidationError("This program is not currently available.")
        return program

    def validate(self, attrs):
        request = self.context.get("request")
        patient = _resolve_patient(request)
        program = attrs.get("program")
        if patient and program:
            exists = Enrollment.objects.filter(
                patient=patient, program=program, status=Enrollment.Status.ACTIVE
            ).exists()
            if exists:
                raise serializers.ValidationError("Already enrolled in this program.")
        return attrs

    def create(self, validated_data):
        patient = _resolve_patient(self.context.get("request"))
        if patient is None:
            # Defensive: permission classes guarantee a patient here, but a
            # missing patient must never create an orphan enrollment.
            raise serializers.ValidationError({"patient": "Could not resolve the patient."})
        return Enrollment.objects.create(patient=patient, **validated_data)


def _resolve_patient(request) -> Patient | None:
    """Patients enroll themselves; clinicians/admins enroll a named patient."""
    if request is None or not getattr(request, "user", None):
        return None
    user = request.user
    if user.role in ("doctor", "admin"):
        patient_id = request.data.get("patient")
        if not patient_id:
            return None
        patient = Patient.objects.filter(id=patient_id).first()
        if patient and user.role == "doctor" and not patient.is_in_care_team(user):
            raise serializers.ValidationError({"patient": "Not on this patient's care team."})
        return patient
    return getattr(user, "patient_profile", None)
