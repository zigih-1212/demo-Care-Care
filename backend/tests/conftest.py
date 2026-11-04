"""Shared pytest fixtures and factories.

We use ``factory_boy`` so tests describe *data shapes* ("a patient with an
active clinician") rather than constructing rows by hand. This keeps tests
readable and, more importantly, resilient when a model gains a required field.

``django_db`` access is requested per test (or via these fixtures) so that pure
unit tests stay fast and the DB is only built when needed.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.patients.models import CareRelationship, Patient

User = get_user_model()


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def patient_user(db):
    return User.objects.create_user(
        email="patient@example.com", password="Str0ng-Passw0rd!", full_name="Pat Ient"
    )


@pytest.fixture
def other_patient_user(db):
    return User.objects.create_user(
        email="other@example.com", password="Str0ng-Passw0rd!", full_name="Other Patient"
    )


@pytest.fixture
def patient(db, patient_user) -> Patient:
    return Patient.objects.create(user=patient_user, primary_condition="IBS", country="DE")


@pytest.fixture
def other_patient(db, other_patient_user) -> Patient:
    return Patient.objects.create(user=other_patient_user, primary_condition="GERD")


@pytest.fixture
def doctor_user(db):
    return User.objects.create_user(
        email="doctor@example.com", password="Str0ng-Passw0rd!", role="doctor", full_name="Dr House"
    )


@pytest.fixture
def care_relationship(db, patient, doctor_user) -> CareRelationship:
    patient.care_team.add(doctor_user)
    return CareRelationship.objects.get(patient=patient, clinician=doctor_user)


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin@example.com", password="Str0ng-Passw0rd!", role="admin", is_staff=True
    )


def auth(user, password: str = "Str0ng-Passw0rd!") -> APIClient:
    """Return a fresh client authenticated via the real JWT endpoint.

    Using the real login path means tests exercise token issuance too - a broken
    login is caught here rather than in production. A *new* client per call is
    essential: sharing one client across fixtures means the last ``auth`` wins
    and a "patient" client silently carries admin credentials.
    """
    client = APIClient()
    response = client.post(
        "/api/v1/auth/login/", {"email": user.email, "password": password}, format="json"
    )
    assert response.status_code == 200, response.data
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return client


@pytest.fixture
def patient_client(patient_user, patient) -> APIClient:
    # Depend on ``patient`` so every patient-authenticated test has a profile.
    return auth(patient_user)


@pytest.fixture
def doctor_client(doctor_user) -> APIClient:
    return auth(doctor_user)


@pytest.fixture
def admin_client(admin_user) -> APIClient:
    return auth(admin_user)
