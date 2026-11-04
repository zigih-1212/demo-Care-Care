"""Tracking serializers.

Validation is intentionally strict on ``recorded_at``: a symptom cannot be
reported in the future (data quality + a cheap guard against malformed clients),
but backfilling the past is allowed.
"""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from .models import MedicationEntry, SymptomEntry


class _RecordedAtMixin:
    """Shared ``recorded_at`` sanity checks.

    Rejects future timestamps (clock skew tolerance 5 min) and enforces the
    configurable backdating window so a client cannot silently rewrite history
    (settings.SYMPTOM_MAX_BACKDATE_DAYS).
    """

    def validate_recorded_at(self, value):
        now = timezone.now()
        if value > now + timedelta(minutes=5):
            raise serializers.ValidationError("recorded_at cannot be in the future.")
        max_backdate = getattr(settings, "SYMPTOM_MAX_BACKDATE_DAYS", 7)
        if value < now - timedelta(days=max_backdate):
            raise serializers.ValidationError(
                f"recorded_at cannot be more than {max_backdate} days in the past."
            )
        return value


class SymptomEntrySerializer(_RecordedAtMixin, serializers.ModelSerializer):
    class Meta:
        model = SymptomEntry
        fields = (
            "id",
            "symptom_type",
            "severity",
            "notes",
            "recorded_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class MedicationEntrySerializer(_RecordedAtMixin, serializers.ModelSerializer):
    class Meta:
        model = MedicationEntry
        fields = (
            "id",
            "medication_name",
            "dosage",
            "taken",
            "recorded_at",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class SymptomTrendPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    avg_severity = serializers.FloatField()
    count = serializers.IntegerField()
