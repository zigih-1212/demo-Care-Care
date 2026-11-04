"""Patient serializers."""

from __future__ import annotations

from rest_framework import serializers

from .models import CareRelationship, Patient


class PatientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Patient
        fields = (
            "id",
            "email",
            "full_name",
            "date_of_birth",
            "sex",
            "country",
            "primary_condition",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "email", "full_name", "created_at", "updated_at")


class RosterEntrySerializer(serializers.Serializer):
    """One row of a clinician's caseload.

    Deliberately aggregate-only: a caseload list should not leak the raw diary.
    A clinician who wants detail opens the patient and that read is audited.
    """

    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    primary_condition = serializers.CharField()
    entries_30d = serializers.IntegerField()
    avg_severity_30d = serializers.FloatField(allow_null=True)
    last_recorded_at = serializers.DateTimeField(allow_null=True)


class CareRelationshipSerializer(serializers.ModelSerializer):
    clinician_email = serializers.EmailField(source="clinician.email", read_only=True)
    patient_id = serializers.UUIDField(source="patient.id", read_only=True)

    class Meta:
        model = CareRelationship
        fields = (
            "id",
            "patient_id",
            "clinician",
            "clinician_email",
            "relationship_type",
            "started_at",
            "ended_at",
        )
        read_only_fields = ("id", "patient_id", "clinician_email", "started_at")
