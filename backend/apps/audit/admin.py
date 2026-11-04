"""Audit admin - view-only to preserve immutability."""

from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "action",
        "resource_type",
        "resource_id",
        "actor_email",
        "ip_address",
    )
    list_filter = ("action", "resource_type")
    search_fields = ("actor_email", "resource_id", "request_id")
    date_hierarchy = "created_at"

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
