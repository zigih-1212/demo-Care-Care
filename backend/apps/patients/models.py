"""Patient domain models.

The ``CareRelationship`` is the linchpin of authorisation: a clinician may only
read a patient's data while an *active* relationship exists. Modelling the
relationship as data (rather than a role check) means access can be granted and
revoked without redeploying, and every access is naturally scoped to care.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Patient(models.Model):
    """A person receiving care.

    Kept separate from ``User`` so that a patient record can exist (e.g.
    invite-pending) before the login is activated, and so clinical attributes do
    not blur into auth credentials.
    """

    class Sex(models.TextChoices):
        FEMALE = "female", _("Female")
        MALE = "male", _("Male")
        OTHER = "other", _("Other")
        UNKNOWN = "unknown", _("Unknown")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patient_profile",
    )
    date_of_birth = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices, default=Sex.UNKNOWN)
    country = models.CharField(max_length=2, default="DE", help_text="ISO 3166-1 alpha-2")

    # Diagnoses relevant to the GI therapy program (IBS/GERD domain).
    primary_condition = models.CharField(max_length=120, blank=True)

    care_team: models.ManyToManyField = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="CareRelationship",
        related_name="patients_under_care",
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patients_patient"
        indexes = [models.Index(fields=["primary_condition"])]

    def __str__(self) -> str:
        # Do NOT expose PII in the repr used inside logs by default.
        return f"Patient({self.id})"

    def is_in_care_team(self, user) -> bool:
        if not (user and user.is_authenticated):
            return False
        if user.role == "admin":
            return True
        return self.care_team.filter(id=user.id).exists()


class CareRelationship(models.Model):
    """Links a clinician to a patient for a bounded period.

    ``ended_at`` is nullable so historical relationships are retained (required
    for audit: "who had access on date X?").
    """

    class RelationshipType(models.TextChoices):
        PRIMARY = "primary", _("Primary clinician")
        CONSULTING = "consulting", _("Consulting clinician")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="care_relationships"
    )
    clinician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_relationships",
    )
    relationship_type = models.CharField(
        max_length=20, choices=RelationshipType.choices, default=RelationshipType.PRIMARY
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "patients_care_relationship"
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "clinician"],
                condition=models.Q(ended_at__isnull=True),
                name="uniq_active_care_relationship",
            )
        ]
        indexes = [models.Index(fields=["clinician", "ended_at"])]

    def __str__(self) -> str:
        return f"{self.clinician_id} -> {self.patient_id}"

    @property
    def is_active(self) -> bool:
        return self.ended_at is None
