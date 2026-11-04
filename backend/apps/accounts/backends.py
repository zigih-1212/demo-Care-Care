"""Authentication backends."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailBackend(ModelBackend):
    """Authenticate by email, case-insensitively.

    ``User.USERNAME_FIELD`` already makes Django's ModelBackend email-aware, but
    we normalise case explicitly so that "Anna@example.com" and
    "anna@example.com" resolve to the same account - important when patients
    type their address on a phone keyboard with autocapitalisation.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        email = username or kwargs.get("email")
        if email is None or password is None:
            return None
        try:
            user = UserModel.objects.get(email__iexact=email.strip())
        except UserModel.DoesNotExist:
            # Run the hasher once to keep timing similar whether or not the user
            # exists (mitigates user enumeration by response time).
            UserModel().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
