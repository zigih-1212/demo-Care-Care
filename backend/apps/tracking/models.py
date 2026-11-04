"""Tracking domain models.

Design notes that matter for a health tracker at scale:

* Symptom entries are append-heavy time-series. We index on
  ``(patient, recorded_at)`` because every read is "this patient's recent
  entries" - the index matches the access pattern, so the common query is an
  index range scan, not a table scan.
* We store a structured ``severity`` (0-10) rather than free text only, so we
  can compute trends server-side without parsing prose.
* Medication logs are separate because a medication schedule is a different
  lifecycle than a symptom record (adherence vs. symptom correlation).
"""

from __future__ import annotations

import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class SymptomType(models.TextChoices):
    ABDOMINAL_PAIN = "abdominal_pain", "Abdominal pain"
    BLOATING = "bloating", "Bloating"
    DIARRHEA = "diarrhea", "Diarrhea"
    CONSTIPATION = "constipation", "Constipation"
    HEARTBURN = "heartburn", "Heartburn"
    NAUSEA = "nausea", "Nausea"
    FATIGUE = "fatigue", "Fatigue"
    OTHER = "other", "Other"


class SymptomEntry(models.Model):
    """A single patient-reported symptom observation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.CASCADE, related_name="symptom_entries"
    )
    symptom_type = models.CharField(max_length=32, choices=SymptomType.choices, db_index=True)
    severity = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        help_text="0 = none, 10 = worst imaginable",
    )
    notes = models.TextField(blank=True, max_length=2000)

    # When the symptom happened (patient-reported) vs. when the row was written.
    # They differ: patients often backfill yesterday's entry. Analytics must use
    # ``recorded_at``, not ``created_at``.
    recorded_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tracking_symptom_entry"
        ordering = ("-recorded_at",)
        indexes = [
            models.Index(fields=["patient", "-recorded_at"]),
            models.Index(fields=["patient", "symptom_type", "-recorded_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.symptom_type}@{self.recorded_at:%Y-%m-%d} severity={self.severity}"


class MedicationEntry(models.Model):
    """A medication intake (or missed intake) event."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.CASCADE, related_name="medication_entries"
    )
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100, blank=True)
    taken = models.BooleanField(default=True)
    recorded_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tracking_medication_entry"
        ordering = ("-recorded_at",)
        indexes = [models.Index(fields=["patient", "-recorded_at"])]

    def __str__(self) -> str:
        state = "taken" if self.taken else "missed"
        return f"{self.medication_name} {state}@{self.recorded_at:%Y-%m-%d}"
