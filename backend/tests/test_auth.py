"""Authentication and account-lifecycle tests (unit + integration).

These exercise the real HTTP surface (login -> JWT -> protected call) so a
regression in token issuance, rotation, or blacklisting is caught here.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from apps.accounts.models import Role

User = get_user_model()

pytestmark = pytest.mark.django_db

STRONG = "Str0ng-Passw0rd!"


class TestRegistration:
    def test_register_creates_patient_and_never_trusts_role(self, api_client):
        resp = api_client.post(
            reverse("accounts:register"),
            {
                "email": "New@Example.COM",
                "password": STRONG,
                "full_name": "New User",
                "role": "admin",  # must be ignored
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        user = User.objects.get(email="new@example.com")
        assert user.role == Role.PATIENT, "client-supplied role must be ignored"
        assert user.check_password(STRONG)

    def test_register_rejects_weak_password(self, api_client):
        resp = api_client.post(
            reverse("accounts:register"),
            {"email": "weak@example.com", "password": "short", "full_name": "X"},
            format="json",
        )
        assert resp.status_code == 400
        assert "password" in resp.data["error"]["details"]

    def test_register_rejects_duplicate_email(self, api_client, patient_user):
        resp = api_client.post(
            reverse("accounts:register"),
            {
                "email": patient_user.email.upper(),
                "password": STRONG,
                "full_name": "Dup",
            },
            format="json",
        )
        assert resp.status_code == 400


class TestLoginAndTokens:
    def test_login_returns_access_and_refresh(self, api_client, patient_user):
        resp = api_client.post(
            reverse("accounts:login"),
            {"email": patient_user.email, "password": STRONG},
            format="json",
        )
        assert resp.status_code == 200
        assert "access" in resp.data and "refresh" in resp.data

    def test_login_rejects_bad_password(self, api_client, patient_user):
        resp = api_client.post(
            reverse("accounts:login"),
            {"email": patient_user.email, "password": "wrong-password"},
            format="json",
        )
        assert resp.status_code == 401

    def test_login_is_not_user_enumerable(self, api_client, patient_user):
        """Unknown user and known user with bad password must be indistinguishable."""
        unknown = api_client.post(
            reverse("accounts:login"),
            {"email": "ghost@example.com", "password": STRONG},
            format="json",
        )
        wrong = api_client.post(
            reverse("accounts:login"),
            {"email": patient_user.email, "password": "nope-wrong"},
            format="json",
        )
        assert unknown.status_code == wrong.status_code == 401

    def test_me_requires_auth(self, api_client):
        assert api_client.get(reverse("accounts:me")).status_code == 401

    def test_me_returns_current_profile(self, patient_client, patient_user):
        resp = patient_client.get(reverse("accounts:me"))
        assert resp.status_code == 200
        assert resp.data["email"] == patient_user.email

    def test_logout_blacklists_refresh_token(self, api_client, patient_user):
        login = api_client.post(
            reverse("accounts:login"),
            {"email": patient_user.email, "password": STRONG},
            format="json",
        )
        refresh = login.data["refresh"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        out = api_client.post(reverse("accounts:logout"), {"refresh": refresh}, format="json")
        assert out.status_code == 205
        # The blacklisted refresh token can no longer mint a new access token.
        reused = api_client.post(reverse("accounts:refresh"), {"refresh": refresh}, format="json")
        assert reused.status_code == 401


class TestChangePassword:
    def test_change_password_requires_current_password(self, patient_client):
        resp = patient_client.post(
            reverse("accounts:password-change"),
            {"current_password": "not-my-password", "new_password": STRONG + "X"},
            format="json",
        )
        assert resp.status_code == 400
        assert resp.data["error"]["code"] == "invalid_password"

    def test_change_password_success_then_old_password_fails(
        self, patient_client, api_client, patient_user
    ):
        resp = patient_client.post(
            reverse("accounts:password-change"),
            {"current_password": STRONG, "new_password": "Br4nd-New-Passw0rd!"},
            format="json",
        )
        assert resp.status_code == 200
        patient_user.refresh_from_db()
        assert patient_user.check_password("Br4nd-New-Passw0rd!")
        old = api_client.post(
            reverse("accounts:login"),
            {"email": patient_user.email, "password": STRONG},
            format="json",
        )
        assert old.status_code == 401


class TestConsent:
    def test_consent_records_timestamp(self, patient_client, patient_user):
        assert patient_user.consent_privacy_accepted_at is None
        resp = patient_client.post(
            reverse("accounts:consent"), {"accept_privacy_policy": True}, format="json"
        )
        assert resp.status_code == 200
        patient_user.refresh_from_db()
        assert patient_user.consent_privacy_accepted_at is not None
