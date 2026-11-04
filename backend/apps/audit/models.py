"""Immutable audit trail for access to patient data.

Regulatory context (MDR / GDPR / BSI TR-03161): every read or write of patient
health data must be attributable to a natural person, with a timestamp, source
IP and the action performed. The log is append-only by convention:
* no ``save()`` updates are exposed by the API,
* ``AuditLog`` overrides ``save`` to reject updates on an existing row.

We deliberately store a *reference* (object id) rather than a copy of the
payload, so the audit table itself does not become a second uncontrolled store
of patient data.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class AuditAction(models.TextChoices):
    READ = "read", "Read"
    CREATE = "create", "Create"
    UPDATE = "update", "Update"
    DELETE = "delete", "Delete"
    EXPORT = "export", "Export"
    LOGIN = "login", "Login"
    LOGIN_FAILED = "login_failed", "Login failed"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
        help_text="Null for unauthenticated actions (e.g. failed login).",
    )
    actor_email = models.EmailField(
        blank=True,
        help_text="Snapshot of the email at action time; survives user deletion.",
    )

    action = models.CharField(max_length=20, choices=AuditAction.choices, db_index=True)
    # What was touched. We keep the domain + id, not the object itself.
    resource_type = models.CharField(max_length=100, db_index=True)
    resource_id = models.CharField(max_length=64, blank=True, db_index=True)
    # Whose data it was - enables "who accessed patient X" queries.
    patient = models.ForeignKey(
        "patients.Patient",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    request_id = models.CharField(max_length=128, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_log"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["patient", "-created_at"]),
            models.Index(fields=["actor", "-created_at"]),
            models.Index(fields=["resource_type", "resource_id"]),
        ]
        # Guard against accidental mutation at the DB-constraint level too.
        default_permissions = ("view",)

    def __str__(self) -> str:
        return f"{self.action} {self.resource_type}:{self.resource_id} by {self.actor_email}"

    def save(self, *args, **kwargs):
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValueError("AuditLog entries are immutable and cannot be updated.")
        return super().save(*args, **kwargs)
