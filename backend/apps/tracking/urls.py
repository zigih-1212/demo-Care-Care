"""Tracking URL routes (mounted at /api/v1/tracking/)."""

from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .views import MedicationEntryViewSet, SymptomEntryViewSet

app_name = "tracking"

router = DefaultRouter()
router.register("symptoms", SymptomEntryViewSet, basename="symptom")
router.register("medications", MedicationEntryViewSet, basename="medication")

urlpatterns = router.urls
