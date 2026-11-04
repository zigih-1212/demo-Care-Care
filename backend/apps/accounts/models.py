"""Custom user model and role model.

Why a custom user from the very first migration:
* Cara Care has patients, clinicians and administrators - a single boolean
  ``is_staff`` cannot express the care model, and the care relationship must be
  an object-level constraint (see patients.CareRelationship).
* Swapping AUTH_USER_MODEL after data exists is extremely painful, so we do it
  now even though the demo has little data.
"""

from __future__ import annotations

import uuid
from typing import ClassVar

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class Role(models.TextChoices):
    PATIENT = "patient", _("Patient")
    DOCTOR = "doctor", _("Doctor")
    ADMIN = "admin", _("Administrator")


class User(AbstractBaseUser, PermissionsMixin):
    """Application user.

    Identity is email-based (no username): patients sign in with the address
    their invitation was sent to.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True, db_index=True)
    full_name = models.CharField(_("full name"), max_length=150, blank=True)
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.PATIENT, db_index=True
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Explicit consent capture - required for GDPR/patient-data processing.
    consent_privacy_accepted_at = models.DateTimeField(null=True, blank=True)

    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    class Meta:
        db_table = "accounts_user"
        indexes = [models.Index(fields=["role", "is_active"])]

    def __str__(self) -> str:
        return self.email

    @property
    def is_patient(self) -> bool:
        return self.role == Role.PATIENT

    @property
    def is_doctor(self) -> bool:
        return self.role == Role.DOCTOR

    @property
    def is_admin_role(self) -> bool:
        return self.role == Role.ADMIN
