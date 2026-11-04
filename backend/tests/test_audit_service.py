"""Audit service guarantees.

The service promises that auditing never breaks the clinical workflow. That
promise is easy to get wrong under ``ATOMIC_REQUESTS``: a bare
``AuditLog.objects.create`` that fails would poison the surrounding transaction
and turn the whole request into a 500. ``record`` therefore runs inside its own
savepoint. These tests pin that behaviour down.
"""

from __future__ import annotations

from unittest import mock

import pytest
from django.db import transaction

from apps.audit.models import AuditLog
from apps.audit.services import record

pytestmark = pytest.mark.django_db


class TestRecordNeverBreaksCaller:
    def test_returns_none_when_write_fails(self):
        with mock.patch.object(AuditLog.objects, "create", side_effect=RuntimeError("boom")):
            assert record(action="read", resource_type="symptom") is None

    def test_failure_does_not_poison_outer_transaction(self, patient_user):
        """A failed audit row must roll back alone, not the caller's work."""
        with transaction.atomic():
            with mock.patch.object(
                AuditLog.objects, "create", side_effect=RuntimeError("db hiccup")
            ):
                assert record(action="read", resource_type="symptom") is None
            # The outer transaction must still be usable. Without the savepoint
            # this query raises TransactionManagementError.
            assert AuditLog.objects.count() == 0

    def test_successful_write_persists(self, patient_user):
        entry = record(action="read", resource_type="symptom", actor=patient_user)
        assert entry is not None
        assert entry.actor_email == patient_user.email
