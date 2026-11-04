"""Patient views with object-level authorisation and audit on read.

The design goal: a patient sees only themselves; a clinician sees only patients
they have an active relationship with. Every successful read of a patient record
is audited, because "who looked at whose health data" is itself regulated.
"""

from __future__ import annotations

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import record as audit_record
from common.permissions import IsCareTeamMember

from .models import Patient
from .serializers import PatientSerializer


class PatientViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Patients are not listed/created through the public API.

    Creation happens via invitation; listing every patient would be a privacy
    hazard and is deliberately not exposed.
    """

    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsCareTeamMember]
    # ``get_queryset`` is the real scoping gate, but drf-spectacular introspects
    # the view anonymously to build the schema. Declaring a base queryset stops
    # the schema generator from calling ``get_queryset`` (which needs
    # ``request.user.role``) and is never used to serve requests.
    queryset = Patient.objects.none()

    def get_queryset(self):
        user = self.request.user
        qs = Patient.objects.select_related("user")
        if user.role == "admin":
            return qs
        if user.role == "doctor":
            # Only active relationships count; ended ones must not grant access.
            return qs.filter(
                care_relationships__clinician=user, care_relationships__ended_at__isnull=True
            )
        # Patient: only their own record.
        return qs.filter(user=user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        audit_record(
            action=AuditAction.READ,
            resource_type="patient",
            request=request,
            resource_id=instance.id,
            patient=instance,
        )
        return Response(self.get_serializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        audit_record(
            action=AuditAction.UPDATE,
            resource_type="patient",
            request=self.request,
            resource_id=instance.id,
            patient=instance,
            metadata={"changed": list(self.request.data.keys())},
        )

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Convenience endpoint for the mobile app's own-profile screen."""
        patient = self.get_queryset().filter(user=request.user).first()
        if not patient:
            return Response(
                {"error": {"code": "not_found", "message": "No patient profile."}}, status=404
            )
        audit_record(
            action=AuditAction.READ,
            resource_type="patient",
            request=request,
            resource_id=patient.id,
            patient=patient,
        )
        return Response(self.get_serializer(patient).data)
