"""Tracking views.

Access model:
* A patient may read/write only their own entries (object permission checks the
  parent patient).
* A clinician may READ entries of patients in their care team, but cannot create
  or modify patient-reported data.

Every create/read is audited via the domain ``patient`` reference so the audit
trail answers "which patients' tracking data did this clinician view".
"""

from __future__ import annotations

from typing import Any

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import record as audit_record
from apps.patients.models import Patient
from common.pagination import CursorPagination
from common.permissions import IsPatientSelfOrCareTeam

from .models import MedicationEntry, SymptomEntry
from .serializers import (
    MedicationEntrySerializer,
    SymptomEntrySerializer,
)
from .services import symptom_summary, symptom_trend


class _PatientScopedQuerysetMixin:
    """Restrict the queryset to data the requesting user may see.

    This is the *first* line (broad scoping); object permissions are the second.
    Doing scoping in the queryset means a clinician's list endpoint never even
    loads other patients' rows, which is both a security and a performance win.
    """

    patient_filter_field = "patient"

    # ``request`` and ``model`` are provided by the concrete ViewSet (DRF
    # ``GenericViewSet``); declaring them here lets the mixin be type-checked on
    # its own without inheriting from DRF's base.
    request: Any
    model: Any

    def get_queryset(self):
        # drf-spectacular introspects the view anonymously to build the schema;
        # ``request.user.role`` does not exist on AnonymousUser, so short-circuit
        # for the fake schema view (documented drf-spectacular guard).
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()
        user = self.request.user
        qs = self.model.objects.select_related("patient", "patient__user")
        if user.role == "admin":
            return qs
        if user.role == "doctor":
            requested = self.request.query_params.get("patient")
            if requested:
                # Fail closed: if a clinician explicitly asks for a patient who
                # is not on their (active) care team, deny outright instead of
                # returning an empty list. An empty 200 hides access-control
                # misconfiguration and makes "denied" indistinguishable from
                # "no data".
                allowed = Patient.objects.filter(
                    id=requested,
                    care_relationships__clinician=user,
                    care_relationships__ended_at__isnull=True,
                ).exists()
                if not allowed:
                    raise PermissionDenied("You are not on this patient's care team.")
            return qs.filter(
                patient__care_relationships__clinician=user,
                patient__care_relationships__ended_at__isnull=True,
            )
        return qs.filter(patient__user=user)

    def _audit_patient(self, request):
        """Resolve the patient whose data this request concerns, for auditing.

        Never raises: auditing must not be able to turn a read into an error.
        """
        user = request.user
        if user.role in ("doctor", "admin"):
            patient_id = request.query_params.get("patient")
            return Patient.objects.filter(id=patient_id).first() if patient_id else None
        try:
            return user.patient_profile
        except Patient.DoesNotExist:
            return None

    def _resolve_patient(self) -> Patient:
        """Determine which patient the request targets.

        Patients: always themselves (a patient cannot write another patient's
        data by passing an id). Clinicians: must pass ``patient`` in the payload
        and be on that patient's care team.
        """
        user = self.request.user
        if user.role == "doctor":
            patient_id = self.request.data.get("patient") or self.request.query_params.get(
                "patient"
            )
            if not patient_id:
                raise ValidationError({"patient": "patient id is required."})
            patient = Patient.objects.filter(id=patient_id).first()
            if not patient:
                raise ValidationError({"patient": "Unknown patient."})
            if not patient.is_in_care_team(user):
                raise PermissionDenied("You are not on this patient's care team.")
            return patient
        if user.role == "admin":
            patient_id = self.request.data.get("patient")
            patient = Patient.objects.filter(id=patient_id).first()
            if not patient:
                raise ValidationError({"patient": "Unknown patient."})
            return patient
        try:
            return user.patient_profile
        except Patient.DoesNotExist:
            raise ValidationError({"patient": "No patient profile for this account."}) from None


