"""Audit URL routes (mounted at /api/v1/audit/)."""

from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .views import AuditLogViewSet

app_name = "audit"

router = DefaultRouter()
router.register("logs", AuditLogViewSet, basename="log")

urlpatterns = router.urls
