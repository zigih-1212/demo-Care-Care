"""Therapy URL routes (mounted at /api/v1/therapy/)."""

from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .views import EnrollmentViewSet, TherapyProgramViewSet

app_name = "therapy"

router = DefaultRouter()
router.register("programs", TherapyProgramViewSet, basename="program")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")

urlpatterns = router.urls