class SymptomEntryViewSet(
    _PatientScopedQuerysetMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    model = SymptomEntry
    serializer_class = SymptomEntrySerializer
    permission_classes = [IsAuthenticated, IsPatientSelfOrCareTeam]
    pagination_class = CursorPagination
    filterset_fields = ["symptom_type"]
    ordering_fields = ["recorded_at", "severity", "created_at"]
    ordering = "-recorded_at"

    def perform_create(self, serializer):
        patient = self._resolve_patient()
        entry = serializer.save(patient=patient)
        audit_record(
            action=AuditAction.CREATE,
            resource_type="symptom_entry",
            request=self.request,
            resource_id=entry.id,
            patient=patient,
            metadata={"symptom_type": entry.symptom_type, "severity": entry.severity},
        )

    def perform_update(self, serializer):
        entry = serializer.save()
        audit_record(
            action=AuditAction.UPDATE,
            resource_type="symptom_entry",
            request=self.request,
            resource_id=entry.id,
            patient=entry.patient,
        )

    def perform_destroy(self, instance):
        patient = instance.patient
        entry_id = instance.id
        instance.delete()
        audit_record(
            action=AuditAction.DELETE,
            resource_type="symptom_entry",
            request=self.request,
            resource_id=entry_id,
            patient=patient,
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Audit aggregate reads at the patient level (who viewed whose data) so
        # the trail answers "which clinicians opened this patient's records".
        audit_patient = self._audit_patient(request)
        audit_record(
            action=AuditAction.READ,
            resource_type="symptom_entry_list",
            request=request,
            resource_id=str(audit_patient.id) if audit_patient else "",
            patient=audit_patient,
            metadata={"query_params": dict(request.query_params)},
        )
        return response

    @action(detail=False, methods=["get"])
    def summary(self, request):
        patient = self._patient_for_analytics(request)
        days = _parse_days(request, default=30)
        audit_record(
            action=AuditAction.READ,
            resource_type="symptom_summary",
            request=request,
            resource_id=patient.id,
            patient=patient,
        )
        return Response(symptom_summary(patient, days=days))

    @action(detail=False, methods=["get"])
    def trend(self, request):
        patient = self._patient_for_analytics(request)
        days = _parse_days(request, default=30)
        symptom_type = request.query_params.get("symptom_type") or None
        audit_record(
            action=AuditAction.READ,
            resource_type="symptom_trend",
            request=request,
            resource_id=patient.id,
            patient=patient,
        )
        points = symptom_trend(patient, days=days, symptom_type=symptom_type)
        return Response({"points": points, "total": len(points)})

    def _patient_for_analytics(self, request) -> Patient:
        """Resolve the patient for read-only analytics endpoints."""
        user = request.user
        if user.role in ("doctor", "admin"):
            patient_id = request.query_params.get("patient")
            if not patient_id:
                raise ValidationError({"patient": "patient query parameter is required."})
            patient = Patient.objects.filter(id=patient_id).first()
            if not patient:
                raise ValidationError({"patient": "Unknown patient."})
            if user.role == "doctor" and not patient.is_in_care_team(user):
                raise PermissionDenied("You are not on this patient's care team.")
            return patient
        try:
            return user.patient_profile
        except Patient.DoesNotExist:
            raise ValidationError({"patient": "No patient profile for this account."}) from None


class MedicationEntryViewSet(
    _PatientScopedQuerysetMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    model = MedicationEntry
    serializer_class = MedicationEntrySerializer
    permission_classes = [IsAuthenticated, IsPatientSelfOrCareTeam]
    pagination_class = CursorPagination
    ordering_fields = ["recorded_at", "created_at"]
    ordering = "-recorded_at"

    def perform_create(self, serializer):
        patient = self._resolve_patient()
        entry = serializer.save(patient=patient)
        audit_record(
            action=AuditAction.CREATE,
            resource_type="medication_entry",
            request=self.request,
            resource_id=entry.id,
            patient=patient,
            metadata={"medication_name": entry.medication_name, "taken": entry.taken},
        )

    def perform_destroy(self, instance):
        patient = instance.patient
        entry_id = instance.id
        instance.delete()
        audit_record(
            action=AuditAction.DELETE,
            resource_type="medication_entry",
            request=self.request,
            resource_id=entry_id,
            patient=patient,
        )


def _parse_days(request, *, default: int) -> int:
    raw = request.query_params.get("days")
    if raw is None:
        return default
    try:
        days = int(raw)
    except (TypeError, ValueError):
        raise ValidationError({"days": "must be an integer."}) from None
    if not 1 <= days <= 365:
        raise ValidationError({"days": "must be between 1 and 365."})
    return days
