"""Account & authentication views.

Throttle scopes are assigned per view class so that brute-force protection is
per-endpoint rather than global (``auth`` scope: 10/min, from settings).
"""

from __future__ import annotations

import contextlib

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    ChangePasswordSerializer,
    ConsentSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """Self-service registration. Creates a PATIENT account."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """Issue access/refresh JWT pair."""

    permission_classes = (AllowAny,)  # type: ignore[assignment]
    throttle_scope = "auth"


class RefreshView(TokenRefreshView):
    permission_classes = (AllowAny,)  # type: ignore[assignment]
    throttle_scope = "auth"


class MeView(APIView):
    """Current user's profile."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {
                    "error": {
                        "code": "invalid_password",
                        "message": "Current password is incorrect.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"status": "password_changed"})


class LogoutView(APIView):
    """Blacklist the presented refresh token.

    Access tokens are short-lived (15 min) and stateless, so logout revokes the
    refresh token; the access token expires on its own.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken

        token = request.data.get("refresh")
        if not token:
            return Response(
                {"error": {"code": "missing_token", "message": "refresh token required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # A malformed/expired/ already-blacklisted token must not fail logout:
        # the client is telling us to forget it anyway. Suppressing the error is
        # intentional and safe here.
        with contextlib.suppress(Exception):
            RefreshToken(token).blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ConsentView(APIView):
    """Record GDPR consent timestamp."""

    permission_classes = [IsAuthenticated]
    serializer_class = ConsentSerializer

    def post(self, request):
        serializer = ConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.consent_privacy_accepted_at = timezone.now()
        user.save(update_fields=["consent_privacy_accepted_at"])
        return Response({"consent_privacy_accepted_at": user.consent_privacy_accepted_at})
