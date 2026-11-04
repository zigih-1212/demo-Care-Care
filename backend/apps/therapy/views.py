"""Therapy views.

Program catalogue is public-to-authenticated users and cached (it changes
rarely). Enrollment is patient-scoped and audited.
"""

from __future__ import annotations

from django.core.cache import cache
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import record as audit_record
from common.pagination import StandardPageNumberPagination
from common.permissions import IsPatientSelfOrCareTeam

from .models import Enrollment, TherapyProgram
from .serializers import EnrollmentSerializer, TherapyProgramSerializer

PROGRAM_CACHE_KEY = "therapy:programs:active"
PROGRAM_CACHE_TTL = 300  # seconds


class TherapyProgramViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only catalogue. Programs are authored by clinicians via admin."""

    serializer_class = TherapyProgramSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPageNumberPagination
    lookup_field = "slug"
    # Base queryset for schema introspection; ``get_queryset`` narrows it.
    queryset = TherapyProgram.objects.none()
    filterset_fields = ["condition"]
    search_fields = ["title", "description"]

    def get_queryset(self):
        # Cache the id list only; the DB still enforces permissions and returns
        # fresh rows. Caching whole serialized objects would risk serving stale
        # medical content after an editorial update.
        return TherapyProgram.objects.filter(is_active=True)

    @action(detail=False, methods=["get"], url_path="cached")
    def cached(self, request):
        """Demonstrates the cache layer used for the hot catalogue endpoint."""
        payload = cache.get(PROGRAM_CACHE_KEY)
        if payload is None:
            payload = TherapyProgramSerializer(
                TherapyProgram.objects.filter(is_active=True), many=True
            ).data
            cache.set(PROGRAM_CACHE_KEY, payload, timeout=PROGRAM_CACHE_TTL)
        return Response(payload)


class EnrollmentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated, IsPatientSelfOrCareTeam]
    pagination_class = StandardPageNumberPagination
    # Base queryset for schema introspection; ``get_queryset`` narrows it.
    queryset = Enrollment.objects.none()
    filterset_fields = ["status", "program"]
    ordering_fields = ["started_at", "progress_percent"]
    ordering = "-started_at"

    def get_queryset(self):
        user = self.request.user
        qs = Enrollment.objects.select_related("program", "patient")
        if user.role == "admin":
            return qs
        if user.role == "doctor":
            return qs.filter(
                patient__care_relationships__clinician=user,
                patient__care_relationships__ended_at__isnull=True,
            )
        return qs.filter(patient__user=user)

    def perform_create(self, serializer):
        enrollment = serializer.save()
        audit_record(
            action=AuditAction.CREATE,
            resource_type="enrollment",
            request=self.request,
            resource_id=enrollment.id,
            patient=enrollment.patient,
            metadata={"program": str(enrollment.program_id)},
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        enrollment = self.get_object()
        if request.user.id != enrollment.patient.user_id:
            return Response(
                {"error": {"code": "forbidden", "message": "Only the patient may complete."}},
                status=403,
            )
        from django.utils import timezone

        enrollment.status = Enrollment.Status.COMPLETED
        enrollment.completed_at = timezone.now()
        enrollment.progress_percent = 100
        enrollment.save(update_fields=["status", "completed_at", "progress_percent"])
        audit_record(
            action=AuditAction.UPDATE,
            resource_type="enrollment",
            request=request,
            resource_id=enrollment.id,
            patient=enrollment.patient,
            metadata={"status": "completed"},
        )
        return Response(self.get_serializer(enrollment).data)
