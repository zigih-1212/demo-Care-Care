"""Object-level permission primitives.

Healthcare rule of thumb: authorisation is about *whose data* it is, not just
*which endpoint* was hit. These classes make "does this authenticated user have
a legitimate care relationship with this patient?" explicit and testable.
"""

from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import Role


class IsPatientSelf(BasePermission):
    """A patient may only touch their own record."""

    message = "You may only access your own patient record."

    def has_object_permission(self, request, view, obj) -> bool:
        patient = getattr(obj, "patient", obj)
        user = request.user
        return bool(user and user.is_authenticated and patient.user_id == user.id)


class IsCareTeamMember(BasePermission):
    """Doctor/admin may read patient data they are linked to.

    Object-level: requires a ``CareRelationship`` between the acting user and the
    patient. Staff flag alone is not enough (a clinician from another clinic must
    not read this patient).
    """

    message = "You are not part of this patient's care team."

    def has_object_permission(self, request, view, obj) -> bool:
        patient = getattr(obj, "patient", obj)
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == Role.ADMIN:
            return True
        if user.role == Role.DOCTOR:
            # Active relationship only: an ended CareRelationship is retained for
            # audit but must not keep granting access. Delegating to the model
            # keeps this single-sourced with the queryset-level scoping.
            return patient.is_in_care_team(user)
        return patient.user_id == user.id

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)


class IsPatientSelfOrCareTeam(IsCareTeamMember):
    """Read = patient self or care team; write = patient self only.

    A clinician must not silently edit a patient-reported symptom; any correction
    is a separate, audited clinical action.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return super().has_object_permission(request, view, obj)
        patient = getattr(obj, "patient", obj)
        return bool(request.user.is_authenticated and patient.user_id == request.user.id)


class IsAdminRole(BasePermission):
    message = "Administrator role required."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user and request.user.is_authenticated and request.user.role == Role.ADMIN
        )
