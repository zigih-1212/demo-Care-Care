"""Therapy domain models.

A ``TherapyProgram`` is authored clinical content (e.g. an 8-week low-FODMAP
protocol). ``Enrollment`` links a patient to a program and tracks progress.

Modelling programs as data (not code) is deliberate: medical content changes
under regulatory review, and shipping a content change must not require a
deploy. Programs are versioned via ``version`` so an in-flight enrollment stays
on the version it started with.
"""

from __future__ import annotations

import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class TherapyProgram(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    condition = models.CharField(
        max_length=120, db_index=True, help_text="Target condition, e.g. IBS"
    )
    duration_weeks = models.PositiveSmallIntegerField(
        default=8, validators=[MinValueValidator(1), MaxValueValidator(104)]
    )
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "therapy_program"
        ordering = ("title",)
        indexes = [models.Index(fields=["condition", "is_active"])]

    def __str__(self) -> str:
        return f"{self.title} v{self.version}"


class Enrollment(models.Model):
    """A patient's participation in a program."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        PAUSED = "paused", "Paused"
        WITHDRAWN = "withdrawn", "Withdrawn"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.CASCADE, related_name="enrollments"
    )
    program = models.ForeignKey(
        TherapyProgram, on_delete=models.PROTECT, related_name="enrollments"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    progress_percent = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "therapy_enrollment"
        ordering = ("-started_at",)
        constraints = [
            # A patient cannot be enrolled twice in the same program at once.
            models.UniqueConstraint(
                fields=["patient", "program"],
                condition=models.Q(status="active"),
                name="uniq_active_enrollment",
            )
        ]
        indexes = [models.Index(fields=["patient", "status"])]

    def __str__(self) -> str:
        return f"{self.patient_id} -> {self.program_id} ({self.status})"
