"""Patient URL routes (mounted at /api/v1/patients/)."""

from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .views import PatientViewSet

app_name = "patients"

router = DefaultRouter()
router.register("", PatientViewSet, basename="patient")

urlpatterns = router.urls
