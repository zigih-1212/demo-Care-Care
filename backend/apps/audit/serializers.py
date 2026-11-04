"""Audit API serializers (read-only)."""

from __future__ import annotations

from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_email",
            "action",
            "resource_type",
            "resource_id",
            "patient",
            "ip_address",
            "user_agent",
            "request_id",
            "metadata",
            "created_at",
        )
        read_only_fields = fields
