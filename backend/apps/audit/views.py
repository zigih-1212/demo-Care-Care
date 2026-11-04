"""Audit views.

Read-only and restricted to administrators: the audit trail is itself sensitive
(it reveals who is treating whom). No mutation endpoints exist, matching the
immutability guarantee in the model.
"""

from __future__ import annotations

from rest_framework import viewsets

from common.permissions import IsAdminRole

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminRole]
    filterset_fields = ["action", "resource_type", "actor", "patient"]
    search_fields = ["actor_email", "resource_id", "request_id"]
    ordering_fields = ["created_at"]
    ordering = "-created_at"

    def get_queryset(self):
        # Only admins reach here (permission above), but keep the query lean:
        # select_related avoids an N+1 when serialising actor/patient refs.
        return AuditLog.objects.select_related("actor", "patient").all()
